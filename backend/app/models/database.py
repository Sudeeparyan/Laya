"""
Laya Healthcare AI Claims Chatbot — JSON Data Loader & In-Memory Store
Loads json_users.json and merges SQL user data into a single members store.
"""

from __future__ import annotations

import json
import os
import copy
from typing import Optional

from app.config import settings


# ──────────────────────────────────────────────
# In-memory data store
# ──────────────────────────────────────────────
_members: dict[str, dict] = {}


# ──────────────────────────────────────────────
# SQL users hardcoded (MEM-1001 → MEM-1010)
# These mirror the data/sql_users.sql file.
# ──────────────────────────────────────────────
_SQL_MEMBERS: list[dict] = [
    {
        "member_id": "MEM-1001",
        "first_name": "Liam",
        "last_name": "O'Connor",
        "email": "liam.oconnor@email.ie",
        "phone": "+353-85-123-4501",
        "date_of_birth": "1990-03-14",
        "iban_last4": "4501",
        "address_line1": "12 Baggot Street Lower",
        "city": "Dublin",
        "county": "Dublin",
        "eircode": "D02 XY45",
        "scheme_name": "Money Smart 20 Family",
        "policy_start_date": "2026-02-01",
        "status": "Active",
        "_scenario_note": "12-week waiting period rejection",
        "current_year_usage": {
            "year": 2026, "quarter": "Q1",
            "q_accumulated_receipts": 0.0,
            "gp_visits_count": 0, "prescription_count": 0,
            "dental_optical_count": 0, "therapy_count": 0,
            "scan_count": 0, "consultant_visits_count": 0,
            "hospital_days_count": 0, "maternity_claimed": False
        },
        "claims_history": []
    },
    {
        "member_id": "MEM-1002",
        "first_name": "Siobhan",
        "last_name": "Kelly",
        "email": "siobhan.kelly@email.ie",
        "phone": "+353-86-234-5602",
        "date_of_birth": "1985-07-22",
        "iban_last4": "5602",
        "address_line1": "7 Patrick Street",
        "city": "Cork",
        "county": "Cork",
        "eircode": "T12 AB34",
        "scheme_name": "Money Smart 20 Family",
        "policy_start_date": "2024-01-01",
        "status": "Active",
        "_scenario_note": "Quarterly €150 threshold (pending → approved)",
        "current_year_usage": {
            "year": 2026, "quarter": "Q1",
            "q_accumulated_receipts": 110.0,
            "gp_visits_count": 2, "prescription_count": 1,
            "dental_optical_count": 0, "therapy_count": 0,
            "scan_count": 0, "consultant_visits_count": 0,
            "hospital_days_count": 0, "maternity_claimed": False
        },
        "claims_history": [
            {"claim_id": "CLM-9001", "treatment_date": "2026-01-10", "treatment_type": "GP & A&E", "practitioner_name": "Dr. John Doe", "claimed_amount": 60.0, "status": "Pending Threshold"},
            {"claim_id": "CLM-9002", "treatment_date": "2026-01-20", "treatment_type": "GP & A&E", "practitioner_name": "Dr. John Doe", "claimed_amount": 50.0, "status": "Pending Threshold"},
        ]
    },
    {
        "member_id": "MEM-1003",
        "first_name": "Declan",
        "last_name": "Murphy",
        "email": "declan.murphy@email.ie",
        "phone": "+353-87-345-6703",
        "date_of_birth": "1978-11-30",
        "iban_last4": "6703",
        "address_line1": "22 Shop Street",
        "city": "Galway",
        "county": "Galway",
        "eircode": "H91 CD56",
        "scheme_name": "Money Smart 20 Family",
        "policy_start_date": "2023-05-01",
        "status": "Active",
        "_scenario_note": "Annual scan limit exhausted (10/10 used)",
        "current_year_usage": {
            "year": 2026, "quarter": "Q1",
            "q_accumulated_receipts": 250.0,
            "gp_visits_count": 4, "prescription_count": 0,
            "dental_optical_count": 0, "therapy_count": 0,
            "scan_count": 10, "consultant_visits_count": 1,
            "hospital_days_count": 0, "maternity_claimed": False
        },
        "claims_history": [
            {"claim_id": "CLM-9003", "treatment_date": "2026-02-05", "treatment_type": "Scan Cover", "practitioner_name": "Beacon Hospital", "claimed_amount": 150.0, "status": "Approved"},
        ]
    },
    {
        "member_id": "MEM-1004",
        "first_name": "Aoife",
        "last_name": "Byrne",
        "email": "aoife.byrne@email.ie",
        "phone": "+353-83-456-7804",
        "date_of_birth": "1992-05-08",
        "iban_last4": "7804",
        "address_line1": "15 O'Connell Street",
        "city": "Limerick",
        "county": "Limerick",
        "eircode": "V94 EF78",
        "scheme_name": "Money Smart 20 Family",
        "policy_start_date": "2022-11-01",
        "status": "Active",
        "_scenario_note": "Partial approval for hospital stay exceeding 40-day max",
        "current_year_usage": {
            "year": 2026, "quarter": "Q1",
            "q_accumulated_receipts": 180.0,
            "gp_visits_count": 1, "prescription_count": 0,
            "dental_optical_count": 0, "therapy_count": 0,
            "scan_count": 0, "consultant_visits_count": 0,
            "hospital_days_count": 38, "maternity_claimed": False
        },
        "claims_history": []
    },
    {
        "member_id": "MEM-1005",
        "first_name": "Conor",
        "last_name": "Walsh",
        "email": "conor.walsh@email.ie",
        "phone": "+353-89-567-8905",
        "date_of_birth": "1988-09-17",
        "iban_last4": "8905",
        "address_line1": "3 Grafton Street",
        "city": "Dublin",
        "county": "Dublin",
        "eircode": "D02 GH90",
        "scheme_name": "Money Smart 20 Family",
        "policy_start_date": "2025-01-01",
        "status": "Active",
        "_scenario_note": "Duplicate claim / fraud detection",
        "current_year_usage": {
            "year": 2026, "quarter": "Q1",
            "q_accumulated_receipts": 200.0,
            "gp_visits_count": 3, "prescription_count": 0,
            "dental_optical_count": 0, "therapy_count": 0,
            "scan_count": 0, "consultant_visits_count": 1,
            "hospital_days_count": 0, "maternity_claimed": False
        },
        "claims_history": [
            {"claim_id": "CLM-9004", "treatment_date": "2026-01-15", "treatment_type": "Consultant Fee", "practitioner_name": "Dr. Sarah Smith", "claimed_amount": 150.0, "status": "Approved"},
        ]
    },
    {
        "member_id": "MEM-1006",
        "first_name": "Roisin",
        "last_name": "Flanagan",
        "email": "roisin.flanagan@email.ie",
        "phone": "+353-85-678-9006",
        "date_of_birth": "1995-01-25",
        "iban_last4": "9006",
        "address_line1": "8 Main Street",
        "city": "Waterford",
        "county": "Waterford",
        "eircode": "X91 IJ12",
        "scheme_name": "Money Smart 20 Family",
        "policy_start_date": "2023-06-15",
        "status": "Active",
        "_scenario_note": "12-month expired receipt rejection",
        "current_year_usage": {
            "year": 2026, "quarter": "Q1",
            "q_accumulated_receipts": 220.0,
            "gp_visits_count": 3, "prescription_count": 2,
            "dental_optical_count": 1, "therapy_count": 0,
            "scan_count": 0, "consultant_visits_count": 0,
            "hospital_days_count": 0, "maternity_claimed": False
        },
        "claims_history": [
            {"claim_id": "CLM-9005", "treatment_date": "2026-01-05", "treatment_type": "GP & A&E", "practitioner_name": "Dr. Molly Malone", "claimed_amount": 55.0, "status": "Approved"},
            {"claim_id": "CLM-9006", "treatment_date": "2026-01-18", "treatment_type": "Prescription", "practitioner_name": "Hickey's Pharmacy", "claimed_amount": 12.0, "status": "Approved"},
            {"claim_id": "CLM-9007", "treatment_date": "2026-02-01", "treatment_type": "Dental & Optical", "practitioner_name": "Smiles Dental Clinic", "claimed_amount": 45.0, "status": "Approved"},
        ]
    },
    {
        "member_id": "MEM-1007",
        "first_name": "Patrick",
        "last_name": "Doyle",
        "email": "patrick.doyle@email.ie",
        "phone": "+353-86-789-0107",
        "date_of_birth": "1982-08-03",
        "iban_last4": "0107",
        "address_line1": "45 Henry Street",
        "city": "Dublin",
        "county": "Dublin",
        "eircode": "D01 KL34",
        "scheme_name": "Money Smart 20 Family",
        "policy_start_date": "2024-03-01",
        "status": "Active",
        "_scenario_note": "Invalid therapy type rejection (semantic check)",
        "current_year_usage": {
            "year": 2026, "quarter": "Q1",
            "q_accumulated_receipts": 160.0,
            "gp_visits_count": 2, "prescription_count": 0,
            "dental_optical_count": 0, "therapy_count": 3,
            "scan_count": 0, "consultant_visits_count": 0,
            "hospital_days_count": 0, "maternity_claimed": False
        },
        "claims_history": [
            {"claim_id": "CLM-9008", "treatment_date": "2026-01-08", "treatment_type": "Day to Day Therapy", "practitioner_name": "PhysioFirst Clinic", "claimed_amount": 40.0, "status": "Approved"},
            {"claim_id": "CLM-9009", "treatment_date": "2026-01-22", "treatment_type": "Day to Day Therapy", "practitioner_name": "AcuWell Centre", "claimed_amount": 35.0, "status": "Approved"},
            {"claim_id": "CLM-9010", "treatment_date": "2026-02-03", "treatment_type": "Day to Day Therapy", "practitioner_name": "Dublin Osteopathy", "claimed_amount": 45.0, "status": "Approved"},
        ]
    },
    {
        "member_id": "MEM-1008",
        "first_name": "Niamh",
        "last_name": "Brennan",
        "email": "niamh.brennan@email.ie",
        "phone": "+353-87-890-1208",
        "date_of_birth": "1993-12-11",
        "iban_last4": "1208",
        "address_line1": "19 Eyre Square",
        "city": "Galway",
        "county": "Galway",
        "eircode": "H91 MN56",
        "scheme_name": "Money Smart 20 Family",
        "policy_start_date": "2023-09-01",
        "status": "Active",
        "_scenario_note": "Maternity cash back (flat €200 max)",
        "current_year_usage": {
            "year": 2026, "quarter": "Q1",
            "q_accumulated_receipts": 175.0,
            "gp_visits_count": 1, "prescription_count": 1,
            "dental_optical_count": 0, "therapy_count": 0,
            "scan_count": 0, "consultant_visits_count": 0,
            "hospital_days_count": 0, "maternity_claimed": False
        },
        "claims_history": [
            {"claim_id": "CLM-9011", "treatment_date": "2026-01-12", "treatment_type": "GP & A&E", "practitioner_name": "Dr. Patricia Hayes", "claimed_amount": 50.0, "status": "Approved"},
        ]
    },
    {
        "member_id": "MEM-1009",
        "first_name": "Sean",
        "last_name": "Gallagher",
        "email": "sean.gallagher@email.ie",
        "phone": "+353-83-901-2309",
        "date_of_birth": "1975-04-19",
        "iban_last4": "2309",
        "address_line1": "31 Quay Street",
        "city": "Kilkenny",
        "county": "Kilkenny",
        "eircode": "R95 OP78",
        "scheme_name": "Money Smart 20 Family",
        "policy_start_date": "2024-07-01",
        "status": "Active",
        "_scenario_note": "Third-party liability / solicitor escalation",
        "current_year_usage": {
            "year": 2026, "quarter": "Q1",
            "q_accumulated_receipts": 190.0,
            "gp_visits_count": 2, "prescription_count": 0,
            "dental_optical_count": 0, "therapy_count": 0,
            "scan_count": 0, "consultant_visits_count": 0,
            "hospital_days_count": 5, "maternity_claimed": False
        },
        "claims_history": [
            {"claim_id": "CLM-9012", "treatment_date": "2026-01-20", "treatment_type": "Hospital In-patient", "practitioner_name": "St. James's Hospital", "claimed_amount": 100.0, "status": "Approved"},
        ]
    },
    {
        "member_id": "MEM-1010",
        "first_name": "Ciara",
        "last_name": "Kavanagh",
        "email": "ciara.kavanagh@email.ie",
        "phone": "+353-89-012-3410",
        "date_of_birth": "1998-06-28",
        "iban_last4": "3410",
        "address_line1": "5 Parnell Square",
        "city": "Dublin",
        "county": "Dublin",
        "eircode": "D01 QR90",
        "scheme_name": "Money Smart 20 Family",
        "policy_start_date": "2024-11-01",
        "status": "Active",
        "_scenario_note": "Missing signature / wrong form detection",
        "current_year_usage": {
            "year": 2026, "quarter": "Q1",
            "q_accumulated_receipts": 155.0,
            "gp_visits_count": 1, "prescription_count": 0,
            "dental_optical_count": 1, "therapy_count": 0,
            "scan_count": 0, "consultant_visits_count": 0,
            "hospital_days_count": 0, "maternity_claimed": False
        },
        "claims_history": [
            {"claim_id": "CLM-9013", "treatment_date": "2026-01-25", "treatment_type": "Dental & Optical", "practitioner_name": "Portobello Dental", "claimed_amount": 30.0, "status": "Approved"},
        ]
    },
]


