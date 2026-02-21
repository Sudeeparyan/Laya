# 🏥 Laya Healthcare — Synthetic Demo Data

> **20 users** covering all 15+ edge-case scenarios for the Money Smart 20 Family Cash Plan agentic AI demo.

## Files

| File | Format | Users | IDs |
|------|--------|-------|-----|
| `sql_users.sql` | SQL (SQLite/PostgreSQL/MySQL) | 10 | MEM-1001 → MEM-1010 |
| `json_users.json` | JSON (context injection) | 10 | MEM-2001 → MEM-2010 |

---

## Quick Reference — All 20 Users

### SQL Users (MEM-1001 to MEM-1010)

| # | Name | ID | Scenario | Expected AI Decision |
|---|------|----|----------|---------------------|
| 1 | Liam O'Connor | MEM-1001 | 12-week waiting period | **REJECTED** — Policy started Feb 1, 2026 (only 3 weeks ago) |
| 2 | Siobhan Kelly | MEM-1002 | €150 quarterly threshold | **APPROVED** — €110 + €60 = €170 > €150 threshold |
| 3 | Declan Murphy | MEM-1003 | Annual scan limit (10/10) | **REJECTED** — All 10 scans used this year |
| 4 | Aoife Byrne | MEM-1004 | Hospital days partial (38/40) | **PARTIAL** — Only 2 of 5 days payable |
| 5 | Conor Walsh | MEM-1005 | Duplicate claim / fraud | **REJECTED** — Exact match in claims_history |
| 6 | Roisin Flanagan | MEM-1006 | 12-month expired receipt | **REJECTED** — Receipt older than 12 months |
| 7 | Patrick Doyle | MEM-1007 | Invalid therapy (Reiki) | **REJECTED** — Not in allowed therapy list |
| 8 | Niamh Brennan | MEM-1008 | Maternity cash back | **APPROVED** — Flat €200 max per birth |
| 9 | Sean Gallagher | MEM-1009 | Third-party / solicitor | **APPROVED + ESCALATED** — Flagged for Legal |
| 10 | Ciara Kavanagh | MEM-1010 | Wrong form / missing sig | **ACTION REQUIRED** — Wrong form type |

### JSON Users (MEM-2001 to MEM-2010)

| # | Name | ID | Scenario | Expected AI Decision |
|---|------|----|----------|---------------------|
| 11 | Eoin McCarthy | MEM-2001 | Mixed batch (GP + Rx) | **PARTIAL** — €20 GP + €10 Rx = €30 |
| 12 | Brigid Sullivan | MEM-2002 | 11th GP visit | **REJECTED** — 10/10 GP visits used |
| 13 | Tadhg Ryan | MEM-2003 | Procedure Code 29 | **REJECTED** — Missing histology report |
| 14 | Orla Nolan | MEM-2004 | Procedure Code 16 | **REJECTED** — Missing serum ferritin |
| 15 | Fionn O'Brien | MEM-2005 | 45-day hospital stay | **PARTIAL** — 40 days approved, 5 rejected |
| 16 | Maeve Duffy | MEM-2006 | Private hospital invoice | **REJECTED** — Cash Plan, not insurance |
| 17 | Cillian Moran | MEM-2007 | Prescription limit (4/4) | **REJECTED** — All 4 prescriptions used |
| 18 | Aisling Healy | MEM-2008 | Consultant 10th + threshold | **APPROVED** — 10th visit + crosses €150 |
| 19 | Dara Fitzpatrick | MEM-2009 | Happy path (all valid) | **APPROVED** — Clean, no issues |
| 20 | Sinead Collins | MEM-2010 | Dental/Optical limit (9/10) | **APPROVED then REJECTED** on 11th |

---

## How to Use

### For SQL (Backend Database)
```bash
# SQLite
sqlite3 laya_demo.db < sql_users.sql

# PostgreSQL
psql -U your_user -d laya_db -f sql_users.sql
```

### For JSON (AI Context Injection)
Pass the specific member's object from `json_users.json` directly into your agent's system prompt:
```
"Here is the user's database record: {member_object}. Evaluate the uploaded claim against the Money Smart 20 Family policy rules."
```

---

## Policy Rules Cheat Sheet (for AI Context)

| Rule | Details |
|------|---------|
| Waiting Period | 12-week initial waiting period from policy start |
| Quarterly Threshold | Claims paid only when accumulated receipts ≥ €150/quarter |
| Submission Deadline | Claims must be submitted within 12 months of treatment |
| GP & A&E | Up to €20 per visit, max 10 visits/year |
| Consultant Fee | Up to €20 per visit, max 10 visits/year |
| Prescription | Up to €10 each, max 4/year |
| Dental & Optical | Up to €20 per visit, max 10 visits/year |
| Scan Cover | Up to €20 each, max 10 scans/year |
| Hospital In-patient | €20/day, max 40 days/year |
| Maternity | Flat €200 per birth/adoption/year |
| Allowed Therapies | Physio, reflexology, acupuncture, osteopathy, physical therapy, chiropractic ONLY |
| Cash Plan Limit | NO private hospital room/surgery coverage |

---

## 🔐 Future-Proof: Auth & Registration Fields

Both SQL and JSON files include these fields for when login/registration is implemented:

| Field | Purpose | Example |
|-------|---------|---------|
| `email` | Login identifier (UNIQUE) | `liam.oconnor@email.ie` |
| `phone` | 2FA / contact | `+353-85-123-4501` |
| `password_hash` | bcrypt hash for auth | `$2b$12$LJ3xVz8k...` |
| `date_of_birth` | Age verification / KYC | `1990-03-14` |
| `iban_last4` | Payment verification | `4501` |
| `address_line1` | Correspondence | `12 Baggot Street Lower` |
| `city` / `county` / `eircode` | Irish address | `Dublin` / `Dublin` / `D02 XY45` |
| `created_at` | Registration timestamp | `2026-02-01 09:00:00` |
| `updated_at` | Profile update tracking | `2026-02-01 09:00:00` |

> **Note:** Password hashes are synthetic bcrypt-format strings. Replace with real bcrypt output when implementing actual authentication.
