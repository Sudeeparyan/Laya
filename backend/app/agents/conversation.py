"""
Laya Healthcare — Conversation Manager
Handles multi-turn conversation memory, follow-up detection, and context-aware
responses using LLM.  Works like ChatGPT / Claude — remembers previous messages
within a session and can answer follow-up questions without re-running the full
claims pipeline.

Session store layout (per session_id):
  {
      "messages": [
          {"role": "user",      "content": "...", "timestamp": "..."},
          {"role": "assistant", "content": "...", "timestamp": "...",
           "decision": "...", "payout_amount": 0.0},
      ],
      "last_claim_context": {          # preserved from the most recent claim run
          "member_id": "MEM-1001",
          "member_data": { ... },
          "extracted_doc": { ... },
          "decision": "REJECTED",
          "reasoning": "...",
          "payout_amount": 0.0,
          "agent_trace": [...],
          "flags": [...],
      },
  }
"""

from __future__ import annotations

import re
import json
import logging
from datetime import datetime

from langchain_core.messages import SystemMessage, HumanMessage

from app.agents.llm_factory import get_llm
from app.config import settings

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# In-memory session store
# ──────────────────────────────────────────────
_sessions: dict[str, dict] = {}

MAX_MESSAGES_PER_SESSION = 50


def get_session(session_id: str) -> dict:
    """Return the full session dict (messages + last_claim_context)."""
    if session_id not in _sessions:
        _sessions[session_id] = {
            "messages": [],
            "last_claim_context": {},
        }
    return _sessions[session_id]


def add_message(session_id: str, role: str, content: str, **extra) -> None:
    """Append a message to the session."""
    session = get_session(session_id)
    entry = {"role": role, "content": content, "timestamp": datetime.now().isoformat()}
    entry.update(extra)
    session["messages"].append(entry)
    # Trim to prevent memory bloat
    if len(session["messages"]) > MAX_MESSAGES_PER_SESSION:
        session["messages"] = session["messages"][-MAX_MESSAGES_PER_SESSION:]


def save_claim_context(session_id: str, ctx: dict) -> None:
    """Persist the result of a claim pipeline run so follow-ups can reference it."""
    session = get_session(session_id)
    session["last_claim_context"] = ctx


def get_messages(session_id: str) -> list[dict]:
    """Return the list of messages for a session."""
    return get_session(session_id).get("messages", [])


def get_last_claim_context(session_id: str) -> dict:
    """Return the last claim context (decision, reasoning, doc, member, etc.)."""
    return get_session(session_id).get("last_claim_context", {})


# ──────────────────────────────────────────────
# Follow-up detection
# ──────────────────────────────────────────────

# Patterns that strongly suggest a follow-up / conversational question
_FOLLOWUP_PATTERNS = [
    # References to previous response
    r"\b(why|what|how|can you|could you|please|tell me|explain)\b",
    r"\b(reason|detail|elaborate|clarify|more info|summary)\b",
    r"\b(the rejection|the decision|the claim|my claim|the result|the payout)\b",
    r"\b(previous|above|that|this|earlier|just now|you said|you mentioned)\b",
    # Short conversational
    r"^(thanks|thank you|ok|okay|got it|sure|yes|no|great|understood)",
    # Policy / general questions
    r"\b(what is|what are|how does|how do|when can|how much|is there|am i|do i)\b",
    r"\b(covered|benefit|policy|plan|scheme|waiting period|threshold|limit)\b",
]

# Patterns that suggest a NEW claim submission
_NEW_CLAIM_PATTERNS = [
    r"\bclaim\s+for\s+(a|my|the)\b",
    r"\bsubmit\s+(a|my|the)\b",
    r"\b(gp|doctor|dentist|hospital|consultant|scan|mri|prescription|therapy|maternity)\s+(visit|fee|claim|receipt|stay|session|appointment)\b",
    r"\b(receipt|invoice|bill)\s+(for|from|of)\b",
    r"\bEUR\s+\d+",
    r"\b\d+\s*euro\b",
    r"\bcost\s+(was|is|of)\s+(EUR|€|\d)",
]


def is_follow_up(user_message: str, session_id: str) -> bool:
    """Determine if a user message is a follow-up / conversational question
    rather than a new claim submission.

    Heuristics:
      1. If there are no previous messages → NOT a follow-up
      2. If the message explicitly contains new-claim language → NOT a follow-up
      3. If the message is short and conversational → follow-up
      4. If no treatment type can be inferred → follow-up
    """
    session = get_session(session_id)
    messages = session.get("messages", [])
    claim_ctx = session.get("last_claim_context", {})

    # No prior conversation = definitely not a follow-up
    if not messages or not claim_ctx:
        return False

    msg = user_message.strip().lower()

    # Questions about existing claims are ALWAYS follow-ups
    # e.g. "when can I submit again?", "why was my claim rejected?"
    question_starters = (
        "when", "why", "how", "what", "where", "can i", "could i",
        "will i", "am i", "do i", "is my", "was my", "are there",
        "tell me", "explain", "please",
    )
    is_question = any(msg.startswith(q) for q in question_starters) or msg.endswith("?")

    # Check for explicit new claim patterns — but only if it's NOT phrased as a question
    if not is_question:
        for pattern in _NEW_CLAIM_PATTERNS:
            if re.search(pattern, msg, re.IGNORECASE):
                return False

    # Short messages (< 8 words) with prior context are almost always follow-ups
    word_count = len(msg.split())
    if word_count <= 8:
        return True

    # Check for follow-up language patterns
    followup_score = 0
    for pattern in _FOLLOWUP_PATTERNS:
        if re.search(pattern, msg, re.IGNORECASE):
            followup_score += 1

    # If at least 2 follow-up signals, treat as follow-up
    return followup_score >= 2


