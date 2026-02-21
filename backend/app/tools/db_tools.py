"""
Laya Healthcare AI Claims Chatbot — Database Tools
LangChain tools for looking up members, usage stats, claims history,
and checking for duplicate claims.
"""

from __future__ import annotations

from langchain_core.tools import tool

from app.models.database import get_member_by_id, get_claims_history


@tool
def lookup_member(member_id: str) -> dict:
    """Look up a member by their ID and return their full record including
    personal details, scheme info, policy start date, and current year usage."""
    member = get_member_by_id(member_id)
    if member is None:
        return {"error": f"Member {member_id} not found in the database."}
    # Remove internal fields
    member.pop("_scenario_note", None)
    member.pop("password_hash", None)
    return member


@tool
def get_usage_stats(member_id: str) -> dict:
    """Return the current year benefits usage for a member, including
    GP visits count, scan count, hospital days, prescription count, etc."""
    member = get_member_by_id(member_id)
    if member is None:
        return {"error": f"Member {member_id} not found."}
    return member.get("current_year_usage", {})


@tool
def get_claims_history_tool(member_id: str) -> list[dict]:
    """Return the complete claims history for a member, including
    claim IDs, treatment dates, types, practitioner names, amounts, and statuses."""
    history = get_claims_history(member_id)
    if not history:
        return [{"info": f"No claims history found for {member_id}."}]
    return history


@tool
def check_existing_claim(
    member_id: str,
    treatment_date: str,
    practitioner_name: str,
    claimed_amount: float,
) -> dict:
    """Check if a claim with the same treatment date, practitioner, and amount
    already exists for this member. Returns whether a duplicate was found."""
    history = get_claims_history(member_id)
    for claim in history:
        if (
            claim.get("treatment_date") == treatment_date
            and claim.get("practitioner_name", "").lower() == practitioner_name.lower()
            and abs(claim.get("claimed_amount", 0) - claimed_amount) < 0.01
        ):
            return {
                "is_duplicate": True,
                "existing_claim_id": claim.get("claim_id"),
                "existing_status": claim.get("status"),
                "message": f"Duplicate claim found: {claim.get('claim_id')} — already {claim.get('status')}.",
            }
    return {
        "is_duplicate": False,
        "message": "No duplicate claim found.",
    }


# Export all tools as a list for agent binding
db_tools = [lookup_member, get_usage_stats, get_claims_history_tool, check_existing_claim]
