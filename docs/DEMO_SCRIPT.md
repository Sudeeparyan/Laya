# Laya Healthcare AI Claims — DEMO SCRIPT

> **Two portals, one AI engine.** Customers submit claims via chat. Developers review every claim through an AI-powered dashboard — the AI recommends, the human decides.

---

## DEMO FLOW — Two-Portal Story (~12 minutes)

### Opening Pitch (45 seconds)
> "Laya Healthcare processes thousands of medical claims manually, taking up to **22 business days**. Our system has two portals:
>
> 1. **Customer Portal** — Members submit claims, ask questions, and get instant AI-powered responses through a chat interface.
> 2. **Developer Dashboard** — Claims processors see ALL customer claims in a single queue. They click any claim, run our 6-agent AI pipeline for analysis, and then make the final human decision — Approve, Reject, or Escalate.
>
> **The pitch is simple: AI assists, human decides.** We reduce 22 days to seconds while keeping full human oversight."

---

## PART 1: CUSTOMER PORTAL (Chat Experience)

> Log in as **Customer** (`customer@laya.ie` / `customer123`). The system redirects to the Chat Dashboard.

---

### SCENARIO 1: Customer Submits a Claim (Waiting Period Rejection) ❌
**What it proves:** A customer submits a claim through chat and gets an instant AI decision.

**Member:** Liam O'Connor (MEM-1001) — Policy started Feb 1, 2026 (only ~3 weeks ago)

#### Step-by-step:
1. **Log in** as `customer@laya.ie` / `customer123`
2. The system opens the **Chat Dashboard** (3-panel layout: sidebar + chat + agent panel)
3. **Select** the member `MEM-1001 - Liam O'Connor` from the sidebar
4. **Upload** the PDF: `demo_pdfs/claim_gp_visit_liam.pdf`
   (OR click the "Waiting Period Test" demo button)
5. **Type this message:**
   ```
   Hi, I would like to submit my claim for a GP visit I had yesterday.
   ```

#### Expected AI Response:
> **Decision: REJECTED**
>
> Your claim has been reviewed and unfortunately cannot be processed at this time.
>
> **Reason:** A 12-week initial waiting period applies to your Money Smart 20 Family scheme. Your policy started on 2026-02-01, and the treatment date (2026-02-20) falls within this waiting period. The waiting period ends on 2026-04-26. You have approximately 65 days remaining before claims can be processed.

#### What to explain to the audience:
- "This is the **Customer Portal** — the member sees a clean chat experience"
- "The AI looked up MEM-1001 in the database, found the policy start date, and calculated the waiting period"
- "The customer gets an instant, clear answer — no 22-day wait"
- "Notice the Agent Trace panel on the right — every tool call is logged"

#### Follow-up Questions (Multi-turn Demo):
6. **Type:** `what is the reason for the rejection`
   > The AI explains the 12-week waiting period in detail, using Liam's name and specific dates — from conversation memory.

7. **Type:** `when can I submit my claim again?`
   > The AI calculates: submit after **2026-04-26** (when the 12-week waiting period ends).

8. **Type:** `what benefits does my plan cover?`
   > The AI lists all Money Smart 20 Family benefits — proving it answers policy questions contextually.

**What to explain:** "This is like ChatGPT — the AI remembers the entire conversation. No need to re-upload documents or repeat information."

---

### SCENARIO 2: Customer Submits a Successful Claim ✅
**What it proves:** The AI approves claims with financial calculations across multiple records.

**Member:** Siobhan Kelly (MEM-1002) — Has €110 accumulated this quarter

#### Step-by-step:
1. **Click "New Chat"** to start a fresh session
2. **Select** the member `MEM-1002 - Siobhan Kelly`
3. **Upload** the PDF: `demo_pdfs/claim_consultant_siobhan.pdf`
4. **Type this message:**
   ```
   I need to submit a consultant visit claim for EUR 60.
   ```

#### Expected AI Response:
> **Decision: APPROVED**
>
> Your consultant fee claim has been processed successfully.
>
> **Details:**
> - Treatment: Consultant Fee with Dr. Nick Riviera on 2026-02-15
> - Claimed amount: €60.00
> - Approved payout: €20.00 (maximum per visit under Money Smart 20 Family)
> - Quarterly threshold: Previous total €110.00 + €60.00 = €170.00 (≥ €150 threshold met — payment triggered)

#### What to explain:
- "The AI checked the database: Siobhan had €110 in claims this quarter"
- "Added €60 → €170 total → crosses the €150 quarterly threshold"
- "Payout of €20 (max per consultant visit) is approved"
- "This shows stateful, multi-record financial calculations"

---

