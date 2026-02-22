"""
Laya Healthcare — Parent Agent 1: Intake & Document Intelligence
Handles form classification, OCR extraction, and compliance checking.

Child Agents (LLM-powered):
  - Form Classifier: Classifies document type
  - Compliance Checker: Validates signatures and structural requirements
"""

from __future__ import annotations

import json

from app.agents.state import ClaimState
from app.agents.child_agents import invoke_form_classifier, invoke_compliance_checker


async def intake_node(state: ClaimState) -> dict:
    """Process document intake: classify form, extract data, check compliance.
    Uses LLM child agents to enhance responses when available."""
    extracted_doc = state.get("extracted_doc", {})
    member_data = state.get("member_data", {})
    trace_entries = []

    # ── Step 1: Form Classification (with Child Agent) ──
    form_type = extracted_doc.get("form_type", "Unknown")
    treatment_type = extracted_doc.get("treatment_type", "Unknown")
    trace_entries.append(f"Intake Agent → Form classified as: {form_type}")

    # Invoke Form Classifier child agent for enhanced classification
    _, classifier_trace = await invoke_form_classifier(extracted_doc)
    trace_entries.append(classifier_trace)

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

    # ── Step 3: Compliance & Signature Check (with Child Agent) ──
    signature_present = extracted_doc.get("signature_present", True)
    if not signature_present:
        trace_entries.append("Intake Agent → FAILED: Member signature is missing")
        enhanced_reasoning, compliance_trace = await invoke_compliance_checker(
            extracted_doc,
            decision="ACTION REQUIRED",
        )
        trace_entries.append(compliance_trace)
        return {
            "current_agent": "Intake Agent",
            "agent_trace": trace_entries,
            "decision": "ACTION REQUIRED",
            "reasoning": enhanced_reasoning or (
                "The main member or policyholder signature is missing on the claim form. "
                "Please sign and re-upload the form."
            ),
            "needs_info": ["Signed claim form"],
        }

    if wrong_form:
        trace_entries.append("Intake Agent → FAILED: Wrong form type used")
        enhanced_reasoning, compliance_trace = await invoke_compliance_checker(
            extracted_doc,
            decision="ACTION REQUIRED",
        )
        trace_entries.append(compliance_trace)
        return {
            "current_agent": "Intake Agent",
            "agent_trace": trace_entries,
            "decision": "ACTION REQUIRED",
            "reasoning": enhanced_reasoning or (
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
