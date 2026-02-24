# Laya Healthcare Backend — Complete AI-Readable Documentation

> **Purpose:** This document provides a comprehensive, AI-readable reference for the entire backend system. Any AI agent reading this should understand:
> 1. What every file does and how it connects to others
> 2. Where to add new features (which files to modify)
> 3. How data flows from frontend → backend → database → AI pipeline → response
> 4. The complete API contract and how the frontend consumes it
> 5. The in-memory database schema and persistence model

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Startup Flow & Initialization](#2-startup-flow--initialization)
3. [File-by-File Reference](#3-file-by-file-reference)
4. [API Reference — Complete Endpoint Map](#4-api-reference--complete-endpoint-map)
5. [Database Layer — In-Memory Store](#5-database-layer--in-memory-store)
6. [Authentication System](#6-authentication-system)
7. [AI Agent Pipeline — LangGraph](#7-ai-agent-pipeline--langgraph)
8. [Frontend ↔ Backend Integration Map](#8-frontend--backend-integration-map)
9. [Data Flow Diagrams](#9-data-flow-diagrams)
10. [Feature Addition Guide](#10-feature-addition-guide)
11. [Pydantic Schemas Reference](#11-pydantic-schemas-reference)
12. [Environment Variables](#12-environment-variables)
13. [WebSocket Endpoints](#13-websocket-endpoints)
14. [Error Handling Patterns](#14-error-handling-patterns)
15. [Testing](#15-testing)

---

## 1. System Overview

### Architecture Summary

```
┌──────────────────┐     HTTP/WS      ┌──────────────────────┐     LLM API      ┌────────────┐
│  React Frontend  │ ◄──────────────► │   FastAPI Backend     │ ◄──────────────► │  OpenAI    │
│  (Vite + React)  │   Port 5173      │   (Uvicorn ASGI)     │   GPT-4o/4o-mini │  API       │
│                  │   Proxy → 8000   │   Port 8000           │                  │            │
└──────────────────┘                  └──────────────────────┘                  └────────────┘
                                              │
                                    ┌─────────┴─────────┐
                                    │  In-Memory Store   │
                                    │  + JSON Persistence│
                                    │  (runtime_state.json)
                                    └───────────────────┘
```

### Key Design Decisions

1. **In-memory database** with JSON file persistence — no SQL database needed
2. **LangGraph state machine** orchestrates the AI pipeline — each node is a function
3. **Two user roles**: `customer` (can submit claims) and `developer` (can review/approve claims)
4. **Customer claims always go to PENDING** — developers must approve via the Queue
5. **Multi-turn conversation** via session-based memory (like ChatGPT)
6. **Parallel validation** — intake and eligibility checks run concurrently via `asyncio.gather`

### Backend Directory Structure

```
backend/
├── run.py                     # Entry point: starts uvicorn server
├── requirements.txt           # Python dependencies
├── .env                       # Environment variables (OPENAI_API_KEY, etc.)
├── users_db.json              # Persisted user accounts
├── test_all.py                # Integration test suite
├── data/
│   ├── runtime_state.json     # Persisted member data, claims, activities, callbacks
│   └── chat_sessions.json     # Persisted chat session history
└── app/
    ├── __init__.py
    ├── config.py              # Settings from .env
    ├── main.py                # FastAPI app factory, CORS, WebSocket, lifespan
    ├── agents/                # AI agent pipeline (LangGraph)
    │   ├── state.py           # ClaimState TypedDict (shared state schema)
    │   ├── graph.py           # LangGraph state machine (build + compile + run)
    │   ├── principal_agent.py # GPT-4o routing agent
    │   ├── parent_1_intake.py # Document validation
    │   ├── parent_2_eligibility.py  # Policy checks (waiting period, deadline, etc.)
    │   ├── parent_3_outpatient.py   # GP, consultant, Rx, therapy, dental, scan
    │   ├── parent_4_hospital.py     # In-patient, procedure codes
    │   ├── parent_5_exceptions.py   # Maternity, third-party, fraud
    │   ├── child_agents.py    # LLM-powered child agent invocations
    │   ├── conversation.py    # Multi-turn session memory & follow-up handler
    │   ├── message_parser.py  # NLP inference from chat messages
    │   └── llm_factory.py     # OpenAI / Azure OpenAI LLM factory
    ├── prompts/               # System prompt templates for each agent
    │   ├── principal.py       # Principal routing prompt
    │   ├── intake.py          # Form classifier, compliance prompts
    │   ├── eligibility.py     # Waiting period, time limit, threshold prompts
    │   ├── outpatient.py      # GP, pharmacy, dental/scan prompts
    │   ├── hospital.py        # In-patient, procedure code prompts
    │   └── exceptions.py      # Maternity, duplicate, third-party prompts
    ├── tools/                 # LangChain tools (deterministic business logic)
    │   ├── policy_tools.py    # Policy rule enforcement + IPID citations
    │   ├── db_tools.py        # Member lookup, usage stats, duplicate detection
    │   └── ocr_tools.py       # Mock OCR + GPT-4V real OCR
    ├── models/                # Data layer
    │   ├── database.py        # In-memory store, CRUD, persistence
    │   └── schemas.py         # Pydantic request/response models
    ├── routers/               # API endpoint handlers
    │   ├── auth.py            # POST /api/auth/register, /login, GET /me
    │   ├── chat.py            # POST /api/chat, WS /ws/chat, callback-request
    │   ├── members.py         # GET /api/members, /members/{id}, /members/{id}/profile
    │   ├── claims.py          # GET /api/claims/{id}, POST /api/upload, GET /api/files/{id}
    │   └── queue.py           # Developer dashboard: claims queue, analytics, review
    └── auth/
        └── users.py           # User store, bcrypt hashing, JWT tokens
```

---

## 2. Startup Flow & Initialization

When the server starts (`python run.py`), the following happens in order:

```
1. run.py → uvicorn.run("app.main:app", ...)
2. app/main.py → FastAPI app created with lifespan()
3. lifespan() executes:
   a. load_data()          → database.py: Load JSON members from data/json_users.json
                             Merge with hardcoded SQL members (MEM-1001 to MEM-1010)
                             Overlay runtime_state.json if it exists (prior claims, usage)
   b. load_users()         → auth/users.py: Load user accounts from users_db.json
                             Seed defaults if first run (admin@laya.ie, customer@laya.ie, test@laya.ie)
   c. load_sessions()      → agents/conversation.py: Load chat sessions from data/chat_sessions.json
4. Routers registered under /api prefix:
   - auth.router    → /api/auth/*
   - chat.router    → /api/chat, /api/callback-request
   - members.router → /api/members/*
   - claims.router  → /api/claims/*, /api/upload, /api/files/*
   - queue.router   → /api/queue/*
5. WebSocket endpoints:
   - /ws/claim-status/{member_id}  (main.py — claim status push)
   - /ws/chat                       (chat.py — real-time agent streaming)
6. Server ready at http://localhost:8000
```

---

## 3. File-by-File Reference

### `run.py`
- **Purpose:** Entry point — launches uvicorn
- **Dependencies:** `app.config.settings`
- **Key:** `uvicorn.run("app.main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=settings.DEBUG)`

### `app/config.py`
- **Purpose:** Centralized settings from `.env` environment variables
- **Class:** `Settings` — all properties are class attributes with defaults
- **Key Settings:**
  - `OPENAI_API_KEY` — Required for LLM agents
  - `OPENAI_MODEL_PRINCIPAL` → `"gpt-4o"` (routing agent)
  - `OPENAI_MODEL_CHILD` → `"gpt-4o-mini"` (child agents)
  - `USE_LLM_CHILDREN` → `true` (enable/disable LLM child agents)
  - `USE_REAL_OCR` → `false` (enable GPT-4V document OCR)
  - `JWT_SECRET` → signing key for auth tokens
  - `RATE_LIMIT_CHAT` → `"30/minute"`
  - `MAX_MESSAGE_LENGTH` → `2000`
  - `CORS_ORIGINS` → `["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]`
  - `UPLOADS_DIR` → `../uploads/` (file upload directory)
  - `JSON_DATA_PATH` → `../data/json_users.json`
- **Singleton:** `settings = Settings()` — imported everywhere

### `app/main.py`
- **Purpose:** FastAPI app factory, middleware, WebSocket endpoints
- **Creates:** The FastAPI `app` instance
- **CORS:** Configured for localhost:5173 (Vite dev server)
- **Routers registered:** auth, chat, members, claims, queue — all under `/api`
- **WebSocket:** `/ws/claim-status/{member_id}` — pushes real-time claim status updates to customers
- **Key function:** `notify_claim_update(member_id, claim_id, new_status, details)` — broadcasts claim decisions
- **Health check:** `GET /` → returns system status

### `app/agents/state.py`
- **Purpose:** Defines `ClaimState` TypedDict — the shared state for all LangGraph nodes
- **Fields (complete list):**
  - `messages: list` — LangGraph message history
  - `user_context: dict` — `{ user_id, name, email, role, member_id }`
  - `session_id: str` — multi-turn conversation ID
  - `conversation_history: list[dict]` — prior messages in session
  - `member_id: str` — e.g. "MEM-1001"
  - `member_data: dict` — full member record from database
  - `extracted_doc: dict` — OCR/parsed document fields
  - `user_message: str` — original user text
  - `current_agent: str` — active agent name
  - `agent_trace: list[str]` — ordered trace: `["Setup → ...", "Intake → ...", ...]`
  - `route: str` — `"outpatient"` | `"hospital"` | `"exceptions"`
  - `decision: str` — `"APPROVED"` | `"REJECTED"` | `"PENDING"` | `"PARTIALLY APPROVED"` | `"ACTION REQUIRED"`
  - `reasoning: str` — human-readable explanation
  - `payout_amount: float` — EUR amount
  - `flags: list[str]` — `["LEGAL_REVIEW", "DUPLICATE", "PENDING_THRESHOLD"]`
  - `needs_info: list[str]` — missing documents/info
- **Design:** Uses `Annotated[list, operator.add]` so LangGraph merges lists across nodes

### `app/agents/graph.py`
- **Purpose:** The core LangGraph state machine — builds, compiles, and executes the pipeline
- **Graph structure:**
  ```
  setup_node → parallel_validation_node → principal_node → (outpatient|hospital|exceptions) → decision_node → END
  ```
- **Node functions:**
  1. `setup_node(state)` — Loads member from DB, auto-infers `extracted_doc` from message if missing
  2. `parallel_validation_node(state)` — Runs `intake_node` + `eligibility_node` concurrently via `asyncio.gather`
  3. `principal_node(state)` — GPT-4o routes to `outpatient`, `hospital`, or `exceptions`
  4. `outpatient_node/hospital_node/exceptions_node` — Treatment-specific processing
  5. `decision_node(state)` — Final aggregation, DB updates, conversation save
- **Routing functions:**
  - `route_after_setup` — member not found → decision; else → parallel_validation
  - `route_after_parallel_validation` — failure → decision; else → principal
  - `route_after_principal` — routes to outpatient/hospital/exceptions based on `state["route"]`
- **Key decision_node logic:**
  - Customer claims: AI decides but sets status to **PENDING** (human review required)
  - Developer claims: Usage updates applied immediately
  - Deferred usage updates stored in claim record for developer approval
  - Conversation session saved for multi-turn follow-up
- **Entry points:**
  - `process_claim(member_id, user_message, extracted_doc, user_context, session_id)` → returns result dict
  - `process_claim_streaming(...)` → async generator yielding node-by-node updates for WebSocket

### `app/agents/principal_agent.py`
- **Purpose:** GPT-4o routing agent — decides which parent handles the claim
- **Input:** Member data, extracted doc, user message
- **Output:** `state["route"]` set to `"outpatient"`, `"hospital"`, or `"exceptions"`
- **Fallback:** `_deterministic_route()` — keyword-based routing when no API key
- **Routing rules:**
  - "maternity", "solicitor", "fraud" → `exceptions`
  - "hospital", "in-patient", "procedure code" → `hospital`
  - Everything else → `outpatient`

### `app/agents/parent_1_intake.py`
- **Purpose:** Document validation — form classification, data extraction, compliance
- **Checks:** Form type, document data presence, member signature
- **Returns:** `ACTION REQUIRED` if missing data/wrong form/no signature

### `app/agents/parent_2_eligibility.py`
- **Purpose:** Policy gatekeeper — 4 sequential checks, any failure = immediate REJECT
- **Checks (in order):**
  1. 12-week waiting period → REJECT if within
  2. 12-month submission deadline → REJECT if expired
  3. €150 quarterly threshold → Flag PENDING_THRESHOLD if below
  4. Duplicate claim detection → REJECT if duplicate found

### `app/agents/parent_3_outpatient.py`
- **Purpose:** Most common claims — GP, consultant, Rx, therapy, dental, scan
- **Sub-processors:**
  - `_process_gp_consultant()` → 10/year limit, €20 cap
  - `_process_prescription()` → 4/year limit, €10 cap
  - `_process_therapy()` → Validates therapy type, 10/year, €20 cap
  - `_process_dental_optical()` → 10/year, €20 cap
  - `_process_scan()` → 10/year, €20 cap

### `app/agents/parent_4_hospital.py`
- **Purpose:** Hospital and complex procedure claims
- **Key rules:**
  - Rejects private hospital invoices (>€1000) — Cash Plan doesn't cover admissions
  - Validates procedure codes (Code 29 = histology, Code 16 = serum ferritin)
  - Hospital in-patient: €20/day, 40 days/year max
  - Partial approvals when days exceed limit

### `app/agents/parent_5_exceptions.py`
- **Purpose:** Edge cases — maternity, third-party/solicitor, fraud
- **Maternity:** Flat €200, one per year
- **Third-party:** APPROVED but flagged LEGAL_REVIEW
- **Duplicate:** Cross-references claims history

### `app/agents/child_agents.py`
- **Purpose:** 15 LLM-powered child agents — enhance deterministic reasoning with GPT-4o-mini
- **Pattern:** Each child receives context + deterministic result → GPT-4o-mini generates natural language reasoning
- **Graceful degradation:** Falls back to deterministic reasoning if LLM unavailable
- **Child functions:**
  - `invoke_form_classifier`, `invoke_compliance_checker`
  - `invoke_waiting_period_checker`, `invoke_time_limit_checker`, `invoke_threshold_calculator`
  - `invoke_gp_consultant_processor`, `invoke_pharmacy_therapy_processor`, `invoke_dental_optical_scan_processor`
  - `invoke_inpatient_calculator`, `invoke_procedure_code_validator`
  - `invoke_maternity_processor`, `invoke_duplicate_detector`, `invoke_third_party_escalator`

### `app/agents/conversation.py`
- **Purpose:** Multi-turn conversation memory and follow-up detection
- **Session store:** In-memory dict keyed by `session_id`
- **Key functions:**
  - `is_follow_up(user_message, session_id)` — heuristic: question patterns, short messages, follow-up keywords
  - `handle_follow_up(user_message, session_id, member_id)` — LLM-powered contextual response
  - `add_message(session_id, role, content)` — append to session
  - `save_claim_context(session_id, ctx)` — persist claim result for follow-ups
  - `get_all_user_sessions(user_id)` — return all sessions for chat history
  - `link_session_to_user(session_id, user_id)` — user ↔ session mapping
- **Persistence:** Saves to `data/chat_sessions.json`
- **Fallback:** `_build_fallback_followup()` — rule-based responses when no LLM

### `app/agents/message_parser.py`
- **Purpose:** NLP inference from chat messages when no document uploaded
- **Functions:**
  - `infer_treatment_type(msg)` — keyword matching → treatment category
  - `infer_total_cost(msg)` — regex extraction of monetary amounts
  - `infer_treatment_date(msg)` — relative dates, month names, explicit formats
  - `infer_practitioner(msg)` — "Dr. XXX" patterns, hospital names
  - `infer_hospital_days(msg)` — stay duration patterns
  - `build_extracted_doc_from_message(msg, member_data, existing_doc)` — builds complete `extracted_doc`

### `app/agents/llm_factory.py`
- **Purpose:** Creates LangChain chat model instances
- **Function:** `get_llm(role)` → `ChatOpenAI` or `AzureChatOpenAI`
  - `role="principal"` → GPT-4o
  - `role="child"` → GPT-4o-mini
  - `temperature=0`, timeout from settings

### `app/prompts/*.py`
- **Purpose:** System prompt templates for each agent
- **Files:** `principal.py`, `intake.py`, `eligibility.py`, `outpatient.py`, `hospital.py`, `exceptions.py`
- **Pattern:** Each file exports uppercase string constants like `PRINCIPAL_AGENT_PROMPT`, `FORM_CLASSIFIER_PROMPT`, etc.

### `app/tools/policy_tools.py`
- **Purpose:** Deterministic policy rule enforcement (source of truth)
- **LangChain @tool functions:**
  1. `check_waiting_period(policy_start_date, treatment_date)` → is within 12-week waiting?
  2. `check_submission_deadline(treatment_date)` → is receipt older than 12 months?
  3. `check_quarterly_threshold(current_accumulated, new_amount)` → crosses €150?
  4. `check_annual_limit(current_count, max_count)` → annual limit exceeded?
  5. `calculate_hospital_payout(days_requested, days_used)` → approved/rejected days, €20/day
  6. `validate_therapy_type(therapy_name)` → is therapy in allowed list?
- **IPID Source:** Contains `IPID_SOURCE` dict mapping policy rules to document sections
- **Citations:** `get_source_citations(treatment_type, rejection_reasons)` → relevant IPID citations

### `app/tools/db_tools.py`
- **Purpose:** LangChain @tool functions for database operations
- **Tools:**
  1. `lookup_member(member_id)` → full member record
  2. `get_usage_stats(member_id)` → current_year_usage dict
  3. `get_claims_history_tool(member_id)` → all claims for member
  4. `check_existing_claim(member_id, treatment_date, practitioner_name, claimed_amount)` → duplicate detection

### `app/tools/ocr_tools.py`
- **Purpose:** Document processing
- **Tools:**
  - `mock_ocr_extract(document_json)` → pass-through JSON validation
  - `real_ocr_extract(image_base64)` → GPT-4V vision OCR (when `USE_REAL_OCR=true`)

### `app/auth/users.py`
- **Purpose:** User account management — registration, login, JWT tokens
- **Store:** In-memory dict `_users`, persisted to `users_db.json`
- **Password:** bcrypt hashing
- **JWT:** HS256, 24-hour expiration
- **Default users (seeded on first run):**
  - `admin@laya.ie` / `admin123` — developer role
  - `customer@laya.ie` / `customer123` — customer role, linked to MEM-1002
  - `test@laya.ie` / `test123` — customer role, linked to MEM-1001
- **Key functions:**
  - `register(email, password, first_name, last_name, role, member_id)` → user + token
  - `login(email, password)` → user + token
  - `decode_token(token)` → payload dict or None
  - `get_user_by_id(user_id)` → safe user dict (no password_hash)

---

## 4. API Reference — Complete Endpoint Map

### Auth Router (`/api/auth`) — `routers/auth.py`

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| POST | `/api/auth/register` | None | Create account | `{ email, password, first_name, last_name, role, member_id? }` | `{ id, email, first_name, last_name, role, member_id, token }` |
| POST | `/api/auth/login` | None | Login | `{ email, password }` | `{ id, email, first_name, last_name, role, member_id, token }` |
| GET | `/api/auth/me` | Bearer | Get current user | — | `{ id, email, first_name, last_name, role, member_id }` |

### Chat Router (`/api`) — `routers/chat.py`

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| POST | `/api/chat` | Bearer | Process claim through AI pipeline | `ClaimRequest` | `ClaimResponse` |
| GET | `/api/chat/history` | Bearer | All chat sessions for user | — | `{ sessions: [...], total }` |
| GET | `/api/chat/session/{session_id}` | Bearer | Specific session messages | — | `{ session_id, messages, last_claim_context }` |
| POST | `/api/callback-request` | Bearer | Submit callback request | `CallbackRequestIn` | `CallbackRequestOut` |

**ClaimRequest body:**
```json
{
  "message": "I want to submit a claim for a GP visit",
  "member_id": "MEM-1001",
  "extracted_document_data": {  // optional — from uploaded PDF
    "member_id": "MEM-1001",
    "patient_name": "Liam O'Connor",
    "form_type": "Money Smart Out-patient Claim Form",
    "treatment_type": "GP & A&E",
    "treatment_date": "2026-02-20",
    "practitioner_name": "Dr. Smith",
    "total_cost": 60.0,
    "signature_present": true
  },
  "session_id": "abc123",  // optional — for multi-turn
  "user_context": { ... }  // optional — auto-extracted from JWT
}
```

**ClaimResponse:**
```json
{
  "decision": "REJECTED",
  "reasoning": "Hi Liam, your claim falls within the 12-week waiting period...",
  "agent_trace": ["Setup → Member MEM-1001 loaded", "Eligibility → Waiting period check..."],
  "payout_amount": 0.0,
  "flags": [],
  "needs_info": [],
  "session_id": "abc123",
  "source_url": "https://www.layahealthcare.ie/api/document/dynamic/ipid?id=65..."
}
```

**CallbackRequestIn body:**
```json
{
  "member_id": "MEM-1001",
  "member_name": "Liam O'Connor",
  "issue_category": "Claim was incorrectly rejected",
  "description": "I believe my claim should have been approved because...",
  "urgency": "medium",
  "preferred_contact": "phone",
  "contact_info": "+353-85-123-4501"
}
```

### Members Router (`/api/members`) — `routers/members.py`

| Method | Endpoint | Auth | Description | Response |
|--------|----------|------|-------------|----------|
| GET | `/api/members` | None | All members (sidebar list) | `{ members: [MemberSummary...], total }` |
| GET | `/api/members/{member_id}` | None | Full member record | `Member` (with usage + claims) |
| GET | `/api/members/{member_id}/profile` | None | Comprehensive analytics | `{ member, analytics, claims, uploaded_documents }` |

### Claims Router (`/api`) — `routers/claims.py`

| Method | Endpoint | Auth | Description | Request | Response |
|--------|----------|------|-------------|---------|----------|
| GET | `/api/claims/{member_id}` | None | Claims history | — | `{ member_id, claims: [...], total }` |
| POST | `/api/upload` | Bearer | Upload document for OCR | `multipart/form-data (file)` | `{ success, extracted_data, file_url, doc_id }` |
| GET | `/api/files/{doc_id}` | None | Serve uploaded file | — | `FileResponse` (PDF/image) |

### Queue Router (`/api/queue`) — `routers/queue.py` (Developer Only)

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| GET | `/api/queue/claims` | Developer | All claims with priority | — | `{ claims: [...], total }` |
| GET | `/api/queue/analytics` | Developer | Dashboard KPIs | — | `{ total_members, total_claims, approved, rejected, ... }` |
| POST | `/api/queue/ai-analyze` | Developer | Run AI on a claim | `AIAnalyzeRequest` | `{ ai_decision, ai_reasoning, agent_trace, source_citations }` |
| POST | `/api/queue/review` | Developer | Final human decision | `ReviewRequest` | `{ success, claim_id, decision, message }` |
| GET | `/api/queue/members-overview` | Developer | All members with full details | — | `{ members: [...], total }` |
| GET | `/api/queue/member-documents/{member_id}` | Developer | Documents for a member | — | `{ member_id, documents, total }` |
| GET | `/api/queue/all-documents` | Developer | All uploaded documents | — | `{ documents, total }` |
| GET | `/api/queue/activities` | Developer | Activity log | `?member_id=&limit=` | `{ activities, total }` |

### WebSocket Endpoints

| Endpoint | Location | Description |
|----------|----------|-------------|
| `ws://localhost:8000/ws/chat` | `routers/chat.py` | Real-time agent trace streaming during claim processing |
| `ws://localhost:8000/ws/claim-status/{member_id}` | `main.py` | Push claim status updates to customer portal |

---

## 5. Database Layer — In-Memory Store

### File: `app/models/database.py`

The database is an **in-memory Python dict** with JSON file persistence. No SQL database is used.

### Global Data Stores

```python
_members: dict[str, dict] = {}              # member_id → full member record
_uploaded_documents: dict[str, list[dict]] = {}  # member_id → list of doc metadata
_activity_log: list[dict] = []              # user activities (max 500)
_callback_requests: list[dict] = []         # customer care callbacks (max 200)
```

### Data Sources (loaded at startup)

1. **JSON members** (`data/json_users.json`): MEM-2001 to MEM-2010 — loaded from file
2. **SQL members** (hardcoded in `database.py`): MEM-1001 to MEM-1010 — each with specific demo scenarios
3. **Persisted state** (`data/runtime_state.json`): Overlays runtime changes (claims, usage updates)

### Member Record Schema

```python
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
    "policy_start_date": "2026-02-01",   # CRITICAL for waiting period checks
    "status": "Active",
    "_scenario_note": "12-week waiting period rejection",  # internal only, stripped from API responses
    "current_year_usage": {
        "year": 2026,
        "quarter": "Q1",
        "q_accumulated_receipts": 0.0,   # toward €150 quarterly threshold
        "gp_visits_count": 0,            # max 10/year
        "prescription_count": 0,         # max 4/year
        "dental_optical_count": 0,       # max 10/year
        "therapy_count": 0,              # max 10/year
        "scan_count": 0,                 # max 10/year
        "consultant_visits_count": 0,    # max 10/year
        "hospital_days_count": 0,        # max 40/year
        "maternity_claimed": false       # max 1/year
    },
    "claims_history": [
        {
            "claim_id": "CLM-20260224143000",
            "treatment_type": "GP & A&E",
            "treatment_date": "2026-01-10",
            "claimed_amount": 60.0,
            "approved_amount": 20.0,
            "status": "Pending",            # customer-submitted are always PENDING
            "practitioner_name": "Dr. John Doe",
            "submitted_date": "2026-02-24",
            "ai_recommendation": "APPROVED", # what the AI decided
            "ai_reasoning": "...",
            "ai_confidence": 0.95,
            "ai_payout_amount": 20.0,
            "ai_flags": [],
            "deferred_usage_updates": [      # applied when developer approves
                {"field": "gp_visits_count", "increment": 1},
                {"field": "q_accumulated_receipts", "increment": 60.0}
            ]
        }
    ]
}
```

### CRUD Functions

| Function | Parameters | Description |
|----------|-----------|-------------|
| `load_data()` | — | Load JSON + SQL members, overlay persisted state |
| `get_all_members()` | — | Return list of `MemberSummary` dicts |
| `get_member_by_id(member_id)` | `str` | Return full member record (deep copy) |
| `get_claims_history(member_id)` | `str` | Return claims array for member |
| `update_usage(member_id, field, increment)` | `str, str, float/int` | Increment a usage counter |
| `add_claim_to_history(member_id, claim)` | `str, dict` | Append claim to member's history |
| `update_claim_status(member_id, claim_id, updates)` | `str, str, dict` | Update specific claim fields |
| `add_uploaded_document(member_id, doc_meta)` | `str, dict` | Track document upload |
| `get_uploaded_documents(member_id)` | `str` | Get docs for member |
| `get_all_uploaded_documents()` | — | Get all docs across all members |
| `add_activity(activity)` | `dict` | Log user activity (max 500) |
| `get_activities(member_id?, limit?)` | `str?, int` | Get recent activities |
| `add_callback_request(request)` | `dict` | Create callback request with ticket ID |
| `get_callback_requests(member_id?, limit?)` | `str?, int` | Get callback requests |

### Persistence

- **File:** `data/runtime_state.json`
- **Written:** After every mutation (claim add, usage update, activity log, callback request)
- **Contains:** `{ members, uploaded_documents, activity_log, callback_requests }`
- **Chat sessions:** Separately persisted to `data/chat_sessions.json` by `conversation.py`
- **User accounts:** Separately persisted to `users_db.json` by `auth/users.py`

### Demo Members (SQL — MEM-1001 to MEM-1010)

| Member ID | Name | Scenario | Key Data |
|-----------|------|----------|----------|
| MEM-1001 | Liam O'Connor | Waiting period rejection | `policy_start_date: 2026-02-01` (brand new) |
| MEM-1002 | Siobhan Kelly | Quarterly threshold | `q_accumulated_receipts: 110.0` (below €150) |
| MEM-1003 | Declan Murphy | Annual scan limit exhausted | `scan_count: 10` (10/10 used) |
| MEM-1004 | Aoife Byrne | Partial hospital approval | `hospital_days_count: 38` (38/40 used) |
| MEM-1005 | Conor Walsh | Duplicate claim detection | Has existing claim on 2026-01-15 |
| MEM-1006 | Roisin Flanagan | 12-month expired receipt | Policy since 2023 |
| MEM-1007 | Patrick Doyle | Invalid therapy type | `therapy_count: 3` |
| MEM-1008 | Niamh Brennan | Maternity cash back | `maternity_claimed: false` |
| MEM-1009 | Sean Gallagher | Third-party/solicitor | `hospital_days_count: 5` |
| MEM-1010 | Ciara Kavanagh | Missing signature/wrong form | `dental_optical_count: 1` |

---

## 6. Authentication System

### Files: `app/auth/users.py` + `app/routers/auth.py`

### Flow

```
1. User registers or logs in → POST /api/auth/register or /api/auth/login
2. Backend returns JWT token + user info
3. Frontend stores token in localStorage as 'laya_token'
4. Every subsequent API request: Axios interceptor adds Authorization: Bearer <token>
5. Backend routers extract user context via _extract_user_context(request) or get_current_user(request)
```

### JWT Token Payload

```json
{
  "sub": "user_uuid",       // user ID
  "email": "user@email.ie",
  "role": "customer",       // or "developer"
  "exp": 1740000000         // 24h expiration
}
```

### Role-Based Access

- **Customer**: Can only access their own member data (`member_id` from user record)
  - Enforced in `chat.py`: if `user_context.role == "customer"` and `body.member_id != linked_member_id` → 403
- **Developer**: Can access all members, claims queue, analytics
  - Enforced via `require_developer` dependency in `queue.py` endpoints

### User Record Schema

```python
{
    "id": "abc123",
    "email": "customer@laya.ie",
    "password_hash": "$2b$12$...",    # bcrypt — NEVER sent to frontend
    "first_name": "Demo",
    "last_name": "Customer",
    "role": "customer",               # "customer" or "developer"
    "member_id": "MEM-1002",          # linked member (customers only)
    "avatar_color": "#00A99D",
    "created_at": "2026-02-24T..."
}
```

---

## 7. AI Agent Pipeline — LangGraph

### Pipeline Flow (Complete)

```
User submits claim via POST /api/chat
           │
           ▼
    ┌─────────────┐
    │ Follow-up?  │──yes──► conversation.handle_follow_up() → LLM contextual response
    └──────┬──────┘
           │ no (new claim)
           ▼
    ┌─────────────┐
    │ setup_node  │ Load member from DB, parse message → extracted_doc
    └──────┬──────┘
           │ member not found? → decision_node (REJECTED)
           ▼
    ┌───────────────────────┐
    │ parallel_validation   │ asyncio.gather(intake_node, eligibility_node)
    │   ├── intake_node     │ → Form classification, compliance, signature check
    │   └── eligibility_node│ → Waiting period, deadline, threshold, duplicates
    └──────────┬────────────┘
               │ failure? → decision_node (REJECTED / ACTION REQUIRED)
               ▼
    ┌──────────────────┐
    │ principal_node   │ GPT-4o decides route: outpatient / hospital / exceptions
    └──────────┬───────┘
               │
        ┌──────┼──────┐
        ▼      ▼      ▼
  outpatient hospital exceptions
   (GP,Rx,    (in-pt,  (maternity,
    dental,    proc     solicitor,
    therapy,   codes)   fraud)
    scans)
        │      │      │
        └──────┼──────┘
               ▼
    ┌─────────────────┐
    │  decision_node  │ Aggregate → personalize → update DB → save session
    └─────────────────┘
               │
               ▼
          Return ClaimResponse to frontend
```

### Agent Trace Format

Each agent appends trace strings to `state["agent_trace"]`. Format:
```
"Agent Name → Action description"
```
Examples:
```
"Setup → Member MEM-1001 (Liam O'Connor) loaded"
"Setup → Inferred from message: GP & A&E (date: 2026-02-20, cost: EUR 60.00)"
"Parallel Validator → Running intake & eligibility checks concurrently..."
"Intake (Form Classifier) → Classified as: Money Smart Out-patient Claim Form"
"Eligibility (Waiting Period) → BLOCKED: Treatment within 12-week waiting period"
"Decision Agent → Final: REJECTED"
"Decision Agent → Customer claim: AI recommends REJECTED, setting status to PENDING for human review"
```

### Customer vs Developer Claim Processing

| Aspect | Customer | Developer |
|--------|----------|-----------|
| AI Decision | Computed normally | Computed normally |
| Final Status | Always set to **PENDING** | Uses AI decision directly |
| Usage Updates | **Deferred** — stored in `deferred_usage_updates` | Applied **immediately** |
| DB Update | Claim added with `ai_recommendation` field | Claim added with final decision |
| Developer Review | Required via `POST /api/queue/review` | Not needed |
| WebSocket Notification | Sent when developer reviews | N/A |

---

## 8. Frontend ↔ Backend Integration Map

### How the Frontend Calls the Backend

The frontend uses `services/api.js` which wraps Axios. All calls go through a Vite proxy (port 5173 → 8000).

| Frontend Action | API Function | Backend Endpoint | Router File |
|----------------|-------------|-----------------|-------------|
| Login | `auth.login()` | `POST /api/auth/login` | `routers/auth.py` |
| Register | `auth.register()` | `POST /api/auth/register` | `routers/auth.py` |
| Load members (sidebar) | `fetchMembers()` | `GET /api/members` | `routers/members.py` |
| Select member | `fetchMember(id)` | `GET /api/members/{id}` | `routers/members.py` |
| Send chat message | `sendChat(payload)` | `POST /api/chat` | `routers/chat.py` |
| Upload document | `uploadDocument(file)` | `POST /api/upload` | `routers/claims.py` |
| Preview file | `getFilePreviewUrl(docId)` | `GET /api/files/{id}` | `routers/claims.py` |
| Get chat history | `fetchChatHistory()` | `GET /api/chat/history` | `routers/chat.py` |
| Get session | `fetchChatSession(id)` | `GET /api/chat/session/{id}` | `routers/chat.py` |
| Get claims | `fetchClaims(id)` | `GET /api/claims/{id}` | `routers/claims.py` |
| Callback request | `submitCallbackRequest(payload)` | `POST /api/callback-request` | `routers/chat.py` |
| Member profile | `fetchMemberProfile(id)` | `GET /api/members/{id}/profile` | `routers/members.py` |
| Queue claims (dev) | `fetchClaimsQueue()` | `GET /api/queue/claims` | `routers/queue.py` |
| Analytics (dev) | `fetchAnalytics()` | `GET /api/queue/analytics` | `routers/queue.py` |
| AI analyze (dev) | `runAIAnalysis(payload)` | `POST /api/queue/ai-analyze` | `routers/queue.py` |
| Review claim (dev) | `submitClaimReview(payload)` | `POST /api/queue/review` | `routers/queue.py` |
| Members overview (dev) | `fetchMembersOverview()` | `GET /api/queue/members-overview` | `routers/queue.py` |
| Member docs (dev) | `fetchMemberDocuments(id)` | `GET /api/queue/member-documents/{id}` | `routers/queue.py` |
| All docs (dev) | `fetchAllDocuments()` | `GET /api/queue/all-documents` | `routers/queue.py` |
| Activities (dev) | `fetchActivities(id, limit)` | `GET /api/queue/activities` | `routers/queue.py` |

### Frontend Component → API Call Mapping

| Component | Hook | API Calls |
|-----------|------|-----------|
| `LoginPage.jsx` | `useAuth()` | `auth.login()`, `auth.register()` |
| `LeftSidebar.jsx` | `useMembers()` | `fetchMembers()`, `fetchMember()` |
| `ChatWindow.jsx` | `useChat()` | `sendChat()`, `uploadDocument()` |
| `ChatWindow.jsx` | — | `submitCallbackRequest()` (via CallbackRequestModal) |
| `AgentPanel.jsx` | — | Uses data from `useChat()` |
| `DashboardPage.jsx` | `useChat()`, `useMembers()` | Combines both hooks |
| `DevDashboardPage.jsx` | — | `fetchClaimsQueue()`, `fetchAnalytics()`, `runAIAnalysis()`, `submitClaimReview()` |
| `MemberProfilePage.jsx` | — | `fetchMemberProfile()` |

### WebSocket Connections

| Frontend Location | WebSocket URL | Purpose |
|-------------------|---------------|---------|
| `useChat.js` | `ws://localhost:8000/ws/chat` | Real-time agent trace during processing |
| `useChat.js` | `ws://localhost:8000/ws/claim-status/{member_id}` | Push claim status updates to customers |

---

## 9. Data Flow Diagrams

### Flow 1: Customer Submits a Claim via Chat

```
1. User types "I want to submit a claim for a GP visit, cost €60, on Feb 20th"
2. ChatWindow.jsx calls sendMessage() which calls sendChat() in useChat.js
3. API: POST /api/chat → { message, member_id, session_id }
4. chat.py:
   a. Validates message (length, sanitization)
   b. Extracts user_context from JWT token
   c. Enforces customer can only query their own member_id
   d. Calls process_claim() in graph.py
5. graph.py:
   a. Detects if follow-up → handle_follow_up() instead
   b. Creates initial ClaimState
   c. Runs LangGraph: setup → parallel_validation → principal → treatment → decision
6. decision_node:
   a. AI recommends APPROVED/REJECTED/etc.
   b. For customers: overrides to PENDING
   c. Stores deferred_usage_updates
   d. Adds claim to member.claims_history
   e. Saves to conversation session
   f. Persists to runtime_state.json
7. Response returned to frontend:
   { decision: "PENDING", reasoning: "✅ Claim Submitted Successfully...", agent_trace: [...], session_id }
8. Frontend:
   a. MessageBubble renders the AI response
   b. ClaimCard renders the decision badge
   c. AgentPanel shows the agent trace
   d. SmartSuggestions shows follow-up options
```

### Flow 2: Developer Reviews a Claim

```
1. DevDashboardPage loads claims queue: GET /api/queue/claims
2. Developer clicks a PENDING claim → ClaimReviewPanel opens
3. Developer clicks "Run AI Analysis": POST /api/queue/ai-analyze
4. queue.py runs the full AI pipeline and returns analysis with source citations
5. Developer reviews AI recommendation and makes final decision
6. Developer submits: POST /api/queue/review
   { claim_id, member_id, decision: "APPROVED", reviewer_notes, payout_amount }
7. queue.py:
   a. Updates claim status in database
   b. If APPROVED: applies deferred_usage_updates (increments usage counters)
   c. Calls notify_claim_update() → WebSocket push to customer portal
8. Customer's portal receives WebSocket message → claim status updates in real-time
```

### Flow 3: Document Upload and OCR

```
1. Customer clicks upload button in ChatWindow
2. File selected → handleFileSelect() → uploadDocument(file) in api.js
3. API: POST /api/upload (multipart/form-data)
4. claims.py:
   a. Reads file bytes
   b. If PDF: extracts text via _extract_text_from_pdf()
   c. Parses fields via _parse_claim_fields_from_text()
   d. Saves file to uploads/ directory as DOC-{timestamp}.{ext}
   e. Tracks upload in _uploaded_documents store
   f. Logs activity for developer monitoring
   g. Returns { extracted_data, file_url, doc_id }
5. Frontend stores extracted_data and shows PDF preview
6. When user sends message, extracted_document_data is included in the chat payload
```

### Flow 4: Customer Requests Callback

```
1. Customer clicks headphones icon in ChatWindow header (or "Talk to a person" suggestion)
2. CallbackRequestModal opens
3. Customer fills: issue category, description, urgency, contact method
4. Submit: POST /api/callback-request
5. chat.py:
   a. Validates auth
   b. Calls add_callback_request() in database.py
   c. Generates ticket ID: CB-{date}-{uuid6}
   d. Logs activity
   e. Returns { ticket_id, status: "received", message }
6. Modal shows success with ticket ID and expected response time
```

---

## 10. Feature Addition Guide

### How to Add a New API Endpoint

1. **Decide which router** to add it to:
   - Customer-facing → `routers/chat.py` or `routers/claims.py`
   - Developer-facing → `routers/queue.py`
   - Auth-related → `routers/auth.py`
   - Member data → `routers/members.py`

2. **Define Pydantic schemas** in `models/schemas.py`:
   ```python
   class MyNewRequest(BaseModel):
       field1: str
       field2: Optional[int] = None

   class MyNewResponse(BaseModel):
       result: str
       success: bool = True
   ```

3. **Add database functions** in `models/database.py` if data storage is needed:
   - Add a new global store (e.g., `_my_new_store: list[dict] = []`)
   - Add it to `_persist_state()` and `_load_persisted_state()`
   - Create CRUD functions

4. **Add the endpoint** in the router file:
   ```python
   @router.post("/my-endpoint", response_model=MyNewResponse)
   async def my_endpoint(body: MyNewRequest, request: Request):
       user_context = _extract_user_context(request)
       # ... logic ...
       return MyNewResponse(result="done")
   ```

5. **Add frontend API function** in `frontend/src/services/api.js`:
   ```javascript
   export async function myNewApiCall(payload) {
     const { data } = await api.post('/my-endpoint', payload);
     return data;
   }
   ```

6. **Track activity** (optional) via `add_activity()` in `database.py`

### How to Add a New AI Agent

1. **Create the parent agent** in `app/agents/parent_N_*.py`:
   - Define an async function matching the signature: `async def my_node(state: ClaimState) -> dict`
   - Return a dict with `agent_trace`, `decision`, `reasoning`, `payout_amount`, etc.

2. **Create child agent functions** in `app/agents/child_agents.py`:
   - Follow the existing pattern: build prompt → invoke LLM → return enhanced reasoning

3. **Create prompt templates** in `app/prompts/my_prompts.py`

4. **Register the node** in `app/agents/graph.py`:
   - Import the node function
   - `graph.add_node("my_node", my_node_func)`
   - Add edges and routing conditions

5. **Update routing** in `principal_agent.py` if the new agent needs to be routed to

### How to Add New Member Data Fields

1. **Update the member schema** in `models/schemas.py` (`Member` class)
2. **Add default values** in `_SQL_MEMBERS` list in `database.py`
3. **Update JSON data** in `data/json_users.json`
4. **No migration needed** — in-memory store auto-adapts

### How to Add a New Frontend Component

1. Create component in `frontend/src/components/MyComponent.jsx`
2. If it needs API data, add the API function in `frontend/src/services/api.js`
3. Import and use in the page component (`DashboardPage.jsx` or `DevDashboardPage.jsx`)
4. If it needs backend support, add the endpoint first (see above)

### Where to Add Specific Feature Types

| Feature Type | Backend Files | Frontend Files |
|-------------|--------------|----------------|
| New claim type | `agents/parent_3_outpatient.py` or new parent, `prompts/`, `tools/policy_tools.py` | `components/ClaimCard.jsx`, `utils/constants.js` |
| New policy rule | `tools/policy_tools.py`, `agents/parent_2_eligibility.py` | `components/AgentTrace.jsx` (display) |
| New dashboard widget | `routers/queue.py` (data endpoint) | `pages/DevDashboardPage.jsx` |
| New chat feature | `routers/chat.py`, `agents/conversation.py` | `components/ChatWindow.jsx`, `hooks/useChat.js` |
| New member field | `models/database.py`, `models/schemas.py` | `components/MemberInfo.jsx`, `components/AgentPanel.jsx` |
| New file type support | `routers/claims.py` (_extract_text, _parse_claim_fields) | `components/FileUpload.jsx`, `components/PdfPreview.jsx` |
| New notification | `main.py` (WebSocket), `models/database.py` | `hooks/useChat.js` (WebSocket handler) |
| New user role | `auth/users.py`, `routers/auth.py` | `hooks/useAuth.jsx`, `pages/LoginPage.jsx` |

---

## 11. Pydantic Schemas Reference

### File: `app/models/schemas.py`

| Schema | Purpose | Used By |
|--------|---------|---------|
| `ClaimHistoryItem` | Single claim record in member's history | `database.py`, `members.py` |
| `CurrentYearUsage` | Member's benefits usage counters | `database.py`, `members.py` |
| `Member` | Full member record | `database.py`, `members.py` |
| `MemberSummary` | Lightweight member for sidebar | `members.py` |
| `ExtractedDocumentData` | OCR/parsed claim document fields | `chat.py` (request body) |
| `ClaimRequest` | Incoming chat/claim request | `chat.py` |
| `AgentTraceEntry` | Single agent step | `chat.py` (response) |
| `ClaimResponse` | AI processing result | `chat.py` |
| `ChatMessage` | Single chat message | `conversation.py` |
| `CallbackRequestIn` | Customer callback request | `chat.py` |
| `CallbackRequestOut` | Callback response with ticket ID | `chat.py` |

### Queue-specific schemas (defined in `routers/queue.py`):

| Schema | Purpose |
|--------|---------|
| `ReviewRequest` | Developer's final decision: `{ claim_id, member_id, decision, reviewer_notes, payout_amount }` |
| `AIAnalyzeRequest` | Run AI on a claim: `{ member_id, message, treatment_type, treatment_date, practitioner_name, total_cost }` |

---

## 12. Environment Variables

### File: `backend/.env`

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENAI_API_KEY` | `""` | **Required** for LLM agents |
| `OPENAI_MODEL_PRINCIPAL` | `"gpt-4o"` | Model for routing agent |
| `OPENAI_MODEL_CHILD` | `"gpt-4o-mini"` | Model for child agents |
| `AZURE_OPENAI_ENDPOINT` | `""` | Set to enable Azure OpenAI |
| `AZURE_OPENAI_API_VERSION` | `"2024-10-21"` | Azure API version |
| `AZURE_DEPLOYMENT_PRINCIPAL` | `"gpt-4o"` | Azure deployment for principal |
| `AZURE_DEPLOYMENT_CHILD` | `"gpt-4o"` | Azure deployment for children |
| `APP_HOST` | `"0.0.0.0"` | Server bind address |
| `APP_PORT` | `8000` | Server port |
| `DEBUG` | `"true"` | Enable uvicorn reload |
| `USE_REAL_OCR` | `"false"` | Enable GPT-4V document OCR |
| `USE_LLM_CHILDREN` | `"true"` | Enable/disable LLM child agents |
| `LLM_TIMEOUT` | `30` | LLM API call timeout (seconds) |
| `RATE_LIMIT_CHAT` | `"30/minute"` | Chat endpoint rate limit |
| `MAX_MESSAGE_LENGTH` | `2000` | Max chat message characters |
| `JWT_SECRET` | `"laya-healthcare-secret-key-2026"` | JWT signing key |

---

## 13. WebSocket Endpoints

### `/ws/chat` — Agent Trace Streaming (chat.py)

**Direction:** Client → Server (claim request) → Server → Client (node updates)

**Client sends:**
```json
{
  "member_id": "MEM-1001",
  "message": "I want to submit a claim for a GP visit",
  "extracted_document_data": null,
  "session_id": "abc123",
  "user_context": { "user_id": "...", "name": "...", "role": "customer" }
}
```

**Server sends (multiple messages):**
```json
// 1. Status
{ "type": "status", "agent": "System", "message": "Processing claim..." }

// 2. Node updates (one per agent node completion)
{ "type": "node_update", "node": "setup_node", "agent": "Setup", "message": "Setup → Member loaded", "current_agent": "Setup" }
{ "type": "node_update", "node": "parallel_validation_node", "agent": "Intake", "message": "Intake → Compliance check passed", "current_agent": "Intake" }

// 3. Final result
{ "type": "result", "decision": "APPROVED", "reasoning": "...", "payout_amount": 20.0, "agent_trace": [...], "flags": [], "session_id": "abc123" }
```

### `/ws/claim-status/{member_id}` — Claim Status Push (main.py)

**Direction:** Server → Client only (push notifications)

**Server sends (when developer reviews a claim):**
```json
{
  "type": "claim_status_update",
  "claim_id": "CLM-20260224143000",
  "member_id": "MEM-1001",
  "new_status": "APPROVED",
  "details": {
    "reviewed_by": "Admin Developer",
    "reviewer_notes": "Claim looks valid",
    "payout_amount": 20.0
  },
  "timestamp": "2026-02-24T14:35:00Z"
}
```

---

## 14. Error Handling Patterns

### HTTP Error Codes Used

| Code | Where | Meaning |
|------|-------|---------|
| 400 | `chat.py` | Invalid message (empty, too long) |
| 401 | `chat.py`, `auth.py` | Missing/invalid/expired JWT token |
| 403 | `chat.py` | Customer trying to access another member's data |
| 403 | `queue.py` | Non-developer trying to access queue endpoints |
| 404 | `members.py`, `claims.py`, `queue.py` | Member or claim not found |
| 429 | `chat.py` | Rate limit exceeded (via SlowAPI) |
| 500 | All routers | Unexpected server error |

### Error Response Format

```json
{ "detail": "Error message here" }
```

### Best-effort Patterns

The codebase uses try/except with pass for non-critical operations:
- Activity logging (`add_activity`) — failure doesn't break claim processing
- WebSocket notifications (`notify_claim_update`) — failure is silent
- Chat history loading from backend — falls back to localStorage

---

## 15. Testing

### File: `test_all.py`

Integration test suite with 15 tests covering:
- Health check endpoint
- Member lookup
- Claim processing (various scenarios)
- Authentication (login/register)
- Rate limiting
- Input validation

### Run tests:
```bash
cd backend
python -m pytest test_all.py -v
```

### Manual testing:
- FastAPI auto-docs: `http://localhost:8000/docs` (Swagger UI)
- Health check: `GET http://localhost:8000/`

---

## Quick Reference: Adding a Feature Checklist

```
□ Define Pydantic schemas in models/schemas.py (if new request/response needed)
□ Add database store + CRUD in models/database.py (if data storage needed)
□ Update _persist_state() and _load_persisted_state() (if new store added)
□ Add API endpoint in the appropriate router file (routers/*.py)
□ Import new schemas/db functions in the router
□ Add frontend API function in frontend/src/services/api.js
□ Create/update React component
□ Wire into page component (DashboardPage or DevDashboardPage)
□ Add activity tracking via add_activity() (optional)
□ Test via /docs Swagger UI
```
