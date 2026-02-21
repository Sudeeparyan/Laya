"""
Laya Healthcare AI Claims Chatbot — LangGraph Compiled State Graph
The main graph that orchestrates all agent nodes with conditional routing.

Flow:
  START → intake_node → principal_node → (conditional routing) → decision_node → END
"""

from __future__ import annotations

import json

from langgraph.graph import StateGraph, END

from app.agents.state import ClaimState
from app.agents.parent_1_intake import intake_node
from app.agents.principal_agent import principal_node
from app.agents.parent_2_eligibility import eligibility_node
from app.agents.parent_3_outpatient import outpatient_node
from app.agents.parent_4_hospital import hospital_node
from app.agents.parent_5_exceptions import exceptions_node
from app.models.database import get_member_by_id, update_usage, add_claim_to_history


# ──────────────────────────────────────────────
# Helper: Initial setup node
# ──────────────────────────────────────────────

def setup_node(state: ClaimState) -> dict:
    """Load member data from the database and prepare initial state."""
    member_id = state.get("member_id", "")
    extracted_doc = state.get("extracted_doc", {})

    # Try to get member_id from extracted doc if not provided at top level
    if not member_id and extracted_doc:
        member_id = extracted_doc.get("member_id", "")

    member_data = get_member_by_id(member_id)

    if member_data is None:
        return {
            "agent_trace": [f"Setup → ERROR: Member {member_id} not found in database"],
            "decision": "REJECTED",
            "reasoning": f"Member ID '{member_id}' was not found in the Laya Healthcare database. Please verify your membership number.",
            "payout_amount": 0.0,
            "current_agent": "Setup",
        }

    # Clean internal fields
    member_data.pop("_scenario_note", None)
    member_data.pop("password_hash", None)

    return {
        "member_data": member_data,
        "member_id": member_id,
        "agent_trace": [f"Setup → Member {member_id} ({member_data.get('first_name', '')} {member_data.get('last_name', '')}) loaded"],
        "current_agent": "Setup",
    }


# ──────────────────────────────────────────────
# Decision node: final aggregation
# ──────────────────────────────────────────────

def decision_node(state: ClaimState) -> dict:
    """Aggregate all state into a final claim decision and update the database."""
    decision = state.get("decision", "")
    reasoning = state.get("reasoning", "")
    payout = state.get("payout_amount", 0.0)
    member_id = state.get("member_id", "")
    extracted_doc = state.get("extracted_doc", {})
    treatment_type = extracted_doc.get("treatment_type", "")

    trace_entries = []

    if decision:
        # Decision was already made by a previous agent
        trace_entries.append(f"Decision Agent → Final: {decision}" + (f" (€{payout:.2f})" if payout else ""))
    else:
        # No explicit decision was made — default to approved
        decision = "APPROVED"
        reasoning = "All checks passed. Claim approved for processing."
        payout = 0.0
        trace_entries.append("Decision Agent → Default: APPROVED (all checks passed)")

    # ── Update the Database after a successful claim ──
    if decision in ("APPROVED", "PARTIALLY APPROVED") and member_id:
        from datetime import datetime

        # Update the correct usage counter based on treatment type
        usage_field_map = {
            "GP & A&E": "gp_visits_count",
            "Consultant Fee": "consultant_visits_count",
            "Prescription": "prescription_count",
            "Dental & Optical": "dental_optical_count",
            "Scan Cover": "scan_count",
        }
        usage_field = usage_field_map.get(treatment_type)
        if usage_field:
            update_usage(member_id, usage_field, 1)
            trace_entries.append(f"Decision Agent → DB Updated: {usage_field} +1")

        # Update hospital days if applicable
        hospital_days = extracted_doc.get("hospital_days", 0)
        if hospital_days and treatment_type in ("Hospital In-patient", ""):
            approved_days = hospital_days  # simplified; actual approved days from calculation
            if decision == "PARTIALLY APPROVED":
                member_data = state.get("member_data", {})
                days_used = member_data.get("current_year_usage", {}).get("hospital_days_count", 0)
                approved_days = min(hospital_days, 40 - days_used)
            update_usage(member_id, "hospital_days_count", approved_days)
            trace_entries.append(f"Decision Agent → DB Updated: hospital_days_count +{approved_days}")

        # Update quarterly accumulated receipts
        total_cost = extracted_doc.get("total_cost", 0.0)
        if total_cost > 0:
            update_usage(member_id, "q_accumulated_receipts", total_cost)
            trace_entries.append(f"Decision Agent → DB Updated: q_accumulated_receipts +€{total_cost:.2f}")

        # Add to claims history
        claim_record = {
            "claim_id": f"CLM-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "treatment_type": treatment_type,
            "treatment_date": extracted_doc.get("treatment_date", ""),
            "claimed_amount": extracted_doc.get("total_cost", 0.0),
            "approved_amount": payout,
            "status": decision,
            "practitioner_name": extracted_doc.get("practitioner_name", ""),
            "submitted_date": datetime.now().strftime("%Y-%m-%d"),
        }
        add_claim_to_history(member_id, claim_record)
        trace_entries.append(f"Decision Agent → Claim {claim_record['claim_id']} recorded in history")

    return {
        "decision": decision,
        "reasoning": reasoning,
        "payout_amount": payout,
        "current_agent": "Decision Agent",
        "agent_trace": trace_entries,
    }


