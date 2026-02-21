## Plan: Laya Healthcare AI Claims Chatbot — Full Implementation Blueprint

**TL;DR:** Build a 3-tier agentic claims processing chatbot for Laya Healthcare's Money Smart 20 Family Cash Plan. The system routes user requests through a Principal Agent → 5 Parent Agents → 15 Child Agents using LangGraph's state graph. FastAPI serves the AI backend with WebSocket streaming. React + Vite + Tailwind delivers a polished healthcare UI with chat, document upload, and real-time agent routing visualization. JSON in-memory data store with 20 synthetic users. Mock OCR by default, optional GPT-4V real OCR. OpenAI GPT-4o powers all agents.

---

### Phase 0: Project Scaffolding (Estimated: 1-2 hours)

**Step 1 — Create the monorepo folder structure**

Inside `c:\Users\sudee\OneDrive\Desktop\Laya\`, create:

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI entry point
│   ├── config.py                # Settings, API keys, env vars
│   ├── models/
│   │   ├── __init__.py
│   │   ├── schemas.py           # Pydantic models (ClaimRequest, ClaimResponse, etc.)
│   │   └── database.py          # JSON data loader + in-memory store
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── state.py             # LangGraph shared state definition
│   │   ├── graph.py             # Main LangGraph compiled graph
│   │   ├── principal_agent.py   # Router / orchestrator
│   │   ├── parent_1_intake.py   # Intake & Document Intelligence
│   │   ├── parent_2_eligibility.py  # Policy & Member Eligibility
│   │   ├── parent_3_outpatient.py   # Everyday Medical Processing
│   │   ├── parent_4_hospital.py     # Hospital & Complex Procedures
│   │   └── parent_5_exceptions.py   # Maternity, Fraud, Legal
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── db_tools.py          # LangChain tools: lookup_member, get_usage, get_claims
│   │   ├── policy_tools.py      # Tools: check_waiting_period, check_threshold, etc.
│   │   └── ocr_tools.py         # Mock OCR + optional GPT-4V OCR tool
│   ├── prompts/
│   │   ├── principal.py         # System prompt for Principal Agent
│   │   ├── intake.py            # System prompts for Parent 1 children
│   │   ├── eligibility.py       # System prompts for Parent 2 children
│   │   ├── outpatient.py        # System prompts for Parent 3 children
│   │   ├── hospital.py          # System prompts for Parent 4 children
│   │   └── exceptions.py        # System prompts for Parent 5 children
│   └── routers/
│       ├── __init__.py
│       ├── chat.py              # POST /chat, WebSocket /ws/chat
│       ├── members.py           # GET /members, GET /members/{id}
│       └── claims.py            # GET /claims/{member_id}
├── requirements.txt
├── .env                         # OPENAI_API_KEY
└── run.py                       # uvicorn launcher

frontend/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css                # Tailwind directives
│   ├── components/
│   │   ├── Layout.jsx           # Sidebar + main area shell
│   │   ├── Sidebar.jsx          # User selector, branding
│   │   ├── ChatWindow.jsx       # Message list + input
│   │   ├── MessageBubble.jsx    # Single chat message (user/AI)
│   │   ├── AgentTrace.jsx       # Shows agent routing visualization
│   │   ├── FileUpload.jsx       # Document upload component
│   │   ├── ClaimCard.jsx        # Formatted claim result card
│   │   ├── MemberInfo.jsx       # Selected member info panel
│   │   └── StatusBadge.jsx      # APPROVED / REJECTED / PENDING badge
│   ├── hooks/
│   │   ├── useChat.js           # Chat state + API calls
│   │   └── useMembers.js        # Member data fetching
│   ├── services/
│   │   └── api.js               # Axios/fetch wrapper
│   └── utils/
│       └── constants.js         # API URL, colors, etc.
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── index.html
```

**Step 2 — Initialize the backend**

- Create a Python virtual environment: `python -m venv venv`
- Install dependencies in `requirements.txt`:
  - `fastapi`, `uvicorn[standard]`, `python-dotenv`
  - `langchain`, `langchain-openai`, `langgraph`, `langchain-core`
  - `pydantic`, `python-multipart` (for file uploads)
  - `openai` (for optional GPT-4V OCR)
- Create `.env` with `OPENAI_API_KEY=sk-...`

**Step 3 — Initialize the frontend**

