-- =============================================================================
-- LAYA HEALTHCARE — SYNTHETIC SQL DATA (10 USERS)
-- Money Smart 20 Family Cash Plan — Agentic AI Demo
-- =============================================================================
-- IMPORTANT FOR AI AGENTS: Each user is crafted to trigger a specific edge case
-- in the claims processing pipeline. Read the inline comments carefully.
-- All dates are anchored around February 2026 (hackathon demo date).
-- =============================================================================

-- ----- SCHEMA DEFINITION -----

CREATE TABLE members (
    member_id VARCHAR(20) PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100) UNIQUE,                -- Future: login identifier
    phone VARCHAR(20),                        -- Future: 2FA / contact
    password_hash VARCHAR(255),               -- Future: bcrypt hash for auth
    date_of_birth DATE,                       -- Future: age verification, KYC
    iban_last4 VARCHAR(4),                    -- Future: payment verification
    address_line1 VARCHAR(200),               -- Future: correspondence
    city VARCHAR(100),
    county VARCHAR(50),
    eircode VARCHAR(10),                      -- Irish postal code
    scheme_name VARCHAR(100),
    policy_start_date DATE,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Future: registration tracking
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP    -- Future: profile updates
);

CREATE TABLE member_benefits_usage (
    member_id VARCHAR(20),
    year INT,
    quarter VARCHAR(2),
    q_accumulated_receipts DECIMAL(10, 2),  -- Total receipts submitted this quarter
    gp_visits_count INT,                     -- Max 10/year, €20 each
    prescription_count INT,                  -- Max 4/year, €10 each
    dental_optical_count INT,                -- Max 10/year, €20 each
    therapy_count INT,                       -- Day-to-day therapies (physio, acupuncture, etc.)
    scan_count INT,                          -- Max 10/year, €20 each
    consultant_visits_count INT,             -- Max 10/year, €20 each
    hospital_days_count INT,                 -- Max 40 days/year, €20/day
    maternity_claimed BOOLEAN,               -- Flat €200 per birth/adoption per year
    FOREIGN KEY (member_id) REFERENCES members(member_id)
);

CREATE TABLE claims_history (
    claim_id VARCHAR(20) PRIMARY KEY,
    member_id VARCHAR(20),
    treatment_date DATE,
    treatment_type VARCHAR(50),
    practitioner_name VARCHAR(100),
    claimed_amount DECIMAL(10, 2),
    status VARCHAR(20),                      -- Approved, Rejected, Pending Threshold, etc.
    FOREIGN KEY (member_id) REFERENCES members(member_id)
);


-- =============================================================================
-- INSERT 10 MEMBERS
-- =============================================================================

INSERT INTO members (member_id, first_name, last_name, email, phone, password_hash, date_of_birth, iban_last4, address_line1, city, county, eircode, scheme_name, policy_start_date, status, created_at, updated_at) VALUES

-- USER 1 — Liam O'Connor
-- SCENARIO: 12-week waiting period rejection
-- WHY: Policy started Feb 1, 2026 → only 3 weeks ago. Any claim before ~Apr 26, 2026 must be REJECTED.
('MEM-1001', 'Liam', 'O''Connor', 'liam.oconnor@email.ie', '+353-85-123-4501', '$2b$12$LJ3xVz8kQm1rN7eF5tW0aeYGh2dK9pXsN8mA4bC6vE1wU3yR0zHqO', '1990-03-14', '4501', '12 Baggot Street Lower', 'Dublin', 'Dublin', 'D02 XY45', 'Money Smart 20 Family', '2026-02-01', 'Active', '2026-02-01 09:00:00', '2026-02-01 09:00:00'),

-- USER 2 — Siobhan Kelly
-- SCENARIO: Quarterly €150 threshold (pending → approved)
-- WHY: Has €110 accumulated. A €60 claim takes her to €170, crossing the €150 threshold → triggers payout.
('MEM-1002', 'Siobhan', 'Kelly', 'siobhan.kelly@email.ie', '+353-86-234-5602', '$2b$12$Mk4yWa9lRn2sO8fG6uX1bfZHi3eL0qYtO9nB5cD7wF2xV4zS1aIrP', '1985-07-22', '5602', '7 Patrick Street', 'Cork', 'Cork', 'T12 AB34', 'Money Smart 20 Family', '2024-01-01', 'Active', '2024-01-01 10:30:00', '2026-01-20 14:15:00'),

