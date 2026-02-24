"""
Laya Healthcare AI Claims Chatbot — LangGraph Compiled State Graph
The main graph that orchestrates all agent nodes with conditional routing.

Architecture improvements:
  - Parallel validation: Intake + Eligibility run concurrently via asyncio.gather
  - Conversation memory: Session-based multi-turn support
  - Real-time streaming: Graph supports astream for WebSocket streaming
  - Child agents: All parent nodes invoke LLM-powered child agents

Flow:
  START → setup_node → parallel_validation_node → principal_node →
  (outpatient|hospital|exceptions) → decision_node → END
"""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime

from langgraph.graph import StateGraph, END

from app.agents.state import ClaimState
from app.agents.parent_1_intake import intake_node
from app.agents.principal_agent import principal_node
from app.agents.parent_2_eligibility import eligibility_node
from app.agents.parent_3_outpatient import outpatient_node
from app.agents.parent_4_hospital import hospital_node
from app.agents.parent_5_exceptions import exceptions_node
from app.agents.message_parser import build_extracted_doc_from_message
from app.agents.conversation import (
    get_session,
    get_messages,
    get_last_claim_context,
    add_message,
    save_claim_context,
    is_follow_up,
    handle_follow_up,
    link_session_to_user,
)
from app.models.database import get_member_by_id, update_usage, add_claim_to_history


# ──────────────────────────────────────────────
# Helper: Initial setup node
# ──────────────────────────────────────────────

def setup_node(state: ClaimState) -> dict:
    """Load member data from the database and prepare initial state."""
    member_id = state.get("member_id", "")
    extracted_doc = state.get("extracted_doc", {})
    user_context = state.get("user_context", {})

    # Try to get member_id from extracted doc if not provided at top level
    if not member_id and extracted_doc:
        member_id = extracted_doc.get("member_id", "")

    # For authenticated customers, auto-resolve member_id from their account
    if not member_id and user_context and user_context.get("member_id"):
        member_id = user_context["member_id"]

    member_data = get_member_by_id(member_id)

    if member_data is None:
        return {
            "agent_trace": [f"Setup → ERROR: Member {member_id} not found in database"],
            "decision": "REJECTED",
            "reasoning": f"Member ID '{member_id}' was not found in the Laya Healthcare database. Please verify your membership number.",
            "payout_amount": 0.0,
            "current_agent": "Setup",
        }

    # Clean internal fields
    member_data.pop("_scenario_note", None)
    member_data.pop("password_hash", None)

    # ── Auto-populate extracted_doc from user message if missing/incomplete ──
    user_message = state.get("user_message", "")
    extracted_doc = state.get("extracted_doc", {})
    if not extracted_doc.get("treatment_type", "").strip():
        enriched_doc = build_extracted_doc_from_message(user_message, member_data, extracted_doc)
        if enriched_doc.get("treatment_type"):
            extracted_doc = enriched_doc

    # Build a personalized greeting trace if we know the user
    user_name = user_context.get("name", "") if user_context else ""
    member_name = f"{member_data.get('first_name', '')} {member_data.get('last_name', '')}".strip()
    if user_name:
        trace_msg = f"Setup → Authenticated user: {user_name} ({user_context.get('role', 'customer')}) | Member {member_id} ({member_name}) loaded"
    else:
        trace_msg = f"Setup → Member {member_id} ({member_name}) loaded"

    result = {
        "member_data": member_data,
        "member_id": member_id,
        "agent_trace": [trace_msg],
        "current_agent": "Setup",
    }
    # Include the enriched extracted_doc if we populated it
    if extracted_doc and extracted_doc.get("treatment_type"):
        result["extracted_doc"] = extracted_doc
        result["agent_trace"].append(
            f"Setup → Inferred from message: {extracted_doc['treatment_type']} "
            f"(date: {extracted_doc.get('treatment_date', 'N/A')}, "
            f"cost: EUR {extracted_doc.get('total_cost', 0):.2f})"
        )
    return result


# ──────────────────────────────────────────────
# Parallel validation node: runs intake + eligibility concurrently
# ──────────────────────────────────────────────

