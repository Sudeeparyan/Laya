"""
Laya Healthcare — User store & auth helpers
JSON-file-backed user database with bcrypt password hashing and JWT tokens.
Supports two roles: 'customer' and 'developer' (operator).
"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt

from app.config import settings

# ── Paths & secrets ──────────────────────────────────
_USERS_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "users_db.json",
)
_JWT_SECRET = settings.JWT_SECRET
_JWT_ALGORITHM = "HS256"
_JWT_EXPIRE_HOURS = 24

# ── In-memory users store ────────────────────────────
_users: dict[str, dict] = {}


# ── Persist helpers ──────────────────────────────────
def _save() -> None:
    with open(_USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(list(_users.values()), f, indent=2, default=str)


def load_users() -> None:
    """Load users from JSON file on startup."""
    global _users
    if os.path.exists(_USERS_FILE):
        with open(_USERS_FILE, "r", encoding="utf-8") as f:
            raw = json.load(f)
        for u in raw:
            _users[u["id"]] = u
        print(f"[AUTH] Loaded {len(_users)} users from {_USERS_FILE}")
    else:
        # Create default developer account
        _seed_defaults()
        print(f"[AUTH] Created default users → {_USERS_FILE}")


def _seed_defaults() -> None:
    """Create a default developer, customer, and test customer account."""
    _register_user(
        email="admin@laya.ie",
        password="admin123",
        first_name="Admin",
        last_name="Developer",
        role="developer",
    )
    _register_user(
        email="customer@laya.ie",
        password="customer123",
        first_name="Demo",
        last_name="Customer",
        role="customer",
        member_id="MEM-1002",
    )
    _register_user(
        email="test@laya.ie",
        password="test123",
        first_name="Liam",
        last_name="O'Connor",
        role="customer",
        member_id="MEM-1001",
    )


# ── Core auth functions ──────────────────────────────
def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _create_token(user: dict) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=_JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, _JWT_SECRET, algorithm=_JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and return token payload, or None if invalid/expired."""
    try:
        return jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def _register_user(
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    role: str = "customer",
    member_id: Optional[str] = None,
) -> dict:
    user_id = str(uuid.uuid4())[:8]
    user = {
        "id": user_id,
        "email": email.lower().strip(),
        "password_hash": _hash_password(password),
        "first_name": first_name,
        "last_name": last_name,
        "role": role,  # 'customer' or 'developer'
        "member_id": member_id,  # linked member for customers
        "avatar_color": _pick_color(first_name),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _users[user_id] = user
    _save()
    return user


def _pick_color(name: str) -> str:
    colors = [
        "#00A99D", "#3498DB", "#E85D4A", "#F5A623",
        "#27AE60", "#9B59B6", "#1ABC9C", "#E74C3C",
    ]
    return colors[sum(ord(c) for c in name) % len(colors)]


# ── Public API ───────────────────────────────────────
def register(
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    role: str = "customer",
    member_id: Optional[str] = None,
) -> dict:
    """Register a new user. Returns user + token or raises ValueError."""
    email = email.lower().strip()

    # Check duplicate
    for u in _users.values():
        if u["email"] == email:
            raise ValueError("Email already registered")

    # Validate role
    if role not in ("customer", "developer"):
        raise ValueError("Role must be 'customer' or 'developer'")

    user = _register_user(email, password, first_name, last_name, role, member_id)
    token = _create_token(user)
    return {**_safe_user(user), "token": token}


def login(email: str, password: str) -> dict:
    """Authenticate user. Returns user + token or raises ValueError."""
    email = email.lower().strip()

    for u in _users.values():
        if u["email"] == email:
            if _verify_password(password, u["password_hash"]):
                token = _create_token(u)
                return {**_safe_user(u), "token": token}
            raise ValueError("Invalid password")

    raise ValueError("Email not found")


def get_user_by_id(user_id: str) -> Optional[dict]:
    u = _users.get(user_id)
    return _safe_user(u) if u else None


def get_all_users() -> list[dict]:
    return [_safe_user(u) for u in _users.values()]


def _safe_user(u: dict) -> dict:
    """Strip password_hash before sending to frontend."""
    return {k: v for k, v in u.items() if k != "password_hash"}
