"""
Laya Healthcare — LLM-Powered Child Agents
Provides child agent functions that use GPT-4o-mini for enhanced natural language
processing within parent agents. Falls back gracefully when LLM is unavailable.

Architecture: Principal Agent → 5 Parent Agents → 15 Child Agents (LLM-powered)

Each child agent:
  1. Receives a formatted prompt template from the prompts/ module
  2. Receives context (member data, document data, deterministic result)
  3. Generates a natural language enhanced response via GPT-4o-mini
  4. Falls back to deterministic reasoning if LLM is unavailable
"""

from __future__ import annotations

import json
import logging

from langchain_core.messages import SystemMessage, HumanMessage

from app.agents.llm_factory import get_llm

logger = logging.getLogger(__name__)


async def invoke_child_agent(
    prompt_template: str,
    context: dict,
    fallback_reasoning: str,
    child_name: str = "Child Agent",
) -> tuple[str, str]:
    """Invoke an LLM-powered child agent with the given prompt and context.

    The child agent enhances the deterministic result with natural language.
    The deterministic decision and payout are always preserved — only the
    reasoning text is enhanced.

    Args:
        prompt_template: The formatted system prompt for the child agent
        context: Dict of context variables to include in the message
        fallback_reasoning: Deterministic reasoning to use if LLM fails
        child_name: Name of the child agent for tracing

    Returns:
        Tuple of (enhanced_reasoning, trace_entry)
    """
    from app.config import settings

    if not settings.OPENAI_API_KEY or not settings.USE_LLM_CHILDREN:
        return fallback_reasoning, f"{child_name} → Using deterministic reasoning"

    try:
        llm = get_llm("child")

        context_str = json.dumps(context, indent=2, default=str)

        messages = [
            SystemMessage(content=prompt_template),
            HumanMessage(content=(
                f"Process this claim based on the following context:\n\n"
                f"{context_str}\n\n"
                f"The deterministic analysis concluded: {fallback_reasoning}\n\n"
                f"Generate a clear, professional, and personalized response for the member. "
                f"Keep the same decision and amounts but make the explanation more natural and helpful. "
                f"Be concise (2-4 sentences max). Do not include any JSON formatting or markdown."
            )),
        ]

        try:
            response = await llm.ainvoke(messages)
        except Exception:
            # Fallback to sync if ainvoke not available
            response = llm.invoke(messages)

        enhanced = response.content.strip()

        # Sanity check: response should be meaningful
        if len(enhanced) < 10:
            return fallback_reasoning, f"{child_name} → LLM response too short, using fallback"

        return enhanced, f"{child_name} → Enhanced reasoning via LLM ✓"

    except Exception as e:
        logger.warning(f"Child agent '{child_name}' LLM call failed: {e}")
        return fallback_reasoning, f"{child_name} → LLM unavailable, using deterministic reasoning"


async def invoke_form_classifier(extracted_doc: dict) -> tuple[str, str]:
    """Child Agent: Form Classifier — classifies document type."""
    from app.prompts.intake import FORM_CLASSIFIER_PROMPT
    return await invoke_child_agent(
        prompt_template=FORM_CLASSIFIER_PROMPT,
        context={"extracted_doc": extracted_doc},
        fallback_reasoning=f"Form classified as: {extracted_doc.get('form_type', 'Unknown')}",
        child_name="Form Classifier",
    )


async def invoke_compliance_checker(extracted_doc: dict, decision: str) -> tuple[str, str]:
    """Child Agent: Compliance Checker — checks signatures and structural requirements."""
    from app.prompts.intake import COMPLIANCE_CHECKER_PROMPT
    return await invoke_child_agent(
        prompt_template=COMPLIANCE_CHECKER_PROMPT.format(
            extracted_doc=json.dumps(extracted_doc, indent=2, default=str),
        ),
        context={"extracted_doc": extracted_doc, "decision": decision},
        fallback_reasoning="All compliance checks passed." if not decision else f"Compliance check result: {decision}",
        child_name="Compliance Checker",
    )