async def parallel_validation_node(state: ClaimState) -> dict:
    """Run intake and eligibility checks in parallel for maximum throughput.

    This implements the ParallelAgent concept from the architecture docs:
    - Identity validation (intake) runs concurrently with
    - Temporal validation (eligibility)
    Results are merged and the first failure terminates early.
    """
    trace_entries = ["Parallel Validator → Running intake & eligibility checks concurrently..."]

    # Run both checks concurrently using asyncio.gather
    intake_result, eligibility_result = await asyncio.gather(
        intake_node(state),
        eligibility_node(state),
    )

    # Merge trace entries from both (preserving order: intake first, then eligibility)
    trace_entries.extend(intake_result.get("agent_trace", []))
    trace_entries.extend(eligibility_result.get("agent_trace", []))
    trace_entries.append("Parallel Validator → Both checks completed ✓")

    # Build merged result
    merged: dict = {
        "agent_trace": trace_entries,
        "current_agent": "Parallel Validator",
    }

    # Check for intake failures first (document issues take priority)
    intake_decision = intake_result.get("decision", "")
    eligibility_decision = eligibility_result.get("decision", "")

    if intake_decision in ("ACTION REQUIRED", "REJECTED"):
        merged["decision"] = intake_decision
        merged["reasoning"] = intake_result.get("reasoning", "")
        merged["payout_amount"] = intake_result.get("payout_amount", 0.0)
        if intake_result.get("needs_info"):
            merged["needs_info"] = intake_result["needs_info"]
        return merged

    if eligibility_decision == "REJECTED":
        merged["decision"] = eligibility_decision
        merged["reasoning"] = eligibility_result.get("reasoning", "")
        merged["payout_amount"] = eligibility_result.get("payout_amount", 0.0)
        return merged

    # Both passed — merge flags from eligibility
    if eligibility_result.get("flags"):
        merged["flags"] = eligibility_result["flags"]

    # Preserve extracted_doc and member_data from intake
    if intake_result.get("extracted_doc"):
        merged["extracted_doc"] = intake_result["extracted_doc"]
    if intake_result.get("member_data"):
        merged["member_data"] = intake_result["member_data"]

    return merged


# ──────────────────────────────────────────────
# Decision node: final aggregation
# ──────────────────────────────────────────────

