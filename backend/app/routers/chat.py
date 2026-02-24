"""
Laya Healthcare — Chat Router

POST /api/chat — Process a claim via the LangGraph agent pipeline.
WebSocket /ws/chat — Real-time agent trace streaming with LangGraph astream.

Improvements:
  - Rate limiting via SlowAPI
  - Input validation (max message length, prompt injection guard)
  - WebSocket streaming with LangGraph astream(stream_mode="updates")
  - Multi-turn session support via session_id
"""

from __future__ import annotations

import html
import re

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
import json

from app.config import settings
from app.models.schemas import ClaimRequest, ClaimResponse, CallbackRequestIn, CallbackRequestOut
from app.agents.graph import process_claim, process_claim_streaming
from app.agents.conversation import get_all_user_sessions, get_session
from app.auth.users import decode_token, get_user_by_id
from app.models.database import add_activity, add_callback_request

router = APIRouter()


# ──────────────────────────────────────────────
# Chat history endpoints
# ──────────────────────────────────────────────

@router.get("/chat/history")
async def get_chat_history(request: Request):
    """Return all chat sessions for the authenticated user.
    Used to restore chat history after logout/login."""
    user_context = _extract_user_context(request)
    if not user_context or not user_context.get("user_id"):
        raise HTTPException(status_code=401, detail="Authentication required")

    sessions = get_all_user_sessions(user_context["user_id"])
    return {"sessions": sessions, "total": len(sessions)}


@router.get("/chat/session/{session_id}")
async def get_chat_session(session_id: str, request: Request):
    """Return a specific chat session's messages and context."""
    user_context = _extract_user_context(request)
    if not user_context:
        raise HTTPException(status_code=401, detail="Authentication required")

    session = get_session(session_id)
    return {
        "session_id": session_id,
        "messages": session.get("messages", []),
        "last_claim_context": session.get("last_claim_context", {}),
    }


# ──────────────────────────────────────────────
# Callback request — customer care escalation
# ──────────────────────────────────────────────

@router.post("/callback-request", response_model=CallbackRequestOut)
async def create_callback_request(body: CallbackRequestIn, request: Request):
    """Submit a customer care callback request.
    Available to authenticated customers who need human assistance."""
    user_context = _extract_user_context(request)
    if not user_context:
        raise HTTPException(status_code=401, detail="Authentication required")

    cb_data = body.model_dump()
    cb_data["user_id"] = user_context.get("user_id")
    cb_data["user_email"] = user_context.get("email", "")

    result = add_callback_request(cb_data)

    # Track activity
    add_activity({
        "type": "callback_request",
        "member_id": body.member_id,
        "user_id": user_context.get("user_id"),
        "summary": f"Callback requested: {body.issue_category} ({body.urgency} urgency)",
        "ticket_id": result["ticket_id"],
    })

    return CallbackRequestOut(
        ticket_id=result["ticket_id"],
        status="received",
        message=f"Your callback request has been received. A Laya Healthcare specialist will contact you shortly.",
    )


# ──────────────────────────────────────────────
# Input validation helpers
# ──────────────────────────────────────────────

def _sanitize_input(text: str) -> str:
    """Basic input sanitization: escape HTML, strip control chars."""
    # Remove null bytes and control characters
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    # Escape HTML to prevent XSS in stored traces/responses
    text = html.escape(text, quote=True)
    return text.strip()


def _validate_message(message: str) -> str:
    """Validate and sanitize user message. Raises HTTPException on failure."""
    if not message or not message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if len(message) > settings.MAX_MESSAGE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Message exceeds maximum length of {settings.MAX_MESSAGE_LENGTH} characters",
        )

    return _sanitize_input(message)