async def invoke_waiting_period_checker(
    policy_start_date: str, treatment_date: str, result_msg: str
) -> tuple[str, str]:
    """Child Agent: Waiting Period Enforcer — checks 12-week waiting period."""
    from app.prompts.eligibility import WAITING_PERIOD_PROMPT
    return await invoke_child_agent(
        prompt_template=WAITING_PERIOD_PROMPT.format(
            policy_start_date=policy_start_date,
            treatment_date=treatment_date,
        ),
        context={"policy_start_date": policy_start_date, "treatment_date": treatment_date},
        fallback_reasoning=result_msg,
        child_name="Waiting Period Enforcer",
    )


async def invoke_time_limit_checker(treatment_date: str, result_msg: str) -> tuple[str, str]:
    """Child Agent: Time Limit Enforcer — checks 12-month submission deadline."""
    from app.prompts.eligibility import TIME_LIMIT_PROMPT
    from datetime import datetime
    return await invoke_child_agent(
        prompt_template=TIME_LIMIT_PROMPT.format(
            treatment_date=treatment_date,
            today=datetime.now().strftime("%Y-%m-%d"),
        ),
        context={"treatment_date": treatment_date},
        fallback_reasoning=result_msg,
        child_name="Time Limit Enforcer",
    )


async def invoke_threshold_calculator(
    accumulated: float, new_amount: float, result_msg: str
) -> tuple[str, str]:
    """Child Agent: Quarterly Threshold Calculator — checks €150 threshold."""
    from app.prompts.eligibility import THRESHOLD_PROMPT
    return await invoke_child_agent(
        prompt_template=THRESHOLD_PROMPT.format(
            accumulated=f"{accumulated:.2f}",
            new_amount=f"{new_amount:.2f}",
        ),
        context={"accumulated": accumulated, "new_amount": new_amount},
        fallback_reasoning=result_msg,
        child_name="Threshold Calculator",
    )


async def invoke_gp_consultant_processor(
    visit_type: str, current_count: int, claimed_amount: float, result: dict
) -> tuple[str, str]:
    """Child Agent: GP & Consultant Visit Processor."""
    from app.prompts.outpatient import GP_CONSULTANT_PROMPT
    return await invoke_child_agent(
        prompt_template=GP_CONSULTANT_PROMPT.format(
            visit_type=visit_type,
            current_count=current_count,
            claimed_amount=f"{claimed_amount:.2f}",
        ),
        context={"visit_type": visit_type, "current_count": current_count, "result": result},
        fallback_reasoning=result.get("reasoning", ""),
        child_name=f"{visit_type} Processor",
    )


async def invoke_pharmacy_therapy_processor(
    treatment_type: str, practitioner_name: str,
    prescription_count: int, therapy_count: int, result: dict
) -> tuple[str, str]:
    """Child Agent: Pharmacy & Therapy Processor."""
    from app.prompts.outpatient import PHARMACY_THERAPY_PROMPT
    return await invoke_child_agent(
        prompt_template=PHARMACY_THERAPY_PROMPT.format(
            treatment_type=treatment_type,
            practitioner_name=practitioner_name,
            prescription_count=prescription_count,
            therapy_count=therapy_count,
        ),
        context={"treatment_type": treatment_type, "practitioner_name": practitioner_name, "result": result},
        fallback_reasoning=result.get("reasoning", ""),
        child_name="Pharmacy & Therapy Processor",
    )


async def invoke_dental_optical_scan_processor(
    treatment_type: str, dental_optical_count: int, scan_count: int,
    claimed_amount: float, result: dict
) -> tuple[str, str]:
    """Child Agent: Dental, Optical & Scan Processor."""
    from app.prompts.outpatient import DENTAL_OPTICAL_SCAN_PROMPT
    return await invoke_child_agent(
        prompt_template=DENTAL_OPTICAL_SCAN_PROMPT.format(
            treatment_type=treatment_type,
            dental_optical_count=dental_optical_count,
            scan_count=scan_count,
            claimed_amount=f"{claimed_amount:.2f}",
        ),
        context={"treatment_type": treatment_type, "result": result},
        fallback_reasoning=result.get("reasoning", ""),
        child_name="Dental/Optical/Scan Processor",
    )


