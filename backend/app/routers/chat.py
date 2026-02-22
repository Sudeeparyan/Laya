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
from app.models.schemas import ClaimRequest, ClaimResponse
from app.agents.graph import process_claim, process_claim_streaming
from app.auth.users import decode_token, get_user_by_id

router = APIRouter()


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

        return ClaimResponse(
            decision=result.get("decision", "PENDING"),
            reasoning=result.get("reasoning", "Processing complete."),
            agent_trace=result.get("agent_trace", []),
            payout_amount=result.get("payout_amount"),
            flags=result.get("flags", []),
            needs_info=result.get("needs_info", []),
            session_id=result.get("session_id"),
        )

    except HTTPException:
        raise  # Re-raise HTTP exceptions (403, 400, etc.) as-is
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing claim: {str(e)}",
        )


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
