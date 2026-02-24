# Laya Healthcare AI Claims — Implementation Plan (Improvements)

> **Goal:** Enhance the end-to-end demo flow with a test user, claim-to-pending pipeline, priority-based dashboard, AI analysis with source document citations, and real-time status sync between developer and customer portals.

---

## Table of Contents

1. [Overview of the Improved Demo Flow](#1-overview-of-the-improved-demo-flow)
2. [PART A — Test User & Test Claim Receipt](#2-part-a--test-user--test-claim-receipt)
3. [PART B — Customer Portal: Submit Claim → Pending](#3-part-b--customer-portal-submit-claim--pending)
4. [PART C — Developer Dashboard: Priority Levels & UI Overhaul](#4-part-c--developer-dashboard-priority-levels--ui-overhaul)
5. [PART D — AI Analysis with Source Document Citations](#5-part-d--ai-analysis-with-source-document-citations)
6. [PART E — Developer Decision → Auto-Update Customer Portal](#6-part-e--developer-decision--auto-update-customer-portal)
7. [PART F — Complete Demo Script (New Flow)](#7-part-f--complete-demo-script-new-flow)
8. [File-by-File Implementation Checklist](#8-file-by-file-implementation-checklist)

---

## 1. Overview of the Improved Demo Flow

### Current Flow (Before)

```
Customer submits claim → AI auto-decides (APPROVED/REJECTED) → Customer sees result immediately
Developer dashboard shows historical claims → Developer can re-analyze but result is already decided
```

### New Flow (After)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        IMPROVED TWO-PORTAL DEMO FLOW                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  PART 1: CUSTOMER PORTAL                                                        │
│  ─────────────────────────                                                      │
│  1. Test user (customer@laya.ie) logs in                                        │
│  2. Selects member (MEM-1001 — Liam O'Connor)                                  │
│  3. Uploads test GP claim receipt PDF                                           │
│  4. Sends message: "I'd like to submit a claim for a GP visit"                 │
│  5. AI processes the claim through the 6-agent pipeline                         │
│  6. ★ NEW: Decision is set to PENDING (not auto-decided)                       │
│  7. Customer sees: "Your claim has been submitted and is under review"          │
│  8. Claim appears in Claims Queue with PENDING status                           │
│                                                                                 │
│  PART 2: DEVELOPER DASHBOARD                                                   │
│  ──────────────────────────────                                                 │
│  1. Developer (admin@laya.ie) logs in → lands on dashboard                     │
│  2. ★ NEW: Sees priority badges (HIGH / MEDIUM / LOW) on each claim            │
│  3. Test user's claim shows as MEDIUM priority (standard claim review)          │
│  4. Developer clicks claim → ClaimReviewPanel opens                             │
│  5. Clicks "Run AI Analysis"                                                    │
│  6. ★ NEW: AI returns recommendation with SOURCE DOCUMENT CITATIONS             │
│     ┌──────────────────────────────────────────────────────────────┐            │
│     │  AI Recommendation: REJECT (Confidence: 95%)                │            │
│     │                                                              │            │
│     │  Reasoning: Member has only been on the policy for 22 days. │            │
│     │  A 12-week initial waiting period applies.                   │            │
│     │                                                              │            │
│     │  📄 Source: Money Smart 20 Family IPID                       │            │
│     │  ┌────────────────────────────────────────────────────────┐  │            │
│     │  │ "A 12 week initial waiting period will apply to the   │  │            │
│     │  │  cover listed, i.e. once your waiting periods have     │  │            │
│     │  │  passed you can claim the benefits included on your    │  │            │
│     │  │  scheme."                                              │  │            │
│     │  └────────────────────────────────────────────────────────┘  │            │
│     │                                                              │            │
│     │  Also references benefit rule:                               │            │
│     │  ┌────────────────────────────────────────────────────────┐  │            │
│     │  │ "GP and A&E: Up to €20 for up to 10 visits combined   │  │            │
│     │  │  per year."                                            │  │            │
│     │  └────────────────────────────────────────────────────────┘  │            │
│     │                                                              │            │
│     │  Rule: Even if the visit limit is not exhausted, the claim  │            │
│     │  cannot be processed because the 12-week waiting period has │            │
│     │  not elapsed since policy start date (2026-02-01).          │            │
│     └──────────────────────────────────────────────────────────────┘            │
│  7. Developer reviews AI reasoning + source citations                           │
│  8. Developer clicks "Reject" → confirms AI recommendation                     │
│  9. ★ NEW: Status auto-updates to REJECTED in the customer portal              │
│ 10. Customer sees updated status without refreshing (WebSocket push)            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. PART A — Test User & Test Claim Receipt

### 2.1 Test User Profile

Use the existing test user setup:

| Field | Value |
|-------|-------|
| **Login** | `customer@laya.ie` / `customer123` |
| **Role** | Customer |
| **Linked Member** | MEM-1001 — Liam O'Connor |
| **Scheme** | Money Smart 20 Family |
| **Policy Start Date** | 2026-02-01 (only ~22 days ago as of Feb 23, 2026) |
| **Expected Outcome** | REJECTED (12-week waiting period not elapsed) |

> **Why MEM-1001?** Liam's policy started on Feb 1, 2026. Today is Feb 23, 2026 — only 22 days into his policy. The Money Smart 20 Family IPID states a **12-week (84-day) initial waiting period**. His waiting period doesn't end until **April 26, 2026**. Any claim submitted now must be REJECTED.

### 2.2 Update Customer Account Linking

Currently `customer@laya.ie` is linked to MEM-1002 (Siobhan Kelly). For this demo flow, we need to either:

- **Option A (Recommended):** Create a new customer account linked to MEM-1001
- **Option B:** Change the existing customer link to MEM-1001

#### Implementation — Option A: Add a new test customer account

**File:** `backend/users_db.json`

Add a new test user entry:

```json
{
  "id": "user_test_customer",
  "email": "test@laya.ie",
  "password_hash": "<bcrypt hash of 'test123'>",
  "first_name": "Liam",
  "last_name": "O'Connor",
  "role": "customer",
  "member_id": "MEM-1001",
  "created_at": "2026-01-15T10:00:00Z"
}
```

**File:** `backend/app/auth/users.py`

Ensure the `load_users()` function picks up the new user from `users_db.json`. Add `test@laya.ie` / `test123` as a default account alongside the existing two.

**File:** `frontend/src/pages/LoginPage.jsx`

Add a third quick-login button:

```jsx
<button onClick={() => quickLogin('test@laya.ie', 'test123')}>
  🧪 Test Customer (Liam)
</button>
```

### 2.3 Generate Test Claim Receipt PDF

**File:** `demo_pdfs/generate_pdfs.py` — Add a new entry to `DEMO_CLAIMS`:

```python
# NEW: Test User GP Claim Receipt (for improved demo flow)
{
    "filename": "claim_gp_test_liam.pdf",
    "data": {
        "member_id": "MEM-1001",
        "patient_name": "Liam O'Connor",
        "dob": "1990-03-14",
        "address": "12 Baggot Street Lower, Dublin",
        "eircode": "D02 XY45",
        "form_type": "Money Smart Out-patient Claim Form",
        "treatment_type": "GP & A&E",
        "treatment_date": "2026-02-20",
        "practitioner_name": "Dr. Sarah Murphy",
        "practitioner_address": "Baggot Street Medical Centre, Dublin 2",
        "total_cost": 55.00,
        "iban_last4": "4501",
        "payment_method": "Paid by Debit Card",
        "signature_present": True,
    },
},
```

**Generate the PDF:**

```bash
cd demo_pdfs
python generate_pdfs.py
```

This creates `demo_pdfs/claim_gp_test_liam.pdf` — a realistic GP visit receipt with:
- Member: Liam O'Connor (MEM-1001)
- Treatment: GP & A&E visit on 2026-02-20
- Practitioner: Dr. Sarah Murphy
- Cost: €55.00
- Signed: Yes

---

## 3. PART B — Customer Portal: Submit Claim → Pending

### 3.1 Core Change: Claims Start as PENDING

Currently, the AI agent pipeline in `graph.py` auto-decides (APPROVED/REJECTED) and saves the final status immediately. The improvement changes this so that when a **customer** submits a claim, the decision is stored but the **status is set to PENDING** until a developer reviews it.

#### Implementation

**File:** `backend/app/agents/graph.py` — `decision_node()` function

In the `decision_node`, check the `user_context.role`:

```python
# CURRENT behavior (auto-decide):
claim_record["status"] = decision  # "APPROVED" or "REJECTED"

# NEW behavior (pending for customers):
user_role = state.get("user_context", {}).get("role", "customer")
if user_role == "customer":
    # Store AI's recommendation internally but set status to PENDING
    claim_record["status"] = "PENDING"
    claim_record["ai_recommendation"] = decision  # "APPROVED" or "REJECTED"
    claim_record["ai_reasoning"] = reasoning
    claim_record["ai_confidence"] = 0.95 if decision in ("APPROVED", "REJECTED") else 0.70
    claim_record["ai_payout_amount"] = payout_amount
    claim_record["ai_flags"] = flags
    claim_record["ai_agent_trace"] = agent_trace
else:
    # Developer-initiated analysis: keep the AI recommendation without saving to DB
    claim_record["status"] = decision
```

**File:** `backend/app/routers/chat.py` — Response message to customer

When the claim is PENDING, return a customer-friendly message instead of the AI decision:

```python
if result.get("decision") == "PENDING" or (user_role == "customer" and original_decision != "PENDING"):
    customer_message = (
        f"✅ **Claim Submitted Successfully**\n\n"
        f"Your claim has been received and is now **under review** by our claims team.\n\n"
        f"**Claim Details:**\n"
        f"- **Claim ID:** {result.get('claim_id', 'N/A')}\n"
        f"- **Treatment:** {treatment_type}\n"
        f"- **Date:** {treatment_date}\n"
        f"- **Amount:** €{total_cost:.2f}\n\n"
        f"You will be notified once a decision has been made. "
        f"Typical processing time is under 24 hours.\n\n"
        f"_If you have questions about your claim, just ask me here._"
    )
```

### 3.2 Customer Portal UI — Pending State Indicator

**File:** `frontend/src/components/ClaimCard.jsx`

Add a PENDING-specific design:

```jsx
// When status is PENDING, show a "under review" card instead of decision
if (status === "PENDING") {
  return (
    <div className="claim-card pending-review">
      <div className="pending-icon">⏳</div>
      <h4>Claim Under Review</h4>
      <p>Claim ID: {claimId}</p>
      <p>Our team is reviewing your claim. You'll be notified when a decision is made.</p>
      <div className="pending-progress-bar" /> {/* Animated subtle pulse bar */}
    </div>
  );
}
```

**File:** `frontend/src/index.css`

Add pending-specific styles:

```css
.claim-card.pending-review {
  border-left: 4px solid #f59e0b; /* amber */
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  padding: 16px;
  border-radius: 12px;
}

.pending-progress-bar {
  height: 3px;
  background: linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b);
  background-size: 200% 100%;
  animation: shimmer 2s ease-in-out infinite;
  border-radius: 2px;
  margin-top: 12px;
}
```

---

## 4. PART C — Developer Dashboard: Priority Levels & UI Overhaul

### 4.1 Priority System (HIGH / MEDIUM / LOW)

Add a **priority badge** to every claim in the Claims Queue. Priority is calculated from multiple signals.

#### Priority Calculation Logic

**File:** `backend/app/routers/queue.py` — Add `calculate_claim_priority()`:

```python
def calculate_claim_priority(claim: dict, member: dict) -> dict:
    """
    Calculate priority level for a claim based on multiple factors.
    Returns: { "level": "HIGH"|"MEDIUM"|"LOW", "score": int, "reasons": list }
    """
    score = 0
    reasons = []
    usage = member.get("current_year_usage", {})
    status = claim.get("status", "").upper()

    # Factor 1: Claim status
    if status == "PENDING":
        score += 20
        reasons.append("Awaiting review")

    # Factor 2: Claim amount
    amount = claim.get("claimed_amount", 0)
    if amount >= 200:
        score += 30
        reasons.append(f"High-value claim (€{amount:.2f})")
    elif amount >= 100:
        score += 15
        reasons.append(f"Medium-value claim (€{amount:.2f})")

    # Factor 3: Member approaching annual limits
    if usage.get("scan_count", 0) >= 8:
        score += 25
        reasons.append(f"Scan limit near ({usage['scan_count']}/10)")
    if usage.get("hospital_days_count", 0) >= 35:
        score += 25
        reasons.append(f"Hospital days near limit ({usage['hospital_days_count']}/40)")
    if usage.get("gp_visits_count", 0) >= 8:
        score += 15
        reasons.append(f"GP visits near limit ({usage['gp_visits_count']}/10)")

    # Factor 4: New policy (waiting period risk)
    policy_start = member.get("policy_start_date", "")
    if policy_start >= "2026-01-01":
        score += 20
        reasons.append("New policy — waiting period may apply")

    # Factor 5: AI pre-analysis flags
    ai_rec = claim.get("ai_recommendation", "")
    if ai_rec == "REJECTED":
        score += 15
        reasons.append("AI recommends rejection")
    if "DUPLICATE" in str(claim.get("ai_flags", [])).upper():
        score += 30
        reasons.append("Potential duplicate detected")

    # Factor 6: Claim age (older pending = higher priority)
    # Claims sitting in PENDING for longer should be escalated

    # Determine level
    if score >= 50:
        level = "HIGH"
    elif score >= 25:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {"level": level, "score": score, "reasons": reasons}
```

Enrich the `/api/queue/claims` response with priority:

```python
# In get_all_claims(), add to each claim:
priority = calculate_claim_priority(claim, member)
all_claims.append({
    **claim,
    "priority": priority,  # { "level": "HIGH", "score": 65, "reasons": [...] }
    # ... existing fields ...
})
```

### 4.2 Dashboard UI — Priority Badges

**File:** `frontend/src/components/ClaimsQueue.jsx`

Add a PRIORITY column to the claims table and colored badges:

```jsx
// Priority badge component
const PriorityBadge = ({ priority }) => {
  const colors = {
    HIGH:   { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5', icon: '🔴' },
    MEDIUM: { bg: '#fffbeb', text: '#d97706', border: '#fcd34d', icon: '🟡' },
    LOW:    { bg: '#f0fdf4', text: '#16a34a', border: '#86efac', icon: '🟢' },
  };
  const c = colors[priority.level] || colors.LOW;
  return (
    <span style={{
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 600,
    }}>
      {c.icon} {priority.level}
    </span>
  );
};
```

Add sortable Priority column header, default sort by priority (HIGH first).

### 4.3 Dashboard UI Improvements — Status Filter Enhancements

**File:** `frontend/src/components/ClaimsQueue.jsx`

Add priority filter pills alongside status filters:

```
[All (30)] [Pending (2)] [Approved (28)] [Rejected (0)]
──────────────────────────────────────────────────────
Priority: [All] [🔴 HIGH (3)] [🟡 MEDIUM (8)] [🟢 LOW (19)]
```

### 4.4 Test User Claim Priority

For the test user scenario (MEM-1001 — Liam O'Connor submitting a GP claim):

| Factor | Score | Reason |
|--------|-------|--------|
| Status: PENDING | +20 | Awaiting review |
| New policy (started 2026-02-01) | +20 | Waiting period may apply |
| AI recommends REJECTED | +15 | AI recommends rejection |
| **Total** | **55** | **→ MEDIUM priority** |

The test user's claim will display as **🟡 MEDIUM** in the Claims Queue — appropriate for a standard claim that needs human review but isn't critical.

---

## 5. PART D — AI Analysis with Source Document Citations

### 5.1 Architecture: Source Document Reference System

This is the most impactful improvement. When the AI analyzes a claim, it must cite **specific text from the IPID source document** to justify its recommendation.

#### Source Document Registry

**File:** `backend/app/tools/policy_tools.py` — Add a source document reference system:

```python
# ── Source Document: Money Smart 20 Family IPID ──────────────────
# This is the official Insurance Product Information Document.
# Every AI recommendation MUST cite specific text from this document.

IPID_SOURCE = {
    "document_name": "Money Smart 20 Family — Insurance Product Information Document (IPID)",
    "document_id": "IPID-MS20F-2026",
    "issuer": "AXA Insurance dac, trading as Laya Healthcare",
    "file_path": "Laya docs/insuranceplan/ipid.md",

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

    Returns a list of citation objects:
    [
        {
            "document": "Money Smart 20 Family IPID",
            "section": "What is insured? → Cash Plan",
            "highlighted_text": "GP and A&E: Up to €20 for up to 10 visits combined per year.",
            "relevance": "This rule defines the benefit cap and annual visit limit for the claimed treatment type."
        },
        ...
    ]
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
        })

    if "quarterly" in reason_str or "threshold" in reason_str or "€150" in reason_str:
        src = IPID_SOURCE["sections"]["quarterly_threshold"]
        citations.append({
            "document": IPID_SOURCE["document_name"],
            "document_id": IPID_SOURCE["document_id"],
            "section": src["section"],
            "highlighted_text": src["rule"],
            "relevance": "Quarterly accumulated receipts have not met the €150 threshold for payment.",
        })

    if "not insured" in reason_str or "not covered" in reason_str or "invalid therapy" in reason_str:
        src = IPID_SOURCE["sections"]["not_insured"]
        citations.append({
            "document": IPID_SOURCE["document_name"],
            "document_id": IPID_SOURCE["document_id"],
            "section": src["section"],
            "highlighted_text": src["rule"],
            "relevance": "The claimed treatment or therapy type is not listed under covered benefits.",
        })

    if "receipt" in reason_str or "signature" in reason_str or "form" in reason_str:
        src = IPID_SOURCE["sections"]["receipt_requirements"]
        citations.append({
            "document": IPID_SOURCE["document_name"],
            "document_id": IPID_SOURCE["document_id"],
            "section": src["section"],
            "highlighted_text": src["rule"],
            "relevance": "The submitted claim form or receipt is missing required information.",
        })

    if "private hospital" in reason_str or "not in-patient" in reason_str:
        src = IPID_SOURCE["sections"]["cashback_only"]
        citations.append({
            "document": IPID_SOURCE["document_name"],
            "document_id": IPID_SOURCE["document_id"],
            "section": src["section"],
            "highlighted_text": src["rule"],
            "relevance": "The scheme is a cash back scheme and does not cover private hospital admissions.",
        })

    return citations
```

### 5.2 Integrate Citations into AI Analysis Response

**File:** `backend/app/routers/queue.py` — `/api/queue/ai-analyze` endpoint

After the AI pipeline returns a result, attach source citations:

```python
from app.tools.policy_tools import get_source_citations

@router.post("/ai-analyze")
async def ai_analyze_claim(body: AIAnalyzeRequest, ...):
    # ... existing pipeline call ...

    result = await process_claim(...)

    # NEW: Generate source document citations
    treatment_type = body.treatment_type or result.get("treatment_type", "")
    reasoning = result.get("reasoning", "")
    flags = result.get("flags", [])
    rejection_reasons = [reasoning] + flags

    source_citations = get_source_citations(treatment_type, rejection_reasons)

    return {
        "ai_decision": result.get("decision", "PENDING"),
        "ai_reasoning": result.get("reasoning", ""),
        "ai_payout_amount": result.get("payout_amount", 0),
        "agent_trace": result.get("agent_trace", []),
        "flags": result.get("flags", []),
        "confidence": 0.95 if result.get("decision") in ("APPROVED", "REJECTED") else 0.7,
        "needs_info": result.get("needs_info", []),
        # ★ NEW FIELDS:
        "source_citations": source_citations,
        "source_document": "Money Smart 20 Family — IPID",
    }
```

### 5.3 Frontend — Source Citation Panel in ClaimReviewPanel

**File:** `frontend/src/components/ClaimReviewPanel.jsx`

Add a **Source Citations** section below the AI recommendation:

```jsx
{/* Source Document Citations */}
{analysis?.source_citations?.length > 0 && (
  <div className="source-citations-panel">
    <h4>
      <span className="icon">📄</span>
      Source Document References
    </h4>
    <p className="source-doc-name">
      {analysis.source_document}
    </p>

    {analysis.source_citations.map((citation, i) => (
      <div key={i} className="citation-card">
        <div className="citation-header">
          <span className="citation-section">{citation.section}</span>
          <span className="citation-badge">IPID Rule</span>
        </div>
        <blockquote className="citation-text">
          "{citation.highlighted_text}"
        </blockquote>
        <p className="citation-relevance">
          <strong>Why this applies:</strong> {citation.relevance}
        </p>
      </div>
    ))}

    <div className="citation-footer">
      <span className="verified-badge">✓ AI cited {analysis.source_citations.length} rule(s) from the official IPID</span>
    </div>
  </div>
)}
```

**File:** `frontend/src/index.css` — Source citation styles:

```css
.source-citations-panel {
  margin-top: 16px;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.source-citations-panel h4 {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.source-doc-name {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 12px;
  font-style: italic;
}

.citation-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #00A99D; /* Laya teal */
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}

.citation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.citation-section {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

.citation-badge {
  font-size: 10px;
  background: #00A99D;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.citation-text {
  font-size: 13px;
  color: #1e293b;
  background: #fefce8; /* light yellow highlight */
  border-left: 3px solid #eab308;
  padding: 8px 12px;
  margin: 8px 0;
  border-radius: 4px;
  font-style: italic;
  line-height: 1.5;
}

.citation-relevance {
  font-size: 12px;
  color: #475569;
  margin-top: 6px;
}

.citation-footer {
  margin-top: 12px;
  text-align: center;
}

.verified-badge {
  font-size: 11px;
  color: #16a34a;
  font-weight: 500;
}
```

### 5.4 Test User Scenario — Expected AI Analysis Output

When the developer runs AI Analysis on Liam O'Connor's GP claim, the expected response:

```json
{
  "ai_decision": "REJECTED",
  "ai_reasoning": "Member MEM-1001 (Liam O'Connor) has a policy start date of 2026-02-01. The treatment date is 2026-02-20, which is only 19 days into the policy. A 12-week (84-day) initial waiting period applies to all benefits under the Money Smart 20 Family scheme. The waiting period does not end until 2026-04-26. Therefore, this GP & A&E claim cannot be processed at this time.",
  "confidence": 0.95,
  "ai_payout_amount": 0,
  "flags": ["WAITING_PERIOD"],

  "source_citations": [
    {
      "document": "Money Smart 20 Family — Insurance Product Information Document (IPID)",
      "document_id": "IPID-MS20F-2026",
      "section": "Are there any restrictions on cover?",
      "highlighted_text": "A 12 week initial waiting period will apply to the cover listed, i.e. once your waiting periods have passed you can claim the benefits included on your scheme.",
      "relevance": "The 12-week initial waiting period has not elapsed since the member's policy start date (2026-02-01). Treatment date (2026-02-20) falls within the waiting period."
    },
    {
      "document": "Money Smart 20 Family — Insurance Product Information Document (IPID)",
      "document_id": "IPID-MS20F-2026",
      "section": "What is insured? → Cash Plan",
      "highlighted_text": "GP and A&E: Up to €20 for up to 10 visits combined per year.",
      "relevance": "Defines the benefit cap and annual limit for 'GP & A&E' under the member's scheme. Even though the visit limit (0/10 used) is not exhausted, the waiting period restriction takes precedence."
    }
  ],

  "source_document": "Money Smart 20 Family — IPID"
}
```

---

## 6. PART E — Developer Decision → Auto-Update Customer Portal

### 6.1 WebSocket Real-Time Status Push

When a developer submits a decision (Approve/Reject), the customer portal should update **in real-time** without the customer needing to refresh.

#### Backend: WebSocket Notification Channel

**File:** `backend/app/main.py` — Add a claim status WebSocket:

```python
from fastapi import WebSocket, WebSocketDisconnect
import json

# Global connection store: member_id -> list of WebSocket connections
claim_status_connections: dict[str, list[WebSocket]] = {}

@app.websocket("/ws/claim-status/{member_id}")
async def claim_status_ws(websocket: WebSocket, member_id: str):
    await websocket.accept()
    if member_id not in claim_status_connections:
        claim_status_connections[member_id] = []
    claim_status_connections[member_id].append(websocket)
    try:
        while True:
            await websocket.receive_text()  # Keep alive
    except WebSocketDisconnect:
        claim_status_connections[member_id].remove(websocket)


async def notify_claim_update(member_id: str, claim_id: str, new_status: str, details: dict):
    """Push a claim status update to all connected customer WebSockets for this member."""
    if member_id in claim_status_connections:
        message = json.dumps({
            "type": "claim_status_update",
            "claim_id": claim_id,
            "member_id": member_id,
            "new_status": new_status,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        for ws in claim_status_connections[member_id]:
            try:
                await ws.send_text(message)
            except Exception:
                pass
```

**File:** `backend/app/routers/queue.py` — `/api/queue/review` endpoint

After updating the claim status, push a WebSocket notification:

```python
from app.main import notify_claim_update

@router.post("/review")
async def review_claim(body: ReviewRequest, ...):
    # ... existing claim update logic ...

    # ★ NEW: Notify customer portal via WebSocket
    await notify_claim_update(
        member_id=body.member_id,
        claim_id=body.claim_id,
        new_status=body.decision,
        details={
            "reviewed_by": claim_found["reviewed_by"],
            "reviewer_notes": claim_found.get("reviewer_notes", ""),
            "payout_amount": claim_found.get("payout_amount", 0),
        },
    )

    return { "success": True, ... }
```

#### Frontend: Listen for Status Updates

**File:** `frontend/src/hooks/useChat.js` — Add a claim status WebSocket listener:

```javascript
// Connect to claim status WebSocket when a member is selected
useEffect(() => {
  if (!selectedMemberId) return;

  const wsUrl = `ws://localhost:8000/ws/claim-status/${selectedMemberId}`;
  const statusWs = new WebSocket(wsUrl);

  statusWs.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'claim_status_update') {
      // Update the relevant message in chat to show the new status
      setMessages(prev => prev.map(msg => {
        if (msg.claimId === data.claim_id) {
          return {
            ...msg,
            decision: data.new_status,
            statusUpdated: true,
            reviewDetails: data.details,
          };
        }
        return msg;
      }));

      // Show a toast notification
      toast.success(
        `Claim ${data.claim_id} has been ${data.new_status.toLowerCase()}`,
        { description: `Reviewed by ${data.details.reviewed_by}` }
      );
    }
  };

  return () => statusWs.close();
}, [selectedMemberId]);
```

**File:** `frontend/src/components/MessageBubble.jsx`

When a PENDING claim gets updated, animate the transition:

```jsx
// If the claim was PENDING and is now updated, show an animated status change
{message.statusUpdated && (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="status-update-banner"
  >
    <StatusBadge status={message.decision} />
    <span>Decision updated by {message.reviewDetails?.reviewed_by}</span>
  </motion.div>
)}
```

### 6.2 Dashboard Auto-Refresh After Decision

**File:** `frontend/src/pages/DevDashboardPage.jsx`

After the developer submits a decision via `submitClaimReview()`, auto-refresh:
- The ClaimsQueue (refetch `/api/queue/claims`)
- The AnalyticsCards (refetch `/api/queue/analytics`)
- The selected claim's status badge in the ClaimReviewPanel

```javascript
const handleSubmitDecision = async (decision, notes, payoutOverride) => {
  const result = await submitClaimReview({
    claim_id: selectedClaim.claim_id,
    member_id: selectedClaim.member_id,
    decision,
    reviewer_notes: notes,
    payout_amount: payoutOverride,
  });

  if (result.success) {
    toast.success(`Claim ${decision.toLowerCase()} successfully`);

    // Auto-refresh dashboard data
    await Promise.all([
      refreshClaimsQueue(),
      refreshAnalytics(),
    ]);

    // Update selected claim in-place
    setSelectedClaim(prev => ({
      ...prev,
      status: decision,
      reviewed_by: result.reviewed_by,
    }));
  }
};
```

---

## 7. PART F — Complete Demo Script (New Flow)

### Pre-Demo Setup

1. Start backend: `cd backend && python run.py`
2. Start frontend: `cd frontend && npm run dev`
3. Ensure `demo_pdfs/claim_gp_test_liam.pdf` is generated

### PART 1: Customer Portal (~3 minutes)

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Open `http://localhost:5173` | Login page appears |
| 2 | Click **"🧪 Test Customer (Liam)"** quick-login button | Logs in as `test@laya.ie` / `test123` |
| 3 | System redirects to `/dashboard` | 3-panel chat layout. Sidebar shows MEM-1001 — Liam O'Connor |
| 4 | Member is auto-selected (linked account) | MemberInfo panel shows: Policy start: 2026-02-01, GP visits: 0/10, Scheme: Money Smart 20 Family |
| 5 | Click **Upload** icon (📎) | File picker opens |
| 6 | Select `demo_pdfs/claim_gp_test_liam.pdf` | PDF preview appears in chat input area |
| 7 | Type: **"I'd like to submit a claim for my GP visit on February 20th"** | Message sends with attached PDF |
| 8 | AI processes through 6-agent pipeline | AgentPanel lights up: Setup → Intake → Eligibility → Principal → Outpatient → Decision |
| 9 | **Response appears:** | ⏳ "Claim Submitted Successfully — Your claim is under review by our claims team." |
| 10 | ClaimCard shows PENDING status | Amber "Under Review" card with claim ID, shimmer progress bar |

**What to explain:**
> "The customer submitted their GP claim receipt. Instead of getting an instant AI decision, the claim is now **PENDING** — meaning a human claims processor will review it. The AI has already analyzed it behind the scenes, but the decision waits for human confirmation. This is the key improvement: **AI processes, human decides.**"

### PART 2: Developer Dashboard (~5 minutes)

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Log out → Log in as `admin@laya.ie` / `admin123` | Redirects to `/dev-dashboard` |
| 2 | Dashboard loads | Hero banner, 6 analytics cards, Claims Queue with priority badges |
| 3 | **Notice the Claims Queue** | Liam's claim visible with **🟡 MEDIUM** priority badge and **PENDING** status |
| 4 | **Point out priority badges** | Each claim has HIGH (🔴) / MEDIUM (🟡) / LOW (🟢) based on risk factors |
| 5 | Click Liam's claim row | ClaimReviewPanel slides open on the right |
| 6 | Review claim details card | Shows: MEM-1001, GP & A&E, 2026-02-20, €55.00, Dr. Sarah Murphy, PENDING |
| 7 | Click **"🧠 Run AI Analysis"** | Purple button pulses, AI pipeline runs (~2-3 seconds) |
| 8 | **AI Analysis result appears** | **REJECT** recommendation, 95% confidence |
| 9 | **Source Citations section** | Two highlighted quotes from the IPID document (see below) |
| 10 | Review the citations | Developer reads the exact policy text that justifies the rejection |
| 11 | Click **"Reject"** decision button | Confirm the AI's recommendation |
| 12 | Add note: "Confirmed: 12-week waiting period not elapsed. AI recommendation verified against IPID source." | Optional but recommended |
| 13 | Click **"Submit Decision"** | Claim status updates to REJECTED |
| 14 | Dashboard refreshes automatically | Analytics cards update, claim moves to REJECTED filter |
| 15 | **Customer portal updates in real-time** | Liam's chat shows: PENDING → REJECTED transition (WebSocket push) |

**What is shown in Step 9 — Source Citations:**

> 📄 **Source Document: Money Smart 20 Family — IPID**
>
> **Citation 1** (Are there any restrictions on cover?):
> > _"A 12 week initial waiting period will apply to the cover listed, i.e. once your waiting periods have passed you can claim the benefits included on your scheme."_
>
> **Why this applies:** The 12-week initial waiting period has not elapsed since the member's policy start date (2026-02-01). Treatment date (2026-02-20) is only 19 days into the policy.
>
> **Citation 2** (What is insured? → Cash Plan):
> > _"GP and A&E: Up to €20 for up to 10 visits combined per year."_
>
> **Why this applies:** This rule defines the benefit cap (€20) and annual limit (10 visits) for GP & A&E claims. However, the waiting period restriction takes precedence — even though visit limits are not exhausted, the claim cannot be processed until the waiting period ends on 2026-04-26.

**What to explain:**
> "The AI didn't just say 'REJECTED' — it cited the **exact text from the official IPID source document** that justifies the rejection. The developer can verify this against the original policy document. This is full **AI transparency with source citations** — the human can trust the AI's recommendation because they can see exactly which rules were applied."

### PART 3: Verification (~1 minute)

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Switch to customer browser tab (or log back in as customer) | Customer portal loads |
| 2 | Look at the chat | Liam's claim now shows ❌ **REJECTED** (was ⏳ PENDING) |
| 3 | The status update appeared automatically | No refresh needed — WebSocket pushed the update |
| 4 | Customer can type: "Why was my claim rejected?" | AI explains the 12-week waiting period using conversation memory |

---

## 8. File-by-File Implementation Checklist

### Backend Changes

| # | File | Change | Priority |
|---|------|--------|----------|
| 1 | `backend/users_db.json` | Add `test@laya.ie` / `test123` account linked to MEM-1001 | HIGH |
| 2 | `backend/app/auth/users.py` | Add test user to default accounts | HIGH |
| 3 | `backend/app/agents/graph.py` | `decision_node()`: Set status=PENDING for customer-submitted claims; store AI recommendation as `ai_recommendation` field | HIGH |
| 4 | `backend/app/routers/chat.py` | Return customer-friendly "Claim Submitted" message when status is PENDING | HIGH |
| 5 | `backend/app/tools/policy_tools.py` | Add `IPID_SOURCE` registry and `get_source_citations()` function | HIGH |
| 6 | `backend/app/routers/queue.py` | Add `calculate_claim_priority()` function, enrich `/api/queue/claims` with priority field, add source citations to `/api/queue/ai-analyze` response | HIGH |
| 7 | `backend/app/main.py` | Add `/ws/claim-status/{member_id}` WebSocket endpoint and `notify_claim_update()` helper | MEDIUM |
| 8 | `backend/app/routers/queue.py` | `/api/queue/review`: Call `notify_claim_update()` after status change | MEDIUM |

### Frontend Changes

| # | File | Change | Priority |
|---|------|--------|----------|
| 9 | `frontend/src/pages/LoginPage.jsx` | Add "🧪 Test Customer" quick-login button | HIGH |
| 10 | `frontend/src/components/ClaimCard.jsx` | Add PENDING state UI (amber "Under Review" card with shimmer) | HIGH |
| 11 | `frontend/src/components/ClaimsQueue.jsx` | Add PRIORITY column with colored badges (HIGH/MEDIUM/LOW), add priority filter pills, default sort by priority | HIGH |
| 12 | `frontend/src/components/ClaimReviewPanel.jsx` | Add Source Citations panel below AI recommendation (citation cards with highlighted text, section references, relevance explanations) | HIGH |
| 13 | `frontend/src/index.css` | Add styles for: `.claim-card.pending-review`, `.priority-badge`, `.source-citations-panel`, `.citation-card`, `.citation-text` (yellow highlight) | HIGH |
| 14 | `frontend/src/hooks/useChat.js` | Add WebSocket listener for `/ws/claim-status` — update claim status in real-time | MEDIUM |
| 15 | `frontend/src/components/MessageBubble.jsx` | Animated PENDING→REJECTED/APPROVED transition when WebSocket pushes update | MEDIUM |
| 16 | `frontend/src/pages/DevDashboardPage.jsx` | Auto-refresh ClaimsQueue + AnalyticsCards after decision submission | MEDIUM |
| 17 | `frontend/src/services/api.js` | No changes needed (existing `runAIAnalysis` and `submitClaimReview` already handle the flow) | — |

### Data & PDF Changes

| # | File | Change | Priority |
|---|------|--------|----------|
| 18 | `demo_pdfs/generate_pdfs.py` | Add test claim PDF data for MEM-1001 GP visit (€55, Dr. Sarah Murphy, 2026-02-20) | HIGH |
| 19 | Run `python demo_pdfs/generate_pdfs.py` | Generate `claim_gp_test_liam.pdf` | HIGH |

### Implementation Order

```
Phase 1 — Core Flow (PENDING + Source Citations):
  ├── #1, #2  → Test user account
  ├── #18, #19 → Test claim PDF
  ├── #3, #4  → PENDING status for customer claims
  ├── #5, #6  → Source citations in AI analysis
  ├── #9, #10 → Customer portal PENDING UI
  └── #11, #12, #13 → Dashboard priority badges + citation panel

Phase 2 — Real-Time Sync:
  ├── #7, #8  → WebSocket claim status push
  ├── #14, #15 → Customer portal real-time update
  └── #16 → Dashboard auto-refresh
```

---

## Summary

| Improvement | What Changes | User Impact |
|-------------|-------------|-------------|
| **Claims start as PENDING** | Customer claims don't auto-decide; AI recommendation is stored internally | "AI processes, human decides" — true human oversight |
| **Priority badges (H/M/L)** | Claims Queue shows colored priority from risk scoring | Developers triage efficiently |
| **Source document citations** | AI cites exact IPID text (highlighted quotes with section references) | Full AI transparency — developers verify against original policy |
| **Real-time status sync** | WebSocket pushes decision updates to customer portal | Customer sees PENDING → REJECTED without refreshing |
| **Test user + PDF** | New demo account + generated GP claim receipt | Clean, reproducible demo scenario |
