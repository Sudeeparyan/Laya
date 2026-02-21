"""
Laya Healthcare — Parent Agent 4: Hospital & Complex Procedure Processing
Handles in-patient stays, procedure code validation, and hospital invoices.
"""

from __future__ import annotations

from app.agents.state import ClaimState
from app.tools.policy_tools import calculate_hospital_payout


def hospital_node(state: ClaimState) -> dict:
    """Process hospital and complex procedure claims."""
    member_data = state.get("member_data", {})
    extracted_doc = state.get("extracted_doc", {})
    usage = member_data.get("current_year_usage", {})
    treatment_type = extracted_doc.get("treatment_type", "")
    total_cost = extracted_doc.get("total_cost", 0.0)
    practitioner = extracted_doc.get("practitioner_name", "Unknown")
    trace_entries = []

    trace_entries.append("Hospital Agent → Processing hospital/complex claim")

    # ── Check 1: Private hospital invoice rejection ──
    # The Cash Plan does NOT cover private hospital invoices
    if total_cost > 1000 and "Hospital In-patient" not in treatment_type:
        trace_entries.append("Hospital Agent → REJECTED: Private hospital invoice detected")
        return {
            "current_agent": "Hospital Agent",
            "agent_trace": trace_entries,
            "decision": "REJECTED",
            "reasoning": (
                f"Your Money Smart 20 Family scheme is a Cash Back scheme, not an in-patient "
                f"health insurance scheme. It does not cover private hospital admission invoices, "
                f"only the daily cash back rate of €20 per day (up to 40 days/year). "
                f"The submitted amount of €{total_cost:.2f} appears to be a hospital invoice."
            ),
            "payout_amount": 0.0,
        }

    # ── Check 2: Procedure Code Validation ──
    procedure_code = extracted_doc.get("procedure_code")
    if procedure_code:
        result = _validate_procedure_code(extracted_doc, trace_entries)
        if result:
            return result

    # ── Check 3: Hospital In-patient Cash Back ──
    hospital_days = extracted_doc.get("hospital_days", 0)
    if hospital_days and hospital_days > 0:
        return _process_hospital_days(hospital_days, usage, practitioner, trace_entries)

    # Default: treat as a hospital-related outpatient claim
    trace_entries.append("Hospital Agent → Processing as hospital day-case")
    payout = min(total_cost, 20.0)
    return {
        "current_agent": "Hospital Agent",
        "agent_trace": trace_entries,
        "decision": "APPROVED",
        "reasoning": f"Hospital day-case claim approved. Cash back of €{payout:.2f}. Facility: {practitioner}.",
        "payout_amount": payout,
    }


def _process_hospital_days(hospital_days: int, usage: dict, practitioner: str, trace: list) -> dict:
    """Calculate hospital in-patient cash back payout."""
    days_used = usage.get("hospital_days_count", 0)

    trace.append(f"Hospital Agent → In-Patient Calculator: {hospital_days} days requested, {days_used}/40 used")

    result = calculate_hospital_payout.invoke({
        "days_requested": hospital_days,
        "days_used": days_used,
    })

    approved_days = result.get("approved_days", 0)
    rejected_days = result.get("rejected_days", 0)
    payout = result.get("payout", 0.0)

    if approved_days == 0:
        trace.append(f"Hospital Agent → REJECTED: All 40 hospital days already used")
        return {
            "current_agent": "Hospital Agent",
            "agent_trace": trace,
            "decision": "REJECTED",
            "reasoning": (
                f"All 40 hospital in-patient days have already been used this year "
                f"({days_used}/40). No further hospital cash back is available."
            ),
            "payout_amount": 0.0,
        }

    if rejected_days > 0:
        trace.append(
            f"Hospital Agent → PARTIALLY APPROVED: {approved_days} days approved, "
            f"{rejected_days} days rejected"
        )
        return {
            "current_agent": "Hospital Agent",
            "agent_trace": trace,
            "decision": "PARTIALLY APPROVED",
            "reasoning": (
                f"Approved for {approved_days} days at €20/day = €{payout:.2f}. "
                f"The remaining {rejected_days} days are rejected as they exceed the annual "
                f"maximum of 40 days. {days_used} days were previously used this year. "
                f"Facility: {practitioner}."
            ),
            "payout_amount": payout,
        }

    trace.append(f"Hospital Agent → APPROVED: {approved_days} days → €{payout:.2f}")
    return {
        "current_agent": "Hospital Agent",
        "agent_trace": trace,
        "decision": "APPROVED",
        "reasoning": (
            f"Hospital in-patient claim approved. {approved_days} days at €20/day = €{payout:.2f}. "
            f"Facility: {practitioner}. {40 - days_used - approved_days} days remaining this year."
        ),
        "payout_amount": payout,
    }


def _validate_procedure_code(extracted_doc: dict, trace: list) -> dict | None:
    """Validate specific procedure code requirements. Returns a result dict if validation fails."""
    procedure_code = extracted_doc.get("procedure_code")

    # Procedure Code 29: Basal cell carcinoma — requires histology report
    if procedure_code == 29:
        histology = extracted_doc.get("histology_report_attached", False)
        trace.append("Hospital Agent → Procedure Code 29 (Basal cell carcinoma) detected")
        if not histology:
            trace.append("Hospital Agent → REJECTED: Histology Report not attached")
            return {
                "current_agent": "Hospital Agent",
                "agent_trace": trace,
                "decision": "REJECTED",
                "reasoning": (
                    "A Histology Report is strictly required for Procedure Code 29 (Basal cell carcinoma). "
                    "Please upload the histology report to proceed with this claim."
                ),
                "payout_amount": 0.0,
                "needs_info": ["Histology Report"],
            }
        trace.append("Hospital Agent → Histology Report verified ✓")

    # Procedure Code 16: Phlebotomy — requires serum ferritin levels
    if procedure_code == 16:
        clinical_indicator = extracted_doc.get("clinical_indicator", "")
        serum_ferritin = extracted_doc.get("serum_ferritin_provided", False)
        trace.append("Hospital Agent → Procedure Code 16 (Phlebotomy) detected")
        if clinical_indicator == "0222" and not serum_ferritin:
            trace.append("Hospital Agent → REJECTED: Initial serum ferritin levels not documented")
            return {
                "current_agent": "Hospital Agent",
                "agent_trace": trace,
                "decision": "REJECTED",
                "reasoning": (
                    "For Procedure Code 16 with Clinical Indicator 0222, the initial serum ferritin "
                    "levels must be explicitly noted on the first claim. Please provide this information."
                ),
                "payout_amount": 0.0,
                "needs_info": ["Initial serum ferritin levels"],
            }
        trace.append("Hospital Agent → Procedure code requirements verified ✓")

    return None  # No issues found
