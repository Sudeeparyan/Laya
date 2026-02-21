"""
Laya Healthcare — Parent Agent 2: Policy & Member Eligibility
Handles waiting period, submission deadline, and quarterly threshold checks.
"""

from __future__ import annotations

from datetime import datetime

from app.agents.state import ClaimState
from app.tools.policy_tools import (
    check_waiting_period,
    check_submission_deadline,
    check_quarterly_threshold,
)
from app.tools.db_tools import check_existing_claim


def eligibility_node(state: ClaimState) -> dict:
    """Run the 3 sequential eligibility checks. If any fails, REJECT immediately."""
    member_data = state.get("member_data", {})
    extracted_doc = state.get("extracted_doc", {})
    usage = member_data.get("current_year_usage", {})
    trace_entries = []

    policy_start = member_data.get("policy_start_date", "")
    treatment_date = extracted_doc.get("treatment_date", "")
    total_cost = extracted_doc.get("total_cost", 0.0)
    accumulated = usage.get("q_accumulated_receipts", 0.0)

    # ── Check 1: Waiting Period (12 weeks) ──
    trace_entries.append("Eligibility Agent → Checking 12-week waiting period...")
    wp_result = check_waiting_period.invoke({
        "policy_start_date": policy_start,
        "treatment_date": treatment_date,
    })

    if wp_result.get("is_within_waiting_period"):
        trace_entries.append(f"Eligibility Agent → FAILED: {wp_result['message']}")
        return {
            "current_agent": "Eligibility Agent",
            "agent_trace": trace_entries,
            "decision": "REJECTED",
            "reasoning": (
                f"A 12-week initial waiting period applies to your chosen scheme. "
                f"Your policy started on {policy_start} and the treatment date ({treatment_date}) "
                f"falls within this waiting period. The waiting period ends on {wp_result.get('waiting_period_end', 'N/A')} "
                f"({wp_result.get('days_remaining', 0)} days remaining)."
            ),
            "payout_amount": 0.0,
        }
    trace_entries.append("Eligibility Agent → Waiting period check PASSED ✓")

    # ── Check 2: Submission Deadline (12 months) ──
    trace_entries.append("Eligibility Agent → Checking 12-month submission deadline...")
    sd_result = check_submission_deadline.invoke({
        "treatment_date": treatment_date,
    })

    if sd_result.get("is_expired"):
        trace_entries.append(f"Eligibility Agent → FAILED: {sd_result['message']}")
        return {
            "current_agent": "Eligibility Agent",
            "agent_trace": trace_entries,
            "decision": "REJECTED",
            "reasoning": (
                f"Claims must be submitted within 12 months of the treatment date on your receipt. "
                f"This receipt from {treatment_date} is older than 12 months "
                f"(deadline was {sd_result.get('submission_deadline', 'N/A')}, "
                f"{sd_result.get('days_over_deadline', 0)} days overdue)."
            ),
            "payout_amount": 0.0,
        }
    trace_entries.append("Eligibility Agent → Submission deadline check PASSED ✓")

    # ── Check 3: Quarterly Threshold (€150) ──
    trace_entries.append("Eligibility Agent → Checking quarterly €150 threshold...")
    qt_result = check_quarterly_threshold.invoke({
        "current_accumulated": accumulated,
        "new_amount": total_cost,
    })

    threshold_crossed = qt_result.get("crosses_threshold", False)
    new_total = qt_result.get("new_total", accumulated + total_cost)

    if threshold_crossed:
        trace_entries.append(
            f"Eligibility Agent → Threshold CROSSED: €{accumulated:.2f} + €{total_cost:.2f} = €{new_total:.2f} (≥ €150) ✓"
        )
    else:
        trace_entries.append(
            f"Eligibility Agent → Below threshold: €{accumulated:.2f} + €{total_cost:.2f} = €{new_total:.2f} (< €150)"
        )

    # ── Check 4: Duplicate Claim Detection ──
    trace_entries.append("Eligibility Agent → Checking for duplicate claims...")
    member_id = member_data.get("member_id", "")
    practitioner = extracted_doc.get("practitioner_name", "")
    dup_result = check_existing_claim.invoke({
        "member_id": member_id,
        "treatment_date": treatment_date,
        "practitioner_name": practitioner,
        "claimed_amount": total_cost,
    })

    if dup_result.get("is_duplicate"):
        trace_entries.append(f"Eligibility Agent → FAILED: {dup_result['message']}")
        return {
            "current_agent": "Eligibility Agent",
            "agent_trace": trace_entries,
            "decision": "REJECTED",
            "reasoning": (
                f"Duplicate claim detected. A claim with the same treatment date ({treatment_date}), "
                f"practitioner ({practitioner}), and amount (€{total_cost:.2f}) already exists "
                f"(Claim {dup_result.get('existing_claim_id', 'N/A')} — {dup_result.get('existing_status', 'N/A')})."
            ),
            "payout_amount": 0.0,
            "flags": ["DUPLICATE"],
        }
    trace_entries.append("Eligibility Agent → No duplicate claims found ✓")

    trace_entries.append("Eligibility Agent → All eligibility checks complete ✓")

    # If below quarterly threshold, mark as pending payment
    result = {
        "current_agent": "Eligibility Agent",
        "agent_trace": trace_entries,
    }
    if not threshold_crossed:
        result["decision"] = "PENDING"
        result["reasoning"] = (
            f"Claim is eligible but your accumulated receipts this quarter total "
            f"€{new_total:.2f}, which is below the €150 quarterly threshold. "
            f"Payment will be released once the threshold is met."
        )

    return result