def load_data() -> None:
    """Load JSON users and merge with SQL users into the in-memory store."""
    global _members

    # 1. Load JSON users (MEM-2001 → MEM-2010)
    json_path = settings.JSON_DATA_PATH
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
        for m in raw.get("database", {}).get("members", []):
            mid = m["member_id"]
            _members[mid] = m
        print(f"[DB] Loaded {len(_members)} JSON members")
    else:
        print(f"[DB] WARNING: JSON data file not found at {json_path}")

    # 2. Merge SQL users (MEM-1001 → MEM-1010)
    for m in _SQL_MEMBERS:
        mid = m["member_id"]
        _members[mid] = m
    print(f"[DB] Merged SQL users. Total members: {len(_members)}")


def get_all_members() -> list[dict]:
    """Return all members (summary view)."""
    result = []
    for m in _members.values():
        result.append({
            "member_id": m["member_id"],
            "first_name": m["first_name"],
            "last_name": m["last_name"],
            "scheme_name": m.get("scheme_name", "Money Smart 20 Family"),
            "status": m.get("status", "Active"),
            "scenario_note": m.get("_scenario_note", ""),
        })
    # Sort by member_id
    result.sort(key=lambda x: x["member_id"])
    return result


def get_member_by_id(member_id: str) -> Optional[dict]:
    """Return full member record by ID."""
    m = _members.get(member_id)
    if m is None:
        return None
    return copy.deepcopy(m)


def get_claims_history(member_id: str) -> list[dict]:
    """Return claims history for a member."""
    m = _members.get(member_id)
    if m is None:
        return []
    return copy.deepcopy(m.get("claims_history", []))


def update_usage(member_id: str, field: str, increment: float | int = 1) -> bool:
    """Increment a field in the member's current_year_usage."""
    m = _members.get(member_id)
    if m is None:
        return False
    usage = m.get("current_year_usage", {})
    if field not in usage:
        return False
    usage[field] += increment
    return True


def add_claim_to_history(member_id: str, claim: dict) -> bool:
    """Add a new claim entry to a member's claims_history."""
    m = _members.get(member_id)
    if m is None:
        return False
    m.setdefault("claims_history", []).append(claim)
    return True