def decision_node(state: ClaimState) -> dict:
    """Aggregate all state into a final claim decision and update the database."""
    decision = state.get("decision", "")
    reasoning = state.get("reasoning", "")
    payout = state.get("payout_amount", 0.0)
    member_id = state.get("member_id", "")
    extracted_doc = state.get("extracted_doc", {})
    treatment_type = extracted_doc.get("treatment_type", "")
    flags = state.get("flags", [])
    user_context = state.get("user_context", {})

    trace_entries = []

    # Personalize greeting for authenticated users
    user_name = user_context.get("first_name", "") if user_context else ""

    if decision:
        # Decision was already made by a previous agent
        trace_entries.append(f"Decision Agent → Final: {decision}" + (f" (€{payout:.2f})" if payout else ""))
    else:
        # No explicit decision was made — default to approved
        decision = "APPROVED"
        reasoning = "All checks passed. Claim approved for processing."
        payout = 0.0
        trace_entries.append("Decision Agent → Default: APPROVED (all checks passed)")

    # Personalize the reasoning for authenticated users
    if user_name and user_context.get("role") == "customer" and reasoning:
        # Add a friendly, personal prefix for customers
        first_char = reasoning[0]
        rest = reasoning[1:] if len(reasoning) > 1 else ""
        if first_char.isalpha():
            reasoning = f"Hi {user_name}, {first_char.lower()}{rest}"
        else:
            reasoning = f"Hi {user_name}, {reasoning}"

    # Handle PENDING_THRESHOLD flag: if claim was approved but below quarterly threshold,
    # override to PENDING and adjust reasoning
    original_ai_decision = decision  # Capture before any PENDING overrides
    if "PENDING_THRESHOLD" in flags and decision == "APPROVED":
        usage = state.get("member_data", {}).get("current_year_usage", {})
        accumulated = usage.get("q_accumulated_receipts", 0.0)
        total_cost = extracted_doc.get("total_cost", 0.0)
        new_total = accumulated + total_cost
        decision = "PENDING"
        reasoning = (
            f"{reasoning}\n\n"
            f"**Note:** Your claim is valid and approved, but your accumulated receipts this quarter total "
            f"€{new_total:.2f}, which is below the €150 quarterly threshold. "
            f"Payment of €{payout:.2f} will be released once the threshold is met."
        )
        trace_entries.append(
            f"Decision Agent → Threshold pending: €{new_total:.2f}/€150.00 — payment held"
        )

    # ── Update the Database after a successful claim ──
    # Determine if this is a customer-submitted claim
    user_role = user_context.get("role", "customer") if user_context else "customer"
    # Capture the original AI decision BEFORE any PENDING overrides
    # (PENDING_THRESHOLD may have already changed decision to PENDING above)
    ai_decision = original_ai_decision  # Set earlier, before threshold override
    ai_reasoning = reasoning
    ai_payout = payout

    # Build deferred usage updates (applied immediately for developers, deferred for customers)
    deferred_usage_updates = []
    if ai_decision in ("APPROVED", "PARTIALLY APPROVED") and member_id:
        usage_field_map = {
            "GP & A&E": "gp_visits_count",
            "Consultant Fee": "consultant_visits_count",
            "Prescription": "prescription_count",
            "Dental & Optical": "dental_optical_count",
            "Day to Day Therapy": "therapy_count",
            "Scan Cover": "scan_count",
        }
        usage_field = usage_field_map.get(treatment_type)
        if usage_field:
            deferred_usage_updates.append({"field": usage_field, "increment": 1})

        hospital_days = extracted_doc.get("hospital_days", 0)
        if hospital_days and treatment_type == "Hospital In-patient":
            approved_days = hospital_days
            if ai_decision == "PARTIALLY APPROVED":
                member_data = state.get("member_data", {})
                days_used = member_data.get("current_year_usage", {}).get("hospital_days_count", 0)
                approved_days = min(hospital_days, 40 - days_used)
            deferred_usage_updates.append({"field": "hospital_days_count", "increment": approved_days})

        total_cost = extracted_doc.get("total_cost", 0.0)
        if total_cost > 0:
            deferred_usage_updates.append({"field": "q_accumulated_receipts", "increment": total_cost})

    # For customer-submitted claims, set status to PENDING (human review required)
    # Usage updates are DEFERRED — only applied when developer approves
    if user_role == "customer" and decision in ("APPROVED", "REJECTED", "PARTIALLY APPROVED"):
        original_decision = decision
        decision = "PENDING"
        trace_entries.append(
            f"Decision Agent → Customer claim: AI recommends {original_decision}, setting status to PENDING for human review"
        )
        trace_entries.append(
            f"Decision Agent → Usage updates deferred until human review approval"
        )
    else:
        # Developer/non-customer claims: apply usage updates immediately
        for upd in deferred_usage_updates:
            update_usage(member_id, upd["field"], upd["increment"])
            trace_entries.append(f"Decision Agent → DB Updated: {upd['field']} +{upd['increment']}")
        deferred_usage_updates = []  # Clear since they've been applied

    # Always add to claims history (including PENDING)
    if member_id and extracted_doc.get("treatment_type"):
        # Add to claims history
        claim_record = {
            "claim_id": f"CLM-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "treatment_type": treatment_type,
            "treatment_date": extracted_doc.get("treatment_date", ""),
            "claimed_amount": extracted_doc.get("total_cost", 0.0),
            "approved_amount": ai_payout if ai_decision in ("APPROVED", "PARTIALLY APPROVED") else 0,
            "status": decision,
            "practitioner_name": extracted_doc.get("practitioner_name", ""),
            "submitted_date": datetime.now().strftime("%Y-%m-%d"),
            "ai_recommendation": ai_decision,
            "ai_reasoning": ai_reasoning,
            "ai_confidence": 0.95 if ai_decision in ("APPROVED", "REJECTED") else 0.70,
            "ai_payout_amount": ai_payout,
            "ai_flags": flags,
            "deferred_usage_updates": deferred_usage_updates,  # Applied when dev approves
        }
        add_claim_to_history(member_id, claim_record)
        trace_entries.append(f"Decision Agent → Claim {claim_record['claim_id']} recorded in history")

    # Save to conversation session for multi-turn support
    session_id = state.get("session_id", "")
    if session_id:
        add_message(session_id, "user", state.get("user_message", ""))
        add_message(session_id, "assistant", reasoning,
                    decision=decision, payout_amount=payout)
        # Persist full claim context so follow-ups can reference it
        save_claim_context(session_id, {
            "member_id": member_id,
            "member_data": state.get("member_data", {}),
            "extracted_doc": extracted_doc,
            "decision": decision,
            "reasoning": reasoning,
            "payout_amount": payout,
            "agent_trace": state.get("agent_trace", []),
            "flags": flags,
        })

    return {
        "decision": decision,
        "reasoning": reasoning,
        "payout_amount": payout,
        "current_agent": "Decision Agent",
        "agent_trace": trace_entries,
    }