-- USER 3 — Declan Murphy
-- SCENARIO: Annual scan limit exhausted (10/10 used)
-- WHY: scan_count=10. Policy allows max 10 scans/year → 11th scan must be REJECTED.
('MEM-1003', 'Declan', 'Murphy', 'declan.murphy@email.ie', '+353-87-345-6703', '$2b$12$Nl5zXb0mSo3tP9gH7vY2cgAIj4fM1rZuP0oC6dE8xG3yW5aT2bJsQ', '1978-11-30', '6703', '22 Shop Street', 'Galway', 'Galway', 'H91 CD56', 'Money Smart 20 Family', '2023-05-01', 'Active', '2023-05-01 11:00:00', '2026-02-05 09:45:00'),

-- USER 4 — Aoife Byrne
-- SCENARIO: Partial approval for hospital stay exceeding 40-day max
-- WHY: hospital_days_count=38. Only 2 days remain. A 5-day stay → approve 2, reject 3.
('MEM-1004', 'Aoife', 'Byrne', 'aoife.byrne@email.ie', '+353-83-456-7804', '$2b$12$Om6aYc1nTp4uQ0hI8wZ3dhBJk5gN2sAvQ1pD7eF9yH4zX6bU3cKtR', '1992-05-08', '7804', '15 O''Connell Street', 'Limerick', 'Limerick', 'V94 EF78', 'Money Smart 20 Family', '2022-11-01', 'Active', '2022-11-01 08:45:00', '2026-02-10 16:30:00'),

-- USER 5 — Conor Walsh
-- SCENARIO: Duplicate claim / fraud detection
-- WHY: Has existing approved claim for Dr. Sarah Smith on Jan 15, 2026 for €150. Same submission → REJECTED as duplicate.
('MEM-1005', 'Conor', 'Walsh', 'conor.walsh@email.ie', '+353-89-567-8905', '$2b$12$Pn7bZd2oUq5vR1iJ9xA4eiCKl6hO3tBwR2qE8fG0zI5aY7cV4dLuS', '1988-09-17', '8905', '3 Grafton Street', 'Dublin', 'Dublin', 'D02 GH90', 'Money Smart 20 Family', '2025-01-01', 'Active', '2025-01-01 12:00:00', '2026-01-15 10:20:00'),

-- USER 6 — Roisin Flanagan
-- SCENARIO: 12-month expired receipt rejection
-- WHY: Policy active since 2023, but test receipt date is Dec 2024 (>12 months old) → REJECTED.
('MEM-1006', 'Roisin', 'Flanagan', 'roisin.flanagan@email.ie', '+353-85-678-9006', '$2b$12$Qo8cAe3pVr6wS2jK0yB5fjDLm7iP4uCxS3rF9gH1aJ6bZ8dW5eMvT', '1995-01-25', '9006', '8 Main Street', 'Waterford', 'Waterford', 'X91 IJ12', 'Money Smart 20 Family', '2023-06-15', 'Active', '2023-06-15 14:00:00', '2026-02-01 11:10:00'),

-- USER 7 — Patrick Doyle
-- SCENARIO: Invalid therapy type rejection (semantic check)
-- WHY: Will claim "Reiki Energy Healing". Only allowed: Physio, reflexology, acupuncture, osteopathy, physical therapy, chiro → REJECTED.
('MEM-1007', 'Patrick', 'Doyle', 'patrick.doyle@email.ie', '+353-86-789-0107', '$2b$12$Rp9dBf4qWs7xT3kL1zC6gkEMn8jQ5vDyT4sG0hI2bK7cA9eX6fNwU', '1982-08-03', '0107', '45 Henry Street', 'Dublin', 'Dublin', 'D01 KL34', 'Money Smart 20 Family', '2024-03-01', 'Active', '2024-03-01 09:30:00', '2026-02-03 13:50:00'),