> **TRANSITION:** "Now let's switch to the **Developer Dashboard**. This is where the claims processor sees ALL customer activity and makes the final call on every claim."

---

## PART 2: DEVELOPER DASHBOARD (AI-Assisted Review)

> Log out and log in as **Developer** (`admin@laya.ie` / `admin123`). The system auto-redirects to the Developer Dashboard.

---

### SCENARIO 3: Developer Dashboard Overview
**What it proves:** Developers see ALL claims across ALL members in one place with analytics.

#### Step-by-step:
1. **Log out** (click the logout icon)
2. **Log in** as `admin@laya.ie` / `admin123`
3. The system auto-redirects to `/dev-dashboard` — the **Developer Claims Dashboard**

#### What to show the audience:
- **Hero Banner:** "22 days → seconds" headline with AI-powered processing tagline
- **Analytics Cards (top row):** 6 stat cards showing:
  - Total Members (20)
  - Total Claims across all members
  - Approved / Rejected counts
  - AI Accuracy (96.5%)
  - Avg Processing Time (2.3 seconds vs 22 business days)
- **Claims Queue (left panel):** Every claim from every customer in a sortable/filterable table
  - Search by claim ID, member name, or practitioner
  - Filter pills: All / Approved / Rejected / Pending (with counts)
  - Sortable columns: member, date, amount, status
- **Risk Monitor (bottom-left):** Members approaching policy limits, ranked by risk score
  - Members like Declan Murphy (10/10 scans) and Aoife Byrne (38/40 hospital days) should appear with "High" risk badges

#### What to explain:
- "This is the developer's centralized command center — every claim from every customer in one view"
- "The analytics cards give an instant pulse on the overall system"
- "The risk monitor flags members who are approaching their policy limits"
- "Notice: the developer can see Liam's rejected claim and Siobhan's approved claim from Part 1"

---

### SCENARIO 4: AI-Assisted Claim Review (Annual Limit Exceeded) ❌
**What it proves:** Developer picks a claim, AI analyzes it, developer makes the final decision.

**Member:** Declan Murphy (MEM-1003) — Already used 10/10 scans this year

#### Step-by-step:
1. In the **Claims Queue**, find Declan Murphy's scan claim
   (Use the search bar: type "Declan" or "MEM-1003")
2. **Click the claim row** — the AI Review Panel opens on the right
3. Review the claim details card:
   - Member: Declan Murphy (MEM-1003)
   - Treatment: Scan Cover (MRI) at Beacon Hospital
   - Amount: €180
   - Status: Pending
4. **Click "Run AI Analysis"** (the purple brain button with pulse animation)
5. Wait for the AI pipeline to complete (~2-3 seconds)

#### Expected AI Analysis Result:
> **AI Recommendation: REJECT** (Confidence: 95%)
>
> **Reasoning:** Member has already used 10 out of 10 scan covers for the policy year 2026. The annual limit has been reached. No additional scan claims can be processed until the next policy year.
>
> **Flags:** Annual limit exceeded

6. **Developer Decision:** Click the **"Reject"** decision button
7. Optionally add a review note: `Annual scan limit reached. Confirmed AI recommendation.`
8. **Click "Submit Decision"**

#### What to explain:
- "The developer clicked one claim from the queue — the AI Review Panel appeared"
- "They clicked 'Run AI Analysis' — the same 6-agent pipeline that powers the chat analyzed this claim"
- "The AI returned: REJECT with 95% confidence and a clear reason"
- "The developer reviewed it and confirmed the rejection — **the human made the final call**"
- "This is the core pitch: **AI assists, human decides**. The AI does the heavy lifting in 2 seconds; the developer validates and submits."

---

### SCENARIO 5: AI-Assisted Review — Duplicate/Fraud Detection ❌
**What it proves:** The AI catches fraud that humans might miss, developer confirms.

**Member:** Conor Walsh (MEM-1005) — Has a pre-existing approved claim for same doctor/date/amount

#### Step-by-step:
1. In the **Claims Queue**, search for "Conor" or "MEM-1005"
2. **Click** Conor Walsh's consultant fee claim
3. **Click "Run AI Analysis"**

#### Expected AI Analysis Result:
> **AI Recommendation: REJECT** (Confidence: 95%)
>
> **Reasoning:** This claim matches an already approved claim (CLM-9004) for the same treatment (Consultant Fee with Dr. Sarah Smith on 2026-01-15 for €150.00). This appears to be a duplicate submission. Duplicate claims cannot be paid out twice.
>
> **Flags:** Potential duplicate

4. **Developer Decision:** Click **"Reject"**
5. Add note: `Confirmed duplicate of CLM-9004. Potential fraud flagged for audit.`
6. **Submit Decision**

