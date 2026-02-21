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


async def principal_node(state: ClaimState) -> dict:
    """Analyze the claim and decide which Parent Agent should handle it."""
    member_data = state.get("member_data", {})
    extracted_doc = state.get("extracted_doc", {})
    user_message = state.get("user_message", "")

    # Build the prompt
    prompt = PRINCIPAL_AGENT_PROMPT.format(
        member_data=json.dumps(member_data, indent=2, default=str),
        extracted_doc=json.dumps(extracted_doc, indent=2, default=str),
        user_message=user_message,
    )

    llm = get_llm("principal")

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
    route = "outpatient"  # default fallback
    reasoning = ""
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
        if "maternity" in content_lower or "duplicate" in content_lower or "fraud" in content_lower or "solicitor" in content_lower or "third-party" in content_lower:
            route = "exceptions"
        elif "hospital" in content_lower or "in-patient" in content_lower or "procedure code" in content_lower:
            route = "hospital"
        else:
            route = "outpatient"
        reasoning = f"Routed based on keyword analysis: {route}"

    # Validate route — only treatment-specific parents are valid after principal
    # (intake and eligibility already ran before principal in the pipeline)
    valid_routes = ["outpatient", "hospital", "exceptions"]
    if route not in valid_routes:
        route = "outpatient"

    return {
        "route": route,
        "current_agent": "Principal Agent",
        "agent_trace": [f"Principal Agent → routing to {route} ({reasoning})"],
    }