- Run `npm create vite@latest frontend -- --template react`
- Install: `npm install tailwindcss @tailwindcss/vite axios react-markdown lucide-react framer-motion`
- Configure Tailwind in `vite.config.js` by importing the `@tailwindcss/vite` plugin
- Set up `index.css` with `@import "tailwindcss"`

---

### Phase 1: Data Layer (Estimated: 1-2 hours)

**Step 4 — Build the JSON data loader** (`backend/app/models/database.py`)

- Load `data/json_users.json` at startup into a Python dict
- Also parse the equivalent SQL data from `data/sql_users.sql` inline (hardcoded as dicts for the 10 SQL users MEM-1001 → MEM-1010)
- Merge both sets into a single `members` list (20 users total)
- Expose functions: `get_all_members()`, `get_member_by_id(member_id)`, `get_claims_history(member_id)`, `update_usage(member_id, field, increment)`

**Step 5 — Define Pydantic schemas** (`backend/app/models/schemas.py`)

- `Member` model matching the JSON structure (member_id, first_name, last_name, scheme_name, policy_start_date, status, current_year_usage, claims_history)
- `ClaimRequest` — incoming chat request with `message: str`, `member_id: str`, `extracted_document_data: Optional[dict]`
- `ClaimResponse` — AI result with `decision: str` (APPROVED/REJECTED/PARTIAL/PENDING), `reasoning: str`, `agent_trace: list[str]`, `payout_amount: Optional[float]`
- `ChatMessage` — `role: str`, `content: str`, `metadata: Optional[dict]`

---

### Phase 2: AI Agent Layer — LangGraph (Estimated: 3-4 hours)

This is the core of the project. You'll implement the hierarchical agent architecture described in `docs/roles.md`.

**Step 6 — Define the shared LangGraph state** (`backend/app/agents/state.py`)

- Create a `TypedDict` called `ClaimState` with fields:
  - `messages: list` — conversation history
  - `member_id: str` — current user
  - `member_data: dict` — full member record from DB
  - `extracted_doc: dict` — OCR/mock document data
  - `current_agent: str` — tracking which agent is active (for UI trace)
  - `agent_trace: list[str]` — ordered list of agents visited
  - `decision: str` — final claim decision
  - `reasoning: str` — explanation
  - `payout_amount: float` — calculated payout
  - `flags: list[str]` — escalation flags (e.g., "LEGAL_REVIEW")
  - `needs_info: list[str]` — missing documents/info
  - `route: str` — routing decision from principal agent

**Step 7 — Build LangChain Tools** (`backend/app/tools/`)

These are the tools agents will call via function-calling:

In `db_tools.py`:
- `lookup_member(member_id: str)` → returns full member record from in-memory store
- `get_usage_stats(member_id: str)` → returns `current_year_usage` dict
- `get_claims_history(member_id: str)` → returns claims list
- `check_existing_claim(member_id, treatment_date, practitioner_name, claimed_amount)` → boolean duplicate check

In `policy_tools.py`:
- `check_waiting_period(policy_start_date: str, treatment_date: str)` → returns (is_within_waiting_period: bool, days_remaining: int)
- `check_submission_deadline(treatment_date: str)` → returns whether receipt is within 12 months
- `check_quarterly_threshold(current_accumulated: float, new_amount: float, threshold=150)` → returns (crosses_threshold: bool, new_total: float)
- `check_annual_limit(current_count: int, max_count: int)` → returns (limit_exceeded: bool, remaining: int)
- `calculate_hospital_payout(days_requested: int, days_used: int, max_days=40, rate=20)` → returns (approved_days, payout, rejected_days)
- `validate_therapy_type(therapy_name: str)` → checks against allowed list (Physiotherapy, reflexology, acupuncture, osteopathy, physical therapist, chiropractor)

In `ocr_tools.py`:
- `mock_ocr_extract(document_json: dict)` → passes through the pre-built mock JSON from `docs/input_output.md`
- `real_ocr_extract(image_base64: str)` → calls GPT-4V with a structured extraction prompt, returns the same schema as mock

**Step 8 — Write Agent System Prompts** (`backend/app/prompts/`)

Each file contains system prompt strings. Key prompts:

`principal.py`: The Principal Agent prompt — instructs GPT-4o to analyze the user message + document data + member record, then output a JSON routing decision choosing one of: `intake`, `eligibility`, `outpatient`, `hospital`, `exceptions`. Include the full policy rules context from the Money Smart 20 Family plan.

