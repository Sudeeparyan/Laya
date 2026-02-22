"""
Laya Healthcare — Principal Agent Node
Routes claims to the correct Parent Agent using GPT-4o.
"""

from __future__ import annotations

import json

from langchain_core.messages import SystemMessage, HumanMessage

from app.agents.state import ClaimState
from app.agents.llm_factory import get_llm
from app.prompts.principal import PRINCIPAL_AGENT_PROMPT


def _deterministic_route(extracted_doc: dict, user_message: str) -> tuple[str, str]:
    """Fallback deterministic routing when LLM is unavailable.
    Analyzes treatment type and keywords to decide the route."""
    treatment_type = extracted_doc.get("treatment_type", "").lower()
    form_type = extracted_doc.get("form_type", "").lower()
    combined = f"{treatment_type} {form_type} {user_message}".lower()

    # Exceptions: maternity, accident, solicitor, duplicate, fraud
    if any(kw in combined for kw in [
        "maternity", "adoption", "pre/post-natal", "prenatal", "postnatal",
        "solicitor", "piab", "third-party", "third party", "fraud",
        "accident", "injury",
    ]):
        return "exceptions", "Matched exception keywords (maternity/accident/solicitor)"

    # Hospital: in-patient, procedure code, hospital days
    if any(kw in combined for kw in [
        "hospital in-patient", "in-patient", "inpatient", "procedure code",
        "hospital stay", "hospital days", "admission",
    ]):
        return "hospital", "Matched hospital/in-patient keywords"

    # Also route to hospital if hospital_days or procedure_code present
    if extracted_doc.get("hospital_days") or extracted_doc.get("procedure_code"):
        return "hospital", "Document contains hospital_days or procedure_code"

    # Outpatient: everything else (GP, consultant, prescription, therapy, dental, scan)
    return "outpatient", "Default route to outpatient processing"


async def principal_node(state: ClaimState) -> dict:
    """Analyze the claim and decide which Parent Agent should handle it."""
    member_data = state.get("member_data", {})
    extracted_doc = state.get("extracted_doc", {})
    user_message = state.get("user_message", "")
    user_context = state.get("user_context", {})

    route = "outpatient"
    reasoning = ""

    # Extract user info for prompt personalization
    user_name = user_context.get("name", "Unknown") if user_context else "Unknown"
    user_email = user_context.get("email", "N/A") if user_context else "N/A"
    user_role = user_context.get("role", "customer") if user_context else "customer"
    user_member_id = user_context.get("member_id", "N/A") if user_context else "N/A"

    # Check if API key is available for LLM routing
    from app.config import settings
    has_api_key = bool(settings.OPENAI_API_KEY)

    if has_api_key:
        # Build the prompt
        prompt = PRINCIPAL_AGENT_PROMPT.format(
            member_data=json.dumps(member_data, indent=2, default=str),
            extracted_doc=json.dumps(extracted_doc, indent=2, default=str),
            user_message=user_message,
            user_name=user_name,
            user_email=user_email,
            user_role=user_role,
            user_member_id=user_member_id,
        )

        llm = get_llm("principal")

        try:
            try:
                response = await llm.ainvoke([
                    SystemMessage(content=prompt),
                    HumanMessage(content=f"Route this claim. User says: '{user_message}'"),
                ])
            except Exception:
                # Fallback to sync if ainvoke not available
                response = llm.invoke([
                    SystemMessage(content=prompt),
                    HumanMessage(content=f"Route this claim. User says: '{user_message}'"),
                ])

            # Parse the routing decision
            try:
                content = response.content.strip()
                # Try to extract JSON from the response
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()

                parsed = json.loads(content)
                route = parsed.get("route", "outpatient")
                reasoning = parsed.get("reasoning", "")
            except (json.JSONDecodeError, IndexError):
                # If LLM doesn't return valid JSON, try keyword extraction
                content_lower = response.content.lower()
                if any(kw in content_lower for kw in ["maternity", "duplicate", "fraud", "solicitor", "third-party"]):
                    route = "exceptions"
                elif any(kw in content_lower for kw in ["hospital", "in-patient", "procedure code"]):
                    route = "hospital"
                else:
                    route = "outpatient"
                reasoning = f"Routed based on keyword analysis: {route}"
        except Exception as e:
            # LLM call failed entirely — fall back to deterministic routing
            route, reasoning = _deterministic_route(extracted_doc, user_message)
            reasoning = f"LLM unavailable, using rule-based routing: {reasoning}"
    else:
        # No API key — use deterministic routing
        route, reasoning = _deterministic_route(extracted_doc, user_message)
        reasoning = f"Rule-based routing (no LLM configured): {reasoning}"

    # Validate route — only treatment-specific parents are valid after principal
    valid_routes = ["outpatient", "hospital", "exceptions"]
    if route not in valid_routes:
        route = "outpatient"

    return {
        "route": route,
        "current_agent": "Principal Agent",
        "agent_trace": [f"Principal Agent → routing to {route} ({reasoning})"],
    }