async def invoke_inpatient_calculator(
    hospital_days: int, days_used: int, claimed_amount: float, result: dict
) -> tuple[str, str]:
    """Child Agent: In-Patient Cash Back Calculator."""
    from app.prompts.hospital import INPATIENT_CALCULATOR_PROMPT
    return await invoke_child_agent(
        prompt_template=INPATIENT_CALCULATOR_PROMPT.format(
            hospital_days=hospital_days,
            days_used=days_used,
            claimed_amount=f"{claimed_amount:.2f}",
        ),
        context={"hospital_days": hospital_days, "days_used": days_used, "result": result},
        fallback_reasoning=result.get("reasoning", ""),
        child_name="In-Patient Calculator",
    )


async def invoke_procedure_code_validator(
    procedure_code: int, clinical_indicator: str,
    histology_attached: bool, serum_ferritin: bool, result: dict
) -> tuple[str, str]:
    """Child Agent: Medical Procedure Code Validator."""
    from app.prompts.hospital import PROCEDURE_CODE_PROMPT
    return await invoke_child_agent(
        prompt_template=PROCEDURE_CODE_PROMPT.format(
            procedure_code=procedure_code,
            clinical_indicator=clinical_indicator,
            histology_attached=histology_attached,
            serum_ferritin=serum_ferritin,
        ),
        context={"procedure_code": procedure_code, "result": result},
        fallback_reasoning=result.get("reasoning", "") if result else "Procedure code validated.",
        child_name="Procedure Code Validator",
    )


async def invoke_maternity_processor(
    maternity_claimed: bool, total_cost: float, result: dict
) -> tuple[str, str]:
    """Child Agent: Maternity & Newborn Processor."""
    from app.prompts.exceptions import MATERNITY_PROMPT
    return await invoke_child_agent(
        prompt_template=MATERNITY_PROMPT.format(
            maternity_claimed=maternity_claimed,
            total_cost=f"{total_cost:.2f}",
        ),
        context={"maternity_claimed": maternity_claimed, "total_cost": total_cost, "result": result},
        fallback_reasoning=result.get("reasoning", ""),
        child_name="Maternity Processor",
    )


async def invoke_duplicate_detector(
    member_id: str, treatment_date: str, practitioner_name: str,
    claimed_amount: float, result: dict
) -> tuple[str, str]:
    """Child Agent: Duplicate & Fraud Detector."""
    from app.prompts.exceptions import DUPLICATE_FRAUD_PROMPT
    return await invoke_child_agent(
        prompt_template=DUPLICATE_FRAUD_PROMPT.format(
            member_id=member_id,
            treatment_date=treatment_date,
            practitioner_name=practitioner_name,
            claimed_amount=f"{claimed_amount:.2f}",
        ),
        context={"member_id": member_id, "result": result},
        fallback_reasoning=result.get("reasoning", ""),
        child_name="Duplicate & Fraud Detector",
    )


async def invoke_third_party_escalator(
    is_accident: bool, solicitor_involved: bool, result: dict
) -> tuple[str, str]:
    """Child Agent: Third-Party & Subrogation Escalator."""
    from app.prompts.exceptions import THIRD_PARTY_PROMPT
    return await invoke_child_agent(
        prompt_template=THIRD_PARTY_PROMPT.format(
            is_accident=is_accident,
            solicitor_involved=solicitor_involved,
        ),
        context={"is_accident": is_accident, "solicitor_involved": solicitor_involved, "result": result},
        fallback_reasoning=result.get("reasoning", ""),
        child_name="Third-Party Escalator",
    )
