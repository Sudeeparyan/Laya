"""
Laya Healthcare — Parent Agent 3: Everyday Medical (Out-Patient) Processing
Handles GP, consultant, prescription, therapy, dental, optical, and scan claims.
"""

from __future__ import annotations

from app.agents.state import ClaimState
from app.tools.policy_tools import check_annual_limit, validate_therapy_type


def outpatient_node(state: ClaimState) -> dict:
    """Process outpatient claims based on treatment type."""
    member_data = state.get("member_data", {})
    extracted_doc = state.get("extracted_doc", {})
    usage = member_data.get("current_year_usage", {})
    treatment_type = extracted_doc.get("treatment_type", "").strip()
    total_cost = extracted_doc.get("total_cost", 0.0)
    practitioner = extracted_doc.get("practitioner_name", "Unknown")
    trace_entries = []

    trace_entries.append(f"Outpatient Agent → Processing: {treatment_type}")

    # ── Route to correct child logic ──

    # GP & A&E / Consultant
    if treatment_type in ("GP & A&E", "Consultant Fee"):
        return _process_gp_consultant(treatment_type, usage, total_cost, practitioner, trace_entries)

    # Prescription
    if treatment_type == "Prescription":
        return _process_prescription(usage, total_cost, practitioner, trace_entries)

    # Day-to-Day Therapy
    if treatment_type == "Day to Day Therapy":
        return _process_therapy(usage, total_cost, practitioner, trace_entries)

    # Dental & Optical
    if treatment_type == "Dental & Optical":
        return _process_dental_optical(usage, total_cost, practitioner, trace_entries)

    # Scan Cover
    if treatment_type == "Scan Cover":
        return _process_scan(usage, total_cost, practitioner, trace_entries)

    # Unknown treatment type
    trace_entries.append(f"Outpatient Agent → Unknown treatment type: '{treatment_type}'")
    return {
        "current_agent": "Outpatient Agent",
        "agent_trace": trace_entries,
        "decision": "ACTION REQUIRED",
        "reasoning": f"Treatment type '{treatment_type}' is not recognized. Please verify the claim form.",
        "payout_amount": 0.0,
    }


def _process_gp_consultant(treatment_type: str, usage: dict, total_cost: float, practitioner: str, trace: list) -> dict:
    """Process GP or Consultant visit claims."""
    is_gp = treatment_type == "GP & A&E"
    count_field = "gp_visits_count" if is_gp else "consultant_visits_count"
    label = "GP" if is_gp else "Consultant"
    current_count = usage.get(count_field, 0)
    max_count = 10
    payout_cap = 20.0

    trace.append(f"Outpatient Agent → {label} Visit Processor")

    limit_result = check_annual_limit.invoke({
        "current_count": current_count,
        "max_count": max_count,
    })

    if limit_result.get("limit_exceeded"):
        trace.append(f"Outpatient Agent → REJECTED: {current_count}/{max_count} {label} visits used")
        return {
            "current_agent": "Outpatient Agent",
            "agent_trace": trace,
            "decision": "REJECTED",
            "reasoning": (
                f"You have already reached the maximum limit of {max_count} {label} visits "
                f"for this policy year ({current_count}/{max_count} used). "
                f"No further {label} claims can be processed this year."
            ),
            "payout_amount": 0.0,
        }

    payout = min(total_cost, payout_cap)
    remaining = limit_result.get("remaining", max_count - current_count)
    trace.append(
        f"Outpatient Agent → APPROVED: {label} visit #{current_count + 1} of {max_count} → €{payout:.2f}"
    )

    return {
        "current_agent": "Outpatient Agent",
        "agent_trace": trace,
        "decision": "APPROVED",
        "reasoning": (
            f"{label} visit claim approved. Visit #{current_count + 1} of {max_count} for this year. "
            f"Cash back of €{payout:.2f} (capped at €{payout_cap:.2f} per visit). "
            f"Practitioner: {practitioner}. {remaining - 1} visits remaining after this claim."
        ),
        "payout_amount": payout,
    }


def _process_prescription(usage: dict, total_cost: float, practitioner: str, trace: list) -> dict:
    """Process prescription claims."""
    current_count = usage.get("prescription_count", 0)
    max_count = 4
    payout_cap = 10.0

    trace.append("Outpatient Agent → Pharmacy Processor")

    limit_result = check_annual_limit.invoke({
        "current_count": current_count,
        "max_count": max_count,
    })

    if limit_result.get("limit_exceeded"):
        trace.append(f"Outpatient Agent → REJECTED: {current_count}/{max_count} prescriptions used")
        return {
            "current_agent": "Outpatient Agent",
            "agent_trace": trace,
            "decision": "REJECTED",
            "reasoning": (
                f"You have already reached the maximum limit of {max_count} prescriptions "
                f"for this policy year ({current_count}/{max_count} used)."
            ),
            "payout_amount": 0.0,
        }

    payout = min(total_cost, payout_cap)
    trace.append(f"Outpatient Agent → APPROVED: Prescription #{current_count + 1} of {max_count} → €{payout:.2f}")

    return {
        "current_agent": "Outpatient Agent",
        "agent_trace": trace,
        "decision": "APPROVED",
        "reasoning": (
            f"Prescription claim approved. Prescription #{current_count + 1} of {max_count} for this year. "
            f"Cash back of €{payout:.2f} (capped at €{payout_cap:.2f}). Pharmacy: {practitioner}."
        ),
        "payout_amount": payout,
    }