-- USER 8 — Niamh Brennan
-- SCENARIO: Maternity cash back (flat €200 max)
-- WHY: Submits pre/post-natal form with €1,500 hospital receipts. Cash Plan pays flat €200 → APPROVED for €200, rest not covered.
('MEM-1008', 'Niamh', 'Brennan', 'niamh.brennan@email.ie', '+353-87-890-1208', '$2b$12$Sq0eCg5rXt8yU4lM2aD7hlFNo9kR6wEzU5tH1iJ3cL8dB0fY7gOwV', '1993-12-11', '1208', '19 Eyre Square', 'Galway', 'Galway', 'H91 MN56', 'Money Smart 20 Family', '2023-09-01', 'Active', '2023-09-01 15:00:00', '2026-01-12 08:40:00'),

-- USER 9 — Sean Gallagher
-- SCENARIO: Third-party liability / solicitor escalation
-- WHY: In-patient claim w/ third party and solicitor. APPROVED but flagged for Legal/Subrogation team.
('MEM-1009', 'Sean', 'Gallagher', 'sean.gallagher@email.ie', '+353-83-901-2309', '$2b$12$Tr1fDh6sYu9zV5mN3bE8imGOp0lS7xFaV6uI2jK4dM9eC1gZ8hPxW', '1975-04-19', '2309', '31 Quay Street', 'Kilkenny', 'Kilkenny', 'R95 OP78', 'Money Smart 20 Family', '2024-07-01', 'Active', '2024-07-01 10:15:00', '2026-01-20 17:25:00'),

-- USER 10 — Ciara Kavanagh
-- SCENARIO: Missing signature / wrong form detection
-- WHY: Uploads General Practitioner Claim Form instead of Out-patient form → ACTION REQUIRED (wrong form).
('MEM-1010', 'Ciara', 'Kavanagh', 'ciara.kavanagh@email.ie', '+353-89-012-3410', '$2b$12$Us2gEi7tZv0aW6nO4cF9jnHPq1mT8yGbW7vJ3kL5eN0fD2hA9iQyX', '1998-06-28', '3410', '5 Parnell Square', 'Dublin', 'Dublin', 'D01 QR90', 'Money Smart 20 Family', '2024-11-01', 'Active', '2024-11-01 13:45:00', '2026-01-25 09:55:00');


-- =============================================================================
-- INSERT BENEFITS USAGE (Year 2026, Quarter Q1)
-- =============================================================================

INSERT INTO member_benefits_usage 
(member_id, year, quarter, q_accumulated_receipts, gp_visits_count, prescription_count, dental_optical_count, therapy_count, scan_count, consultant_visits_count, hospital_days_count, maternity_claimed) VALUES

-- MEM-1001: Brand new member, zero usage (waiting period test)
('MEM-1001', 2026, 'Q1', 0.00, 0, 0, 0, 0, 0, 0, 0, FALSE),

-- MEM-1002: Has €110 accumulated this quarter (threshold test)
('MEM-1002', 2026, 'Q1', 110.00, 2, 1, 0, 0, 0, 0, 0, FALSE),

-- MEM-1003: 10 scans maxed out, €250 accumulated (annual limit test)
('MEM-1003', 2026, 'Q1', 250.00, 4, 0, 0, 0, 10, 1, 0, FALSE),

-- MEM-1004: 38 hospital days used, only 2 remaining (partial approval test)
('MEM-1004', 2026, 'Q1', 180.00, 1, 0, 0, 0, 0, 0, 38, FALSE),

-- MEM-1005: Normal usage, has an existing approved claim (duplicate test)
('MEM-1005', 2026, 'Q1', 200.00, 3, 0, 0, 0, 0, 1, 0, FALSE),

-- MEM-1006: Normal usage, well over threshold (expired receipt test)
('MEM-1006', 2026, 'Q1', 220.00, 3, 2, 1, 0, 0, 0, 0, FALSE),

-- MEM-1007: Some therapy claims, normal usage (invalid therapy test)
('MEM-1007', 2026, 'Q1', 160.00, 2, 0, 0, 3, 0, 0, 0, FALSE),

-- MEM-1008: Normal usage, no prior maternity claim (maternity test)
('MEM-1008', 2026, 'Q1', 175.00, 1, 1, 0, 0, 0, 0, 0, FALSE),