#### What to explain:
- "In manual processing, duplicate claims slip through — costing insurers millions"
- "The AI cross-referenced the claims history and caught the duplicate instantly"
- "The developer confirmed and added a fraud note — this goes into the audit trail"
- "This is where the AI saves real money: **fraud detection in seconds, not weeks**"

---

### SCENARIO 6: Switch Back to Chat View
**What it proves:** Developers can seamlessly switch between the dashboard and chat interfaces.

#### Step-by-step:
1. Click the **"Chat View"** button in the top-right navbar
2. The system navigates to `/dashboard` — the familiar 3-panel chat layout
3. From the left sidebar, notice the **"Claims Dashboard"** button at the bottom
4. Click it to return to `/dev-dashboard`

#### What to explain:
- "Developers have two views: the Dashboard for queue management and the Chat for testing AI responses"
- "They can switch between them seamlessly — the sidebar always shows the Dashboard link"

---

## BONUS SCENARIOS (If time allows)

### BONUS A: Invalid Therapy Type (from Dashboard)
1. In **Claims Queue**, find Patrick Doyle (MEM-1007)
2. Click his claim → Run AI Analysis
3. **Expected:** AI recommends REJECT — Reiki is not in the allowed therapy list
4. Developer confirms rejection

### BONUS B: Hospital Stay Partial Approval (from Dashboard)
1. Find Aoife Byrne (MEM-1004) — 38/40 hospital days used
2. Run AI Analysis on her 5-day hospital stay claim
3. **Expected:** AI recommends PARTIALLY APPROVED — Only 2 of 5 days approved (€40 payout)
4. Developer adjusts payout amount in the override field if needed, submits

### BONUS C: Customer General Question (from Chat)
1. Switch to Chat View, select any member
2. **Type:** `What benefits are covered under my Money Smart 20 Family plan?`
3. **Expected:** Full benefits table — proving the AI answers policy questions without documents

### BONUS D: Maternity Cash Back (from Dashboard)
1. Find Niamh Brennan (MEM-1008) in the Claims Queue
2. Run AI Analysis on her maternity claim
3. **Expected:** AI recommends APPROVED for flat €200 maternity cash back
4. Developer approves

---

## QUICK REFERENCE: All Members in the Database

| Member ID | Name | Scenario | Expected Result |
|-----------|------|----------|----------------|
| MEM-1001 | Liam O'Connor | Waiting period (policy started 3 weeks ago) | REJECTED |
| MEM-1002 | Siobhan Kelly | Crosses €150 quarterly threshold | APPROVED |
| MEM-1003 | Declan Murphy | 10/10 scans used (annual limit) | REJECTED |
| MEM-1004 | Aoife Byrne | 38/40 hospital days used | PARTIALLY APPROVED |
| MEM-1005 | Conor Walsh | Duplicate claim for same doctor/date | REJECTED |
| MEM-1006 | Roisin Flanagan | 12-month expired receipt | REJECTED |
| MEM-1007 | Patrick Doyle | Invalid therapy type (Reiki) | REJECTED |
| MEM-1008 | Niamh Brennan | Maternity flat €200 cash back | APPROVED |
| MEM-1009 | Sean Gallagher | Third-party/solicitor escalation | ESCALATED |
| MEM-1010 | Ciara Kavanagh | Missing signature detection | ACTION REQUIRED |

---

## LOGIN CREDENTIALS

| Role | Email | Password | Redirects To |
|------|-------|----------|-------------|
| Developer | `admin@laya.ie` | `admin123` | `/dev-dashboard` |
| Customer | `customer@laya.ie` | `customer123` | `/dashboard` |

---

## TIPS FOR THE DEMO

1. **Start with Part 1 (Customer Portal)** — Log in as customer, show the chat claim submission. This establishes the "problem" (customer submits a claim).
2. **Transition to Part 2 (Developer Dashboard)** — Log in as developer. "Now let's see how the claims processor handles this." This is the "solution."
3. **The money shot is Scenario 4** — Click a claim → Run AI Analysis → see the recommendation → click Approve/Reject. This is the "AI assists, human decides" workflow in action.
4. **Highlight the speed:** Point at the footer bar — "Average processing: 2.3 seconds. Manual processing: 22 business days."
5. **Show follow-up questions in Part 1** — "When can I submit again?" proves ChatGPT-like conversational memory.
6. **End with Scenario 5 (Fraud Detection)** — The AI catching duplicates is the most impressive capability.
7. **Keep the terminal/logs visible** — Show real-time agent routing in the backend.
8. **Use the search & filter** in the Claims Queue — Type a member name, click a status filter pill, sort by amount. This proves the dashboard is truly functional.
9. **Show the Risk Monitor** — Scroll down to see members approaching limits. "The system proactively flags risky cases."