# ──────────────────────────────────────────────
# Routing functions
# ──────────────────────────────────────────────

def route_after_intake(state: ClaimState) -> str:
    """After intake, check if there was a hard stop (ACTION_REQUIRED) or continue to eligibility."""
    decision = state.get("decision", "")
    if decision in ("ACTION REQUIRED", "REJECTED"):
        return "decision_node"
    return "eligibility_node"


def route_after_eligibility(state: ClaimState) -> str:
    """After eligibility checks, either reject or continue to principal for routing."""
    decision = state.get("decision", "")
    if decision == "REJECTED":
        return "decision_node"
    return "principal_node"


def route_after_principal(state: ClaimState) -> str:
    """Route from principal agent to the correct treatment-specific parent agent."""
    route = state.get("route", "outpatient")
    route_map = {
        "outpatient": "outpatient_node",
        "hospital": "hospital_node",
        "exceptions": "exceptions_node",
    }
    return route_map.get(route, "outpatient_node")


def route_after_setup(state: ClaimState) -> str:
    """After setup, check if member was found."""
    decision = state.get("decision", "")
    if decision == "REJECTED":
        return "decision_node"
    return "intake_node"


# ──────────────────────────────────────────────
# Build the graph
# ──────────────────────────────────────────────

def build_graph() -> StateGraph:
    """Construct and compile the LangGraph state graph."""
    graph = StateGraph(ClaimState)

    # Add nodes
    graph.add_node("setup_node", setup_node)
    graph.add_node("intake_node", intake_node)
    graph.add_node("principal_node", principal_node)
    graph.add_node("eligibility_node", eligibility_node)
    graph.add_node("outpatient_node", outpatient_node)
    graph.add_node("hospital_node", hospital_node)
    graph.add_node("exceptions_node", exceptions_node)
    graph.add_node("decision_node", decision_node)

    # Set entry point
    graph.set_entry_point("setup_node")

    # Define edges: setup → intake → eligibility → principal → (treatment) → decision
    graph.add_conditional_edges("setup_node", route_after_setup, {
        "decision_node": "decision_node",
        "intake_node": "intake_node",
    })

    graph.add_conditional_edges("intake_node", route_after_intake, {
        "decision_node": "decision_node",
        "eligibility_node": "eligibility_node",
    })

    graph.add_conditional_edges("eligibility_node", route_after_eligibility, {
        "decision_node": "decision_node",
        "principal_node": "principal_node",
    })

    graph.add_conditional_edges("principal_node", route_after_principal, {
        "outpatient_node": "outpatient_node",
        "hospital_node": "hospital_node",
        "exceptions_node": "exceptions_node",
    })

    # All processing agents → decision_node
    graph.add_edge("outpatient_node", "decision_node")
    graph.add_edge("hospital_node", "decision_node")
    graph.add_edge("exceptions_node", "decision_node")

    # Decision → END
    graph.add_edge("decision_node", END)

    return graph


# Compile the graph
claim_graph = build_graph().compile()


async def process_claim(
    member_id: str,
    user_message: str,
    extracted_doc: dict | None = None,
) -> dict:
    """Run a claim through the full agent pipeline.

    Returns a dict with: decision, reasoning, agent_trace, payout_amount, flags, needs_info
    """
    initial_state: ClaimState = {
        "messages": [],
        "member_id": member_id,
        "member_data": {},
        "extracted_doc": extracted_doc or {},
        "user_message": user_message,
        "current_agent": "",
        "agent_trace": [],
        "route": "",
        "decision": "",
        "reasoning": "",
        "payout_amount": 0.0,
        "flags": [],
        "needs_info": [],
    }

    # Run the graph
    result = await claim_graph.ainvoke(initial_state)

    return {
        "decision": result.get("decision", "PENDING"),
        "reasoning": result.get("reasoning", "Processing complete."),
        "agent_trace": result.get("agent_trace", []),
        "payout_amount": result.get("payout_amount", 0.0),
        "flags": result.get("flags", []),
        "needs_info": result.get("needs_info", []),
    }
