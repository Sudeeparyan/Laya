"""
Laya Healthcare — Parent Agent 2: Policy & Member Eligibility
Handles waiting period, submission deadline, and quarterly threshold checks.

Child Agents (LLM-powered):
  - Waiting Period Enforcer: Validates 12-week waiting period
  - Time Limit Enforcer: Validates 12-month submission deadline
  - Quarterly Threshold Calculator: Checks €150 threshold
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
from app.agents.child_agents import (
    invoke_waiting_period_checker,
    invoke_time_limit_checker,
    invoke_threshold_calculator,
    invoke_duplicate_detector,
)


async def eligibility_node(state: ClaimState) -> dict:
    """Run the 3 sequential eligibility checks. If any fails, REJECT immediately.
    Uses LLM child agents for enhanced natural language responses."""
    member_data = state.get("member_data", {})
    extracted_doc = state.get("extracted_doc", {})
    usage = member_data.get("current_year_usage", {})
    trace_entries = []

    policy_start = member_data.get("policy_start_date", "")
    treatment_date = extracted_doc.get("treatment_date", "")
    total_cost = extracted_doc.get("total_cost", 0.0)
    accumulated = usage.get("q_accumulated_receipts", 0.0)

    # Default treatment_date to today if not provided
    if not treatment_date:
        treatment_date = datetime.now().strftime("%Y-%m-%d")
        trace_entries.append(f"Eligibility Agent → No treatment date provided, defaulting to today: {treatment_date}")

    # ── Check 1: Waiting Period (12 weeks) ──
    trace_entries.append("Eligibility Agent → Checking 12-week waiting period...")
    wp_result = check_waiting_period.invoke({
        "policy_start_date": policy_start,
        "treatment_date": treatment_date,
    })

    if wp_result.get("is_within_waiting_period"):
        trace_entries.append(f"Eligibility Agent → FAILED: {wp_result['message']}")

        # Enhance with child agent
        fallback_reasoning = (
            f"A 12-week initial waiting period applies to your chosen scheme. "
            f"Your policy started on {policy_start} and the treatment date ({treatment_date}) "
            f"falls within this waiting period. The waiting period ends on {wp_result.get('waiting_period_end', 'N/A')} "
            f"({wp_result.get('days_remaining', 0)} days remaining)."
        )
        enhanced, child_trace = await invoke_waiting_period_checker(
            policy_start, treatment_date, fallback_reasoning,
        )
        trace_entries.append(child_trace)

        return {
            "current_agent": "Eligibility Agent",
            "agent_trace": trace_entries,
            "decision": "REJECTED",
            "reasoning": enhanced,
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

        fallback_reasoning = (
            f"Claims must be submitted within 12 months of the treatment date on your receipt. "
            f"This receipt from {treatment_date} is older than 12 months "
            f"(deadline was {sd_result.get('submission_deadline', 'N/A')}, "
            f"{sd_result.get('days_over_deadline', 0)} days overdue)."
        )
        enhanced, child_trace = await invoke_time_limit_checker(
            treatment_date, fallback_reasoning,
        )
        trace_entries.append(child_trace)

        return {
            "current_agent": "Eligibility Agent",
            "agent_trace": trace_entries,
            "decision": "REJECTED",
            "reasoning": enhanced,
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

    # Enhance threshold result with child agent
    _, threshold_trace = await invoke_threshold_calculator(
        accumulated, total_cost, qt_result.get("message", ""),
    )
    trace_entries.append(threshold_trace)

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

        fallback_reasoning = (
            f"Duplicate claim detected. A claim with the same treatment date ({treatment_date}), "
            f"practitioner ({practitioner}), and amount (€{total_cost:.2f}) already exists "
            f"(Claim {dup_result.get('existing_claim_id', 'N/A')} — {dup_result.get('existing_status', 'N/A')})."
        )
        enhanced, child_trace = await invoke_duplicate_detector(
            member_id, treatment_date, practitioner, total_cost,
            {"reasoning": fallback_reasoning},
        )
        trace_entries.append(child_trace)

        return {
            "current_agent": "Eligibility Agent",
            "agent_trace": trace_entries,
            "decision": "REJECTED",
            "reasoning": enhanced,
            "payout_amount": 0.0,
            "flags": ["DUPLICATE"],
        }
    trace_entries.append("Eligibility Agent → No duplicate claims found ✓")

    trace_entries.append("Eligibility Agent → All eligibility checks complete ✓")

    # If below quarterly threshold, add a flag so decision_node can handle it
    result = {
        "current_agent": "Eligibility Agent",
        "agent_trace": trace_entries,
    }
    if not threshold_crossed:
        result["flags"] = ["PENDING_THRESHOLD"]

    return result