def _extract_user_context(request: Request) -> dict | None:
    """Try to extract authenticated user context from the Authorization header.
    Returns user_context dict or None if not authenticated."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload:
        return None
    user = get_user_by_id(payload["sub"])
    if not user:
        return None
    return {
        "user_id": user.get("id"),
        "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "customer"),
        "member_id": user.get("member_id"),
    }


@router.post("/chat", response_model=ClaimResponse)
async def chat_endpoint(request: Request, body: ClaimRequest):
    """Process a healthcare claim through the AI agent pipeline.

    Accepts a user message, member ID, and optional extracted document data.
    Returns the claim decision, reasoning, agent trace, and payout amount.

    Rate limited to prevent abuse ({settings.RATE_LIMIT_CHAT}).
    Input is validated and sanitized before processing.
    """
    try:
        # Rate limiting — get limiter from app state
        limiter: Limiter = request.app.state.limiter
        await limiter._check_request_limit(request, chat_endpoint, [settings.RATE_LIMIT_CHAT])
    except Exception:
        # If rate limiting check fails for any reason, let the request through
        # The SlowAPI middleware will catch actual rate limit violations
        pass

    # Pre-initialize for the finally block's activity tracking
    validated_message = body.message or ""
    user_context = None
    result_decision = None

    try:
        # Validate and sanitize input
        validated_message = _validate_message(body.message)

        # Extract authenticated user context from JWT
        user_context = _extract_user_context(request)

        # Allow frontend-provided user_context as fallback
        if not user_context and body.user_context:
            user_context = body.user_context

        # Build extracted_doc dict from the request
        extracted_doc = None
        if body.extracted_document_data:
            extracted_doc = body.extracted_document_data.model_dump()

        # For customer users, enforce they can only query their own member_id
        if user_context and user_context.get("role") == "customer":
            linked_member = user_context.get("member_id")
            if linked_member and body.member_id != linked_member:
                raise HTTPException(
                    status_code=403,
                    detail=f"Access denied: you can only access your own member data ({linked_member})",
                )

        # Run the claim through the agent graph with user context and session
        result = await process_claim(
            member_id=body.member_id,
            user_message=validated_message,
            extracted_doc=extracted_doc,
            user_context=user_context,
            session_id=body.session_id,
        )

        # For customer-submitted claims that are PENDING, return a friendly message
        result_decision = result.get("decision", "PENDING")
        result_reasoning = result.get("reasoning", "Processing complete.")
        user_role = user_context.get("role", "customer") if user_context else "customer"

        if result_decision == "PENDING" and user_role == "customer":
            treatment_type = ""
            treatment_date = ""
            total_cost = 0.0
            if extracted_doc:
                treatment_type = extracted_doc.get("treatment_type", "")
                treatment_date = extracted_doc.get("treatment_date", "")
                total_cost = extracted_doc.get("total_cost", 0.0)

            user_first_name = user_context.get("first_name", "") if user_context else ""
            greeting = f"Hi {user_first_name}, your" if user_first_name else "Your"

            result_reasoning = (
                f"✅ **Claim Submitted Successfully**\n\n"
                f"{greeting} claim has been received and is now **under review** by our claims team.\n\n"
                f"**Claim Details:**\n"
                f"- **Treatment:** {treatment_type or 'N/A'}\n"
                f"- **Date:** {treatment_date or 'N/A'}\n"
                f"- **Amount:** €{total_cost:.2f}\n\n"
                f"You will be notified once a decision has been made. "
                f"Typical processing time is under 24 hours.\n\n"
                f"_If you have questions about your claim, just ask me here._"
            )

        return ClaimResponse(
            decision=result_decision,
            reasoning=result_reasoning,
            agent_trace=result.get("agent_trace", []),
            payout_amount=result.get("payout_amount"),
            flags=result.get("flags", []),
            needs_info=result.get("needs_info", []),
            session_id=result.get("session_id"),
            source_url="https://www.layahealthcare.ie/api/document/dynamic/ipid?id=65&asOnDate=2026-02-24",
        )

    except HTTPException:
        raise  # Re-raise HTTP exceptions (403, 400, etc.) as-is
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing claim: {str(e)}",
        )
    finally:
        # Track activity for developer monitoring (best-effort)
        try:
            user_name = ""
            user_role = "customer"
            if user_context:
                user_name = user_context.get("name", "")
                user_role = user_context.get("role", "customer")
            add_activity({
                "type": "chat_message",
                "member_id": body.member_id,
                "user_name": user_name,
                "user_role": user_role,
                "description": f"Sent message: {validated_message[:80]}{'...' if len(validated_message) > 80 else ''}",
                "details": {
                    "message": validated_message[:200],
                    "has_document": body.extracted_document_data is not None,
                    "decision": result_decision,
                    "session_id": body.session_id,
                },
            })
        except Exception:
            pass  # Activity tracking is best-effort


@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """WebSocket endpoint for real-time agent trace streaming.

    Uses LangGraph's astream(stream_mode="updates") to yield
    node-by-node updates as each agent completes processing.

    The client sends a JSON message with the claim request.
    The server streams back individual agent updates in real-time,
    followed by a final result message.

    Message types:
      - status: processing started
      - node_update: a single agent node completed
      - result: final aggregated result
      - error: something went wrong
    """
    await websocket.accept()
    try:
        while True:
            # Receive claim request
            data = await websocket.receive_text()
            request_data = json.loads(data)

            member_id = request_data.get("member_id", "")
            message = request_data.get("message", "")
            extracted_doc = request_data.get("extracted_document_data")
            session_id = request_data.get("session_id")

            # Validate message length
            if len(message) > settings.MAX_MESSAGE_LENGTH:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Message exceeds maximum length of {settings.MAX_MESSAGE_LENGTH} characters",
                })
                continue

            if not message.strip():
                await websocket.send_json({
                    "type": "error",
                    "message": "Message cannot be empty",
                })
                continue

            # Sanitize input
            message = _sanitize_input(message)

            # Send processing start
            await websocket.send_json({
                "type": "status",
                "agent": "System",
                "message": "Processing claim through agent pipeline...",
            })

            # Stream agent updates in real-time using LangGraph astream
            final_result = {}
            all_traces = []

            async for update in process_claim_streaming(
                member_id=member_id,
                user_message=message,
                extracted_doc=extracted_doc,
                user_context=request_data.get("user_context"),
                session_id=session_id,
            ):
                node_name = update.get("node_name", "")
                traces = update.get("agent_trace", [])
                all_traces.extend(traces)

                # Stream each trace entry as it happens
                for trace_entry in traces:
                    agent_name = trace_entry.split("→")[0].strip() if "→" in trace_entry else node_name
                    await websocket.send_json({
                        "type": "node_update",
                        "node": node_name,
                        "agent": agent_name,
                        "message": trace_entry,
                        "current_agent": update.get("current_agent", ""),
                    })

                # Track final result from the last node (decision_node)
                if update.get("decision"):
                    final_result = update

            # Send final aggregated result
            await websocket.send_json({
                "type": "result",
                "decision": final_result.get("decision", "PENDING"),
                "reasoning": final_result.get("reasoning", ""),
                "payout_amount": final_result.get("payout_amount", 0),
                "agent_trace": all_traces,
                "flags": final_result.get("flags", []),
                "needs_info": final_result.get("needs_info", []),
                "session_id": final_result.get("session_id"),
            })

    except WebSocketDisconnect:
        pass
    except json.JSONDecodeError:
        await websocket.send_json({
            "type": "error",
            "message": "Invalid JSON format",
        })
    except Exception as e:
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"Error: {str(e)}",
            })
        except Exception:
            pass  # WebSocket may already be closed
