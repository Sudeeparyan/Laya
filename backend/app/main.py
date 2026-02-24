"""
Laya Healthcare AI Claims Chatbot — FastAPI Entry Point

Improvements:
  - SlowAPI rate limiting on chat endpoint
  - Centralized error handlers
  - WebSocket claim status push for real-time updates
"""

import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.models.database import load_data
from app.auth.users import load_users
from app.agents.conversation import load_sessions
from app.routers import chat, members, claims, auth, queue

# ── Rate limiter ─────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load data at startup."""
    print("=" * 60)
    print("  Laya Healthcare AI Claims Chatbot — Starting Up")
    print("=" * 60)
    load_data()
    load_users()
    load_sessions()
    print("[OK] Data loaded. Server ready.")
    print(f"[OK] Rate limit: {settings.RATE_LIMIT_CHAT}")
    print(f"[OK] Max message length: {settings.MAX_MESSAGE_LENGTH}")
    print(f"[OK] API docs at http://localhost:{settings.APP_PORT}/docs")
    print("=" * 60)
    yield
    print("[SHUTDOWN] Server shutting down.")


app = FastAPI(
    title="Laya Healthcare AI Claims Chatbot",
    description=(
        "AI-powered agentic claims processing system for the "
        "Money Smart 20 Family Cash Plan. Routes claims through "
        "Principal → Parent → Child agents using LangGraph.\n\n"
        "**Improvements:** Parallel validation, real-time WebSocket "
        "streaming, LLM-powered child agents, rate limiting, "
        "conversation memory, and input validation."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# Attach rate limiter to the app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(members.router, prefix="/api", tags=["Members"])
app.include_router(claims.router, prefix="/api", tags=["Claims"])
app.include_router(queue.router, prefix="/api", tags=["Queue"])


# ── WebSocket: Claim Status Push ─────────────────────
# Global connection store: member_id -> list of WebSocket connections
claim_status_connections: dict[str, list[WebSocket]] = {}


@app.websocket("/ws/claim-status/{member_id}")
async def claim_status_ws(websocket: WebSocket, member_id: str):
    """WebSocket endpoint for real-time claim status updates to customer portal."""
    await websocket.accept()
    if member_id not in claim_status_connections:
        claim_status_connections[member_id] = []
    claim_status_connections[member_id].append(websocket)
    try:
        while True:
            await websocket.receive_text()  # Keep alive
    except WebSocketDisconnect:
        claim_status_connections[member_id].remove(websocket)
        if not claim_status_connections[member_id]:
            del claim_status_connections[member_id]


async def notify_claim_update(member_id: str, claim_id: str, new_status: str, details: dict):
    """Push a claim status update to all connected customer WebSockets for this member."""
    if member_id in claim_status_connections:
        message = json.dumps({
            "type": "claim_status_update",
            "claim_id": claim_id,
            "member_id": member_id,
            "new_status": new_status,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        dead_connections = []
        for ws in claim_status_connections[member_id]:
            try:
                await ws.send_text(message)
            except Exception:
                dead_connections.append(ws)
        # Clean up dead connections
        for ws in dead_connections:
            claim_status_connections[member_id].remove(ws)


@app.get("/", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Laya Healthcare AI Claims Chatbot",
        "version": "2.0.0",
        "features": [
            "parallel_validation",
            "websocket_streaming",
            "child_agents",
            "rate_limiting",
            "conversation_memory",
        ],
    }
