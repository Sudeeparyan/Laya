"""
Laya Healthcare — Members Router
GET /api/members — List all members
GET /api/members/{member_id} — Get full member record
GET /api/members/{member_id}/profile — Full profile with analytics for profile page
"""

from __future__ import annotations

from datetime import datetime, date
from collections import Counter

from fastapi import APIRouter, HTTPException

from app.models.database import get_all_members, get_member_by_id, get_uploaded_documents

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


@router.get("/members/{member_id}/profile")
async def get_member_profile(member_id: str):
    """Return comprehensive member profile with analytics for the profile page."""
    member = get_member_by_id(member_id)
    if member is None:
        raise HTTPException(
            status_code=404,
            detail=f"Member {member_id} not found.",
        )

    member.pop("_scenario_note", None)
    member.pop("password_hash", None)

    claims = member.get("claims_history", [])
    usage = member.get("current_year_usage", {})

    # ── Claims analytics ──
    total_claims = len(claims)
    approved = sum(1 for c in claims if "approved" in c.get("status", "").lower())
    rejected = sum(1 for c in claims if "rejected" in c.get("status", "").lower())
    pending = sum(1 for c in claims if "pending" in c.get("status", "").lower())
    total_claimed = sum(c.get("claimed_amount", 0) for c in claims)
    total_approved_amount = sum(
        c.get("claimed_amount", 0) for c in claims
        if "approved" in c.get("status", "").lower()
    )

    # ── Status distribution for pie chart ──
    status_distribution = {}
    for c in claims:
        s = c.get("status", "Unknown")
        # Normalize
        sl = s.lower()
        if "approved" in sl:
            key = "Approved"
        elif "rejected" in sl:
            key = "Rejected"
        elif "pending" in sl:
            key = "Pending"
        else:
            key = s
        status_distribution[key] = status_distribution.get(key, 0) + 1

    # ── Claims by treatment type for bar chart ──
    treatment_counts = Counter(c.get("treatment_type", "Other") for c in claims)
    claims_by_type = [
        {"type": t, "count": cnt}
        for t, cnt in sorted(treatment_counts.items(), key=lambda x: -x[1])
    ]

    # ── Monthly claims trend (last 6 months) ──
    monthly_claims = {}
    for c in claims:
        td = c.get("treatment_date", "")
        if td:
            month_key = td[:7]  # "2026-01"
            monthly_claims[month_key] = monthly_claims.get(month_key, 0) + 1
    claims_timeline = [
        {"month": m, "count": cnt}
        for m, cnt in sorted(monthly_claims.items())
    ]

    # ── Spending by treatment type ──
    spending_by_type = {}
    for c in claims:
        t = c.get("treatment_type", "Other")
        spending_by_type[t] = spending_by_type.get(t, 0) + c.get("claimed_amount", 0)
    spending_breakdown = [
        {"type": t, "amount": round(amt, 2)}
        for t, amt in sorted(spending_by_type.items(), key=lambda x: -x[1])
    ]

    # ── Usage limits (for progress bars) ──
    limits = {
        "gp_visits": {"used": usage.get("gp_visits_count", 0), "max": 10, "label": "GP & A&E Visits"},
        "prescriptions": {"used": usage.get("prescription_count", 0), "max": 4, "label": "Prescriptions"},
        "dental_optical": {"used": usage.get("dental_optical_count", 0), "max": 10, "label": "Dental & Optical"},
        "therapy": {"used": usage.get("therapy_count", 0), "max": 10, "label": "Therapies"},
        "scans": {"used": usage.get("scan_count", 0), "max": 10, "label": "Scans"},
        "consultant": {"used": usage.get("consultant_visits_count", 0), "max": 10, "label": "Consultant Visits"},
        "hospital_days": {"used": usage.get("hospital_days_count", 0), "max": 40, "label": "Hospital Days"},
    }

    # ── Policy duration ──
    policy_start = member.get("policy_start_date", "")
    days_on_policy = 0
    waiting_period_remaining = 0
    if policy_start:
        try:
            start_date = datetime.strptime(policy_start, "%Y-%m-%d").date()
            today = date(2026, 2, 23)  # Fixed demo date
            days_on_policy = (today - start_date).days
            waiting_period_remaining = max(0, 84 - days_on_policy)  # 12 weeks = 84 days
        except ValueError:
            pass

    # ── Risk score ──
    risk_score = 0
    risk_factors = []
    if usage.get("scan_count", 0) >= 8:
        risk_score += 30
        risk_factors.append(f"Scan limit near ({usage['scan_count']}/10)")
    if usage.get("hospital_days_count", 0) >= 35:
        risk_score += 30
        risk_factors.append(f"Hospital days near limit ({usage['hospital_days_count']}/40)")
    if usage.get("gp_visits_count", 0) >= 8:
        risk_score += 15
        risk_factors.append(f"GP visits near limit ({usage['gp_visits_count']}/10)")
    if usage.get("q_accumulated_receipts", 0) >= 130:
        risk_score += 10
        risk_factors.append(f"Quarterly threshold near (€{usage['q_accumulated_receipts']:.0f}/€150)")
    if policy_start >= "2026-01-01":
        risk_score += 15
        risk_factors.append("New policy — waiting period may apply")
    risk_score = min(risk_score, 100)

    # Build all claims with enriched data for the table
    enriched_claims = []
    for c in claims:
        enriched_claims.append({
            **c,
            "member_name": f"{member['first_name']} {member['last_name']}",
            "member_id": member_id,
        })
    enriched_claims.sort(key=lambda x: x.get("treatment_date", ""), reverse=True)

    # Get uploaded documents for this member
    uploaded_docs = get_uploaded_documents(member_id)

    return {
        "member": member,
        "analytics": {
            "total_claims": total_claims,
            "approved": approved,
            "rejected": rejected,
            "pending": pending,
            "total_claimed": round(total_claimed, 2),
            "total_approved_amount": round(total_approved_amount, 2),
            "approval_rate": round((approved / total_claims * 100), 1) if total_claims > 0 else 0,
            "status_distribution": status_distribution,
            "claims_by_type": claims_by_type,
            "claims_timeline": claims_timeline,
            "spending_breakdown": spending_breakdown,
            "limits": limits,
            "days_on_policy": days_on_policy,
            "waiting_period_remaining": waiting_period_remaining,
            "risk_score": risk_score,
            "risk_factors": risk_factors,
            "q_accumulated_receipts": usage.get("q_accumulated_receipts", 0),
        },
        "claims": enriched_claims,
        "uploaded_documents": uploaded_docs,
    }
