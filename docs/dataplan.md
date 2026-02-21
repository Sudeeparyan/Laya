To effectively demonstrate your Agentic AI Architecture, your synthetic data needs to be deliberately crafted to trigger the edge cases we discussed (like the 12-week waiting period, the 11th visit, the €150 quarterly threshold, and duplicates).

Since it is currently **February 2026**, I have set up the dates in this synthetic data so that it perfectly aligns with real-world testing for your hackathon.

Here is the synthetic data provided in both **SQL** (for your database) and **JSON** (perfect for passing directly into an LLM prompt as context).

### The Personas Created for Your Demo:
1. **Liam O'Connor:** Joined 3 weeks ago. (Use him to test the *12-week waiting period rejection*).
2. **Siobhan Kelly:** Has €110 in receipts this quarter. (Use her to test the *Quarterly €150 threshold hold*).
3. **Declan Murphy:** Has already used his 10 Scan covers. (Use him to test the *Annual limit rejection*).
4. **Aoife Byrne:** Has used 38 hospital days. (Use her to test the *Partial approval for exceeding the 40-day max*).
5. **Conor Walsh:** Standard user, but has a specific past claim. (Use him to test the *Duplicate claim rejection*).

---

### Option 1: SQL Database Initialization Script
You can run this in SQLite, PostgreSQL, or MySQL to set up your backend state.

```sql
-- 1. Create Members Table
CREATE TABLE members (
    member_id VARCHAR(20) PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    scheme_name VARCHAR(100),
    policy_start_date DATE,
    status VARCHAR(20)
);

-- 2. Create Benefits Usage Table (Tracks limits per year/quarter)
CREATE TABLE member_benefits_usage (
    member_id VARCHAR(20),
    year INT,
    quarter VARCHAR(2),
    q_accumulated_receipts DECIMAL(10, 2),
    gp_visits_count INT,
    prescription_count INT,
    dental_optical_count INT,
    therapy_count INT,
    scan_count INT,
    consultant_visits_count INT,
    hospital_days_count INT,
    maternity_claimed BOOLEAN,
    FOREIGN KEY (member_id) REFERENCES members(member_id)
);

-- 3. Create Claims History Table (For duplicate checking)
CREATE TABLE claims_history (
    claim_id VARCHAR(20) PRIMARY KEY,
    member_id VARCHAR(20),
    treatment_date DATE,
    treatment_type VARCHAR(50),
    practitioner_name VARCHAR(100),
    claimed_amount DECIMAL(10, 2),
    status VARCHAR(20),
    FOREIGN KEY (member_id) REFERENCES members(member_id)
);

-- ==========================================
-- INSERT SYNTHETIC DATA
-- ==========================================

-- Insert Members
INSERT INTO members (member_id, first_name, last_name, scheme_name, policy_start_date, status) VALUES
('MEM-1001', 'Liam', 'O''Connor', 'Money Smart 20 Family', '2026-02-01', 'Active'), -- Newbie (Wait period test)
('MEM-1002', 'Siobhan', 'Kelly', 'Money Smart 20 Family', '2024-01-01', 'Active'),  -- Accumulator test
('MEM-1003', 'Declan', 'Murphy', 'Money Smart 20 Family', '2023-05-01', 'Active'),  -- Max limit test
('MEM-1004', 'Aoife', 'Byrne', 'Money Smart 20 Family', '2022-11-01', 'Active'),    -- Hospital days test
('MEM-1005', 'Conor', 'Walsh', 'Money Smart 20 Family', '2025-01-01', 'Active');    -- Duplicate check test

-- Insert Benefits Usage (For Year 2026, Quarter Q1)
INSERT INTO member_benefits_usage 
(member_id, year, quarter, q_accumulated_receipts, gp_visits_count, prescription_count, dental_optical_count, therapy_count, scan_count, consultant_visits_count, hospital_days_count, maternity_claimed) VALUES
('MEM-1001', 2026, 'Q1', 0.00, 0, 0, 0, 0, 0, 0, 0, FALSE),
('MEM-1002', 2026, 'Q1', 110.00, 2, 1, 0, 0, 0, 0, 0, FALSE), -- Has €110, needs €40 more to get paid
('MEM-1003', 2026, 'Q1', 250.00, 4, 0, 0, 0, 10, 1, 0, FALSE), -- 10 scans used (Maxed out)
('MEM-1004', 2026, 'Q1', 180.00, 1, 0, 0, 0, 0, 0, 38, FALSE), -- 38 hospital days used (Only 2 left)
('MEM-1005', 2026, 'Q1', 200.00, 3, 0, 0, 0, 0, 1, 0, FALSE);

-- Insert Claims History (Specifically setting up a duplicate scenario for Conor)
INSERT INTO claims_history (claim_id, member_id, treatment_date, treatment_type, practitioner_name, claimed_amount, status) VALUES
('CLM-9001', 'MEM-1002', '2026-01-10', 'GP & A&E', 'Dr. John Doe', 60.00, 'Pending Threshold'),
('CLM-9002', 'MEM-1002', '2026-01-20', 'GP & A&E', 'Dr. John Doe', 50.00, 'Pending Threshold'),
('CLM-9003', 'MEM-1003', '2026-02-05', 'Scan Cover', 'Beacon Hospital', 150.00, 'Approved'),
('CLM-9004', 'MEM-1005', '2026-01-15', 'Consultant Fee', 'Dr. Sarah Smith', 150.00, 'Approved'); -- The target for the duplicate test
```

---

### Option 2: JSON Format (For Context Injection)
In a hackathon, sometimes you don't have time to wire up a full SQL database. Instead, you can load this JSON file into memory and pass the specific member's object directly into your Agent's system prompt (e.g., *"Here is the user's database record: {json_data}. Evaluate the uploaded claim."*)

