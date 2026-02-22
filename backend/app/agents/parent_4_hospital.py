"""
Laya Healthcare — Parent Agent 4: Hospital & Complex Procedure Processing
Handles in-patient stays, procedure code validation, and hospital invoices.

Child Agents (LLM-powered):
  - In-Patient Calculator: Calculates hospital cash back payout
  - Procedure Code Validator: Validates clinical requirements per procedure code
"""

from __future__ import annotations

from app.agents.state import ClaimState
from app.tools.policy_tools import calculate_hospital_payout
from app.agents.child_agents import invoke_inpatient_calculator, invoke_procedure_code_validator


async def hospital_node(state: ClaimState) -> dict:
    """Process hospital and complex procedure claims.
    Uses LLM child agents for enhanced natural language responses."""
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
    # FIX: Only check against non-hospital treatment types (removed empty string match)
    if total_cost > 1000 and treatment_type not in ("Hospital In-patient",):
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

    # ── Check 2: Procedure Code Validation (with Child Agent) ──
    procedure_code = extracted_doc.get("procedure_code")
    if procedure_code:
        result = await _validate_procedure_code(extracted_doc, trace_entries)
        if result:
            return result

    # ── Check 3: Hospital In-patient Cash Back (with Child Agent) ──
    hospital_days = extracted_doc.get("hospital_days", 0)
    if hospital_days and hospital_days > 0:
        return await _process_hospital_days(hospital_days, usage, total_cost, practitioner, trace_entries)

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


async def _process_hospital_days(hospital_days: int, usage: dict, total_cost: float, practitioner: str, trace: list) -> dict:
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
        output = {
            "current_agent": "Hospital Agent",
            "agent_trace": trace,
            "decision": "REJECTED",
            "reasoning": (
                f"All 40 hospital in-patient days have already been used this year "
                f"({days_used}/40). No further hospital cash back is available."
            ),
            "payout_amount": 0.0,
        }
        enhanced, child_trace = await invoke_inpatient_calculator(hospital_days, days_used, total_cost, output)
        trace.append(child_trace)
        output["reasoning"] = enhanced
        return output

    if rejected_days > 0:
        trace.append(
            f"Hospital Agent → PARTIALLY APPROVED: {approved_days} days approved, "
            f"{rejected_days} days rejected"
        )
        output = {
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
        enhanced, child_trace = await invoke_inpatient_calculator(hospital_days, days_used, total_cost, output)
        trace.append(child_trace)
        output["reasoning"] = enhanced
        return output

    trace.append(f"Hospital Agent → APPROVED: {approved_days} days → €{payout:.2f}")
    output = {
        "current_agent": "Hospital Agent",
        "agent_trace": trace,
        "decision": "APPROVED",
        "reasoning": (
            f"Hospital in-patient claim approved. {approved_days} days at €20/day = €{payout:.2f}. "
            f"Facility: {practitioner}. {40 - days_used - approved_days} days remaining this year."
        ),
        "payout_amount": payout,
    }
    enhanced, child_trace = await invoke_inpatient_calculator(hospital_days, days_used, total_cost, output)
    trace.append(child_trace)
    output["reasoning"] = enhanced
    return output


async def _validate_procedure_code(extracted_doc: dict, trace: list) -> dict | None:
    """Validate specific procedure code requirements. Returns a result dict if validation fails."""
    procedure_code = extracted_doc.get("procedure_code")
    clinical_indicator = extracted_doc.get("clinical_indicator", "")
    histology = extracted_doc.get("histology_report_attached", False)
    serum_ferritin = extracted_doc.get("serum_ferritin_provided", False)

    # Procedure Code 29: Basal cell carcinoma — requires histology report
    if procedure_code == 29:
        trace.append("Hospital Agent → Procedure Code 29 (Basal cell carcinoma) detected")
        if not histology:
            trace.append("Hospital Agent → REJECTED: Histology Report not attached")
            output = {
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
            # Enhance with Procedure Code Validator child agent
            enhanced, child_trace = await invoke_procedure_code_validator(
                procedure_code, clinical_indicator, histology, serum_ferritin, output,
            )
            trace.append(child_trace)
            output["reasoning"] = enhanced
            return output
        trace.append("Hospital Agent → Histology Report verified ✓")

    # Procedure Code 16: Phlebotomy — requires serum ferritin levels
    if procedure_code == 16:
        trace.append("Hospital Agent → Procedure Code 16 (Phlebotomy) detected")
        if clinical_indicator == "0222" and not serum_ferritin:
            trace.append("Hospital Agent → REJECTED: Initial serum ferritin levels not documented")
            output = {
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
            enhanced, child_trace = await invoke_procedure_code_validator(
                procedure_code, clinical_indicator, histology, serum_ferritin, output,
            )
            trace.append(child_trace)
            output["reasoning"] = enhanced
            return output
        trace.append("Hospital Agent → Procedure code requirements verified ✓")

    return None  # No issues found
