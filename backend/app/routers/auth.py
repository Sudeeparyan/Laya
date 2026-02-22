"""
Laya Healthcare — Auth Router
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional

from app.auth.users import register, login, decode_token, get_user_by_id

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── Schemas ──────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    role: str = "customer"
    member_id: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


# ── Dependency: extract current user from Authorization header ──
async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = auth_header.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token expired or invalid")
    user = get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_developer(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "developer":
        raise HTTPException(status_code=403, detail="Developer access required")
    return user


# ── Endpoints ────────────────────────────────────────
@router.post("/register")
async def register_endpoint(req: RegisterRequest):
    try:
        result = register(
            email=req.email,
            password=req.password,
            first_name=req.first_name,
            last_name=req.last_name,
            role=req.role,
            member_id=req.member_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login_endpoint(req: LoginRequest):
    try:
        result = login(email=req.email, password=req.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me")
async def me_endpoint(user: dict = Depends(get_current_user)):
    return user
