This is an excellent use case for an Agentic AI Architecture (Principal -> Parent -> Child agents) in a hackathon setting. Medical claims processing is historically heavily manual, and your approach perfectly showcases AI’s ability to parse complex documents, cross-reference databases, and apply business logic. 

Based on the **Laya Healthcare Money Smart 20 Family** policy document and the various claim forms you provided, I have crafted **15 complex scenario test cases** for your demo. These will prove that your AI can handle OCR data extraction, stateful memory (database lookups), and complex, multi-layered business rules.

### How to pitch this in your Demo:
Explain that the **Principal Agent** interprets the user's intent, routes to the **Parent Agent** (e.g., Out-patient Agent, In-patient Agent, Maternity Agent), and then a specific **Child Agent** checks the explicit rules, reads the DB for history, and returns a calculated decision.

---

### The 15 Complex Demo Scenarios

#### 1. The "Waiting Period" Rejection
*   **Scenario:** A user uploads a valid GP receipt for €50. However, the database shows their policy started only 4 weeks ago.
*   **AI Agent Logic:** Checks member start date in DB against the treatment date.
*   **Expected AI Output:** **REJECTED.** *Reason:* "A 12-week initial waiting period applies to your chosen scheme. The treatment date falls within this waiting period."

#### 2. The "Quarterly Accumulation" Hold (Complex DB Lookup)
*   **Scenario:** A user submits a valid €60 Consultant fee receipt. Their previous claims this quarter total €50. 
*   **AI Agent Logic:** The AI reads the restriction: *"Claims will only be paid once the accumulated receipts total €150 or more in every quarter submitted."*
*   **Expected AI Output:** **APPROVED BUT PENDING PAYMENT.** *Reason:* "Valid claim for €20 limit. However, your accumulated receipts for this quarter are only €110 (€50 previous + €60 current). Payment will be processed once total quarter receipts exceed €150."

#### 3. Mixed Batch Claim (Handling Multiple Limits at Once)
*   **Scenario:** User uploads an Out-patient claim form with two receipts: A €60 GP visit and a €15 Prescription.
*   **AI Agent Logic:** Child agent splits the claim. It applies the €20 cap to the GP visit and the €10 cap to the prescription.
*   **Expected AI Output:** **PARTIALLY APPROVED.** *Reason:* "GP Visit approved for €20 (maximum allowance). Prescription approved for €10 (maximum allowance). Total payout: €30."

#### 4. The 11th Visit (Exceeding Yearly Cap)
*   **Scenario:** User claims a €20 Scan Cover. The DB shows they have already successfully claimed 10 Scan Covers this policy year.
*   **AI Agent Logic:** DB lookup returns `scan_count = 10`. Policy allows "up to 10 scans per year".
*   **Expected AI Output:** **REJECTED.** *Reason:* "You have already reached the maximum limit of 10 Scan Covers for this policy year."

#### 5. Missing Mandatory Procedure Evidence (Deep Document Parsing)
*   **Scenario:** A GP submits a claim for **Procedure Code 29** (Basal cell carcinoma). The user uploaded the claim form but no additional documents.
*   **AI Agent Logic:** The AI reads page 4 of the GP form: *"Procedure code 29: HISTOLOGY REPORT REQUIRED WITH THE CLAIM FORM."* It scans the attachments, finds no histology report.
*   **Expected AI Output:** **PENDING / REJECTED.** *Reason:* "A Histology Report is strictly required for Procedure Code 29. Please upload the histology report to proceed."

#### 6. Specific Clinical Indicator Rule (Phlebotomy)
*   **Scenario:** User uploads a claim for **Procedure Code 16 (Phlebotomy)**. The Clinical Indicator code written is `0222`, but the AI detects no initial serum ferritin levels are mentioned on the form.
*   **AI Agent Logic:** Cross-references the GP form rules which state: *"INITIAL SERUM FERRITIN FOR CLINICAL INDICATOR (0222)... REQUIRED ON THE FIRST CLAIM."*
*   **Expected AI Output:** **REJECTED.** *Reason:* "For procedure code 16 with clinical indicator 0222, the initial serum ferritin levels must be explicitly noted on the first claim."

#### 7. Third-Party Liability / Solicitor Flag (Risk & Fraud Mitigation)
*   **Scenario:** User submits an In-Patient claim. On the form, the box for "Is admission related to accident or injury?" is checked **Yes**, and the "Solicitor" box is checked **Yes**.
*   **AI Agent Logic:** Identifies third-party involvement.
*   **Expected AI Output:** **APPROVED (WITH ESCALATION).** *Reason:* "Claim meets medical criteria, but flagged for the Legal/Subrogation Team. As per the declaration, Laya Healthcare must recover these costs from the Personal Injuries Assessment Board (PIAB) or third-party solicitor."

