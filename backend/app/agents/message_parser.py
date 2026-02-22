"""
Laya Healthcare — Message Parser Utility
Infers claim details (treatment type, cost, date, etc.) from the user's
chat message when no document data is uploaded.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta


# ── Treatment type keyword mappings ──
_TREATMENT_KEYWORDS: list[tuple[list[str], str]] = [
    (["gp ", "gp,", "gp.", "general practitioner", "gp visit", "doctor visit",
      "a&e", "emergency room", "a and e", "emergency department"], "GP & A&E"),
    (["consultant", "specialist", "specialist visit", "consultant fee",
      "consultant visit"], "Consultant Fee"),
    (["prescription", "pharmacy", "medication", "medicine", "drug"], "Prescription"),
    (["physiotherapy", "physio", "reflexology", "acupuncture", "osteopathy",
      "chiropractor", "chiropractic", "physical therapy", "physical therapist",
      "therapy session", "day to day therapy", "reiki", "massage therapy",
      "massage"], "Day to Day Therapy"),
    (["dental", "dentist", "teeth", "filling", "root canal", "optical",
      "optician", "eye test", "glasses", "contact lens", "eye exam"], "Dental & Optical"),
    (["scan", "mri", "ct scan", "x-ray", "xray", "x ray", "ultrasound",
      "imaging", "radiology", "diagnostic"], "Scan Cover"),
    (["hospital", "in-patient", "inpatient", "hospital stay", "admission",
      "admitted", "ward", "surgery", "operation", "discharge"], "Hospital In-patient"),
    (["maternity", "pregnancy", "baby", "birth", "newborn", "adoption",
      "pre-natal", "prenatal", "postnatal", "post-natal"], "Maternity / Adoption Cash Back"),
]


def infer_treatment_type(message: str) -> str:
    """Infer the treatment type from a user's chat message.
    Returns the treatment type string, or empty string if no match."""
    msg_lower = message.lower()
    for keywords, treatment_type in _TREATMENT_KEYWORDS:
        for kw in keywords:
            if kw in msg_lower:
                return treatment_type
    return ""


def infer_total_cost(message: str) -> float:
    """Extract a monetary amount from the message. Returns 0.0 if none found."""
    # Match patterns like: €60, EUR 60, 60 euro, €60.00, $150.50
    patterns = [
        r'[€$£]\s*(\d+(?:\.\d{1,2})?)',          # €60, €60.00
        r'(\d+(?:\.\d{1,2})?)\s*(?:euro|eur)',     # 60 euro, 60.00 EUR
        r'EUR\s*(\d+(?:\.\d{1,2})?)',              # EUR 60
        r'cost\s+(?:was|is|of)?\s*[€$£]?\s*(\d+(?:\.\d{1,2})?)',  # cost was 60
        r'(\d+(?:\.\d{1,2})?)\s*(?:per|each)',     # 60 per
    ]
    for pattern in patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1))
            except (ValueError, IndexError):
                continue
    return 0.0


def infer_treatment_date(message: str) -> str:
    """Infer treatment date from the message. Returns YYYY-MM-DD or today's date."""
    msg_lower = message.lower()
    today = datetime.now()

    # Check for relative dates
    if "yesterday" in msg_lower:
        return (today - timedelta(days=1)).strftime("%Y-%m-%d")
    if "today" in msg_lower:
        return today.strftime("%Y-%m-%d")
    if "last week" in msg_lower:
        return (today - timedelta(weeks=1)).strftime("%Y-%m-%d")
    if "last month" in msg_lower:
        return (today - timedelta(days=30)).strftime("%Y-%m-%d")
    if "two weeks ago" in msg_lower or "2 weeks ago" in msg_lower:
        return (today - timedelta(weeks=2)).strftime("%Y-%m-%d")

    # Check for month mentions like "from January", "in December 2024"
    month_names = {
        "january": 1, "february": 2, "march": 3, "april": 4,
        "may": 5, "june": 6, "july": 7, "august": 8,
        "september": 9, "october": 10, "november": 11, "december": 12,
        "jan": 1, "feb": 2, "mar": 3, "apr": 4,
        "jun": 6, "jul": 7, "aug": 8, "sep": 9, "sept": 9,
        "oct": 10, "nov": 11, "dec": 12,
    }
    for month_name, month_num in month_names.items():
        if month_name in msg_lower:
            # Check for year
            year_match = re.search(rf'{month_name}\s+(\d{{4}})', msg_lower)
            year = int(year_match.group(1)) if year_match else today.year
            # Use the 15th of the month as a reasonable default
            try:
                return datetime(year, month_num, 15).strftime("%Y-%m-%d")
            except ValueError:
                pass

    # Check for explicit date patterns: DD/MM/YYYY, YYYY-MM-DD, etc.
    date_patterns = [
        (r'(\d{4})-(\d{1,2})-(\d{1,2})', lambda m: f"{m.group(1)}-{m.group(2).zfill(2)}-{m.group(3).zfill(2)}"),
        (r'(\d{1,2})/(\d{1,2})/(\d{4})', lambda m: f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"),
        (r'(\d{1,2})-(\d{1,2})-(\d{4})', lambda m: f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"),
    ]
    for pattern, formatter in date_patterns:
        match = re.search(pattern, message)
        if match:
            try:
                return formatter(match)
            except (ValueError, IndexError):
                continue

    # Default to today
    return today.strftime("%Y-%m-%d")


def infer_practitioner(message: str) -> str:
    """Try to extract a practitioner name from the message."""
    msg_lower = message.lower()

    # Check for "Dr. XXX" pattern
    dr_match = re.search(r'(?:dr\.?|doctor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)', message)
    if dr_match:
        return f"Dr. {dr_match.group(1)}"

    # Check for hospital names
    hospital_keywords = ["hospital", "clinic", "centre", "center", "pharmacy"]
    for kw in hospital_keywords:
        match = re.search(rf'(?:at|from|in)\s+(?:the\s+)?([A-Z][\w\s\']+?{kw})', message, re.IGNORECASE)
        if match:
            return match.group(1).strip()

    return ""


def infer_hospital_days(message: str) -> int | None:
    """Extract hospital stay duration from the message."""
    patterns = [
        r'(\d+)\s*(?:-\s*)?day(?:s)?\s+(?:hospital\s+)?stay',
        r'(\d+)\s*(?:-\s*)?day(?:s)?\s+(?:in|at)\s+(?:the\s+)?hospital',
        r'stayed?\s+(?:for\s+)?(\d+)\s+day',
        r'(\d+)\s+night(?:s)?\s+(?:in|at)',
        r'admission\s+(?:for\s+)?(\d+)\s+day',
    ]
    for pattern in patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            try:
                return int(match.group(1))
            except (ValueError, IndexError):
                continue
    return None


def build_extracted_doc_from_message(
    user_message: str,
    member_data: dict,
    existing_doc: dict | None = None,
) -> dict:
    """Build or augment extracted_doc from the user message and member data.

    If existing_doc already has a treatment_type, it is returned as-is.
    Otherwise, fields are inferred from the user's message.
    """
    doc = dict(existing_doc) if existing_doc else {}

    # If treatment_type is already populated, return as-is
    if doc.get("treatment_type", "").strip():
        return doc

    # Infer treatment type from the message
    treatment_type = infer_treatment_type(user_message)
    if not treatment_type:
        return doc  # Can't infer, leave empty

    # Populate fields from inference + member data
    member_id = member_data.get("member_id", doc.get("member_id", ""))
    patient_name = f"{member_data.get('first_name', '')} {member_data.get('last_name', '')}".strip()

    doc.setdefault("member_id", member_id)
    doc.setdefault("patient_name", patient_name or doc.get("patient_name", ""))
    doc["treatment_type"] = treatment_type
    doc.setdefault("form_type", "Money Smart Out-patient Claim Form")
    doc.setdefault("treatment_date", infer_treatment_date(user_message))
    doc.setdefault("signature_present", True)

    # Infer optional fields
    cost = infer_total_cost(user_message)
    if cost > 0:
        doc.setdefault("total_cost", cost)
    else:
        # Set sensible defaults based on treatment type
        default_costs = {
            "GP & A&E": 60.0,
            "Consultant Fee": 75.0,
            "Prescription": 25.0,
            "Day to Day Therapy": 50.0,
            "Dental & Optical": 45.0,
            "Scan Cover": 150.0,
            "Hospital In-patient": 100.0,
            "Maternity / Adoption Cash Back": 1500.0,
        }
        doc.setdefault("total_cost", default_costs.get(treatment_type, 50.0))

    practitioner = infer_practitioner(user_message)
    if practitioner:
        doc.setdefault("practitioner_name", practitioner)
    else:
        doc.setdefault("practitioner_name", "Not specified")

    # Hospital-specific fields
    hospital_days = infer_hospital_days(user_message)
    if hospital_days:
        doc["hospital_days"] = hospital_days

    return doc