`eligibility.py`: Child prompts for:
- **Waiting Period Enforcer** — "Check if treatment_date is within 12 weeks of policy_start_date"
- **Time Limit Enforcer** — "Check if treatment_date is within 12 months of today"
- **Quarterly Threshold Calculator** — "Sum accumulated receipts + new claim, compare to €150"

`outpatient.py`: Child prompts for:
- **GP & Consultant Processor** — "Check visit counts against 10/year limit, cap payout at €20"
- **Pharmacy & Therapy Processor** — "Check prescription count (max 4), validate therapy type"
- **Dental/Optical/Scan Processor** — "Check counts against 10/year limit"

`hospital.py`: Child prompts for hospital stays, procedure codes, Emergency/MRI

`exceptions.py`: Child prompts for maternity (€200 flat), duplicate/fraud detection, third-party escalation

**Step 9 — Build the LangGraph State Graph** (`backend/app/agents/graph.py`)

This is the most critical file. Build the graph using LangGraph's `StateGraph`:

1. **Define nodes:**
   - `principal_node` — calls GPT-4o with principal prompt + tools, outputs routing decision
   - `intake_node` — form classification + OCR extraction (mock or real)
   - `eligibility_node` — runs waiting period, time limit, and threshold checks in sequence
   - `outpatient_node` — routes to GP/Consultant, Pharmacy/Therapy, or Dental/Optical/Scan child logic
   - `hospital_node` — handles in-patient calculations, procedure code validation
   - `exceptions_node` — handles maternity, fraud, third-party
   - `decision_node` — final aggregation: formats the decision, reasoning, and payout

2. **Define edges (conditional routing):**
   - `START` → `intake_node` (always start with document processing)
   - `intake_node` → `principal_node` (after extracting data, let principal decide route)
   - `principal_node` → conditional edge based on `state["route"]`:
     - `"eligibility"` → `eligibility_node`
     - `"outpatient"` → `outpatient_node`
     - `"hospital"` → `hospital_node`
     - `"exceptions"` → `exceptions_node`
   - `eligibility_node` → conditional: if eligible, proceed to the treatment-specific parent; if not, go to `decision_node` with REJECTED
   - `outpatient_node` / `hospital_node` / `exceptions_node` → `decision_node`
   - `decision_node` → `END`

3. **Compile the graph:**
   - `app = graph.compile()` — produces the runnable agent

**Step 10 — Implement each node function**

Each node is a Python function `(state: ClaimState) -> ClaimState`:

- **`intake_node`**: Checks if `extracted_doc` exists in state. If not and a file was uploaded, call `mock_ocr_extract` or `real_ocr_extract`. Updates `state["extracted_doc"]` and `state["member_data"]` by looking up the member. Appends "Intake Agent" to `agent_trace`.

- **`principal_node`**: Constructs prompts with member data + document data. Calls GPT-4o. Parses the routing decision. Updates `state["route"]`. Appends "Principal Agent → routing to {parent}" to trace.

- **`eligibility_node`**: Runs the 3 eligibility checks sequentially using the policy tools. If any check fails, sets `decision = "REJECTED"` with the specific reason. If all pass, lets the flow continue. Appends trace entries for each check.

- **`outpatient_node`**: Based on `treatment_type` in the document, delegates to the correct child logic (GP, prescription, therapy, dental, scan). Calls the appropriate `check_annual_limit` tool. Calculates payout (capped at €20). Appends trace.

- **`hospital_node`**: Calculates hospital day payout using `calculate_hospital_payout`. Handles procedure code validation logic. Appends trace.

- **`exceptions_node`**: Checks for duplicates via `check_existing_claim`. Handles maternity flat rate. Flags third-party claims. Appends trace.

- **`decision_node`**: Aggregates all state into a final `ClaimResponse`. Formats reasoning as a human-readable explanation.

---

### Phase 3: FastAPI Backend (Estimated: 2-3 hours)

**Step 11 — Create the main FastAPI app** (`backend/app/main.py`)

- Initialize FastAPI with CORS middleware (allow `localhost:5173` for Vite dev server)
- Load JSON data at startup via a lifespan event
- Include routers from `chat.py`, `members.py`, `claims.py`

**Step 12 — Chat endpoint** (`backend/app/routers/chat.py`)

