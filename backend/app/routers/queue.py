"""
Laya Healthcare — Developer Claims Queue Router

GET  /api/queue/claims     — All claims across all members (developer dashboard)
GET  /api/queue/analytics  — Summary stats for dashboard cards
POST /api/queue/review     — Developer submits final human decision on a claim
POST /api/queue/ai-analyze — Run AI analysis on a specific claim for developer review
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel

from app.models.database import (
    get_all_members,
    get_member_by_id,
    get_claims_history,
    add_claim_to_history,
    update_usage,
)
from app.routers.auth import require_developer
from app.agents.graph import process_claim

router = APIRouter(prefix="/queue", tags=["Queue"])


# ── Schemas ──────────────────────────────────────────
class ReviewRequest(BaseModel):
    claim_id: str
    member_id: str
    decision: str  # APPROVED, REJECTED, ESCALATED
    reviewer_notes: Optional[str] = None
    payout_amount: Optional[float] = None


class AIAnalyzeRequest(BaseModel):
    member_id: str
    message: str
    treatment_type: Optional[str] = None
    treatment_date: Optional[str] = None
    practitioner_name: Optional[str] = None
    total_cost: Optional[float] = None


# ── Endpoints ────────────────────────────────────────

@router.get("/claims")
async def get_all_claims(user: dict = Depends(require_developer)):
    """Return ALL claims across all members for the developer queue dashboard.
    Enriches each claim with member name, scheme, and status info."""
    all_claims = []
    members = get_all_members()

    for member_summary in members:
        mid = member_summary["member_id"]
        member = get_member_by_id(mid)
        if not member:
            continue

        claims = member.get("claims_history", [])
        usage = member.get("current_year_usage", {})

        for claim in claims:
            all_claims.append({
                **claim,
                "member_id": mid,
                "member_name": f"{member['first_name']} {member['last_name']}",
                "scheme_name": member.get("scheme_name", ""),
                "policy_start_date": member.get("policy_start_date", ""),
                "member_status": member.get("status", "Active"),
                "q_accumulated_receipts": usage.get("q_accumulated_receipts", 0),
            })

    # Sort by treatment_date descending (newest first)
    all_claims.sort(key=lambda c: c.get("treatment_date", ""), reverse=True)
    return {"claims": all_claims, "total": len(all_claims)}


@router.get("/analytics")
async def get_analytics(user: dict = Depends(require_developer)):
    """Return dashboard analytics for the developer view."""
    members = get_all_members()
    total_members = len(members)

    total_claims = 0
    approved = 0
    rejected = 0
    pending = 0
    escalated = 0
    total_payout = 0.0
    claim_types = {}
    member_risk_scores = []

    for member_summary in members:
        mid = member_summary["member_id"]
        member = get_member_by_id(mid)
        if not member:
            continue

        claims = member.get("claims_history", [])
        usage = member.get("current_year_usage", {})
        total_claims += len(claims)

        # Risk scoring based on usage proximity to limits
        risk_score = 0
        if usage.get("scan_count", 0) >= 8:
            risk_score += 30
        if usage.get("hospital_days_count", 0) >= 35:
            risk_score += 30
        if usage.get("gp_visits_count", 0) >= 8:
            risk_score += 15
        if usage.get("q_accumulated_receipts", 0) >= 130:
            risk_score += 10
        # New policy = higher risk for waiting period issues
        policy_start = member.get("policy_start_date", "")
        if policy_start >= "2026-01-01":
            risk_score += 15

        member_risk_scores.append({
            "member_id": mid,
            "member_name": f"{member['first_name']} {member['last_name']}",
            "risk_score": min(risk_score, 100),
            "total_claims": len(claims),
            "scheme_name": member.get("scheme_name", ""),
        })

        for claim in claims:
            status = claim.get("status", "").lower()
            if "approved" in status:
                approved += 1
                total_payout += claim.get("claimed_amount", 0)
            elif "rejected" in status:
                rejected += 1
            elif "pending" in status:
                pending += 1
            elif "escalated" in status:
                escalated += 1

            # Count by type
            ctype = claim.get("treatment_type", "Other")
            claim_types[ctype] = claim_types.get(ctype, 0) + 1

    # Sort risk scores descending
    member_risk_scores.sort(key=lambda x: x["risk_score"], reverse=True)

    return {
        "total_members": total_members,
        "total_claims": total_claims,
        "approved": approved,
        "rejected": rejected,
        "pending": pending,
        "escalated": escalated,
        "total_payout": total_payout,
        "claim_types": claim_types,
        "avg_processing_time": 2.3,  # seconds (mock for demo)
        "ai_accuracy": 96.5,  # percent (mock for demo)
        "member_risk_scores": member_risk_scores[:10],  # Top 10 risky members
    }


@router.post("/ai-analyze")
async def ai_analyze_claim(body: AIAnalyzeRequest, user: dict = Depends(require_developer)):
    """Run the AI pipeline on a claim and return the analysis for developer review.
    The developer sees the AI recommendation but makes the final decision."""
    try:
        # Build extracted document data if available
        extracted_doc = None
        if body.treatment_type:
            extracted_doc = {
                "member_id": body.member_id,
                "patient_name": "",
                "form_type": "Money Smart Out-patient Claim Form",
                "treatment_type": body.treatment_type,
                "treatment_date": body.treatment_date or "",
                "practitioner_name": body.practitioner_name or "",
                "total_cost": body.total_cost or 0.0,
                "signature_present": True,
            }

        result = await process_claim(
            member_id=body.member_id,
            user_message=body.message,
            extracted_doc=extracted_doc,
            user_context={
                "user_id": user.get("id"),
                "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
                "role": "developer",
            },
        )

        return {
            "ai_decision": result.get("decision", "PENDING"),
            "ai_reasoning": result.get("reasoning", ""),
            "ai_payout_amount": result.get("payout_amount", 0),
            "agent_trace": result.get("agent_trace", []),
            "flags": result.get("flags", []),
            "confidence": 0.95 if result.get("decision") in ("APPROVED", "REJECTED") else 0.7,
            "needs_info": result.get("needs_info", []),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {str(e)}",
        )


@router.post("/review")
async def review_claim(body: ReviewRequest, user: dict = Depends(require_developer)):
    """Developer submits their final human decision on a claim.
    This overrides the AI recommendation with the human verdict."""
    member = get_member_by_id(body.member_id)
    if not member:
        raise HTTPException(status_code=404, detail=f"Member {body.member_id} not found")

    # Find the claim in history
    claims = member.get("claims_history", [])
    claim_found = None
    for claim in claims:
        if claim.get("claim_id") == body.claim_id:
            claim_found = claim
            break

    if not claim_found:
        raise HTTPException(status_code=404, detail=f"Claim {body.claim_id} not found")

    # Update claim status with the human decision
    claim_found["status"] = body.decision
    claim_found["reviewed_by"] = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
    claim_found["reviewed_at"] = datetime.now(timezone.utc).isoformat()
    claim_found["reviewer_notes"] = body.reviewer_notes or ""

    if body.payout_amount is not None:
        claim_found["payout_amount"] = body.payout_amount

    return {
        "success": True,
        "claim_id": body.claim_id,
        "decision": body.decision,
        "message": f"Claim {body.claim_id} has been {body.decision.lower()} by {claim_found['reviewed_by']}",
    }


@router.get("/members-overview")
async def get_members_overview(user: dict = Depends(require_developer)):
    """Return all members with their full details for developer overview."""
    members = get_all_members()
    detailed = []

    for member_summary in members:
        mid = member_summary["member_id"]
        member = get_member_by_id(mid)
        if member:
            member.pop("_scenario_note", None)
            member.pop("password_hash", None)
            detailed.append(member)

    return {"members": detailed, "total": len(detailed)}
