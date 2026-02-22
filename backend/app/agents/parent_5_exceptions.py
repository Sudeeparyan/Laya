"""
Laya Healthcare — Parent Agent 5: Exceptions, Maternity & Legal
Handles maternity/adoption, duplicate detection, and third-party escalation.

Child Agents (LLM-powered):
  - Maternity Processor: Processes maternity/adoption claims
  - Duplicate & Fraud Detector: Detects duplicate/fraudulent claims
  - Third-Party Escalator: Handles solicitor/PIAB escalation
"""

from __future__ import annotations

from app.agents.state import ClaimState
from app.tools.db_tools import check_existing_claim
from app.agents.child_agents import (
    invoke_maternity_processor,
    invoke_duplicate_detector,
    invoke_third_party_escalator,
)


async def exceptions_node(state: ClaimState) -> dict:
    """Handle exception cases: maternity, duplicates, third-party claims.
    Uses LLM child agents for enhanced natural language responses."""
    member_data = state.get("member_data", {})
    extracted_doc = state.get("extracted_doc", {})
    usage = member_data.get("current_year_usage", {})
    treatment_type = extracted_doc.get("treatment_type", "")
    form_type = extracted_doc.get("form_type", "")
    trace_entries = []

    trace_entries.append("Exceptions Agent → Analyzing claim for edge cases")

    # ── Check 1: Maternity / Adoption ──
    if "Pre/Post-Natal" in form_type or "Maternity" in treatment_type or "maternity" in treatment_type.lower():
        return await _process_maternity(usage, extracted_doc, trace_entries)

    # ── Check 2: Third-Party / Solicitor ──
    is_accident = extracted_doc.get("is_accident", False)
    solicitor_involved = extracted_doc.get("solicitor_involved", False)
    if is_accident or solicitor_involved:
        return await _process_third_party(extracted_doc, trace_entries)

    # ── Check 3: Duplicate / Fraud Detection ──
    return await _check_duplicate(member_data, extracted_doc, trace_entries)


async def _process_maternity(usage: dict, extracted_doc: dict, trace: list) -> dict:
    """Process maternity/adoption flat-rate cash back."""
    maternity_claimed = usage.get("maternity_claimed", False)
    total_cost = extracted_doc.get("total_cost", 0.0)

    trace.append("Exceptions Agent → Maternity & Newborn Processor")

    if maternity_claimed:
        trace.append("Exceptions Agent → REJECTED: Maternity already claimed this year")
        result = {
            "current_agent": "Exceptions Agent",
            "agent_trace": trace,
            "decision": "REJECTED",
            "reasoning": (
                "The Maternity/Adoption Cash Back of €200 has already been claimed for this policy year. "
                "Only one maternity/adoption benefit is allowed per year."
            ),
            "payout_amount": 0.0,
        }
        enhanced, child_trace = await invoke_maternity_processor(maternity_claimed, total_cost, result)
        trace.append(child_trace)
        result["reasoning"] = enhanced
        return result

    payout = 200.0  # flat rate
    excess = max(0, total_cost - payout)

    trace.append(f"Exceptions Agent → APPROVED: Maternity Cash Back → €{payout:.2f}")
    if excess > 0:
        trace.append(f"Exceptions Agent → Note: €{excess:.2f} not covered (Cash Plan limit)")

    result = {
        "current_agent": "Exceptions Agent",
        "agent_trace": trace,
        "decision": "APPROVED",
        "reasoning": (
            f"Maternity/Adoption Cash Back approved for the flat maximum rate of €{payout:.2f}. "
            + (f"The remaining €{excess:.2f} is not covered under the Cash Plan policy. " if excess > 0 else "")
            + "The newborn/adopted child will be added to the policy cover free of charge."
        ),
        "payout_amount": payout,
        "flags": ["MATERNITY_DB_UPDATE"],
    }
    enhanced, child_trace = await invoke_maternity_processor(maternity_claimed, total_cost, result)
    trace.append(child_trace)
    result["reasoning"] = enhanced
    return result


async def _process_third_party(extracted_doc: dict, trace: list) -> dict:
    """Handle third-party liability and solicitor escalation."""
    is_accident = extracted_doc.get("is_accident", False)
    solicitor = extracted_doc.get("solicitor_involved", False)

    trace.append("Exceptions Agent → Third-Party & Subrogation Escalator")

    flags = ["LEGAL_REVIEW"]
    reasons = []
    if is_accident:
        reasons.append("The claim is related to an accident or injury")
        trace.append("Exceptions Agent → Flag: Accident-related claim")
    if solicitor:
        reasons.append("A solicitor or PIAB is involved")
        trace.append("Exceptions Agent → Flag: Solicitor/PIAB involved")

    trace.append("Exceptions Agent → APPROVED with LEGAL_REVIEW escalation")

    result = {
        "current_agent": "Exceptions Agent",
        "agent_trace": trace,
        "decision": "APPROVED",
        "reasoning": (
            f"Claim meets medical criteria and is approved for cash back. "
            f"However, this claim has been flagged for the Legal/Subrogation Team because: "
            f"{'; '.join(reasons)}. As per the policy declaration, Laya Healthcare must recover "
            f"these costs from the Personal Injuries Assessment Board (PIAB) or third-party solicitor."
        ),
        "payout_amount": min(extracted_doc.get("total_cost", 0), 20.0),
        "flags": flags,
    }
    enhanced, child_trace = await invoke_third_party_escalator(is_accident, solicitor, result)
    trace.append(child_trace)
    result["reasoning"] = enhanced
    return result


async def _check_duplicate(member_data: dict, extracted_doc: dict, trace: list) -> dict:
    """Check for duplicate claims in the member's history."""
    member_id = member_data.get("member_id", "")
    treatment_date = extracted_doc.get("treatment_date", "")
    practitioner = extracted_doc.get("practitioner_name", "")
    amount = extracted_doc.get("total_cost", 0.0)

    trace.append("Exceptions Agent → Duplicate & Fraud Detector")

    dup_result = check_existing_claim.invoke({
        "member_id": member_id,
        "treatment_date": treatment_date,
        "practitioner_name": practitioner,
        "claimed_amount": amount,
    })

    if dup_result.get("is_duplicate"):
        existing_id = dup_result.get("existing_claim_id", "Unknown")
        trace.append(f"Exceptions Agent → DUPLICATE FOUND: {existing_id}")
        result = {
            "current_agent": "Exceptions Agent",
            "agent_trace": trace,
            "decision": "REJECTED",
            "reasoning": (
                f"Duplicate claim detected. A claim for this specific treatment date ({treatment_date}), "
                f"practitioner ({practitioner}), and amount (€{amount:.2f}) has already been processed "
                f"(Claim ID: {existing_id}). This submission is rejected to prevent duplicate payouts."
            ),
            "payout_amount": 0.0,
            "flags": ["DUPLICATE"],
        }
        enhanced, child_trace = await invoke_duplicate_detector(
            member_id, treatment_date, practitioner, amount, result,
        )
        trace.append(child_trace)
        result["reasoning"] = enhanced
        return result

    trace.append("Exceptions Agent → No duplicates found ✓")

    # If no exception case was triggered, pass through with a note
    return {
        "current_agent": "Exceptions Agent",
        "agent_trace": trace,
        "decision": "APPROVED",
        "reasoning": "No exception cases detected. Claim cleared for standard processing.",
        "payout_amount": min(extracted_doc.get("total_cost", 0), 20.0),
    }
