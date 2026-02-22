"""
Laya Healthcare AI Claims Chatbot — Pydantic Schemas
Defines all data models for the API, database records, and agent communication.
"""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


# ──────────────────────────────────────────────
# Database / Member Models
# ──────────────────────────────────────────────

class ClaimHistoryItem(BaseModel):
    """A single historical claim record."""
    claim_id: str
    treatment_date: str
    treatment_type: str
    practitioner_name: str
    claimed_amount: float
    status: str  # Approved, Rejected, Pending Threshold, etc.


class CurrentYearUsage(BaseModel):
    """Tracks a member's benefits usage for the current year/quarter."""
    year: int = 2026
    quarter: str = "Q1"
    q_accumulated_receipts: float = 0.0
    gp_visits_count: int = 0
    prescription_count: int = 0
    dental_optical_count: int = 0
    therapy_count: int = 0
    scan_count: int = 0
    consultant_visits_count: int = 0
    hospital_days_count: int = 0
    maternity_claimed: bool = False


class Member(BaseModel):
    """Full member record matching the JSON data structure."""
    member_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    iban_last4: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    eircode: Optional[str] = None
    scheme_name: str = "Money Smart 20 Family"
    policy_start_date: str
    status: str = "Active"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    current_year_usage: CurrentYearUsage = CurrentYearUsage()
    claims_history: list[ClaimHistoryItem] = []
    _scenario_note: Optional[str] = None


class MemberSummary(BaseModel):
    """Lightweight member info for sidebar listing."""
    member_id: str
    first_name: str
    last_name: str
    scheme_name: str
    status: str
    scenario_note: Optional[str] = None


# ──────────────────────────────────────────────
# API Request / Response Models
# ──────────────────────────────────────────────

class ExtractedDocumentData(BaseModel):
    """OCR-extracted (or mock) document data."""
    member_id: str
    patient_name: str
    form_type: str = "Money Smart Out-patient Claim Form"
    treatment_type: str
    treatment_date: str
    practitioner_name: str
    total_cost: float
    signature_present: bool = True
    procedure_code: Optional[int] = None
    clinical_indicator: Optional[str] = None
    hospital_days: Optional[int] = None
    is_accident: Optional[bool] = None
    solicitor_involved: Optional[bool] = None
    histology_report_attached: Optional[bool] = None
    serum_ferritin_provided: Optional[bool] = None


class ClaimRequest(BaseModel):
    """Incoming chat/claim request from the frontend."""
    message: str
    member_id: str
    extracted_document_data: Optional[ExtractedDocumentData] = None
    user_context: Optional[dict] = None  # { name, email, role, member_id, user_id }
    session_id: Optional[str] = None  # For multi-turn conversation support


class AgentTraceEntry(BaseModel):
    """A single step in the agent routing trace."""
    agent: str
    action: str
    result: Optional[str] = None


class ClaimResponse(BaseModel):
    """AI claim processing result returned to the frontend."""
    decision: str = Field(
        description="APPROVED, REJECTED, PARTIALLY APPROVED, PENDING, or ACTION REQUIRED"
    )
    reasoning: str = Field(description="Human-readable explanation of the decision")
    agent_trace: list[str] = Field(
        default_factory=list,
        description="Ordered list of agents visited during processing"
    )
    payout_amount: Optional[float] = Field(
        default=None,
        description="Calculated payout in EUR (if approved)"
    )
    flags: list[str] = Field(
        default_factory=list,
        description="Escalation flags (e.g., LEGAL_REVIEW, DUPLICATE)"
    )
    needs_info: list[str] = Field(
        default_factory=list,
        description="Missing documents or information"
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Session ID for multi-turn conversation continuity"
    )


class ChatMessage(BaseModel):
    """A single chat message."""
    role: str  # "user" or "assistant"
    content: str
    metadata: Optional[dict] = None