#### 8. The "12-Month Rule" Expiration
*   **Scenario:** User submits a perfectly valid €50 routine dental receipt, but the date on the receipt is from 14 months ago.
*   **AI Agent Logic:** AI compares the receipt date to the current system date.
*   **Expected AI Output:** **REJECTED.** *Reason:* "Claims must be submitted within 12 months of the treatment date on your receipt. This receipt is older than 12 months."

#### 9. Max Duration Exceeded (In-Patient Stay)
*   **Scenario:** User uploads a hospital claim for an In-Patient stay lasting 45 days. 
*   **AI Agent Logic:** AI checks the "Hospital day-case / In-patient Cash Back" limit, which is "Up to €20 per day up to a max of 40 days per year."
*   **Expected AI Output:** **PARTIALLY APPROVED.** *Reason:* "Approved for 40 days at €20/day (€800). The remaining 5 days are rejected as they exceed the annual maximum of 40 days."

#### 10. Invalid Therapy Category (Semantic Understanding)
*   **Scenario:** User submits a receipt for €60 for "Reiki Energy Healing" under *Day to Day Therapies*.
*   **AI Agent Logic:** AI checks the allowed list under Day to Day Therapies: *(Physiotherapy, reflexology, acupuncture, osteopathy, physical therapist, chiropractor)*. It uses semantic matching to determine Reiki is not one of these.
*   **Expected AI Output:** **REJECTED.** *Reason:* "Reiki is not an eligible Day to Day Therapy. Covered therapies are limited to Physiotherapy, reflexology, acupuncture, osteopathy, physical therapy, and chiropractic."

#### 11. Maternity Cash Back (Flat Rate Rule)
*   **Scenario:** User uploads a Pre and Post-Natal Claim Form for the birth of a baby, along with hospital receipts totaling €1,500. 
*   **AI Agent Logic:** AI routes to Maternity Child Agent. It identifies the benefit is "Up to €200 per birth / adoption per year."
*   **Expected AI Output:** **APPROVED.** *Reason:* "Maternity/Adoption Cash Back approved for the flat maximum rate of €200. The remaining €1,300 is not covered under the Cash Plan policy."

#### 12. Missing Signature Detection (Computer Vision/OCR)
*   **Scenario:** User submits an Out-patient claim form. All details are filled perfectly, but the "Signed (insured member if over 16)" box is blank.
*   **AI Agent Logic:** Vision/OCR agent detects an empty signature bounding box.
*   **Expected AI Output:** **PENDING / ACTION REQUIRED.** *Reason:* "The main member or policyholder signature is missing on page 1. Please sign and re-upload the form."

#### 13. Duplicate Claim Submission
*   **Scenario:** User uploads a receipt for a Consultant Visit dated 01/01/2026. The AI checks the database and sees a claim for the exact same amount, same date, and same consultant was approved on 15/01/2026.
*   **AI Agent Logic:** Hash matching or DB querying prevents double payouts.
*   **Expected AI Output:** **REJECTED.** *Reason:* "Duplicate claim detected. A claim for this specific treatment date and provider has already been processed."

#### 14. In-patient Exceeding Cover Type (Cash Plan Restriction)
*   **Scenario:** User uploads a €5,000 hospital invoice for a private room and surgery, expecting full coverage.
*   **AI Agent Logic:** The AI reads the overarching rule of the *Cash Plan* product: *"Health Insurance Cash Plans do not provide in-patient cover for costs incurred in hospital as a private patient."*
*   **Expected AI Output:** **REJECTED.** *Reason:* "Your Money Smart 20 Family scheme is a Cash Back scheme, not an in-patient health insurance scheme. It does not cover private hospital admission invoices, only the daily cash back rate of €20 per day."

#### 15. The "Child Agent Handoff" (Wrong Form Uploaded)
*   **Scenario:** The user wants to claim for a standard GP visit but accidentally fills out and uploads the **General Practitioner Claim Form** (which is for HSE/GP overall charge/procedures) instead of the **Money Smart Out-patient Claim Form**.
*   **AI Agent Logic:** The Principal Agent classifies the document type. It realizes the form used is for advanced Medical/Surgical claims rather than basic cash-back out-patient receipts.
*   **Expected AI Output:** **ACTION REQUIRED.** *Reason:* "It looks like you uploaded the 'General Practitioner Claim Form' meant for hospital/surgical procedures. To claim your €20 GP Cash Back, please upload the 'Money Smart Out-patient Claim Form' with your receipt."

---

### Tips for the Demo
1. **Show the UI:** Have a simple chat or upload interface. 
2. **Show the "Brain" (The Logs):** When a document is uploaded, visually show the routing: `Principal Agent -> Routing to Out-Patient Agent -> Querying Database for past claims -> Applying €20 limit -> Decision`. Judges *love* to see the thought process of the agents.
3. **Use Synthetic Data:** Create a fake database table on the screen (or in terminal) showing "User 123: 9 GP visits used". Run Scenario #4 and watch the database update to 10, then reject the next one. This proves your AI isn't just a basic LLM prompt, but a fully integrated agentic system.