# ──────────────────────────────────────────────
# Routing functions
# ──────────────────────────────────────────────

def route_after_parallel_validation(state: ClaimState) -> str:
    """After parallel validation, check if there was a failure or continue to principal."""
    decision = state.get("decision", "")
    if decision in ("ACTION REQUIRED", "REJECTED"):
        return "decision_node"
    return "principal_node"


def route_after_principal(state: ClaimState) -> str:
    """Route from principal agent to the correct treatment-specific parent agent."""
    route = state.get("route", "outpatient")
    route_map = {
        "outpatient": "outpatient_node",
        "hospital": "hospital_node",
        "exceptions": "exceptions_node",
    }
    return route_map.get(route, "outpatient_node")


def route_after_setup(state: ClaimState) -> str:
    """After setup, check if member was found."""
    decision = state.get("decision", "")
    if decision == "REJECTED":
        return "decision_node"
    return "parallel_validation_node"


# ──────────────────────────────────────────────
# Build the graph
# ──────────────────────────────────────────────

def build_graph() -> StateGraph:
    """Construct and compile the LangGraph state graph.

    Flow: setup → parallel_validation (intake||eligibility) → principal → treatment → decision
    """
    graph = StateGraph(ClaimState)

    # Add nodes
    graph.add_node("setup_node", setup_node)
    graph.add_node("parallel_validation_node", parallel_validation_node)
    graph.add_node("principal_node", principal_node)
    graph.add_node("outpatient_node", outpatient_node)
    graph.add_node("hospital_node", hospital_node)
    graph.add_node("exceptions_node", exceptions_node)
    graph.add_node("decision_node", decision_node)

    # Set entry point
    graph.set_entry_point("setup_node")

    # Define edges: setup → parallel_validation → principal → (treatment) → decision
    graph.add_conditional_edges("setup_node", route_after_setup, {
        "decision_node": "decision_node",
        "parallel_validation_node": "parallel_validation_node",
    })

    graph.add_conditional_edges("parallel_validation_node", route_after_parallel_validation, {
        "decision_node": "decision_node",
        "principal_node": "principal_node",
    })

    graph.add_conditional_edges("principal_node", route_after_principal, {
        "outpatient_node": "outpatient_node",
        "hospital_node": "hospital_node",
        "exceptions_node": "exceptions_node",
    })

    # All processing agents → decision_node
    graph.add_edge("outpatient_node", "decision_node")
    graph.add_edge("hospital_node", "decision_node")
    graph.add_edge("exceptions_node", "decision_node")

    # Decision → END
    graph.add_edge("decision_node", END)

    return graph


# Compile the graph
claim_graph = build_graph().compile()


