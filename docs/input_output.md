To show a flawless live demo, your input needs to simulate what a real user would do: **Upload a document** and **type a message**. 

Since you are building this for a hackathon, the safest and most impressive way to handle the "Document Upload" part is to simulate what **Parent Agent 1 (OCR & Data Extractor)** outputs. 

Here are the exact inputs you should give your system during the demo for the 4 best test cases. 

---

### Demo Test Case 1: The "Waiting Period" Rejection
**What you are proving:** The AI can read the database, calculate dates, and apply the 12-week waiting period rule.

**1. What you type into the Chat UI:**
> "Hi, I would like to submit my claim for a GP visit I had yesterday."

**2. The Document/Mocked OCR JSON you provide:**
*(If your UI allows file uploads, create a dummy PDF with these details. If you are using an API/JSON payload, pass this directly):*
```json
{
  "extracted_document_data": {
    "member_id": "MEM-1001",
    "patient_name": "Liam O'Connor",
    "form_type": "Money Smart Out-patient Claim Form",
    "treatment_type": "GP & A&E",
    "treatment_date": "2026-02-20",
    "practitioner_name": "Dr. Hibbert",
    "total_cost": 60.00,
    "signature_present": true
  }
}
```
**Watch it happen:** The AI will look up `MEM-1001`, see the policy start date is `2026-02-01`, realize Feb 20th is only 3 weeks later, and reject it because of the 12-week rule.

---

### Demo Test Case 2: The "Quarterly Threshold" Approval
**What you are proving:** The AI can do math across past database records and current document data to cross the €150 threshold.

**1. What you type into the Chat UI:**
> "Please process my latest consultant receipt."

**2. The Document/Mocked OCR JSON you provide:**
```json
{
  "extracted_document_data": {
    "member_id": "MEM-1002",
    "patient_name": "Siobhan Kelly",
    "form_type": "Money Smart Out-patient Claim Form",
    "treatment_type": "Consultant Fee",
    "treatment_date": "2026-02-15",
    "practitioner_name": "Dr. Nick Riviera",
    "total_cost": 60.00,
    "signature_present": true
  }
}
```
**Watch it happen:** The AI looks up `MEM-1002`, sees she already has €110 in receipts this quarter. It calculates €110 + €60 = €170. Because €170 > €150, it approves the claim to trigger a payout.

---

### Demo Test Case 3: The "Annual Limit Exceeded" Rejection
**What you are proving:** The AI tracks the count of specific benefits (Scans) and enforces hard annual limits.

**1. What you type into the Chat UI:**
> "I'm submitting my receipt for an MRI scan I had at the Beacon Hospital."

**2. The Document/Mocked OCR JSON you provide:**
```json
{
  "extracted_document_data": {
    "member_id": "MEM-1003",
    "patient_name": "Declan Murphy",
    "form_type": "Money Smart Out-patient Claim Form",
    "treatment_type": "Scan Cover",
    "treatment_date": "2026-02-10",
    "practitioner_name": "Beacon Hospital",
    "total_cost": 200.00,
    "signature_present": true
  }
}
```
**Watch it happen:** The AI checks `MEM-1003`, sees `scan_count: 10`. It checks the policy rules ("Up to €20 for up to 10 scans per year"). Because the 10-scan limit is already reached, it rejects the claim.

---

### Demo Test Case 4: The "Duplicate / Fraud" Detection
**What you are proving:** The AI checks the history table to prevent paying out the exact same receipt twice.

**1. What you type into the Chat UI:**
> "Hi, I need to claim for my consultant visit from January."

**2. The Document/Mocked OCR JSON you provide:**
```json
{
  "extracted_document_data": {
    "member_id": "MEM-1005",
    "patient_name": "Conor Walsh",
    "form_type": "Money Smart Out-patient Claim Form",
    "treatment_type": "Consultant Fee",
    "treatment_date": "2026-01-15",
    "practitioner_name": "Dr. Sarah Smith",
    "total_cost": 150.00,
    "signature_present": true
  }
}
```
**Watch it happen:** The AI looks up `MEM-1005`, scans the `claims_history` array in the database, and sees that a claim for *Dr. Sarah Smith* on *2026-01-15* for *€150* already exists and was "Approved". The AI flags this as a duplicate and rejects it.

---

### 💡 Hackathon Pro-Tip for your System Prompt:
To make your Principal Agent work perfectly with these inputs, your overarching system prompt should look something like this:

*"You are the Principal Agent for Laya Healthcare. A user will provide a text request and an uploaded document (represented as JSON data). Your job is to route this to the correct Parent Agent. 
1. Look up the `member_id` in the database. 
2. Compare the `extracted_document_data` against the Money Smart 20 Family policy rules.
3. Check for waiting periods (12 weeks), annual limits, quarterly thresholds (€150), and duplicate claims.
4. Return a final decision: APPROVED, REJECTED, or PARTIALLY APPROVED, along with a clear explanation of your reasoning based on the policy and database history."*