def _process_therapy(usage: dict, total_cost: float, practitioner: str, trace: list) -> dict:
    """Process Day-to-Day Therapy claims with semantic validation."""
    payout_cap = 20.0

    trace.append("Outpatient Agent → Therapy Processor")

    # Validate therapy type using the practitioner/therapy name
    validation = validate_therapy_type.invoke({"therapy_name": practitioner})

    if not validation.get("is_valid"):
        trace.append(f"Outpatient Agent → REJECTED: '{practitioner}' is not an eligible therapy")
        return {
            "current_agent": "Outpatient Agent",
            "agent_trace": trace,
            "decision": "REJECTED",
            "reasoning": validation.get("message", f"'{practitioner}' is not an eligible Day-to-Day Therapy."),
            "payout_amount": 0.0,
        }

    payout = min(total_cost, payout_cap)
    trace.append(f"Outpatient Agent → APPROVED: Therapy session → €{payout:.2f}")

    return {
        "current_agent": "Outpatient Agent",
        "agent_trace": trace,
        "decision": "APPROVED",
        "reasoning": (
            f"Day-to-Day Therapy claim approved. '{practitioner}' is an eligible therapy provider. "
            f"Cash back of €{payout:.2f} (capped at €{payout_cap:.2f})."
        ),
        "payout_amount": payout,
    }


def _process_dental_optical(usage: dict, total_cost: float, practitioner: str, trace: list) -> dict:
    """Process Dental & Optical claims."""
    current_count = usage.get("dental_optical_count", 0)
    max_count = 10
    payout_cap = 20.0

    trace.append("Outpatient Agent → Dental/Optical Processor")

    limit_result = check_annual_limit.invoke({
        "current_count": current_count,
        "max_count": max_count,
    })

    if limit_result.get("limit_exceeded"):
        trace.append(f"Outpatient Agent → REJECTED: {current_count}/{max_count} dental/optical visits used")
        return {
            "current_agent": "Outpatient Agent",
            "agent_trace": trace,
            "decision": "REJECTED",
            "reasoning": (
                f"You have already reached the maximum limit of {max_count} Dental & Optical visits "
                f"for this policy year ({current_count}/{max_count} used)."
            ),
            "payout_amount": 0.0,
        }

    payout = min(total_cost, payout_cap)
    trace.append(f"Outpatient Agent → APPROVED: Dental/Optical #{current_count + 1} of {max_count} → €{payout:.2f}")

    return {
        "current_agent": "Outpatient Agent",
        "agent_trace": trace,
        "decision": "APPROVED",
        "reasoning": (
            f"Dental & Optical claim approved. Visit #{current_count + 1} of {max_count} for this year. "
            f"Cash back of €{payout:.2f} (capped at €{payout_cap:.2f}). Provider: {practitioner}."
        ),
        "payout_amount": payout,
    }


def _process_scan(usage: dict, total_cost: float, practitioner: str, trace: list) -> dict:
    """Process Scan Cover (MRI/CT/X-ray) claims."""
    current_count = usage.get("scan_count", 0)
    max_count = 10
    payout_cap = 20.0

    trace.append("Outpatient Agent → Scan Processor")

    limit_result = check_annual_limit.invoke({
        "current_count": current_count,
        "max_count": max_count,
    })

    if limit_result.get("limit_exceeded"):
        trace.append(f"Outpatient Agent → REJECTED: {current_count}/{max_count} scans used")
        return {
            "current_agent": "Outpatient Agent",
            "agent_trace": trace,
            "decision": "REJECTED",
            "reasoning": (
                f"You have already reached the maximum limit of {max_count} Scan Covers "
                f"for this policy year ({current_count}/{max_count} used). "
                f"No further scan claims can be processed this year."
            ),
            "payout_amount": 0.0,
        }

    payout = min(total_cost, payout_cap)
    trace.append(f"Outpatient Agent → APPROVED: Scan #{current_count + 1} of {max_count} → €{payout:.2f}")

    return {
        "current_agent": "Outpatient Agent",
        "agent_trace": trace,
        "decision": "APPROVED",
        "reasoning": (
            f"Scan Cover claim approved. Scan #{current_count + 1} of {max_count} for this year. "
            f"Cash back of €{payout:.2f} (capped at €{payout_cap:.2f}). Facility: {practitioner}."
        ),
        "payout_amount": payout,
    }