# ──────────────────────────────────────────────
# Conversational follow-up handler (LLM-powered)
# ──────────────────────────────────────────────

_FOLLOWUP_SYSTEM_PROMPT = """You are Laya Healthcare's AI Claims Assistant. You are in the middle of a conversation with a member about their health insurance claim.

CONVERSATION HISTORY:
{conversation_history}

LAST CLAIM CONTEXT:
- Member: {member_name} ({member_id})
- Scheme: {scheme_name}
- Decision: {decision}
- Payout: €{payout_amount:.2f}
- Reasoning: {reasoning}
- Treatment Type: {treatment_type}
- Treatment Date: {treatment_date}
- Total Cost: €{total_cost:.2f}

AGENT TRACE (what the system did):
{agent_trace}

MEMBER USAGE (current year):
{usage_summary}

INSTRUCTIONS:
- Answer the member's follow-up question based on the conversation history and claim context above.
- Be helpful, empathetic, and professional. Use the member's first name.
- If they ask about the reason for a rejection/decision, explain it clearly using the reasoning and agent trace.
- If they ask about their policy, benefits, or usage, use the member data above.
- If they ask about next steps, provide actionable advice.
- If they want to submit a NEW claim, tell them to type their new claim details or upload a new document.
- Keep responses concise but informative (2-4 paragraphs max).
- Use markdown formatting for readability (bold, bullet points, etc.).
- Always maintain a warm, Laya Healthcare brand tone.
"""


async def handle_follow_up(
    user_message: str,
    session_id: str,
    member_id: str,
) -> dict:
    """Handle a follow-up question using conversation history + LLM.

    Returns a dict matching the ClaimResponse shape so the frontend
    can render it identically.
    """
    session = get_session(session_id)
    claim_ctx = session.get("last_claim_context", {})
    messages = session.get("messages", [])
    member_data = claim_ctx.get("member_data", {})
    extracted_doc = claim_ctx.get("extracted_doc", {})
    usage = member_data.get("current_year_usage", {})

    member_name = f"{member_data.get('first_name', '')} {member_data.get('last_name', '')}".strip() or "Member"
    scheme = member_data.get("scheme_name", "Unknown")

    # Build conversation history string
    conv_lines = []
    for m in messages[-10:]:  # last 10 messages for context
        role_label = "Member" if m["role"] == "user" else "AI Assistant"
        conv_lines.append(f"{role_label}: {m['content']}")
    conversation_str = "\n".join(conv_lines) if conv_lines else "(No prior messages)"

    # Build agent trace string
    trace = claim_ctx.get("agent_trace", [])
    trace_str = "\n".join(f"  - {t}" for t in trace) if trace else "(No trace available)"

    # Build usage summary
    usage_lines = [
        f"  GP Visits: {usage.get('gp_visits_count', 0)}/10",
        f"  Consultant: {usage.get('consultant_visits_count', 0)}/10",
        f"  Prescriptions: {usage.get('prescription_count', 0)}/4",
        f"  Dental/Optical: {usage.get('dental_optical_count', 0)}/10",
        f"  Therapy: {usage.get('therapy_count', 0)}/10",
        f"  Scans: {usage.get('scan_count', 0)}/10",
        f"  Hospital Days: {usage.get('hospital_days_count', 0)}/40",
        f"  Quarterly Receipts: €{usage.get('q_accumulated_receipts', 0):.2f} / €150",
    ]
    usage_str = "\n".join(usage_lines)

    # Format the system prompt
    system_prompt = _FOLLOWUP_SYSTEM_PROMPT.format(
        conversation_history=conversation_str,
        member_name=member_name,
        member_id=member_id,
        scheme_name=scheme,
        decision=claim_ctx.get("decision", "N/A"),
        payout_amount=claim_ctx.get("payout_amount", 0.0),
        reasoning=claim_ctx.get("reasoning", "No reasoning available"),
        treatment_type=extracted_doc.get("treatment_type", "N/A"),
        treatment_date=extracted_doc.get("treatment_date", "N/A"),
        total_cost=extracted_doc.get("total_cost", 0.0),
        agent_trace=trace_str,
        usage_summary=usage_str,
    )

    # Save user message to session first
    add_message(session_id, "user", user_message)

    # Use LLM if available, otherwise build a rule-based response
    reasoning = ""
    if settings.OPENAI_API_KEY:
        try:
            llm = get_llm("child")  # Use the lighter model for follow-ups
            response = await llm.ainvoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_message),
            ])
            reasoning = response.content.strip()
        except Exception as e:
            logger.warning(f"LLM follow-up failed: {e}")
            reasoning = ""

    # Fallback if LLM unavailable or failed
    if not reasoning:
        reasoning = _build_fallback_followup(user_message, claim_ctx, member_data)

    # Save assistant response to session
    add_message(session_id, "assistant", reasoning,
                decision=claim_ctx.get("decision", ""),
                payout_amount=claim_ctx.get("payout_amount", 0.0))

    # Build trace entries for the follow-up
    trace_entries = [
        f"Conversation Agent → Follow-up detected (session has {len(messages)} prior messages)",
        f"Conversation Agent → Using claim context: {claim_ctx.get('decision', 'N/A')} for {extracted_doc.get('treatment_type', 'N/A')}",
        f"Conversation Agent → Generated contextual response ✓",
    ]

    return {
        "decision": claim_ctx.get("decision", ""),
        "reasoning": reasoning,
        "agent_trace": trace_entries,
        "payout_amount": claim_ctx.get("payout_amount", 0.0),
        "flags": claim_ctx.get("flags", []),
        "needs_info": [],
        "session_id": session_id,
    }


