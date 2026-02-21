"""
Laya Healthcare AI Claims Chatbot — FastAPI Entry Point
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models.database import load_data
from app.routers import chat, members, claims


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load data at startup."""
    print("=" * 60)
    print("  Laya Healthcare AI Claims Chatbot — Starting Up")
    print("=" * 60)
    load_data()
    print("[OK] Data loaded. Server ready.")
    print(f"[OK] API docs at http://localhost:{settings.APP_PORT}/docs")
    print("=" * 60)
    yield
    print("[SHUTDOWN] Server shutting down.")


app = FastAPI(
    title="Laya Healthcare AI Claims Chatbot",
    description=(
        "AI-powered agentic claims processing system for the "
        "Money Smart 20 Family Cash Plan. Routes claims through "
        "Principal → Parent → Child agents using LangGraph."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(members.router, prefix="/api", tags=["Members"])
app.include_router(claims.router, prefix="/api", tags=["Claims"])


@app.get("/", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Laya Healthcare AI Claims Chatbot",
        "version": "1.0.0",
    }
