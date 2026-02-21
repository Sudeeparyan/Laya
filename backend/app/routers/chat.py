"""
Laya Healthcare — Chat Router
POST /api/chat — Process a claim via the LangGraph agent pipeline.
WebSocket /ws/chat — Real-time agent trace streaming (future).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
import json

from app.models.schemas import ClaimRequest, ClaimResponse
from app.agents.graph import process_claim

router = APIRouter()


@router.post("/chat", response_model=ClaimResponse)
async def chat_endpoint(request: ClaimRequest):
    """Process a healthcare claim through the AI agent pipeline.

    Accepts a user message, member ID, and optional extracted document data.
    Returns the claim decision, reasoning, agent trace, and payout amount.
    """
    try:
        # Build extracted_doc dict from the request
        extracted_doc = None
        if request.extracted_document_data:
            extracted_doc = request.extracted_document_data.model_dump()

        # Run the claim through the agent graph
        result = await process_claim(
            member_id=request.member_id,
            user_message=request.message,
            extracted_doc=extracted_doc,
        )

        return ClaimResponse(
            decision=result.get("decision", "PENDING"),
            reasoning=result.get("reasoning", "Processing complete."),
            agent_trace=result.get("agent_trace", []),
            payout_amount=result.get("payout_amount"),
            flags=result.get("flags", []),
            needs_info=result.get("needs_info", []),
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing claim: {str(e)}",
        )


@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """WebSocket endpoint for real-time agent trace streaming.

    The client sends a JSON message with the claim request.
    The server streams back agent trace updates as they happen.
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

            # Send processing start
            await websocket.send_json({
                "type": "status",
                "agent": "System",
                "message": "Processing claim...",
            })

            # Process the claim
            result = await process_claim(
                member_id=member_id,
                user_message=message,
                extracted_doc=extracted_doc,
            )

            # Stream agent trace entries
            for i, trace_entry in enumerate(result.get("agent_trace", [])):
                await websocket.send_json({
                    "type": "trace",
                    "step": i + 1,
                    "agent": trace_entry.split("→")[0].strip() if "→" in trace_entry else "Agent",
                    "message": trace_entry,
                })

            # Send final result
            await websocket.send_json({
                "type": "result",
                "decision": result.get("decision", "PENDING"),
                "reasoning": result.get("reasoning", ""),
                "payout_amount": result.get("payout_amount", 0),
                "agent_trace": result.get("agent_trace", []),
                "flags": result.get("flags", []),
                "needs_info": result.get("needs_info", []),
            })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": f"Error: {str(e)}",
        })