def _build_fallback_followup(user_message: str, claim_ctx: dict, member_data: dict) -> str:
    """Build a rule-based follow-up response when no LLM is available."""
    msg = user_message.lower()
    decision = claim_ctx.get("decision", "")
    reasoning = claim_ctx.get("reasoning", "")
    member_name = member_data.get("first_name", "there")
    extracted = claim_ctx.get("extracted_doc", {})

    # Reason for rejection/decision
    if any(kw in msg for kw in ["reason", "why", "explain", "detail", "rejected", "denied"]):
        return (
            f"Hi {member_name}, here's a detailed explanation of your claim decision:\n\n"
            f"**Decision: {decision}**\n\n"
            f"{reasoning}\n\n"
            f"If you have any further questions or believe this decision is incorrect, "
            f"you can contact Laya Healthcare's claims team for a review."
        )

    # Payout / amount
    if any(kw in msg for kw in ["payout", "amount", "how much", "payment", "reimburse"]):
        payout = claim_ctx.get("payout_amount", 0.0)
        if decision == "APPROVED":
            return (
                f"Hi {member_name}, your claim has been approved with a payout of **€{payout:.2f}**.\n\n"
                f"This will be transferred to your registered bank account (IBAN ending ****) "
                f"once the quarterly threshold of €150 has been met."
            )
        else:
            return (
                f"Hi {member_name}, unfortunately your claim was **{decision}** "
                f"so no payout has been issued.\n\n{reasoning}"
            )

    # Next steps
    if any(kw in msg for kw in ["next", "what can", "what should", "now what", "step"]):
        if decision == "REJECTED":
            return (
                f"Hi {member_name}, here are your options:\n\n"
                f"1. **Wait and resubmit** — If the rejection was due to a waiting period, "
                f"you can resubmit after the waiting period ends.\n"
                f"2. **Contact Laya Healthcare** — If you believe the decision is incorrect, "
                f"call the claims team at 1890 700 890.\n"
                f"3. **Submit a different claim** — Type your new claim details or upload a new receipt."
            )
        return (
            f"Hi {member_name}, your claim has been processed with decision: **{decision}**.\n\n"
            f"You can submit another claim by typing your claim details or uploading a new receipt."
        )

    # Policy / benefits questions
    if any(kw in msg for kw in ["policy", "benefit", "cover", "plan", "scheme"]):
        return (
            f"Hi {member_name}, you're on the **{member_data.get('scheme_name', 'Money Smart 20 Family')}** plan.\n\n"
            f"This plan includes cash-back benefits for GP visits, consultant fees, prescriptions, "
            f"dental & optical, therapy, scans, hospital stays, and maternity.\n\n"
            f"Claims are paid out once accumulated receipts total €150 or more per quarter. "
            f"A 12-week initial waiting period applies to new policies."
        )

    # Thank you / acknowledgement
    if any(kw in msg for kw in ["thank", "thanks", "great", "got it", "ok", "understood"]):
        return (
            f"You're welcome, {member_name}! If you need anything else — whether it's "
            f"submitting another claim, checking your benefits, or asking about your policy — "
            f"I'm here to help. Just type your question or upload a new receipt."
        )

    # Generic follow-up
    return (
        f"Hi {member_name}, regarding your recent claim:\n\n"
        f"**Decision:** {decision}\n"
        f"**Treatment:** {extracted.get('treatment_type', 'N/A')}\n"
        f"**Reasoning:** {reasoning}\n\n"
        f"Is there anything specific you'd like to know? I can explain the decision, "
        f"discuss your benefits, or help you submit a new claim."
    )
