"""
Laya Healthcare AI Claims Chatbot — LangGraph Shared State
Defines the TypedDict used across all agent nodes in the state graph.
"""

from __future__ import annotations
from typing import Annotated, TypedDict
import operator


class ClaimState(TypedDict, total=False):
    """Shared state passed through all LangGraph nodes."""

    # Conversation
    messages: Annotated[list, operator.add]  # chat history (HumanMessage / AIMessage)

    # Authenticated user context (from JWT / login session)
    user_context: dict  # { name, email, role, member_id, user_id }

    # Session & multi-turn conversation support
    session_id: str  # unique session identifier for multi-turn
    conversation_history: Annotated[list[dict], operator.add]  # previous interactions in this session

    # Member context
    member_id: str
    member_data: dict  # full member record from DB

    # Document data
    extracted_doc: dict  # OCR/mock document fields
    user_message: str  # original user text

    # Agent routing
    current_agent: str  # which agent is currently active
    agent_trace: Annotated[list[str], operator.add]  # ordered list of agents visited
    route: str  # routing decision from principal agent

    # Claim decision
    decision: str  # APPROVED / REJECTED / PARTIALLY APPROVED / PENDING / ACTION REQUIRED
    reasoning: str  # human-readable explanation
    payout_amount: float  # calculated payout in EUR

    # Flags
    flags: Annotated[list[str], operator.add]  # escalation flags (LEGAL_REVIEW, DUPLICATE, etc.)
    needs_info: Annotated[list[str], operator.add]  # missing documents/info
