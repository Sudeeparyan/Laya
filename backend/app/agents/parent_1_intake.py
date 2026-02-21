"""
Laya Healthcare — Parent Agent 1: Intake & Document Intelligence
Handles form classification, OCR extraction, and compliance checking.
"""

from __future__ import annotations

from app.agents.state import ClaimState


def intake_node(state: ClaimState) -> dict:
    """Process document intake: classify form, extract data, check compliance."""
    extracted_doc = state.get("extracted_doc", {})
    member_data = state.get("member_data", {})
    trace_entries = []

    # ── Step 1: Form Classification ──
    form_type = extracted_doc.get("form_type", "Unknown")
    treatment_type = extracted_doc.get("treatment_type", "Unknown")
    trace_entries.append(f"Intake Agent → Form classified as: {form_type}")

    # Check for wrong form usage
    wrong_form = False
    if "General Practitioner Claim Form" in form_type and treatment_type in ["GP & A&E", "Consultant Fee"]:
        wrong_form = True
        trace_entries.append("Intake Agent → WARNING: Wrong form detected (GP Claim Form used for cash-back claim)")

    # ── Step 2: Data Extraction (mock OCR pass-through) ──
    if not extracted_doc:
        return {
            "current_agent": "Intake Agent",
            "agent_trace": ["Intake Agent → No document data provided. Cannot process."],
            "decision": "ACTION REQUIRED",
            "reasoning": "No document or claim data was provided. Please upload a claim form or receipt.",
            "needs_info": ["Claim form or receipt document"],
        }

    trace_entries.append(f"Intake Agent → Data extracted: {treatment_type} by {extracted_doc.get('practitioner_name', 'Unknown')}")

    # ── Step 3: Compliance & Signature Check ──
    signature_present = extracted_doc.get("signature_present", True)
    if not signature_present:
        trace_entries.append("Intake Agent → FAILED: Member signature is missing")
        return {
            "current_agent": "Intake Agent",
            "agent_trace": trace_entries,
            "decision": "ACTION REQUIRED",
            "reasoning": "The main member or policyholder signature is missing on the claim form. Please sign and re-upload the form.",
            "needs_info": ["Signed claim form"],
        }

    if wrong_form:
        trace_entries.append("Intake Agent → FAILED: Wrong form type used")
        return {
            "current_agent": "Intake Agent",
            "agent_trace": trace_entries,
            "decision": "ACTION REQUIRED",
            "reasoning": (
                f"It looks like you uploaded the '{form_type}' meant for hospital/surgical procedures. "
                f"To claim your cash back, please upload the 'Money Smart Out-patient Claim Form' with your receipt."
            ),
            "needs_info": ["Correct claim form (Money Smart Out-patient Claim Form)"],
        }

    trace_entries.append("Intake Agent → All compliance checks passed ✓")

    return {
        "current_agent": "Intake Agent",
        "agent_trace": trace_entries,
        "extracted_doc": extracted_doc,
        "member_data": member_data,
    }
