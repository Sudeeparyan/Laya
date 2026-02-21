Here is the complete, structured blueprint for your **Agentic Architecture**. You can use this directly as your development roadmap. 

The **Principal Agent** acts as the front door. When a user uploads a document or asks a question, the Principal Agent looks at the request and routes it to one (or more) of the **5 Parent Agents**. Each Parent Agent manages a specific domain and delegates the actual processing to its **Child Agents**.

---

### **Parent Agent 1: Intake & Document Intelligence**
**Role:** The "Eyes" of the system. This parent is responsible for reading the uploaded files, classifying what they are, and extracting raw data so the rest of the system can understand it.

*   **Child 1.1: Form Classifier**
    *   *Task:* Looks at the uploaded PDF/Image and identifies the form type (e.g., *Out-patient Claim Form*, *General Practitioner Form*, *Pre/Post-Natal Form*, *In-patient Form*, or just a loose receipt).
*   **Child 1.2: OCR & Data Extractor**
    *   *Task:* Extracts key-value pairs from the documents. Pulls out Membership Number, Patient Name, Dates of Treatment, Total Cost, Procedure Codes, and IBAN/Payment details.
*   **Child 1.3: Compliance & Signature Checker (Computer Vision)**
    *   *Task:* Checks for mandatory structural elements. Did the user sign the declaration? Is the receipt actually attached? Did the GP stamp the form? If anything is missing, it immediately halts the process and asks the user to fix it.

---

### **Parent Agent 2: Policy & Member Eligibility (The Database Interactor)**
**Role:** The "Gatekeeper." Before calculating any money, this parent checks the synthetic database to ensure the user is legally allowed to make this claim based on their policy status and history.

*   **Child 2.1: Waiting Period Enforcer**
    *   *Task:* Looks up the user's policy start date in the DB. Applies the rule: *"A 12-week initial waiting period applies."* If the treatment date is within 12 weeks of the start date, it rejects the claim.
*   **Child 2.2: Time Limit Enforcer**
    *   *Task:* Compares the date on the receipt to today's date. Applies the rule: *"Claims must be submitted within 12 months of the treatment date."* Rejects expired receipts.
*   **Child 2.3: Quarterly Threshold Calculator**
    *   *Task:* Checks the DB for the user's total claims this quarter. Applies the rule: *"Claims will only be paid once accumulated receipts total €150 or more in every quarter."* If it's under €150, it approves the claim but marks it as "Pending Payment."

---

### **Parent Agent 3: Everyday Medical (Out-Patient) Processing**
**Role:** The "Day-to-Day" handler. This parent processes the most common, high-volume claims associated with the Money Smart Cash Plan.

*   **Child 3.1: GP & Consultant Visit Processor**
    *   *Task:* Checks the DB for the number of visits this year. Approves GP claims up to €20 (max 10 visits/year) and Consultant claims up to €20 (max 10 visits/year). Rejects the 11th visit.
*   **Child 3.2: Pharmacy & Therapy Processor**
    *   *Task:* Validates prescriptions (Up to €10, max 4/year). Validates Day-to-Day therapies. *Crucial logic:* It must semantically check if the therapy is allowed (Physiotherapy, reflexology, acupuncture, osteopathy, physical therapist, chiropractor). If the user claims for "Massage," it rejects it.
*   **Child 3.3: Dental, Optical & Scan Processor**
    *   *Task:* Processes Routine Dental & Optical (Up to €20, max 10 visits) and Scans (Up to €20, max 10 scans).

---

### **Parent Agent 4: Hospital & Complex Procedure Processing**
**Role:** The "Specialist." This handles complicated forms (like the General Practitioner form and In-patient form) that involve hospital stays, procedure codes, and medical necessity checks.

*   **Child 4.1: In-Patient Cash Back Calculator**
    *   *Task:* Checks admission and discharge dates. Calculates the length of stay. Approves €20 per day up to a max of 40 days per year. It also rejects full hospital invoices, reminding the user this is a *Cash Plan*, not private room cover.
*   **Child 4.2: Medical Procedure Code Validator**
    *   *Task:* Looks for specific clinical rules. For example, if it sees **Procedure Code 16 (Phlebotomy)**, it scans the form to ensure Serum Ferritin levels are provided. If **Code 29 (Basal cell carcinoma)** is claimed, it checks if a Histology Report was uploaded. Rejects if conditions aren't met.
*   **Child 4.3: Emergency & MRI/CT Validator**
    *   *Task:* Processes the "MRI/CT Section" and "Emergency Dental Section," ensuring the Consultant Code or referring GP details are filled out correctly.

---

### **Parent Agent 5: Exceptions, Maternity & Legal**
**Role:** The "Edge Case & Risk" handler. This parent deals with specific life events, potential fraud, and legal recoveries (Third-party faults).

*   **Child 5.1: Maternity & Newborn Processor**
    *   *Task:* Triggers when the Pre/Post-Natal form is detected. Approves the flat €200 Cash Back per birth/adoption. It also triggers an API/DB update to automatically add the newborn baby to the policy cover free of charge.
*   **Child 5.2: Third-Party & Subrogation Escalator**
    *   *Task:* Scans the "Accidents Section". If the user checks "Yes" to "Expenses recoverable from another source?" or "Claiming through a Solicitor/PIAB," this agent approves the medical claim but sends an alert/flag to the Laya Healthcare Legal Team to recover the money from the third party later.
*   **Child 5.3: Duplicate & Fraud Detector**
    *   *Task:* Checks the database to see if a claim for this exact amount, on this exact date, with this exact doctor has already been paid out. If a match is found, it rejects the claim as a duplicate.

---
