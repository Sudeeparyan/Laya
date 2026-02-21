"""
Laya Healthcare — Members Router
GET /api/members — List all members
GET /api/members/{member_id} — Get full member record
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.database import get_all_members, get_member_by_id

router = APIRouter()


@router.get("/members")
async def list_members():
    """Return all 20 test members (summary view for sidebar selector)."""
    members = get_all_members()
    return {"members": members, "total": len(members)}


@router.get("/members/{member_id}")
async def get_member(member_id: str):
    """Return full member record with usage stats and claims history."""
    member = get_member_by_id(member_id)
    if member is None:
        raise HTTPException(
            status_code=404,
            detail=f"Member {member_id} not found.",
        )
    # Remove internal fields
    member.pop("_scenario_note", None)
    member.pop("password_hash", None)
    return member
