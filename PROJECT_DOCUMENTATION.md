# Laya Healthcare AI Claims Chatbot — Complete Project Documentation

> **Purpose of this document:** Provide a comprehensive, AI-readable reference for every file, capability, architecture decision, and business rule in the Laya Healthcare AI Claims Chatbot project. Any AI agent reading this document should fully understand the project's structure, data flow, agent hierarchy, API contract, and frontend behavior.

---

## Table of Contents

1. [Project Overview & Agenda](#1-project-overview--agenda)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Directory Structure](#4-directory-structure)
5. [Business Domain & Insurance Rules](#5-business-domain--insurance-rules)
6. [Backend — File-by-File Documentation](#6-backend--file-by-file-documentation)
7. [Frontend — File-by-File Documentation](#7-frontend--file-by-file-documentation)
8. [Data & Test Fixtures](#8-data--test-fixtures)
9. [Documentation Files](#9-documentation-files)
10. [Agent Architecture Deep Dive](#10-agent-architecture-deep-dive)
11. [API Reference](#11-api-reference)
12. [Authentication & Authorization](#12-authentication--authorization)
13. [Data Flow & Processing Pipeline](#13-data-flow--processing-pipeline)
14. [Key Design Patterns](#14-key-design-patterns)
15. [Demo Scenarios & Test Matrix](#15-demo-scenarios--test-matrix)
16. [Configuration & Environment Variables](#16-configuration--environment-variables)

---

## 1. Project Overview & Agenda

### What Is This Project?

**Laya Healthcare AI Claims Chatbot** is an AI-powered, multi-agent healthcare claims processing system built for **Laya Healthcare** (AXA Insurance dac), Ireland's second-largest health insurer with 28% market share. The system automates the adjudication of claims under the **Money Smart 20 Family Cash Plan** — a cash-back health insurance product that reimburses members for everyday medical expenses.

### The Problem It Solves

Traditional claims processing at Laya takes ~22 days with manual bottlenecks. This system reduces that to **under 3 seconds** using a 6-layer AI agent pipeline that:

1. **Validates documents** (OCR extraction, form classification, signature/compliance checking)
2. **Checks eligibility** (waiting periods, submission deadlines, quarterly thresholds, duplicate detection)
3. **Routes claims** intelligently to specialist agents based on treatment type
4. **Calculates payouts** with exact policy rule enforcement
5. **Detects fraud** (duplicate claims, third-party liability escalation)
6. **Enables human oversight** via a developer dashboard with AI-assisted review

### The Agenda

- **For Customers:** A conversational chatbot that processes insurance claims in real-time, provides instant decisions with explanations, and supports multi-turn follow-up conversation
- **For Developers/Operators:** A full claims management dashboard with AI analysis, risk monitoring, priority queuing, document management, and human-in-the-loop decision authority
- **Architecture Showcase:** Demonstrates a production-grade multi-agent AI system using LangGraph (state machine orchestration), LLM-powered child agents (GPT-4o / GPT-4o-mini), real-time WebSocket streaming, and policy-compliant rule enforcement

### Two-Portal Architecture

| Portal | User | Purpose |
|--------|------|---------|
| **Customer Portal** | Health insurance members | Chat-based claim submission, instant AI decisions, multi-turn conversation, document upload |
| **Developer Dashboard** | Claims operators / developers | Analytics, claims queue with priority scoring, AI-assisted review panel, risk monitoring, document viewer, activity log |

---

## 2. Architecture Overview

### Agent Hierarchy: 1-5-15 Pattern

```
Principal Agent (GPT-4o — intelligent router)
├── Parent 1: Intake & Document Intelligence
│   ├── Child: Form Classifier
│   ├── Child: OCR Extractor
│   └── Child: Compliance & Signature Checker
├── Parent 2: Policy & Member Eligibility
│   ├── Child: Waiting Period Enforcer
│   ├── Child: Time Limit Enforcer
│   ├── Child: Quarterly Threshold Calculator
│   └── Child: Duplicate & Fraud Detector
├── Parent 3: Outpatient Processing
│   ├── Child: GP & Consultant Processor
│   ├── Child: Pharmacy & Therapy Processor
│   └── Child: Dental/Optical/Scan Processor
├── Parent 4: Hospital & Complex Procedures
│   ├── Child: In-Patient Cash Back Calculator
│   ├── Child: Procedure Code Validator
│   └── Child: Emergency/MRI/CT Validator
└── Parent 5: Exceptions, Maternity & Legal
    ├── Child: Maternity & Newborn Processor
    ├── Child: Third-Party & Subrogation Escalator
    └── Child: Duplicate & Fraud Detector
```

### Processing Pipeline (LangGraph State Graph)

```
START → setup_node → parallel_validation_node (intake ‖ eligibility)
     → principal_node → (outpatient | hospital | exceptions)
     → decision_node → END
```

- **Parallel Validation:** Intake and eligibility run concurrently via `asyncio.gather`
- **Conditional Routing:** Principal Agent decides which treatment-specific parent handles the claim
- **Early Termination:** If any validation fails, the pipeline short-circuits to the decision node

### Communication Flow

```
Frontend (React) ←→ FastAPI Backend ←→ LangGraph State Machine ←→ OpenAI GPT-4o/4o-mini
     ↕ WebSocket (real-time streaming)
     ↕ HTTP REST (standard requests)
```

---

## 3. Technology Stack

### Backend
| Technology | Purpose | Version |
|-----------|---------|---------|
| **FastAPI** | REST API framework | ≥0.115 |
| **Uvicorn** | ASGI server | ≥0.34 |
| **LangChain** | LLM framework & tools | ≥0.3 |
| **LangGraph** | State machine orchestration | ≥0.2.60 |
| **OpenAI** | GPT-4o (routing), GPT-4o-mini (child agents) | ≥1.58 |
| **Pydantic** | Data validation & schemas | ≥2.10 |
| **SlowAPI** | Rate limiting | ≥0.1.9 |
| **bcrypt** | Password hashing | ≥4.0 |
| **PyJWT** | JWT authentication | ≥2.8 |
| **python-dotenv** | Environment variable loading | ≥1.0 |

### Frontend
| Technology | Purpose | Version |
|-----------|---------|---------|
| **React** | UI framework | 19 |
| **Vite** | Build tool & dev server | 6 |
| **Tailwind CSS** | Utility-first CSS (v4 with @theme) | 4 |
| **Axios** | HTTP client | latest |
| **Framer Motion** | Animations & transitions | latest |
| **Recharts** | Data visualization charts | latest |
| **React Router DOM** | Client-side routing | latest |
| **React Markdown** | Markdown rendering in chat | latest |
| **Lucide React** | Icon library | latest |
| **Sonner** | Toast notifications | latest |

---

## 4. Directory Structure

```
Laya/
├── backend/                          # Python FastAPI backend
│   ├── run.py                        # Uvicorn launcher entry point
│   ├── requirements.txt              # Python dependencies
│   ├── test_all.py                   # Integration test suite (15 tests)
│   ├── users_db.json                 # Persisted user accounts (JSON)
│   ├── data/
│   │   ├── chat_sessions.json        # Persisted chat sessions (auto-saved)
│   │   └── runtime_state.json        # Persisted runtime state (members, docs, activities, callbacks)
│   └── app/
│       ├── __init__.py               # Package marker
│       ├── config.py                 # Settings from environment variables
│       ├── main.py                   # FastAPI app factory, CORS, WebSocket, lifespan
│       ├── agents/                   # AI agent pipeline
│       │   ├── state.py              # ClaimState TypedDict (shared state schema)
│       │   ├── graph.py              # LangGraph state machine (build + compile + process)
│       │   ├── principal_agent.py    # Principal routing agent (GPT-4o)
│       │   ├── parent_1_intake.py    # Document intake & compliance
│       │   ├── parent_2_eligibility.py # Waiting period, deadline, threshold, duplicates
│       │   ├── parent_3_outpatient.py  # GP, consultant, Rx, therapy, dental, scan
│       │   ├── parent_4_hospital.py    # In-patient, procedure codes
│       │   ├── parent_5_exceptions.py  # Maternity, third-party, fraud
│       │   ├── child_agents.py       # LLM-powered child agent invocations
│       │   ├── conversation.py       # Multi-turn session memory & follow-up handler
│       │   ├── message_parser.py     # NLP inference from chat messages
│       │   └── llm_factory.py        # OpenAI / Azure OpenAI LLM factory
│       ├── prompts/                  # System prompt templates
│       │   ├── principal.py          # Principal Agent routing prompt
│       │   ├── intake.py             # Form classifier, OCR, compliance prompts
│       │   ├── eligibility.py        # Waiting period, time limit, threshold prompts
│       │   ├── outpatient.py         # GP, pharmacy, dental/scan prompts
│       │   ├── hospital.py           # In-patient, procedure code prompts
│       │   └── exceptions.py         # Maternity, duplicate, third-party prompts
│       ├── tools/                    # LangChain tools (deterministic business logic)
│       │   ├── policy_tools.py       # Policy rule enforcement + IPID source citations
│       │   ├── db_tools.py           # Member lookup, usage stats, duplicate checking
│       │   └── ocr_tools.py          # Mock OCR + GPT-4V real OCR
│       ├── models/                   # Data layer
│       │   ├── database.py           # In-memory data store, CRUD operations
│       │   └── schemas.py            # Pydantic models for API request/response
│       ├── routers/                  # API endpoints
│       │   ├── auth.py               # Register, login, JWT management
│       │   ├── chat.py               # Chat endpoint + WebSocket streaming
│       │   ├── members.py            # Member CRUD + profile analytics
│       │   ├── claims.py             # Claims history + document upload/OCR
│       │   └── queue.py              # Developer dashboard (queue, analytics, review)
│       └── auth/
│           └── users.py              # User store, bcrypt hashing, JWT tokens
│
├── frontend/                         # React SPA
│   ├── index.html                    # HTML entry point
│   ├── package.json                  # NPM manifest
│   ├── vite.config.js                # Vite build config with API proxy
│   └── src/
│       ├── App.jsx                   # Root component with routing
│       ├── main.jsx                  # React DOM entry point
│       ├── index.css                 # Global Tailwind + Laya design system
│       ├── components/               # Reusable UI components
│       │   ├── AgentPanel.jsx        # Right panel: pipeline visualization + usage stats
│       │   ├── AgentTrace.jsx        # Expandable agent routing timeline
│       │   ├── AnalyticsCards.jsx     # Developer KPI metric cards
│       │   ├── ArchitectureView.jsx  # Interactive agent flow diagram
│       │   ├── ChatWindow.jsx        # Main chat interface (center panel)
│       │   ├── ClaimCard.jsx         # Claim decision result card in chat
│       │   ├── ClaimReviewPanel.jsx  # AI-assisted human review panel
│       │   ├── ClaimsQueue.jsx       # Developer claims queue table
│       │   ├── FileUpload.jsx        # Drag-and-drop document upload
│       │   ├── Layout.jsx            # 3-panel layout wrapper
│       │   ├── LeftSidebar.jsx       # Navigation, sessions, member selector
│       │   ├── MemberInfo.jsx        # Member details card with usage bars
│       │   ├── MembersOverview.jsx   # Risk monitor widget
│       │   ├── MessageBubble.jsx     # Chat message bubble (user/AI)
│       │   ├── PdfPreview.jsx        # PDF/image preview (inline + modal)
│       │   ├── SmartSuggestions.jsx   # Contextual follow-up suggestion chips
│       │   ├── StatusBadge.jsx       # Decision status badge component
│       │   └── WelcomeScreen.jsx     # Empty state with capability cards
│       ├── hooks/                    # Custom React hooks
│       │   ├── useAuth.jsx           # Authentication context & provider
│       │   ├── useChat.js            # Chat session, WebSocket, message state
│       │   ├── useKeyboardShortcuts.js # Ctrl+K, Ctrl+/, Ctrl+U, Escape
│       │   └── useMembers.js         # Member data fetching & selection
│       ├── pages/                    # Route-level page components
│       │   ├── DashboardPage.jsx     # Main app page (3-panel chat interface)
│       │   ├── DevDashboardPage.jsx  # Developer claims management dashboard
│       │   ├── LoginPage.jsx         # Animated login with quick-login buttons
│       │   ├── MemberProfilePage.jsx # Individual member AI analytics page
│       │   └── RegisterPage.jsx      # Account registration with role selector
│       ├── services/                 # API communication layer
│       │   ├── api.js                # Axios HTTP client for all backend endpoints
│       │   └── auth.js               # Authentication API (login, register, token)
│       └── utils/
│           └── constants.js          # API URLs, colors, decision styles, demo scenarios
│
├── data/                             # Synthetic test data
│   ├── json_users.json               # 10 JSON members (MEM-2001 to MEM-2010)
│   ├── sql_users.sql                 # 10 SQL members (MEM-1001 to MEM-1010)
│   └── README.md                     # Data documentation & policy rules cheat sheet
│
├── demo_pdfs/
│   └── generate_pdfs.py              # PDF claim form generator (styled like real Laya forms)
│
├── docs/                             # Architecture & planning documentation
│   ├── archicture.md                 # Mermaid agent flow diagram
│   ├── dataplan.md                   # Synthetic data plan (5 key personas)
│   ├── laya.md                       # Full architectural whitepaper (~4,500 words)
│   ├── roles.md                      # Complete agent hierarchy blueprint
│   ├── scenariors.md                 # 15 test scenarios for validation
│   ├── DEMO_SCRIPT.md               # 12-minute live demo walkthrough
│   └── input_output.md              # Exact JSON payloads for 4 demo scenarios
│
├── Laya docs/
│   └── insuranceplan/
│       └── ipid.md                   # Official IPID policy document (source of truth)
│
└── uploads/                          # Uploaded claim documents (runtime)
```

---

## 5. Business Domain & Insurance Rules

### The Insurance Product

**Money Smart 20 Family Cash Plan** by AXA Insurance dac (trading as Laya Healthcare). This is a **Cash Back plan**, NOT private health insurance. It reimburses members fixed amounts for everyday medical expenses.

### Benefit Limits (Source: IPID)

| Benefit Category | Cash Back Per Event | Annual Limit |
|-----------------|-------------------|--------------|
| GP & A&E visits | Up to €20/visit | 10 visits/year |
| Consultant visits | Up to €20/visit | 10 visits/year |
| Prescriptions | Up to €10/prescription | 4/year |
| Dental & Optical | Up to €20/visit | 10 visits/year |
| Day-to-Day Therapies | Up to €20/session | 10 sessions/year |
| Scan Cover (MRI/CT/X-ray) | Up to €20/scan | 10 scans/year |
| Hospital In-patient | €20/day | 40 days/year |
| Maternity/Adoption | Flat €200 | 1 per year |

### Allowed Therapies (Strictly Enforced)

Only these 6 therapy types are covered:
- Physiotherapy
- Reflexology
- Acupuncture
- Osteopathy
- Physical Therapist
- Chiropractor

**Not Covered:** Massage therapy, Reiki, aromatherapy, hydrotherapy, etc.

### Policy Restrictions

1. **12-Week Waiting Period:** New policies must wait 12 weeks before making claims
2. **12-Month Submission Deadline:** Claims must be submitted within 12 months of treatment date
3. **€150 Quarterly Threshold:** Payment only triggered when accumulated receipts ≥ €150 per quarter
4. **Cash Plan Only:** Does NOT cover private hospital invoices, surgery costs, or room charges — only the €20/day cash back
5. **Receipt Requirements:** Must include member name, service type, practitioner details, date, and original receipt

### Procedure Code Rules

- **Procedure Code 29 (Basal cell carcinoma):** Requires histology report attachment
- **Procedure Code 16 (Phlebotomy) with Clinical Indicator 0222:** Requires initial serum ferritin levels documented

### Exception Cases

- **Third-party/Solicitor:** Claims involving accidents or solicitors are APPROVED but flagged for LEGAL_REVIEW (Laya must recover costs from PIAB/third party)
- **Duplicate Claims:** Same treatment date + practitioner + amount = REJECTED
- **Maternity:** Flat €200 maximum, one per year; newborn added to policy free

---

## 6. Backend — File-by-File Documentation

### `backend/run.py`
**Purpose:** Uvicorn launcher — the entry point to start the backend server.
**What it does:** Imports settings from `app.config`, runs `uvicorn.run()` targeting `app.main:app` with configurable host, port, and reload settings.
**Run command:** `python run.py`

---

### `backend/app/config.py`
**Purpose:** Centralized configuration loaded from environment variables via `python-dotenv`.
**Key settings:**
- `OPENAI_API_KEY` — Required for LLM-powered agents
- `OPENAI_MODEL_PRINCIPAL` — Model for routing agent (default: `gpt-4o`)
- `OPENAI_MODEL_CHILD` — Model for child agents (default: `gpt-4o-mini`)
- `AZURE_OPENAI_ENDPOINT` — Set to enable Azure OpenAI mode
- `APP_HOST` / `APP_PORT` — Server binding (default: `0.0.0.0:8000`)
- `USE_REAL_OCR` — Enable GPT-4V document OCR (default: `false`)
- `USE_LLM_CHILDREN` — Enable LLM enhancement of child agent responses (default: `true`)
- `RATE_LIMIT_CHAT` — Rate limit for chat endpoint (default: `30/minute`)
- `MAX_MESSAGE_LENGTH` — Max chat message length (default: `2000` chars)
- `JWT_SECRET` — Secret key for JWT token signing
- `LLM_TIMEOUT` — Timeout for LLM API calls (default: `30` seconds)

---

### `backend/app/main.py`
**Purpose:** FastAPI application factory — the main app definition.
**What it does:**
- Creates the FastAPI app with full OpenAPI docs at `/docs`
- Configures CORS for localhost development (ports 5173, 3000)
- Attaches SlowAPI rate limiter
- Registers all routers under `/api` prefix: `auth`, `chat`, `members`, `claims`, `queue`
- Implements `lifespan` context manager to load data and users on startup
- WebSocket endpoint `/ws/claim-status/{member_id}` for real-time claim status push to customers
- `notify_claim_update()` function broadcasts claim decisions to connected customer WebSockets
- Health check endpoint at `GET /` returning system status and feature list

---

### `backend/app/agents/state.py`
**Purpose:** Defines `ClaimState` — the TypedDict that flows through every node in the LangGraph state machine.
**Key fields:**
- `user_context` — Authenticated user info (name, email, role, member_id)
- `session_id` / `conversation_history` — Multi-turn conversation support
- `member_id` / `member_data` — Member context from database
- `extracted_doc` — OCR/mock document fields (treatment type, cost, date, etc.)
- `user_message` — Original chat message text
- `current_agent` / `agent_trace` / `route` — Agent routing state
- `decision` / `reasoning` / `payout_amount` — Claim outcome
- `flags` / `needs_info` — Escalation flags and missing information
**Design:** Uses `Annotated[list, operator.add]` for list fields so LangGraph automatically merges lists across nodes.

---

### `backend/app/agents/graph.py`
**Purpose:** The core LangGraph state machine — builds, compiles, and executes the agent pipeline.
**Key components:**

1. **`setup_node(state)`** — Loads member data from DB, auto-populates `extracted_doc` from user message if missing, builds personalized greeting trace
2. **`parallel_validation_node(state)`** — Runs intake + eligibility checks concurrently via `asyncio.gather`; merges results; short-circuits on failure
3. **`decision_node(state)`** — Final aggregation: personalizes reasoning, handles PENDING_THRESHOLD flag, updates database (usage counters, claims history), saves to conversation session
4. **Routing functions:**
   - `route_after_setup` — If member not found → decision; else → parallel validation
   - `route_after_parallel_validation` — If validation failed → decision; else → principal
   - `route_after_principal` — Routes to outpatient, hospital, or exceptions
5. **`build_graph()`** — Constructs the StateGraph with all nodes and conditional edges, compiles it
6. **`process_claim()`** — Main entry point: detects follow-ups, runs the full pipeline or handles conversation
7. **`process_claim_streaming()`** — Streaming variant using `claim_graph.astream()` for WebSocket real-time updates

**Graph flow:**
```
setup → parallel_validation (intake ‖ eligibility) → principal → (outpatient|hospital|exceptions) → decision → END
```

---

### `backend/app/agents/principal_agent.py`
**Purpose:** The GPT-4o routing agent that decides which parent agent handles the claim.
**What it does:**
1. Builds a detailed prompt with member data, document data, user context
2. Sends to GPT-4o with the `PRINCIPAL_AGENT_PROMPT` system message
3. Parses the JSON response to extract `route` and `reasoning`
4. **Fallback:** If no API key or LLM fails, uses `_deterministic_route()` — keyword-based routing:
   - Keywords like "maternity", "solicitor", "fraud" → `exceptions`
   - Keywords like "hospital", "in-patient", "procedure code" → `hospital`
   - Everything else → `outpatient`

---

### `backend/app/agents/parent_1_intake.py`
**Purpose:** Document intelligence — form classification, data extraction, compliance checking.
**Processing steps:**
1. Classifies the form type using the Form Classifier child agent
2. Checks for wrong form usage (e.g., GP Claim Form for cash-back)
3. Validates document data presence
4. Checks for member signature
5. Returns `ACTION REQUIRED` if missing data, wrong form, or no signature
**Child agents used:** `invoke_form_classifier`, `invoke_compliance_checker`

---

### `backend/app/agents/parent_2_eligibility.py`
**Purpose:** Policy gatekeeper — 4 sequential checks, any failure = immediate REJECT.
**Checks (in order):**
1. **12-week waiting period:** `check_waiting_period` tool → REJECT if within waiting period
2. **12-month submission deadline:** `check_submission_deadline` tool → REJECT if expired
3. **€150 quarterly threshold:** `check_quarterly_threshold` tool → Flag PENDING_THRESHOLD if below
4. **Duplicate claim detection:** `check_existing_claim` tool → REJECT if duplicate found
**Child agents used:** `invoke_waiting_period_checker`, `invoke_time_limit_checker`, `invoke_threshold_calculator`, `invoke_duplicate_detector`

---

### `backend/app/agents/parent_3_outpatient.py`
**Purpose:** Processes the most common claim types — GP, consultant, prescription, therapy, dental/optical, scan.
**Sub-processors:**
- `_process_gp_consultant()` — Checks 10/year limit, caps payout at €20
- `_process_prescription()` — Checks 4/year limit, caps payout at €10
- `_process_therapy()` — Validates therapy type against allowed list, checks 10/year limit, caps at €20
- `_process_dental_optical()` — Checks 10/year limit, caps at €20
- `_process_scan()` — Checks 10/year limit, caps at €20
**Child agents used:** `invoke_gp_consultant_processor`, `invoke_pharmacy_therapy_processor`, `invoke_dental_optical_scan_processor`

---

### `backend/app/agents/parent_4_hospital.py`
**Purpose:** Hospital and complex procedure claims.
**Processing logic:**
1. Rejects private hospital invoices (>€1000 for non-hospital treatment types) — Cash Plan doesn't cover hospital admissions
2. Validates procedure codes (Code 29 needs histology, Code 16 needs serum ferritin)
3. Calculates hospital in-patient cash back using `calculate_hospital_payout` tool
4. Handles partial approvals (e.g., 38/40 days used, requesting 5 more → only 2 approved)
**Child agents used:** `invoke_inpatient_calculator`, `invoke_procedure_code_validator`

---

### `backend/app/agents/parent_5_exceptions.py`
**Purpose:** Edge cases — maternity, third-party/solicitor, and duplicate/fraud detection.
**Sub-processors:**
- `_process_maternity()` — Flat €200, one per year, excess not covered, newborn added to policy
- `_process_third_party()` — APPROVES claim but adds LEGAL_REVIEW flag for solicitor/PIAB cases
- `_check_duplicate()` — Cross-references claims history for exact matches
**Child agents used:** `invoke_maternity_processor`, `invoke_third_party_escalator`, `invoke_duplicate_detector`

---

### `backend/app/agents/child_agents.py`
**Purpose:** LLM-powered child agent invocations. Each child agent enhances deterministic reasoning with natural language via GPT-4o-mini.
**Architecture:** Every child agent follows the same pattern:
1. Receives a formatted prompt template from `prompts/`
2. Receives context (member data, document data, deterministic result)
3. Sends to GPT-4o-mini for natural language enhancement
4. Returns enhanced reasoning text + trace entry
5. Falls back gracefully to deterministic reasoning if LLM unavailable
**15 child agent functions:** `invoke_form_classifier`, `invoke_compliance_checker`, `invoke_waiting_period_checker`, `invoke_time_limit_checker`, `invoke_threshold_calculator`, `invoke_gp_consultant_processor`, `invoke_pharmacy_therapy_processor`, `invoke_dental_optical_scan_processor`, `invoke_inpatient_calculator`, `invoke_procedure_code_validator`, `invoke_maternity_processor`, `invoke_duplicate_detector`, `invoke_third_party_escalator`

---

### `backend/app/agents/conversation.py`
**Purpose:** Multi-turn conversation memory and follow-up detection — makes the chatbot work like ChatGPT/Claude.
**Key capabilities:**
- **Session store:** In-memory dict keyed by `session_id`, stores messages and last claim context
- **`is_follow_up()`:** Heuristic detection of follow-up vs. new claim:
  - No prior messages → NOT follow-up
  - Explicit new-claim language → NOT follow-up
  - Short messages (<8 words) with prior context → follow-up
  - Question starters (why, how, when) → follow-up
- **`handle_follow_up()`:** LLM-powered conversational response using full claim context as system prompt; includes member data, decision, trace, usage stats
- **`_build_fallback_followup()`:** Rule-based follow-up responses when no LLM is available (handles rejection reasons, payout questions, next steps, policy questions, thank you messages)
- **Session limit:** 50 messages per session max

---

### `backend/app/agents/message_parser.py`
**Purpose:** NLP utility that infers claim details from natural language chat messages when no document is uploaded.
**Inference capabilities:**
- **`infer_treatment_type()`** — Keyword matching to classify treatment (e.g., "gp visit" → "GP & A&E", "dentist" → "Dental & Optical")
- **`infer_total_cost()`** — Regex extraction of monetary amounts (€60, EUR 60, 60 euro)
- **`infer_treatment_date()`** — Parses relative dates ("yesterday", "last week"), month names, and explicit date formats (DD/MM/YYYY, YYYY-MM-DD)
- **`infer_practitioner()`** — Extracts "Dr. XXX" patterns and hospital/clinic names
- **`infer_hospital_days()`** — Extracts hospital stay duration patterns
- **`build_extracted_doc_from_message()`** — Orchestrates all inference to build an `extracted_doc` dict from a plain text message, with sensible cost defaults per treatment type:
  - GP & A&E: €60 | Consultant: €120 | Prescription: €30 | Dental & Optical: €50 | Day-to-Day Therapies: €60 | Scan Cover: €150 | Hospital In-patient: €200 | Maternity: €500

---

### `backend/app/agents/llm_factory.py`
**Purpose:** Creates the correct LangChain chat model instance based on settings.
**What it does:**
- Returns `ChatOpenAI` (standard) or `AzureChatOpenAI` (Azure) based on `settings.use_azure`
- Role-based model selection: `"principal"` → GPT-4o, `"child"` → GPT-4o-mini
- Configures `temperature=0` for deterministic outputs
- Applies `LLM_TIMEOUT` setting

---

### `backend/app/prompts/principal.py`
**Purpose:** System prompt for the Principal Agent (GPT-4o routing).
**Content:** Detailed instructions for:
- Analyzing claim type from document treatment_type and form_type
- Checking for red flags (missing signature, wrong form, accident/solicitor)
- Routing to one of 5 parent agents: intake, eligibility, outpatient, hospital, exceptions
- Output format: JSON with `route`, `reasoning`, `priority_checks`
- Full context injection: member data, extracted doc, user message, authenticated user info

---

### `backend/app/prompts/intake.py`
**Purpose:** System prompts for Parent 1's child agents.
**Prompts:** `FORM_CLASSIFIER_PROMPT` (document type classification), `OCR_EXTRACTOR_PROMPT` (field extraction), `COMPLIANCE_CHECKER_PROMPT` (signature, receipt, stamp, form validation)

---

### `backend/app/prompts/eligibility.py`
**Purpose:** System prompts for Parent 2's child agents.
**Prompts:** `ELIGIBILITY_AGENT_PROMPT` (parent), `WAITING_PERIOD_PROMPT`, `TIME_LIMIT_PROMPT`, `THRESHOLD_PROMPT`

---

### `backend/app/prompts/outpatient.py`
**Purpose:** System prompts for Parent 3's child agents.
**Prompts:** `OUTPATIENT_AGENT_PROMPT` (parent with benefit limits table), `GP_CONSULTANT_PROMPT`, `PHARMACY_THERAPY_PROMPT` (with allowed therapy list), `DENTAL_OPTICAL_SCAN_PROMPT`

---

### `backend/app/prompts/hospital.py`
**Purpose:** System prompts for Parent 4's child agents.
**Prompts:** `HOSPITAL_AGENT_PROMPT` (with critical Cash Plan rule), `INPATIENT_CALCULATOR_PROMPT`, `PROCEDURE_CODE_PROMPT` (codes 16 and 29 rules), `EMERGENCY_MRI_PROMPT`

---

### `backend/app/prompts/exceptions.py`
**Purpose:** System prompts for Parent 5's child agents.
**Prompts:** `EXCEPTIONS_AGENT_PROMPT` (parent), `MATERNITY_PROMPT`, `DUPLICATE_FRAUD_PROMPT`, `THIRD_PARTY_PROMPT`

---

### `backend/app/tools/policy_tools.py`
**Purpose:** LangChain `@tool` functions for deterministic policy rule enforcement. These are the "source of truth" business logic — always correct regardless of LLM availability.
**Tools:**
- `check_waiting_period(policy_start_date, treatment_date)` — Returns whether treatment is within 12-week waiting period
- `check_submission_deadline(treatment_date)` — Returns whether receipt is older than 12 months
- `check_quarterly_threshold(current_accumulated, new_amount)` — Returns whether €150 threshold is crossed
- `check_annual_limit(current_count, max_count)` — Returns whether annual benefit limit is exceeded
- `calculate_hospital_payout(days_requested, days_used)` — Returns approved/rejected days and payout at €20/day
- `validate_therapy_type(therapy_name)` — Returns whether therapy is in the allowed list
**IPID Source:** Contains `IPID_SOURCE` dict with all policy rules mapped to document sections (12 keys: `gp_ae`, `hospital_cashback`, `prescriptions`, `dental_optical`, `therapies`, `scan_cover`, `consultant_fee`, `maternity`, `waiting_period`, `quarterly_threshold`, `not_insured`, `receipt_requirements`, `cashback_only`), plus `get_source_citations(treatment_type, rejection_reasons)` function that maps treatment types and rejection keywords to relevant IPID sections and returns citation dicts with `document`, `section`, `highlighted_text`, `relevance`, and `source_url` (pointing to `https://www.layahealthcare.ie/api/document/dynamic/ipid?id=65&asOnDate=2026-02-24`).

---

### `backend/app/tools/db_tools.py`
**Purpose:** LangChain `@tool` functions for database operations.
**Tools:**
- `lookup_member(member_id)` — Returns full member record
- `get_usage_stats(member_id)` — Returns current year benefits usage
- `get_claims_history_tool(member_id)` — Returns all claims for a member
- `check_existing_claim(member_id, treatment_date, practitioner_name, claimed_amount)` — Duplicate detection; lenient mode if practitioner is unknown

---

### `backend/app/tools/ocr_tools.py`
**Purpose:** Document processing tools — mock OCR and real GPT-4V OCR.
**Tools:**
- `mock_ocr_extract(document_json)` — Pass-through JSON validation with required field checking
- `real_ocr_extract(image_base64)` — GPT-4V vision-based document extraction (requires `USE_REAL_OCR=true`)

---

### `backend/app/models/database.py`
**Purpose:** In-memory data store — loads, stores, and manages all member data.
**Data sources:**
- **SQL Members (MEM-1001 to MEM-1010):** Hardcoded in `_SQL_MEMBERS` list within the file, each with specific schema data for demo scenarios
- **JSON Members (MEM-2001 to MEM-2010):** Loaded from `data/json_users.json` at startup
**Key functions:**
- `load_data()` — Merges JSON and SQL members into `_members` dict
- `get_all_members()` — Returns summary list sorted by ID
- `get_member_by_id(id)` — Deep copy of full member record
- `update_usage(id, field, increment)` — Increments usage counter
- `add_claim_to_history(id, claim)` — Appends claim record
- `add_uploaded_document(id, meta)` — Tracks uploaded documents
- `add_activity(activity)` — Logs activities (max 500, FIFO)
- `get_activities(member_id, limit)` — Returns recent activities, optionally filtered
**Persistence:** Data is stored in-memory at runtime but is persisted to `data/runtime_state.json` on mutation (members, uploaded documents, activity log, callback requests). Chat sessions are persisted to `data/chat_sessions.json`. On server restart, the in-memory store is rebuilt from the base data sources (SQL + JSON members), but runtime state and chat sessions survive if these files exist.
**Callback requests:** `_callback_requests` list with `add_callback_request()` and `get_callback_requests()` functions.
**Activity log:** `_activity_log` list (max 500 entries, FIFO) with `add_activity()` and `get_activities(member_id, limit)` functions.

---

### `backend/app/models/schemas.py`
**Purpose:** Pydantic models for API data validation and serialization.
**Key models:**
- `Member` — Full member record (personal info, scheme, usage, claims history)
- `MemberSummary` — Lightweight view for sidebar listing
- `ClaimHistoryItem` — Single historical claim record
- `CurrentYearUsage` — Benefits usage tracking (GP count, scan count, hospital days, etc.)
- `ExtractedDocumentData` — OCR-extracted document fields (member_id, treatment_type, cost, procedure_code, etc.)
- `ClaimRequest` — Incoming chat request (message, member_id, optional document data, session_id)
- `ClaimResponse` — AI processing result (decision, reasoning, agent_trace, payout_amount, flags, session_id, source_url)
- `CallbackRequestIn` — Callback request input (member_id, member_name, issue_category, description, urgency [low/medium/high], preferred_contact [phone/email], contact_info)
- `CallbackRequestOut` — Callback request response (ticket_id, status, message)

---

### `backend/app/routers/chat.py`
**Purpose:** The main chat endpoint and WebSocket for real-time agent streaming.
**Endpoints:**
- `POST /api/chat` — Process a claim through the AI pipeline; validates input, extracts JWT user context, enforces customer member_id access control, runs `process_claim()`, returns `ClaimResponse`
- `WebSocket /ws/chat` — Real-time streaming; receives JSON claim request, streams `node_update` events as each agent completes, sends final `result` message
**Security features:**
- Input sanitization (HTML escaping, control char removal)
- Message length validation
- Rate limiting via SlowAPI
- JWT-based user context extraction
- Customer access control (can only query own member_id)
- Activity tracking (best-effort logging of all messages)

---

### `backend/app/routers/members.py`
**Purpose:** Member data endpoints.
**Endpoints:**
- `GET /api/members` — List all members (summary view)
- `GET /api/members/{member_id}` — Full member record
- `GET /api/members/{member_id}/profile` — Comprehensive profile with analytics: claims stats, status distribution, claims by type, monthly timeline, spending breakdown, usage limits, policy duration, waiting period status, and risk score calculation

---

### `backend/app/routers/claims.py`
**Purpose:** Claims history and document upload.
**Endpoints:**
- `GET /api/claims/{member_id}` — Returns claims history for a member
- `POST /api/upload` — Upload a document file (PDF/PNG/JPG):
  - In mock mode: extracts text from PDF via custom `_extract_text_from_pdf()` (handles zlib-compressed streams), then parses structured fields via `_parse_claim_fields_from_text()` using regex
  - In real mode: sends to GPT-4V for OCR
  - Saves uploaded file to `uploads/` directory
  - Tracks upload metadata for developer visibility
- `GET /api/files/{doc_id}` — Serves previously uploaded files for preview

---

### `backend/app/routers/queue.py`
**Purpose:** Developer-only dashboard API — claims queue, analytics, AI-assisted review.
**Endpoints:**
- `GET /api/queue/claims` — All claims across all members with priority scoring and enriched data; sorted by priority (requires developer role)
- `GET /api/queue/analytics` — Dashboard metrics: total members/claims, approved/rejected/pending counts, total payout, claim type distribution, member risk scores
- `POST /api/queue/ai-analyze` — Runs the full AI pipeline on a specific claim and returns: decision, reasoning, confidence score, agent trace, flags, and IPID source citations
- `POST /api/queue/review` — Developer submits final human decision (APPROVED/REJECTED/ESCALATED) with notes and optional payout override; updates claim status in DB; pushes notification to customer via WebSocket
- `GET /api/queue/members-overview` — All members with full details
- `GET /api/queue/member-documents/{member_id}` — Uploaded documents for a member
- `GET /api/queue/all-documents` — All uploaded documents
- `GET /api/queue/activities` — Activity log with optional member filter

**Priority calculation:** `calculate_claim_priority()` scores claims based on: PENDING status (+20), high value (+15/+30), proximity to annual limits (+15/+25), new policy risk (+20), AI rejection recommendation (+15), duplicate flag (+30). Returns HIGH (≥50), MEDIUM (≥25), or LOW.

---

### `backend/app/routers/auth.py`
**Purpose:** Authentication endpoints.
**Endpoints:**
- `POST /api/auth/register` — Create new account (email, password, name, role, optional member_id)
- `POST /api/auth/login` — Authenticate with email/password, returns JWT token + user data
- `GET /api/auth/me` — Validate current session, returns user data
**Dependencies:** `get_current_user` (extracts user from JWT), `require_developer` (403 if not developer role)

---

### `backend/app/auth/users.py`
**Purpose:** User storage and authentication logic.
**What it does:**
- JSON file-backed user database (`users_db.json`)
- bcrypt password hashing (secure)
- JWT token generation/validation (24-hour expiry)
- In-memory user store loaded on startup
- Default seeded accounts:
  - `admin@laya.ie` / `admin123` — Developer role
  - `customer@laya.ie` / `customer123` — Customer role, linked to MEM-1002
  - `test@laya.ie` / `test123` — Customer role, linked to MEM-1001

---

### `backend/test_all.py`
**Purpose:** Integration test suite with 15 tests covering all core features.
**Tests validate:** Module imports, data loading, member records, user accounts, IPID source URL, source citations, priority calculation, ClaimResponse schema, activity tracking, policy tools, graph module exports, WebSocket notification function, demo PDF generation, uploads directory.

---

## 7. Frontend — File-by-File Documentation

### `frontend/src/App.jsx`
**Purpose:** Root component. Sets up React Router with protected and public routes.
**Routes:**
- `/login` → LoginPage (public)
- `/register` → RegisterPage (public)
- `/dashboard` → DashboardPage (protected)
- `/dev-dashboard` → DevDashboardPage (protected, developer only)
- `/dev-dashboard/member/:memberId` → MemberProfilePage (protected, developer only)

---

### `frontend/src/main.jsx`
**Purpose:** Vite entry point. Renders `<App />` into the DOM with React StrictMode.

---

### `frontend/src/index.css`
**Purpose:** Global Tailwind v4 stylesheet defining the Laya Healthcare design system.
**Key features:** Custom CSS properties (@theme), 3-panel layout, glassmorphism, gradient utilities, pipeline step styles, agent animations (pulse, float, fade), typing dots, scrollbar styling, developer dashboard styles, responsive breakpoints.

---

### `frontend/src/components/AgentPanel.jsx`
**Purpose:** Right panel showing the AI processing pipeline stages, decision result, and member usage stats.
**Key features:** 5 animated pipeline stages (Setup → Parallel Validation → Principal → Treatment → Decision), real-time status computation from agent trace strings, usage bars for all 7 benefit categories, decision card with payout amount, customer mode (simplified view).

---

### `frontend/src/components/AgentTrace.jsx`
**Purpose:** Expandable vertical timeline showing individual agent routing steps.
**Key features:** Collapsible accordion, color-coded dots (green=pass, red=fail), staggered animation.

---

### `frontend/src/components/AnalyticsCards.jsx`
**Purpose:** Developer dashboard KPI cards — Total Members, Total Claims, Approved, Rejected, AI Accuracy, Avg Processing Time.

---

### `frontend/src/components/ArchitectureView.jsx`
**Purpose:** Interactive architecture visualization of the full AI agent pipeline with 10 graph nodes.
**Key features:** Vertical flow layout, real-time node status highlighting synced with agent trace, animated connectors, selectable nodes with detail panel showing child agents and filtered trace, color-coded legend.

---

### `frontend/src/components/ChatWindow.jsx`
**Purpose:** Main chat interface (center panel). Handles message display, text input, file upload, and voice input.
**Key features:** Auto-scroll, PDF/image upload with OCR processing, Web Speech API voice input (en-IE locale), inline PDF preview, typing indicator with active agent name, smart suggestion chips, keyboard shortcuts.

---

### `frontend/src/components/ClaimCard.jsx`
**Purpose:** Renders the claim decision result embedded within AI message bubbles.
**Key features:** Animated payout counter, status badge, flags, missing info alerts, IPID source document link, special "Under Review" card for PENDING decisions with shimmer progress bar, embedded AgentTrace, copy reference to clipboard.

---

### `frontend/src/components/ClaimReviewPanel.jsx`
**Purpose:** AI-assisted human review panel for developer "human-in-the-loop" workflow.
**Key features:** Claim details display, "Run AI Analysis" button (triggers full pipeline), AI recommendation with confidence score, reasoning, flags, source citations with IPID links, expandable agent trace, human decision buttons (Approve/Reject/Escalate), payout override field, review notes, submit action.

---

### `frontend/src/components/ClaimsQueue.jsx`
**Purpose:** Developer claims queue table.
**Key features:** Full-text search, status filter pills, priority filter pills (color-coded), sortable columns, priority scoring with PriorityBadge, clickable member links to profile pages, skeleton loading, animated row transitions.

---

### `frontend/src/components/FileUpload.jsx`
**Purpose:** Drag-and-drop document upload with demo scenario quick-select.
**Key features:** Visual drop zone, OCR processing via API, upload state tracking, demo scenario buttons from `DEMO_SCENARIOS` constant.

---

### `frontend/src/components/Layout.jsx`
**Purpose:** Simple 3-panel layout wrapper (left, center, right).

---

### `frontend/src/components/LeftSidebar.jsx`
**Purpose:** Left navigation sidebar with branding, chat sessions, member selector, and user profile.
**Key features:** Laya brand header, "New Chat" button (Ctrl+K), chat session list with delete, member selector dropdown, selected member preview card, user profile with role badge, developer-only "Claims Dashboard" link.

---

### `frontend/src/components/MemberInfo.jsx`
**Purpose:** Standalone member info card with usage stats and recent claims.
**Key features:** Gradient header with avatar, scheme and policy info, usage progress bars, quarterly receipts tracker, recent claims list.

---

### `frontend/src/components/MembersOverview.jsx`
**Purpose:** Developer risk monitor widget showing members ordered by risk score.

---

### `frontend/src/components/MessageBubble.jsx`
**Purpose:** Individual chat message bubble for user and AI messages.
**Key features:** Markdown rendering for AI responses, embedded ClaimCard for decisions, PDF attachment indicator with preview modal, real-time claim status updates from WebSocket (shows APPROVED/REJECTED with reviewer notes).
**WebSocket status metadata fields:** When a developer reviews a PENDING claim, the customer's message is patched in-place with `metadata.statusUpdated` (boolean) and `metadata.reviewDetails` (object with `decision`, `reviewer_notes`, `payout_amount`). This triggers an animated status-update banner in the message bubble.

---

### `frontend/src/components/PdfPreview.jsx`
**Purpose:** PDF/image preview component with compact and full modal modes.

---

### `frontend/src/components/SmartSuggestions.jsx`
**Purpose:** Contextual follow-up suggestion chips based on decision type.
**Key features:** Dynamic suggestions (APPROVED → "Submit another", REJECTED → "Why rejected?"), member-specific limit warnings, color-coded chips.

---

### `frontend/src/components/CallbackRequestModal.jsx`
**Purpose:** Modal dialog for requesting a human callback from Laya Customer Care when the AI cannot resolve an issue.
**Lines:** 343
**Props:** `isOpen`, `onClose`, `selectedMember`, `user`
**Key features:**
- 7 predefined issue categories (e.g., "Claim was incorrectly rejected", "General complaint")
- 3 urgency levels (Low/Medium/High) with response-time SLAs (2 hours / 24 hours / 2–3 business days)
- 2 contact methods (Phone, Email) — auto-resolved from `selectedMember` or `user`
- Calls `submitCallbackRequest()` API service → `POST /api/callback-request`
- Framer Motion AnimatePresence for open/close animation + spring animation on success
- Success state displays a ticket ID and Laya's phone number (1890 700 890)
- 1000-character description limit with live counter
- Form resets after 300ms delay on close (waits for exit animation)

---

### `frontend/src/components/StatusBadge.jsx`
**Purpose:** Reusable badge for claim decision statuses (APPROVED, REJECTED, PENDING, etc.).

---

### `frontend/src/components/WelcomeScreen.jsx`
**Purpose:** Empty state screen with capability cards for quick claim submission.
**Key features:** 6 claim type cards (GP, Consultant, Rx, Hospital, Dental, Scan) that pre-fill chat prompt and document data for the selected member.

---

### `frontend/src/hooks/useAuth.jsx`
**Purpose:** Authentication context provider and hook.
**Key features:** JWT token validation on mount, login/register/logout callbacks, exposes `user`, `isAuthenticated`, `isDeveloper`, `isCustomer` flags, localStorage persistence.

---

### `frontend/src/hooks/useChat.js`
**Purpose:** Core hook managing chat sessions, messages, AI pipeline calls, and real-time WebSocket streaming.
**Key features:**
- Multi-session management (create, select, delete sessions)
- **WebSocket-first communication** for real-time agent trace streaming, with HTTP POST fallback
- Multi-turn conversation memory via `session_id`
- Live trace updates during processing
- **Claim Status WebSocket** for real-time PENDING → APPROVED/REJECTED notifications from developer reviews
- User context injection (role, name, email) in every payload

---

### `frontend/src/hooks/useKeyboardShortcuts.js`
**Purpose:** Global keyboard shortcuts — Ctrl+K (new chat), Ctrl+/ (toggle panel), Ctrl+U (upload), Escape (close).

---

### `frontend/src/hooks/useMembers.js`
**Purpose:** Hook for fetching and selecting member data from the API.

---

### `frontend/src/pages/DashboardPage.jsx`
**Purpose:** Main application page — the 3-panel chat interface.
**Key features:** Orchestrates LeftSidebar, ChatWindow, AgentPanel/ArchitectureView. Customer mode auto-selects linked member, connects claim status WebSocket. Developer mode shows all members and architecture toggle.

---

### `frontend/src/pages/DevDashboardPage.jsx`
**Purpose:** Developer-only claims management dashboard.
**Key features:** 4 tabs — Claims Queue (with AI review panel), Members grid, Documents viewer, Activity Log. Analytics cards at top. Redirects non-developers.

---

### `frontend/src/pages/LoginPage.jsx`
**Purpose:** Animated login page with quick-login buttons for demo accounts.
**Quick logins:** Developer (`admin@laya.ie`), Customer (`customer@laya.ie`), Test/Liam (`test@laya.ie`).

---

### `frontend/src/pages/MemberProfilePage.jsx`
**Purpose:** AI-first claims intelligence dashboard for a specific member (developer only).
**Key features:** Hero card, AI Quick Stats, metric cards, risk factors, claims table with AI review panel, uploaded documents grid, tabbed analytics (usage limits, status pie chart, risk gauge, claims by type, spending breakdown). Uses Recharts for all visualizations.

---

### `frontend/src/pages/RegisterPage.jsx`
**Purpose:** Account registration with role selector (Customer/Developer) and optional member ID linking.

---

### `frontend/src/services/api.js`
**Purpose:** Axios HTTP client for all backend API communication.
**Key features:** Base URL `/api` (Vite proxy), 60s timeout, JWT Bearer token injection, 401 auto-logout, exports functions for all endpoints.

---

### `frontend/src/services/auth.js`
**Purpose:** Authentication API service.
**Key features:** Separate Axios instance, localStorage token/user management, login/register/fetchMe functions.

---

### `frontend/src/utils/constants.js`
**Purpose:** Application-wide constants.
**Key exports:** `API_BASE_URL`, `WS_BASE_URL`, `COLORS` (teal, navy, coral, amber, green, blue), `DECISION_STYLES` (Tailwind class sets per decision), `DEMO_SCENARIOS` (4 pre-built test cases with full document payloads).

---

## 8. Data & Test Fixtures

### `data/json_users.json`
**Purpose:** 10 synthetic members (MEM-2001 to MEM-2010) with varied edge-case scenarios.
**Structure:** Each member has personal info, auth fields, current_year_usage, and claims_history.

### `data/sql_users.sql`
**Purpose:** SQL creation script for 10 members (MEM-1001 to MEM-1010) — the "core" demo members.

### `data/README.md`
**Purpose:** Documentation for all 20 test members with expected AI decisions and policy rules cheat sheet.

### `backend/users_db.json`
**Purpose:** Persisted user accounts (created at runtime, seeded with default accounts).

### `demo_pdfs/generate_pdfs.py`
**Purpose:** Generates styled PDF claim forms mimicking real Laya Healthcare documents.
**Features:** Custom `ClaimFormPDF(FPDF)` class with Laya teal branding, structured sections, signature lines, and "DEMO DOCUMENT" watermark.
**Generates 8 PDFs:**
1. `claim_gp_visit_liam.pdf` — MEM-1001 (Liam) GP visit, Dr. Sarah Murphy, €55
2. `claim_consultant_siobhan.pdf` — MEM-1002 (Siobhan) Consultant, Prof. McBride, €120
3. `claim_scan_declan.pdf` — MEM-1003 (Declan) MRI scan, St. James's, €180
4. `claim_consultant_conor.pdf` — MEM-1005 (Conor) Consultant duplicate test, €120
5. `claim_hospital_aoife.pdf` — MEM-1004 (Aoife) Hospital 5-day stay, €500
6. `claim_maternity_niamh.pdf` — MEM-1008 (Niamh) Maternity, €500
7. `claim_gp_test_liam.pdf` — MEM-1001 (Liam) GP test receipt, Dr. Sarah Murphy, €55
8. `claim_accident_sean.pdf` — MEM-1009 (Sean) Accident/solicitor claim, €350
**Dependency:** Uses `fpdf2` library (install separately: `pip install fpdf2`, not in `requirements.txt`).

---

## 9. Documentation Files

| File | Purpose |
|------|---------|
| `docs/archicture.md` | Mermaid diagram of agent architecture |
| `docs/dataplan.md` | Synthetic data plan with 5 key personas |
| `docs/laya.md` | Full architectural whitepaper (~4,500 words) |
| `docs/roles.md` | Complete 1-5-15 agent hierarchy blueprint |
| `docs/scenariors.md` | 15 complex test scenarios |
| `docs/DEMO_SCRIPT.md` | 12-minute live demo walkthrough |
| `docs/input_output.md` | Exact JSON payloads for 4 demo scenarios |
| `Laya docs/insuranceplan/ipid.md` | Official IPID policy document (source of truth) |
| `improvements.md` | Detailed implementation plan (1130 lines) for improved demo flow: PENDING pipeline, priority levels, source citations, real-time sync, deferred usage updates |

---

## 10. Agent Architecture Deep Dive

### LangGraph State Machine

The core of the system is a compiled LangGraph `StateGraph` with 7 nodes and conditional edges:

```python
Nodes: setup_node, parallel_validation_node, principal_node,
       outpatient_node, hospital_node, exceptions_node, decision_node

Edges:
  setup_node → [decision_node | parallel_validation_node]     # conditional on member found
  parallel_validation_node → [decision_node | principal_node]  # conditional on validation pass
  principal_node → [outpatient | hospital | exceptions]        # conditional on route
  outpatient_node → decision_node
  hospital_node → decision_node
  exceptions_node → decision_node
  decision_node → END
```

### Shared State (ClaimState)

All nodes read from and write to the same `ClaimState` TypedDict. List fields use `Annotated[list, operator.add]` so LangGraph automatically merges (appends) entries from each node.

### Child Agent Pattern

Every parent agent follows this pattern:
1. **Deterministic logic first** — Policy rules calculated via tools (`check_waiting_period`, etc.)
2. **LLM enhancement second** — Child agent enhances the reasoning text via GPT-4o-mini
3. **Graceful fallback** — If LLM unavailable, deterministic reasoning is used as-is

This ensures **100% correctness of decisions and payouts** regardless of LLM availability — the LLM only improves the natural language quality of explanations.

### Dual Communication Modes

1. **HTTP POST `/api/chat`** — Standard request/response; returns complete `ClaimResponse`
2. **WebSocket `/ws/chat`** — Real-time streaming via `claim_graph.astream(stream_mode="updates")`; yields `node_update` events as each agent completes

### Follow-up Detection

The system detects whether a message is a new claim or a follow-up question:
- **New claim indicators:** "claim for a", "submit a", "receipt for", monetary amounts
- **Follow-up indicators:** Questions (why, how, when), short messages (<8 words), references to previous content
- Follow-ups bypass the full pipeline and use the `handle_follow_up()` LLM-powered conversational handler

---

## 11. API Reference

### Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Create account |
| POST | `/api/auth/login` | Public | Login, returns JWT |
| GET | `/api/auth/me` | Bearer | Validate session |

### Chat Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/chat` | Optional | Process claim through AI pipeline |
| POST | `/api/callback-request` | Bearer | Submit a customer callback request (creates a ticket with issue category, urgency, and contact info) |
| GET | `/api/chat/session/{session_id}` | Bearer | Retrieve a single chat session by ID |
| WS | `/ws/chat` | None | Real-time agent streaming |
| WS | `/ws/claim-status/{member_id}` | None | Push claim status updates to customers |

### Member Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/members` | None | List all members (summary) |
| GET | `/api/members/{id}` | None | Full member record |
| GET | `/api/members/{id}/profile` | None | Comprehensive profile with analytics |

### Claims Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/claims/{member_id}` | None | Claims history |
| POST | `/api/upload` | Optional | Upload document for OCR |
| GET | `/api/files/{doc_id}` | None | Serve uploaded file |

### Developer Queue Endpoints (Requires Developer Role)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/queue/claims` | Developer | All claims with priority scoring |
| GET | `/api/queue/analytics` | Developer | Dashboard metrics |
| POST | `/api/queue/ai-analyze` | Developer | Run AI analysis on a claim |
| POST | `/api/queue/review` | Developer | Submit human decision |
| GET | `/api/queue/members-overview` | Developer | All members with full details |
| GET | `/api/queue/member-documents/{member_id}` | Developer | Uploaded documents for a specific member |
| GET | `/api/queue/all-documents` | Developer | All uploaded documents |
| GET | `/api/queue/activities` | Developer | Activity log (optional `?member_id=` filter) |

---

## 12. Authentication & Authorization

### User Roles

| Role | Capabilities |
|------|-------------|
| **customer** | Chat with AI, submit own claims only, view own member data, receive real-time claim status updates |
| **developer** | Full access: all members, claims queue, AI analysis, human review, analytics dashboard, member profiles, activity log |

### JWT Token Flow

1. User logs in via `POST /api/auth/login` → receives JWT token (24-hour expiry)
2. Token stored in `localStorage` as `laya_token`
3. Every API request includes `Authorization: Bearer <token>` header (auto-injected by Axios interceptor)
4. Backend extracts user context from JWT in chat endpoint for personalization
5. 401 responses trigger auto-logout on frontend

### Access Control

- **Customers** can only query their own `member_id` — enforced in chat endpoint (403 if mismatch)
- **Developer-only endpoints** use `require_developer` dependency (403 if not developer role)
- **Customer claim decisions** are always set to PENDING (human review required), regardless of AI recommendation

---

## 13. Data Flow & Processing Pipeline

### Full Claim Processing Flow

```
1. User sends message (chat or WebSocket)
   ├── Input validated (length, sanitization)
   ├── JWT user context extracted
   └── Follow-up detection checked

2. If follow-up → handle_follow_up() (LLM conversational response)

3. If new claim → process_claim() invoked:
   a. setup_node:
      - Load member from DB
      - Auto-populate extracted_doc from message if no document uploaded
      - Build personalized trace

   b. parallel_validation_node (concurrent):
      - intake_node: Form classification, compliance, signature check
      - eligibility_node: Waiting period, deadline, threshold, duplicate

   c. If validation fails → short-circuit to decision_node

   d. principal_node:
      - GPT-4o analyzes claim and routes to parent agent
      - Fallback: keyword-based deterministic routing

   e. Treatment-specific parent:
      - outpatient_node: GP, consultant, Rx, therapy, dental, scan
      - hospital_node: In-patient cash back, procedure codes
      - exceptions_node: Maternity, third-party, duplicates

   f. decision_node:
      - Personalizes reasoning (customer name)
      - Handles PENDING_THRESHOLD flag
      - Customer claims → PENDING (human review required)
      - Updates database (usage counters, claims history)
      - Saves to conversation session
      - Returns final decision

4. Response returned to frontend with:
   decision, reasoning, agent_trace, payout_amount, flags, needs_info, session_id, source_url
```

### Real-Time Streaming Flow (WebSocket)

```
Client → WebSocket /ws/chat → send JSON claim request
                             ← status: "Processing claim..."
                             ← node_update: setup_node completed
                             ← node_update: parallel_validation completed
                             ← node_update: principal_agent completed
                             ← node_update: treatment_agent completed
                             ← node_update: decision_node completed
                             ← result: final aggregated result
```

### Developer Review Flow

```
1. Developer views Claims Queue (priority-sorted)
2. Selects a PENDING claim → ClaimReviewPanel opens
3. Clicks "Run AI Analysis" → POST /api/queue/ai-analyze
4. AI returns: recommendation, confidence, reasoning, trace, citations
5. Developer reviews AI recommendation (confidence score, reasoning, flags, IPID source citations)
6. Developer clicks Approve/Reject/Escalate → POST /api/queue/review (with optional payout override and reviewer notes)
7. Backend updates claim status in database
8. Backend pushes notification via WebSocket to customer
9. Customer sees real-time status update in their chat
```

---

## 14. Key Design Patterns

### 1. Deterministic Core, LLM Enhancement
All business logic (decisions, payouts, limits) is deterministic. LLMs only enhance the natural language quality of explanations. This ensures correctness regardless of LLM availability.

### 2. Parallel Validation
Intake and eligibility run concurrently via `asyncio.gather`. Early termination if either fails.

### 3. Human-in-the-Loop
Customer claims always go to PENDING status. Developer reviews AI recommendation and makes final decision (three options: **Approve**, **Reject**, or **Escalate**). AI provides confidence score and source citations to aid human judgment.

### 3a. Deferred Usage Updates
When a customer submits a claim, the AI calculates the decision and payout but does NOT immediately update usage counters (GP visits, hospital days, etc.). Instead, the usage deltas are stored as `deferred_usage_updates` on the claim record. When a developer **approves** the claim via the review panel, the deferred updates are applied to the member's `current_year_usage`. This prevents usage counters from being incremented for claims that may ultimately be rejected by human review.

### 4. Graceful Degradation
If OpenAI API key is missing or LLM calls fail:
- Principal Agent uses keyword-based deterministic routing
- Child agents fall back to deterministic reasoning text
- Follow-up handler uses rule-based responses
- All decisions and payouts remain correct

### 5. Multi-Turn Conversation Memory
Sessions persist messages and claim context. Follow-up questions bypass the full pipeline and use the conversation handler for contextual responses.

### 6. Source Citation
Every decision references the official IPID document with specific section, rule text, and source URL. This enables audit trails and regulatory compliance.

### 7. WebSocket-First, HTTP-Fallback\nChat tries WebSocket first for real-time agent trace streaming. Falls back to HTTP POST if WebSocket fails.\n\n### 8. Data Persistence
Despite being an in-memory data store, the system persists runtime state to disk:
- `data/runtime_state.json` — Members, uploaded documents, activity log, callback requests (saved on every mutation)
- `data/chat_sessions.json` — Chat session history with messages and claim context (saved on session update)
- `backend/users_db.json` — User accounts (saved on registration)
This ensures data survives server restarts during development and demos.

### 9. Known Code Duplication
- `UsageBar` component is duplicated in `AgentPanel.jsx` and `MemberInfo.jsx` with slightly different styling
- `getNodeStatus()` in `ArchitectureView.jsx` and `getStageStatus()` in `AgentPanel.jsx` share nearly identical keyword-matching logic
- `ArchitectureView.jsx` defines `x`/`y` coordinates on nodes that are unused (layout uses `FLOW_ROWS` instead)
- `useLocation` is imported but unused in `LeftSidebar.jsx`

---

## 15. Demo Scenarios & Test Matrix

### Core 10 Members (SQL — MEM-1001 to MEM-1010)

| Member ID | Name | Scenario | Expected Decision |
|-----------|------|----------|-------------------|
| MEM-1001 | Liam O'Connor | 12-week waiting period | REJECTED |
| MEM-1002 | Siobhan Kelly | Quarterly €150 threshold | APPROVED (€110+€60=€170 ≥ €150) |
| MEM-1003 | Declan Murphy | Annual scan limit (10/10) | REJECTED |
| MEM-1004 | Aoife Byrne | Hospital partial (38/40 days) | PARTIALLY APPROVED (2 of 5 days) |
| MEM-1005 | Conor Walsh | Duplicate claim | REJECTED |
| MEM-1006 | Roisin Flanagan | 12-month expired receipt | REJECTED |
| MEM-1007 | Patrick Doyle | Invalid therapy (Reiki) | REJECTED |
| MEM-1008 | Niamh Brennan | Maternity cash back | APPROVED (flat €200) |
| MEM-1009 | Sean Gallagher | Third-party/solicitor | APPROVED + LEGAL_REVIEW flag |
| MEM-1010 | Ciara Kavanagh | Missing signature | ACTION REQUIRED |

### Extended 10 Members (JSON — MEM-2001 to MEM-2010)

| Member ID | Name | Scenario |
|-----------|------|----------|
| MEM-2001 | Eoin McCarthy | Mixed batch claim |
| MEM-2002 | Brigid Sullivan | 11th GP visit (cap exceeded) |
| MEM-2003 | Tadhg Ryan | Missing histology (Procedure Code 29) |
| MEM-2004 | Orla Healy | Phlebotomy serum ferritin (Code 16) |
| MEM-2005 | Cillian Nolan | Happy path GP claim |
| MEM-2006 | Grainne Daly | 12-month expired receipt |
| MEM-2007 | Fionn O'Brien | Invalid therapy (massage) |
| MEM-2008 | Saoirse Quinn | Maternity already claimed |
| MEM-2009 | Oisin Maguire | Third-party accident |
| MEM-2010 | Aisling Power | Wrong form type |

### Default User Accounts

| Email | Password | Role | Linked Member |
|-------|----------|------|---------------|
| `admin@laya.ie` | `admin123` | developer | None |
| `customer@laya.ie` | `customer123` | customer | MEM-1002 |
| `test@laya.ie` | `test123` | customer | MEM-1001 |

---

## 16. Configuration & Environment Variables

### Required Environment Variables

```env
OPENAI_API_KEY=sk-...          # Required for LLM-powered agents
```

### Optional Environment Variables

```env
# LLM Model Selection
OPENAI_MODEL_PRINCIPAL=gpt-4o       # Principal Agent model
OPENAI_MODEL_CHILD=gpt-4o-mini      # Child Agent model

# Azure OpenAI (set endpoint to enable Azure mode)
AZURE_OPENAI_ENDPOINT=              # Azure endpoint URL
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_DEPLOYMENT_PRINCIPAL=gpt-4o
AZURE_DEPLOYMENT_CHILD=gpt-4o

# Server
APP_HOST=0.0.0.0
APP_PORT=8000
DEBUG=true

# Features
USE_REAL_OCR=false                   # Enable GPT-4V document OCR
USE_LLM_CHILDREN=true               # Enable LLM enhancement of child agents
LLM_TIMEOUT=30                       # LLM API call timeout (seconds)

# Security
RATE_LIMIT_CHAT=30/minute
MAX_MESSAGE_LENGTH=2000
JWT_SECRET=laya-healthcare-secret-key-2026
```

### How to Run

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python run.py
# Server starts at http://localhost:8000
# API docs at http://localhost:8000/docs
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Dev server starts at http://localhost:5173
# Vite proxies /api → http://localhost:8000
```

---

## Summary of Capabilities

| Capability | Implementation |
|-----------|---------------|
| AI Claims Processing | LangGraph state machine with 7 nodes, 5 parent agents, 15 child agents |
| Intelligent Routing | GPT-4o Principal Agent with deterministic fallback |
| Natural Language | GPT-4o-mini child agents enhance all responses |
| Real-Time Streaming | WebSocket with LangGraph astream for live agent trace |
| Document OCR | Mock OCR (PDF text extraction) + optional GPT-4V vision |
| Multi-Turn Conversation | Session-based memory with follow-up detection |
| Human-in-the-Loop | Developer dashboard with AI-assisted review panel |
| Fraud Detection | Duplicate claim detection + third-party escalation |
| Policy Compliance | Deterministic tools enforce all IPID business rules |
| Source Citations | Every decision links to official IPID document sections |
| Voice Input | Web Speech API with Irish English locale (`en-IE`), toggle via microphone button in ChatWindow |
| Callback Requests | CallbackRequestModal with 7 issue categories, 3 urgency levels, ticket tracking |
| Risk Monitoring | Priority scoring for claims queue + member risk scores |
| Analytics | Recharts visualizations (pie, bar, area, radial gauge) |
| Authentication | JWT + bcrypt, role-based access control |
| Rate Limiting | SlowAPI on chat endpoint |
| Responsive Design | Tailwind v4 with tablet/mobile breakpoints |