- `POST /api/chat` — accepts `ClaimRequest` body. Runs the LangGraph compiled graph with the input state. Returns `ClaimResponse` with decision, reasoning, agent_trace, payout.
- `WebSocket /ws/chat` — for streaming: as each node in the graph executes, stream the `agent_trace` updates to the frontend in real-time so the UI can show "Principal Agent thinking..." → "Routing to Eligibility..." → "Checking waiting period..." etc.

**Step 13 — Members endpoints** (`backend/app/routers/members.py`)

- `GET /api/members` — returns list of all 20 members (id, name, scheme, status) for the sidebar user selector
- `GET /api/members/{member_id}` — returns full member record with usage stats

**Step 14 — Claims endpoints** (`backend/app/routers/claims.py`)

- `GET /api/claims/{member_id}` — returns claims_history for a member
- `POST /api/upload` — accepts file upload, processes via mock/real OCR, returns extracted JSON

---

### Phase 4: React Frontend (Estimated: 4-5 hours)

**Step 15 — App shell & layout** (`Layout.jsx`, `App.jsx`)

- Full-height layout with left sidebar (280px) + main chat area
- Laya Healthcare branding: use Laya's brand colors — primary teal `#00A99D`, dark navy `#1A2B4A`, white backgrounds
- Top header bar with Laya logo text "laya healthcare" in lowercase + "AI Claims Assistant" subtitle
- Responsive design with mobile sidebar toggle

**Step 16 — Sidebar component** (`Sidebar.jsx`)

- **Member Selector dropdown/list** — shows all 20 test users fetched from `GET /api/members`
- Each user card shows: name, member_id, and a colored tag indicating their test scenario (e.g., "Waiting Period", "Duplicate", etc.) pulled from `_scenario_note`
- Clicking a user sets them as active — their data appears in `MemberInfo.jsx`
- Bottom of sidebar: link to the Laya Healthcare logo/branding

**Step 17 — Member Info panel** (`MemberInfo.jsx`)

- Displays selected member's details in a clean card:
  - Name, Member ID, Scheme Name, Policy Start Date, Status
  - Usage stats as progress bars (e.g., "GP Visits: 8/10", "Scans: 10/10 MAXED")
  - Claims history as a mini table
- Color-code limits: green (< 70%), amber (70-99%), red (100% / maxed)

**Step 18 — Chat window** (`ChatWindow.jsx`, `MessageBubble.jsx`)

- Scrollable message area with auto-scroll to bottom
- User messages: right-aligned, teal background, white text
- AI messages: left-aligned, white/light gray card with navy text
- AI messages include:
  - The reasoning text (formatted with markdown via `react-markdown`)
  - A `ClaimCard` component embedded showing the decision
- Input area at bottom: text input + send button + file upload button
- Typing indicator when AI is processing

**Step 19 — Claim result card** (`ClaimCard.jsx`, `StatusBadge.jsx`)

- Visually rich card showing:
  - `StatusBadge`: APPROVED (green), REJECTED (red), PARTIALLY APPROVED (amber), PENDING (blue), ACTION REQUIRED (orange)
  - Payout amount (if approved): large bold text "€20.00"
  - Reasoning broken into bullet points
  - Collapsible "Agent Trace" section showing the routing path

**Step 20 — Agent trace visualization** (`AgentTrace.jsx`)

- A horizontal stepper / flow visualization showing the agent routing path:
  - e.g., `User → Principal Agent → Eligibility Agent → Waiting Period Check → REJECTED`
- Each step is a pill/node with connecting arrows
- Active step pulses/glows during processing
- Completed steps get checkmarks (green) or X marks (red)
- Use `framer-motion` for smooth animations

**Step 21 — File upload component** (`FileUpload.jsx`)

- Drag & drop zone or click-to-upload
- Accepts PDF/images
- For demo: also has a "Use Demo Document" dropdown that injects the mock OCR JSON from `docs/input_output.md` for each test case
- Shows extracted data preview before sending

**Step 22 — Chat hook** (`useChat.js`)

- Manages conversation state: `messages[]`, `isLoading`, `activeAgent`
- `sendMessage(text, memberId, documentData)` — POSTs to `/api/chat`, appends user message, then appends AI response
- Optional WebSocket connection for real-time agent trace streaming
- Error handling with retry

**Step 23 — API service** (`services/api.js`)

- Axios instance with base URL `http://localhost:8000/api`
- Functions: `fetchMembers()`, `fetchMember(id)`, `sendChat(payload)`, `uploadDocument(file)`

---

### Phase 5: Polish & Demo Readiness (Estimated: 2-3 hours)