```json
{
  "database": {
    "members": [
      {
        "member_id": "MEM-1001",
        "first_name": "Liam",
        "last_name": "O'Connor",
        "scheme_name": "Money Smart 20 Family",
        "policy_start_date": "2026-02-01",
        "status": "Active",
        "current_year_usage": {
          "year": 2026,
          "quarter": "Q1",
          "q_accumulated_receipts": 0.00,
          "gp_visits_count": 0,
          "prescription_count": 0,
          "dental_optical_count": 0,
          "therapy_count": 0,
          "scan_count": 0,
          "consultant_visits_count": 0,
          "hospital_days_count": 0,
          "maternity_claimed": false
        },
        "claims_history": []
      },
      {
        "member_id": "MEM-1002",
        "first_name": "Siobhan",
        "last_name": "Kelly",
        "scheme_name": "Money Smart 20 Family",
        "policy_start_date": "2024-01-01",
        "status": "Active",
        "current_year_usage": {
          "year": 2026,
          "quarter": "Q1",
          "q_accumulated_receipts": 110.00,
          "gp_visits_count": 2,
          "prescription_count": 1,
          "dental_optical_count": 0,
          "therapy_count": 0,
          "scan_count": 0,
          "consultant_visits_count": 0,
          "hospital_days_count": 0,
          "maternity_claimed": false
        },
        "claims_history": [
          {
            "claim_id": "CLM-9001",
            "treatment_date": "2026-01-10",
            "treatment_type": "GP & A&E",
            "practitioner_name": "Dr. John Doe",
            "claimed_amount": 60.00,
            "status": "Pending Threshold"
          },
          {
            "claim_id": "CLM-9002",
            "treatment_date": "2026-01-20",
            "treatment_type": "GP & A&E",
            "practitioner_name": "Dr. John Doe",
            "claimed_amount": 50.00,
            "status": "Pending Threshold"
          }
        ]
      },
      {
        "member_id": "MEM-1003",
        "first_name": "Declan",
        "last_name": "Murphy",
        "scheme_name": "Money Smart 20 Family",
        "policy_start_date": "2023-05-01",
        "status": "Active",
        "current_year_usage": {
          "year": 2026,
          "quarter": "Q1",
          "q_accumulated_receipts": 250.00,
          "gp_visits_count": 4,
          "prescription_count": 0,
          "dental_optical_count": 0,
          "therapy_count": 0,
          "scan_count": 10,
          "consultant_visits_count": 1,
          "hospital_days_count": 0,
          "maternity_claimed": false
        },
        "claims_history": [
          {
            "claim_id": "CLM-9003",
            "treatment_date": "2026-02-05",
            "treatment_type": "Scan Cover",
            "practitioner_name": "Beacon Hospital",
            "claimed_amount": 150.00,
            "status": "Approved"
          }
        ]
      },
      {
        "member_id": "MEM-1004",
        "first_name": "Aoife",
        "last_name": "Byrne",
        "scheme_name": "Money Smart 20 Family",
        "policy_start_date": "2022-11-01",
        "status": "Active",
        "current_year_usage": {
          "year": 2026,
          "quarter": "Q1",
          "q_accumulated_receipts": 180.00,
          "gp_visits_count": 1,
          "prescription_count": 0,
          "dental_optical_count": 0,
          "therapy_count": 0,
          "scan_count": 0,
          "consultant_visits_count": 0,
          "hospital_days_count": 38,
          "maternity_claimed": false
        },
        "claims_history": []
      },
      {
        "member_id": "MEM-1005",
        "first_name": "Conor",
        "last_name": "Walsh",
        "scheme_name": "Money Smart 20 Family",
        "policy_start_date": "2025-01-01",
        "status": "Active",
        "current_year_usage": {
          "year": 2026,
          "quarter": "Q1",
          "q_accumulated_receipts": 200.00,
          "gp_visits_count": 3,
          "prescription_count": 0,
          "dental_optical_count": 0,
          "therapy_count": 0,
          "scan_count": 0,
          "consultant_visits_count": 1,
          "hospital_days_count": 0,
          "maternity_claimed": false
        },
        "claims_history": [
          {
            "claim_id": "CLM-9004",
            "treatment_date": "2026-01-15",
            "treatment_type": "Consultant Fee",
            "practitioner_name": "Dr. Sarah Smith",
            "claimed_amount": 150.00,
            "status": "Approved"
          }
        ]
      }
    ]
  }
}
```

### How to use this in your Demo Flow:
When you are doing your live demo, follow this flow:

1. **Upload a fake GP receipt** for **Liam O'Connor (MEM-1001)** dated *Feb 18, 2026*.
   * *Watch the Agent pull his DB record, see his start date is Feb 1, 2026, calculate it's less than 12 weeks, and **Reject** the claim.*
2. **Upload a fake €60 Consultant receipt** for **Siobhan Kelly (MEM-1002)**.
   * *Watch the Agent pull her DB record, see she has €110. It will add 60 + 110 = 170. It crosses the €150 threshold, so it **Approves** the payment.*
3. **Upload a fake Scan Cover receipt** for **Declan Murphy (MEM-1003)**.
   * *Watch the Agent look at `scan_count: 10`, check the policy rule (Max 10), and **Reject** it.*
4. **Upload a duplicate receipt** for **Conor Walsh (MEM-1005)** for Dr. Sarah Smith on Jan 15, 2026.
   * *Watch the Agent scan his `claims_history` array, find an exact match, and **Reject** it as fraud/duplicate.*