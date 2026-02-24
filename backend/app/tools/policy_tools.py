"""
Laya Healthcare AI Claims Chatbot — Policy Tools
LangChain tools for enforcing Money Smart 20 Family policy rules:
waiting periods, submission deadlines, thresholds, annual limits,
hospital payout calculations, and therapy validation.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from langchain_core.tools import tool


@tool
def check_waiting_period(policy_start_date: str, treatment_date: str) -> dict:
    """Check if treatment falls within the 12-week initial waiting period.
    Returns whether the claim is within the waiting period and days remaining."""
    try:
        start = datetime.strptime(policy_start_date, "%Y-%m-%d")
        treatment = datetime.strptime(treatment_date, "%Y-%m-%d")
        waiting_end = start + timedelta(weeks=12)
        is_within = treatment < waiting_end
        days_remaining = max(0, (waiting_end - treatment).days)
        return {
            "is_within_waiting_period": is_within,
            "waiting_period_end": waiting_end.strftime("%Y-%m-%d"),
            "days_remaining": days_remaining,
            "message": (
                f"BLOCKED: Treatment date {treatment_date} is within the 12-week waiting period "
                f"(ends {waiting_end.strftime('%Y-%m-%d')}). {days_remaining} days remaining."
                if is_within
                else f"OK: Treatment date is after the 12-week waiting period."
            ),
        }
    except ValueError as e:
        return {"error": f"Invalid date format: {e}. Use YYYY-MM-DD."}


@tool
def check_submission_deadline(treatment_date: str) -> dict:
    """Check whether a receipt/claim is within the 12-month submission window.
    Claims must be submitted within 12 months of the treatment date."""
    try:
        treatment = datetime.strptime(treatment_date, "%Y-%m-%d")
        today = datetime.now()
        deadline = treatment + timedelta(days=365)
        is_expired = today > deadline
        days_over = max(0, (today - deadline).days) if is_expired else 0
        return {
            "is_expired": is_expired,
            "submission_deadline": deadline.strftime("%Y-%m-%d"),
            "days_over_deadline": days_over,
            "message": (
                f"EXPIRED: This receipt is older than 12 months. Deadline was {deadline.strftime('%Y-%m-%d')} "
                f"({days_over} days overdue)."
                if is_expired
                else f"OK: Receipt is within the 12-month submission window (deadline: {deadline.strftime('%Y-%m-%d')})."
            ),
        }
    except ValueError as e:
        return {"error": f"Invalid date format: {e}. Use YYYY-MM-DD."}


@tool
def check_quarterly_threshold(
    current_accumulated: float, new_amount: float, threshold: float = 150.0
) -> dict:
    """Check whether accumulated receipts cross the €150 quarterly threshold
    for payment to be triggered. Returns whether threshold is crossed."""
    new_total = current_accumulated + new_amount
    crosses = new_total >= threshold
    return {
        "crosses_threshold": crosses,
        "previous_total": current_accumulated,
        "new_claim_amount": new_amount,
        "new_total": new_total,
        "threshold": threshold,
        "message": (
            f"THRESHOLD CROSSED: €{current_accumulated:.2f} + €{new_amount:.2f} = €{new_total:.2f} "
            f"(≥ €{threshold:.2f}). Payment can be triggered."
            if crosses
            else f"BELOW THRESHOLD: €{current_accumulated:.2f} + €{new_amount:.2f} = €{new_total:.2f} "
            f"(< €{threshold:.2f}). Claim approved but payment pending until threshold is met."
        ),
    }


@tool
def check_annual_limit(current_count: int, max_count: int) -> dict:
    """Check if the annual limit for a specific benefit type has been exceeded.
    Returns whether the limit is exceeded and how many remain."""
    exceeded = current_count >= max_count
    remaining = max(0, max_count - current_count)
    return {
        "limit_exceeded": exceeded,
        "current_count": current_count,
        "max_count": max_count,
        "remaining": remaining,
        "message": (
            f"LIMIT EXCEEDED: {current_count}/{max_count} already used. No more claims allowed this year."
            if exceeded
            else f"OK: {current_count}/{max_count} used. {remaining} remaining this year."
        ),
    }


@tool
def calculate_hospital_payout(
    days_requested: int, days_used: int, max_days: int = 40, rate: float = 20.0
) -> dict:
    """Calculate hospital in-patient cash back payout.
    €20 per day up to a max of 40 days per year."""
    days_available = max(0, max_days - days_used)
    approved_days = min(days_requested, days_available)
    rejected_days = days_requested - approved_days
    payout = approved_days * rate

    if approved_days == 0:
        msg = f"REJECTED: All {max_days} hospital days already used this year."
    elif rejected_days > 0:
        msg = (
            f"PARTIALLY APPROVED: {approved_days} days approved at €{rate}/day = €{payout:.2f}. "
            f"{rejected_days} days rejected (exceeds annual {max_days}-day limit)."
        )
    else:
        msg = f"APPROVED: {approved_days} days at €{rate}/day = €{payout:.2f}."

    return {
        "approved_days": approved_days,
        "rejected_days": rejected_days,
        "payout": payout,
        "days_available_before": days_available,
        "message": msg,
    }


@tool
def validate_therapy_type(therapy_name: str) -> dict:
    """Check if a therapy type is covered under the Day-to-Day Therapies benefit.
    Allowed: Physiotherapy, reflexology, acupuncture, osteopathy, physical therapist, chiropractor."""
    allowed_therapies = [
        "physiotherapy",
        "reflexology",
        "acupuncture",
        "osteopathy",
        "physical therapist",
        "physical therapy",
        "chiropractor",
        "chiropractic",
    ]
    therapy_lower = therapy_name.strip().lower()
    is_valid = any(allowed in therapy_lower or therapy_lower in allowed for allowed in allowed_therapies)
    return {
        "is_valid": is_valid,
        "therapy_submitted": therapy_name,
        "allowed_therapies": [
            "Physiotherapy", "Reflexology", "Acupuncture",
            "Osteopathy", "Physical Therapist", "Chiropractor",
        ],
        "message": (
            f"OK: '{therapy_name}' is an eligible Day-to-Day Therapy."
            if is_valid
            else f"REJECTED: '{therapy_name}' is NOT an eligible Day-to-Day Therapy. "
            f"Covered therapies: Physiotherapy, reflexology, acupuncture, osteopathy, "
            f"physical therapy, and chiropractic."
        ),
    }


# Export all tools as a list for agent binding
policy_tools = [
    check_waiting_period,
    check_submission_deadline,
    check_quarterly_threshold,
    check_annual_limit,
    calculate_hospital_payout,
    validate_therapy_type,
]


# ── Source Document: Money Smart 20 Family IPID ──────────────────
# This is the official Insurance Product Information Document.
# Every AI recommendation MUST cite specific text from this document.

IPID_SOURCE = {
    "document_name": "Money Smart 20 Family — Insurance Product Information Document (IPID)",
    "document_id": "IPID-MS20F-2026",
    "issuer": "AXA Insurance dac, trading as Laya Healthcare",
    "file_path": "Laya docs/insuranceplan/ipid.md",
    "source_url": "https://www.layahealthcare.ie/api/document/dynamic/ipid?id=65&asOnDate=2026-02-24",

    "sections": {
        "gp_ae": {
            "rule": "GP and A&E: Up to €20 for up to 10 visits combined per year.",
            "section": "What is insured? → Cash Plan",
            "page": 1,
        },
        "hospital_cashback": {
            "rule": "Hospital day-case / In-patient Cash Back: Up to €20 per day for Hospital day-case or in-patient stay up to a max of 40 days per year.",
            "section": "What is insured? → Cash Plan",
            "page": 1,
        },
        "prescriptions": {
            "rule": "Prescriptions: Up to €10 for up to 4 prescriptions per year.",
            "section": "What is insured? → Cash Plan",
            "page": 1,
        },
        "dental_optical": {
            "rule": "Routine Dental & Optical Cover: Up to €20 for up to 10 visits combined per year.",
            "section": "What is insured? → Cash Plan",
            "page": 1,
        },
        "therapies": {
            "rule": "Day to Day Therapies (Physiotherapy, reflexology, acupuncture, osteopathy, physical therapist, chiropractor): Up to €20 for up to 10 visits combined per year.",
            "section": "What is insured? → Cash Plan",
            "page": 1,
        },
        "scan_cover": {
            "rule": "Scan Cover: Up to €20 for up to 10 scans per year.",
            "section": "What is insured? → Cash Plan",
            "page": 1,
        },
        "consultant_fee": {
            "rule": "Consultant fee: Up to €20 per visit - 10 visits per year.",
            "section": "What is insured? → Cash Plan",
            "page": 1,
        },
        "maternity": {
            "rule": "Maternity / Adoption Cash Back: Up to €200 per birth / adoption per year.",
            "section": "What is insured? → Cash Plan",
            "page": 1,
        },
        "waiting_period": {
            "rule": "A 12 week initial waiting period will apply to the cover listed, i.e. once your waiting periods have passed you can claim the benefits included on your scheme.",
            "section": "Are there any restrictions on cover?",
            "page": 1,
        },
        "quarterly_threshold": {
            "rule": "Claims can be made on a quarterly basis, once all outstanding premiums have been paid. Claims will only be paid once the accumulated receipts total €150 or more in every quarter submitted.",
            "section": "Are there any restrictions on cover? → (a)",
            "page": 1,
        },
        "not_insured": {
            "rule": "Benefits which are not included under 'What is insured' on this document are not eligible for benefit under your chosen scheme.",
            "section": "What is not insured?",
            "page": 1,
        },
        "receipt_requirements": {
            "rule": "When you are submitting receipts please make sure that you have included all of the details below: The members name, The type of service and items provided, The name, address and qualifications of practitioner, The date the service was provided, The original and not a photocopy of your receipt.",
            "section": "Are there any restrictions on cover? → (e)",
            "page": 1,
        },
        "cashback_only": {
            "rule": "Your MoneySmart scheme is a Cash Back scheme, as it is not an in-patient health insurance scheme it does not include cover for hospital admissions.",
            "section": "Where am I covered?",
            "page": 1,
        },
    },
}


def get_source_citations(treatment_type: str, rejection_reasons: list[str]) -> list[dict]:
    """
    Given a treatment type and list of rejection reasons, return relevant
    source document citations from the IPID.
    """
    citations = []

    # Map treatment types to their IPID section keys
    treatment_to_key = {
        "GP & A&E": "gp_ae",
        "Consultant Fee": "consultant_fee",
        "Prescription": "prescriptions",
        "Day-to-Day Therapy": "therapies",
        "Dental & Optical": "dental_optical",
        "Scan Cover": "scan_cover",
        "Hospital": "hospital_cashback",
        "Maternity": "maternity",
    }

    source_url = IPID_SOURCE["source_url"]

    # Always cite the relevant benefit rule
    key = treatment_to_key.get(treatment_type)
    if key and key in IPID_SOURCE["sections"]:
        src = IPID_SOURCE["sections"][key]
        citations.append({
            "document": IPID_SOURCE["document_name"],
            "document_id": IPID_SOURCE["document_id"],
            "section": src["section"],
            "highlighted_text": src["rule"],
            "relevance": f"Defines the benefit cap and annual limit for '{treatment_type}' under the member's scheme.",
            "source_url": source_url,
        })

    # Cite restriction rules based on rejection reasons
    reason_str = " ".join(rejection_reasons).lower()

    if "waiting period" in reason_str:
        src = IPID_SOURCE["sections"]["waiting_period"]
        citations.append({
            "document": IPID_SOURCE["document_name"],
            "document_id": IPID_SOURCE["document_id"],
            "section": src["section"],
            "highlighted_text": src["rule"],
            "relevance": "The 12-week initial waiting period has not elapsed since the member's policy start date.",
            "source_url": source_url,
        })

    if "quarterly" in reason_str or "threshold" in reason_str or "€150" in reason_str:
        src = IPID_SOURCE["sections"]["quarterly_threshold"]
        citations.append({
            "document": IPID_SOURCE["document_name"],
            "document_id": IPID_SOURCE["document_id"],
            "section": src["section"],
            "highlighted_text": src["rule"],
            "relevance": "Quarterly accumulated receipts have not met the €150 threshold for payment.",
            "source_url": source_url,
        })

    if "not insured" in reason_str or "not covered" in reason_str or "invalid therapy" in reason_str:
        src = IPID_SOURCE["sections"]["not_insured"]
        citations.append({
            "document": IPID_SOURCE["document_name"],
            "document_id": IPID_SOURCE["document_id"],
            "section": src["section"],
            "highlighted_text": src["rule"],
            "relevance": "The claimed treatment or therapy type is not listed under covered benefits.",
            "source_url": source_url,
        })

    if "receipt" in reason_str or "signature" in reason_str or "form" in reason_str:
        src = IPID_SOURCE["sections"]["receipt_requirements"]
        citations.append({
            "document": IPID_SOURCE["document_name"],
            "document_id": IPID_SOURCE["document_id"],
            "section": src["section"],
            "highlighted_text": src["rule"],
            "relevance": "The submitted claim form or receipt is missing required information.",
            "source_url": source_url,
        })

    if "private hospital" in reason_str or "not in-patient" in reason_str:
        src = IPID_SOURCE["sections"]["cashback_only"]
        citations.append({
            "document": IPID_SOURCE["document_name"],
            "document_id": IPID_SOURCE["document_id"],
            "section": src["section"],
            "highlighted_text": src["rule"],
            "relevance": "The scheme is a cash back scheme and does not cover private hospital admissions.",
            "source_url": source_url,
        })

    return citations
