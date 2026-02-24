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
    update_claim_status,
    get_uploaded_documents,
    get_all_uploaded_documents,
    get_activities,
)
from app.routers.auth import require_developer
from app.agents.graph import process_claim
from app.tools.policy_tools import get_source_citations

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


# ── Priority Calculation ─────────────────────────────

def calculate_claim_priority(claim: dict, member: dict) -> dict:
    """
    Calculate priority level for a claim based on multiple factors.
    Returns: { "level": "HIGH"|"MEDIUM"|"LOW", "score": int, "reasons": list }
    """
    score = 0
    reasons = []
    usage = member.get("current_year_usage", {})
    status = claim.get("status", "").upper()

    # Factor 1: Claim status
    if status == "PENDING":
        score += 20
        reasons.append("Awaiting review")

    # Factor 2: Claim amount
    amount = claim.get("claimed_amount", 0)
    if amount >= 200:
        score += 30
        reasons.append(f"High-value claim (€{amount:.2f})")
    elif amount >= 100:
        score += 15
        reasons.append(f"Medium-value claim (€{amount:.2f})")

    # Factor 3: Member approaching annual limits
    if usage.get("scan_count", 0) >= 8:
        score += 25
        reasons.append(f"Scan limit near ({usage['scan_count']}/10)")
    if usage.get("hospital_days_count", 0) >= 35:
        score += 25
        reasons.append(f"Hospital days near limit ({usage['hospital_days_count']}/40)")
    if usage.get("gp_visits_count", 0) >= 8:
        score += 15
        reasons.append(f"GP visits near limit ({usage['gp_visits_count']}/10)")

    # Factor 4: New policy (waiting period risk)
    policy_start = member.get("policy_start_date", "")
    if policy_start >= "2026-01-01":
        score += 20
        reasons.append("New policy — waiting period may apply")

    # Factor 5: AI pre-analysis flags
    ai_rec = claim.get("ai_recommendation", "")
    if ai_rec == "REJECTED":
        score += 15
        reasons.append("AI recommends rejection")
    if "DUPLICATE" in str(claim.get("ai_flags", [])).upper():
        score += 30
        reasons.append("Potential duplicate detected")

    # Determine level
    if score >= 50:
        level = "HIGH"
    elif score >= 25:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {"level": level, "score": score, "reasons": reasons}


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
            priority = calculate_claim_priority(claim, member)
            all_claims.append({
                **claim,
                "member_id": mid,
                "member_name": f"{member['first_name']} {member['last_name']}",
                "scheme_name": member.get("scheme_name", ""),
                "policy_start_date": member.get("policy_start_date", ""),
                "member_status": member.get("status", "Active"),
                "q_accumulated_receipts": usage.get("q_accumulated_receipts", 0),
                "priority": priority,
            })

    # Sort by priority score descending (highest priority first), then by date
    all_claims.sort(key=lambda c: (c.get("priority", {}).get("score", 0), c.get("treatment_date", "")), reverse=True)
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

        # Generate source document citations
        treatment_type = body.treatment_type or result.get("treatment_type", "")
        reasoning = result.get("reasoning", "")
        flags = result.get("flags", [])
        rejection_reasons = [reasoning] + flags

        source_citations = get_source_citations(treatment_type, rejection_reasons)

        from app.tools.policy_tools import IPID_SOURCE

        return {
            "ai_decision": result.get("decision", "PENDING"),
            "ai_reasoning": result.get("reasoning", ""),
            "ai_payout_amount": result.get("payout_amount", 0),
            "agent_trace": result.get("agent_trace", []),
            "flags": result.get("flags", []),
            "confidence": 0.95 if result.get("decision") in ("APPROVED", "REJECTED") else 0.7,
            "needs_info": result.get("needs_info", []),
            "source_citations": source_citations,
            "source_document": "Money Smart 20 Family — IPID",
            "source_url": IPID_SOURCE["source_url"],
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

    # Find the claim in history (verify it exists)
    claims = member.get("claims_history", [])
    claim_found = None
    for claim in claims:
        if claim.get("claim_id") == body.claim_id:
            claim_found = claim
            break

    if not claim_found:
        raise HTTPException(status_code=404, detail=f"Claim {body.claim_id} not found")

    # Build update dict
    reviewer_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
    claim_updates = {
        "status": body.decision,
        "reviewed_by": reviewer_name,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "reviewer_notes": body.reviewer_notes or "",
    }
    if body.payout_amount is not None:
        claim_updates["payout_amount"] = body.payout_amount

    # Update the actual store (not a deep copy) and persist to disk
    update_claim_status(body.member_id, body.claim_id, claim_updates)

    # Apply deferred usage updates when developer APPROVES
    # (Usage was NOT incremented at submission time for customer PENDING claims)
    if body.decision in ("APPROVED", "PARTIALLY APPROVED"):
        deferred_updates = claim_found.get("deferred_usage_updates", [])
        for upd in deferred_updates:
            update_usage(body.member_id, upd["field"], upd["increment"])
        # Clear deferred updates after applying
        if deferred_updates:
            update_claim_status(body.member_id, body.claim_id, {"deferred_usage_updates": []})

    # Notify customer portal via WebSocket
    try:
        from app.main import notify_claim_update
        await notify_claim_update(
            member_id=body.member_id,
            claim_id=body.claim_id,
            new_status=body.decision,
            details={
                "reviewed_by": reviewer_name,
                "reviewer_notes": body.reviewer_notes or "",
                "payout_amount": body.payout_amount or 0,
            },
        )
    except Exception:
        pass  # WebSocket notification is best-effort

    return {
        "success": True,
        "claim_id": body.claim_id,
        "decision": body.decision,
        "message": f"Claim {body.claim_id} has been {body.decision.lower()} by {reviewer_name}",
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


@router.get("/member-documents/{member_id}")
async def get_member_documents(member_id: str, user: dict = Depends(require_developer)):
    """Return all documents uploaded for a specific member."""
    docs = get_uploaded_documents(member_id)
    return {"member_id": member_id, "documents": docs, "total": len(docs)}


@router.get("/all-documents")
async def get_all_documents(user: dict = Depends(require_developer)):
    """Return all uploaded documents across all members."""
    all_docs = get_all_uploaded_documents()
    flat_list = []
    for member_id, docs in all_docs.items():
        for doc in docs:
            flat_list.append({**doc, "member_id": member_id})
    flat_list.sort(key=lambda d: d.get("uploaded_at", ""), reverse=True)
    return {"documents": flat_list, "total": len(flat_list)}


@router.get("/activities")
async def get_activity_log(
    member_id: str = None,
    limit: int = 50,
    user: dict = Depends(require_developer),
):
    """Return recent user activities for developer monitoring.
    Optionally filter by member_id."""
    activities = get_activities(member_id=member_id, limit=limit)
    return {"activities": activities, "total": len(activities)}