**Step 24 — UI polish & healthcare theming**

- Custom Tailwind theme extending with Laya colors:
  - `laya-teal: #00A99D`, `laya-navy: #1A2B4A`, `laya-light: #F0F9F8`, `laya-coral: #E85D4A` (for rejections)
- Glassmorphism effect on the chat cards (subtle frosted glass)
- Smooth transitions on message appearance (fade-in from bottom)
- Loading skeleton states for member data
- Dark mode toggle (optional stretch goal)

**Step 25 — Pre-configured demo scenarios**

- Add a "Demo Scenarios" panel (collapsible, top of sidebar or floating button)
- 4 quick-launch buttons matching the test cases from `docs/input_output.md`:
  1. "Waiting Period Test (Liam)" — auto-selects MEM-1001, injects mock OCR, sends message
  2. "Threshold Test (Siobhan)" — auto-selects MEM-1002
  3. "Limit Test (Declan)" — auto-selects MEM-1003
  4. "Duplicate Test (Conor)" — auto-selects MEM-1005
- Clicking a button runs the full flow automatically — great for live demo

**Step 26 — Error handling & edge cases in backend**

- Graceful handling when member_id not found
- Timeout handling for OpenAI API calls (set 30s timeout)
- Fallback response if LLM returns unexpected format
- Input validation on all endpoints
- Rate limiting awareness (log token usage per request)

**Step 27 — Agent trace logging**

- Each agent node logs its name, input state summary, and output decision to the `agent_trace` list
- Backend returns this trace with every response
- Useful for judges to see the "brain" of the system in real-time

---

### Phase 6: Testing & Demo Prep (Estimated: 1-2 hours)

**Step 28 — Run through all 4 core demo test cases**

Test with the exact inputs from `docs/input_output.md`:
1. Liam O'Connor (MEM-1001) — expect REJECTED (waiting period)
2. Siobhan Kelly (MEM-1002) — expect APPROVED (threshold crossed)
3. Declan Murphy (MEM-1003) — expect REJECTED (10/10 scans)
4. Conor Walsh (MEM-1005) — expect REJECTED (duplicate)

**Step 29 — Run through extended scenarios**

Test at least 4-6 more from the 15 scenarios in `docs/scenariors.md`:
- Mixed batch claim (MEM-2001)
- Invalid therapy (MEM-1007 / Patrick Doyle)
- Maternity (MEM-1008 / Niamh Brennan)
- Hospital partial (MEM-1004 / MEM-2005)

**Step 30 — Prepare the pitch narrative**

Structure the demo as:
1. **Problem statement** (30s): "Laya's claims teams manually check each claim against policy docs — slow, error-prone, hard to audit"
2. **Solution** (30s): "AI-powered agentic system that reads documents, cross-references policy rules and member records, and returns auditable decisions in seconds"
3. **Architecture** (1min): Show the agent flow diagram from `docs/archicture.md`
4. **Live demo** (3-4min): Run 3-4 test cases, show agent trace, show different edge cases being handled
5. **Impact** (30s): "Reduces processing time from ~15 min/claim to seconds. Full audit trail. Scalable horizontally."

---

### Verification

- **Backend**: Run `uvicorn app.main:app --reload` from `backend/`, hit `http://localhost:8000/docs` to verify all endpoints via Swagger
- **Frontend**: Run `npm run dev` from `frontend/`, verify chat sends/receives, member selector works, agent trace renders
- **Integration**: Select a member in the sidebar, send a demo message, verify the full pipeline: UI → FastAPI → LangGraph → GPT-4o → tools → response → UI card with decision
- **Edge cases**: Test all 4 demo scenarios from `docs/input_output.md` produce correct decisions
- **Performance**: Ensure end-to-end latency < 10 seconds per claim

### Decisions

- **JSON in-memory over SQL** — fastest for hackathon, no DB setup; merging both SQL+JSON user sets gives you 20 test users
- **LangGraph over plain LangChain agents** — state graph gives explicit routing control, visualizable flow, and deterministic behavior judges can follow
- **GPT-4o-mini for child agents, GPT-4o for principal** — save cost/latency on simple rule checks (children), use the stronger model for routing decisions (principal)
- **Mock OCR as default** — guarantees consistent demo; real GPT-4V OCR as optional "wow factor" if asked by judges
- **WebSocket for agent trace** — real-time visualization of agent routing is the single most impressive thing you can show judges; worth the extra implementation effort
