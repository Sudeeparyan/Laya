"""
Laya Healthcare AI Claims Chatbot — FastAPI Entry Point

Improvements:
  - SlowAPI rate limiting on chat endpoint
  - Centralized error handlers
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.models.database import load_data
from app.auth.users import load_users
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