-- MEM-1009: Normal usage (third-party escalation test)
('MEM-1009', 2026, 'Q1', 190.00, 2, 0, 0, 0, 0, 0, 5, FALSE),

-- MEM-1010: Normal usage (wrong form / missing signature test)
('MEM-1010', 2026, 'Q1', 155.00, 1, 0, 1, 0, 0, 0, 0, FALSE);


-- =============================================================================
-- INSERT CLAIMS HISTORY
-- =============================================================================

INSERT INTO claims_history (claim_id, member_id, treatment_date, treatment_type, practitioner_name, claimed_amount, status) VALUES

-- MEM-1002 (Siobhan): Two pending threshold claims totaling €110
('CLM-9001', 'MEM-1002', '2026-01-10', 'GP & A&E', 'Dr. John Doe', 60.00, 'Pending Threshold'),
('CLM-9002', 'MEM-1002', '2026-01-20', 'GP & A&E', 'Dr. John Doe', 50.00, 'Pending Threshold'),

-- MEM-1003 (Declan): One approved scan (of 10 total)
('CLM-9003', 'MEM-1003', '2026-02-05', 'Scan Cover', 'Beacon Hospital', 150.00, 'Approved'),

-- MEM-1005 (Conor): THE DUPLICATE TARGET — must match exactly for fraud detection
('CLM-9004', 'MEM-1005', '2026-01-15', 'Consultant Fee', 'Dr. Sarah Smith', 150.00, 'Approved'),

-- MEM-1006 (Roisin): Recent valid claims (her "expired" receipt will be a NEW submission with old date)
('CLM-9005', 'MEM-1006', '2026-01-05', 'GP & A&E', 'Dr. Molly Malone', 55.00, 'Approved'),
('CLM-9006', 'MEM-1006', '2026-01-18', 'Prescription', 'Hickey''s Pharmacy', 12.00, 'Approved'),
('CLM-9007', 'MEM-1006', '2026-02-01', 'Dental & Optical', 'Smiles Dental Clinic', 45.00, 'Approved'),

-- MEM-1007 (Patrick): Past approved therapy claims (all valid types)
('CLM-9008', 'MEM-1007', '2026-01-08', 'Day to Day Therapy', 'PhysioFirst Clinic', 40.00, 'Approved'),
('CLM-9009', 'MEM-1007', '2026-01-22', 'Day to Day Therapy', 'AcuWell Centre', 35.00, 'Approved'),
('CLM-9010', 'MEM-1007', '2026-02-03', 'Day to Day Therapy', 'Dublin Osteopathy', 45.00, 'Approved'),

-- MEM-1008 (Niamh): One GP visit
('CLM-9011', 'MEM-1008', '2026-01-12', 'GP & A&E', 'Dr. Patricia Hayes', 50.00, 'Approved'),

-- MEM-1009 (Sean): In-patient stay already approved (5 days)
('CLM-9012', 'MEM-1009', '2026-01-20', 'Hospital In-patient', 'St. James''s Hospital', 100.00, 'Approved'),

-- MEM-1010 (Ciara): One dental claim
('CLM-9013', 'MEM-1010', '2026-01-25', 'Dental & Optical', 'Portobello Dental', 30.00, 'Approved');


-- =============================================================================
-- END OF SQL SYNTHETIC DATA
-- =============================================================================
-- QUICK REFERENCE — Who triggers what:
-- MEM-1001 (Liam)    → 12-week waiting period REJECTION
-- MEM-1002 (Siobhan) → €150 quarterly threshold APPROVAL
-- MEM-1003 (Declan)  → 11th scan annual limit REJECTION
-- MEM-1004 (Aoife)   → Hospital days PARTIAL APPROVAL (2 of 5 days)
-- MEM-1005 (Conor)   → Duplicate claim REJECTION (fraud)
-- MEM-1006 (Roisin)  → 12-month expired receipt REJECTION
-- MEM-1007 (Patrick) → Invalid therapy "Reiki" REJECTION
-- MEM-1008 (Niamh)   → Maternity flat €200 APPROVAL
-- MEM-1009 (Sean)    → Third-party / solicitor ESCALATION
-- MEM-1010 (Ciara)   → Wrong form / missing signature ACTION REQUIRED
-- =============================================================================