async def process_claim(
    member_id: str,
    user_message: str,
    extracted_doc: dict | None = None,
    user_context: dict | None = None,
    session_id: str | None = None,
) -> dict:
    """Run a claim through the full agent pipeline.

    Args:
        member_id: The member's ID (e.g. MEM-1002)
        user_message: The user's chat message
        extracted_doc: OCR/mock document data
        user_context: Authenticated user info { name, email, role, member_id, user_id }
        session_id: Optional session ID for multi-turn conversation support

    Returns a dict with: decision, reasoning, agent_trace, payout_amount, flags, needs_info, session_id
    """
    # Generate session_id if not provided (for multi-turn support)
    if not session_id:
        session_id = str(uuid.uuid4())[:12]

    # Link session to user for chat history retrieval
    if user_context and user_context.get("user_id"):
        link_session_to_user(session_id, user_context["user_id"])

    # ── Follow-up detection ──
    # If the user is asking a follow-up question (not a new claim),
    # use the conversation manager instead of re-running the full pipeline.
    if is_follow_up(user_message, session_id):
        return await handle_follow_up(
            user_message=user_message,
            session_id=session_id,
            member_id=member_id,
        )

    # ── New claim: run the full agent pipeline ──
    # Load conversation history for context
    conversation_history = get_messages(session_id)

    # If no extracted_doc was provided, check if the previous claim in this
    # session had one — allows follow-up claims to reuse document context
    if not extracted_doc:
        prev_ctx = get_last_claim_context(session_id)
        prev_doc = prev_ctx.get("extracted_doc", {})
        # Only reuse if the member matches and the doc has real data
        if prev_doc.get("treatment_type") and prev_ctx.get("member_id") == member_id:
            # Don't auto-reuse — the user is sending a new claim without a doc,
            # let the message parser handle inference
            pass

    initial_state: ClaimState = {
        "messages": [],
        "member_id": member_id,
        "member_data": {},
        "user_context": user_context or {},
        "extracted_doc": extracted_doc or {},
        "user_message": user_message,
        "session_id": session_id,
        "conversation_history": conversation_history,
        "current_agent": "",
        "agent_trace": [],
        "route": "",
        "decision": "",
        "reasoning": "",
        "payout_amount": 0.0,
        "flags": [],
        "needs_info": [],
    }

    # Run the graph
    result = await claim_graph.ainvoke(initial_state)

    return {
        "decision": result.get("decision", "PENDING"),
        "reasoning": result.get("reasoning", "Processing complete."),
        "agent_trace": result.get("agent_trace", []),
        "payout_amount": result.get("payout_amount", 0.0),
        "flags": result.get("flags", []),
        "needs_info": result.get("needs_info", []),
        "session_id": session_id,
    }


async def process_claim_streaming(
    member_id: str,
    user_message: str,
    extracted_doc: dict | None = None,
    user_context: dict | None = None,
    session_id: str | None = None,
):
    """Run a claim through the pipeline and yield streaming updates.

    Yields dicts with {type, node_name, data} for each node completion.
    Used by the WebSocket endpoint for real-time agent trace streaming.
    """
    if not session_id:
        session_id = str(uuid.uuid4())[:12]

    # Link session to user for chat history retrieval
    if user_context and user_context.get("user_id"):
        link_session_to_user(session_id, user_context["user_id"])

    # Follow-up detection for streaming too
    if is_follow_up(user_message, session_id):
        result = await handle_follow_up(
            user_message=user_message,
            session_id=session_id,
            member_id=member_id,
        )
        yield {
            "type": "node_update",
            "node_name": "conversation_agent",
            "agent_trace": result.get("agent_trace", []),
            "current_agent": "Conversation Agent",
            "decision": result.get("decision", ""),
            "reasoning": result.get("reasoning", ""),
            "payout_amount": result.get("payout_amount", 0.0),
            "flags": result.get("flags", []),
            "needs_info": [],
            "session_id": session_id,
        }
        return

    conversation_history = get_messages(session_id)

    initial_state: ClaimState = {
        "messages": [],
        "member_id": member_id,
        "member_data": {},
        "user_context": user_context or {},
        "extracted_doc": extracted_doc or {},
        "user_message": user_message,
        "session_id": session_id,
        "conversation_history": conversation_history,
        "current_agent": "",
        "agent_trace": [],
        "route": "",
        "decision": "",
        "reasoning": "",
        "payout_amount": 0.0,
        "flags": [],
        "needs_info": [],
    }

    # Stream updates as each node completes
    async for event in claim_graph.astream(initial_state, stream_mode="updates"):
        for node_name, node_output in event.items():
            traces = node_output.get("agent_trace", [])
            yield {
                "type": "node_update",
                "node_name": node_name,
                "agent_trace": traces,
                "current_agent": node_output.get("current_agent", ""),
                "decision": node_output.get("decision", ""),
                "reasoning": node_output.get("reasoning", ""),
                "payout_amount": node_output.get("payout_amount", 0.0),
                "flags": node_output.get("flags", []),
                "needs_info": node_output.get("needs_info", []),
                "session_id": session_id,
            }
