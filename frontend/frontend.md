# Laya Healthcare AI — Frontend Documentation

> **Comprehensive reference for AI agents and developers.**
> Covers every file, component, hook, page, service, utility, data flow, and styling convention.
> Use this alongside `backend/backend_docs.md` and the database layer for full-stack understanding.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Directory Structure](#3-directory-structure)
4. [Build & Dev Configuration](#4-build--dev-configuration)
5. [Entry Points & Routing](#5-entry-points--routing)
6. [State Management Architecture](#6-state-management-architecture)
7. [Services — API & Auth](#7-services--api--auth)
8. [Hooks — Custom React Hooks](#8-hooks--custom-react-hooks)
9. [Pages — Full Page Components](#9-pages--full-page-components)
10. [Components — UI Building Blocks](#10-components--ui-building-blocks)
11. [Utilities & Constants](#11-utilities--constants)
12. [Styling System](#12-styling-system)
13. [Frontend ↔ Backend API Map](#13-frontend--backend-api-map)
14. [WebSocket Connections](#14-websocket-connections)
15. [Data Flow Diagrams](#15-data-flow-diagrams)
16. [Component Hierarchy Tree](#16-component-hierarchy-tree)
17. [Feature Addition Guide](#17-feature-addition-guide)
18. [Key Patterns & Conventions](#18-key-patterns--conventions)

---

## 1. System Overview

Laya Healthcare AI is a **health insurance claims processing platform** with an AI-powered multi-agent pipeline. The frontend is a **React 19 SPA** that provides:

- **Customer Dashboard** — Chat-based claim submission with real-time AI agent tracing, document upload, and claim status tracking
- **Developer Dashboard** — Operational view with claims queue, AI-assisted human review, member analytics, documents, and activity log
- **Member Profile** — Deep analytics per member with Recharts visualizations, AI risk scoring, and claim review

### Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        React 19 SPA                             │
│  ┌──────────┐  ┌──────────────────┐  ┌────────────────────┐    │
│  │LeftSidebar│  │   ChatWindow     │  │   AgentPanel       │    │
│  │(290px)    │  │   (flex-grow)    │  │   (380px/collapse) │    │
│  │           │  │                  │  │                    │    │
│  │• Sessions │  │• Messages        │  │• 5-stage pipeline  │    │
│  │• Member   │  │• Smart Suggest   │  │• Decision card     │    │
│  │• Profile  │  │• File Upload     │  │• Member usage bars │    │
│  └──────────┘  └──────────────────┘  └────────────────────┘    │
│                                                                 │
│  State: AuthContext + useChat + useMembers + useKeyboardShortcuts│
│  Comm:  Axios REST + WebSocket (agent trace + claim status)     │
└─────────────────────────────────────────────────────────────────┘
         │                                    ▲
         │ HTTP REST (/api/*)                 │ WebSocket (/api/ws/*)
         ▼                                    │
┌─────────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (port 8000)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack & Dependencies

### Core

| Package | Version | Purpose |
|---|---|---|
| `react` | 19.x | UI framework |
| `react-dom` | 19.x | DOM renderer |
| `react-router-dom` | ^6 | Client-side routing |
| `vite` | 6.x | Build tool & dev server |
| `@tailwindcss/vite` | ^4 | Tailwind CSS v4 Vite plugin |
| `tailwindcss` | ^4 | Utility-first CSS (uses `@theme` directive, no config file) |

### UI & Animation

| Package | Purpose |
|---|---|
| `framer-motion` | Page transitions, element animations, AnimatePresence |
| `lucide-react` | Icon library (Shield, Brain, FileText, etc.) |
| `sonner` | Toast notifications (`<Toaster>` in App.jsx) |
| `react-markdown` | Render AI responses as Markdown in message bubbles |
| `recharts` | Charts in MemberProfilePage (Bar, Pie, Area, RadialBar) |

### HTTP & State

| Package | Purpose |
|---|---|
| `axios` | HTTP client with interceptors for JWT auth |
| React Context | `AuthContext` for user/auth state |
| Custom Hooks | `useChat`, `useMembers`, `useKeyboardShortcuts` |
| `localStorage` | Chat session persistence, auth token/user storage |

### Scripts (package.json)

```json
{
  "dev": "vite",           // Start dev server on port 5173
  "build": "vite build",   // Production build
  "preview": "vite preview" // Preview production build
}
```

---

## 3. Directory Structure

```
frontend/
├── index.html              # HTML entry, loads Inter font
├── package.json            # Dependencies & scripts
├── vite.config.js          # Vite config: proxy, Tailwind plugin
└── src/
    ├── main.jsx            # ReactDOM.createRoot, StrictMode
    ├── App.jsx             # Router, AuthProvider, Toaster, Routes
    ├── index.css           # Tailwind @theme + all custom CSS (890 lines)
    ├── components/
    │   ├── AgentPanel.jsx        # Right panel: pipeline + decision + usage
    │   ├── AgentTrace.jsx        # Expandable agent routing timeline
    │   ├── AnalyticsCards.jsx     # Dev dashboard KPI stat cards
    │   ├── ArchitectureView.jsx  # Live agent flow diagram (591 lines)
    │   ├── ChatWindow.jsx        # Center panel: messages + input + upload
    │   ├── ClaimCard.jsx         # Claim result card with animated payout
    │   ├── ClaimReviewPanel.jsx  # AI-assisted human review panel
    │   ├── ClaimsQueue.jsx       # Dev claims queue with filters
    │   ├── CallbackRequestModal.jsx # Customer callback request modal
    │   ├── FileUpload.jsx        # Drag-drop + demo scenario selector
    │   ├── Layout.jsx            # 3-panel wrapper (9 lines)
    │   ├── LeftSidebar.jsx       # Blue sidebar: sessions, member, profile
    │   ├── MemberInfo.jsx        # Member details + usage bars
    │   ├── MembersOverview.jsx   # Risk monitor widget
    │   ├── MessageBubble.jsx     # User/AI message rendering
    │   ├── PdfPreview.jsx        # PDF/image preview (compact + full + modal)
    │   ├── SmartSuggestions.jsx   # Context-aware suggestion chips
    │   ├── StatusBadge.jsx       # APPROVED/REJECTED/PENDING badge
    │   └── WelcomeScreen.jsx     # Empty state with 6 capability cards
    ├── hooks/
    │   ├── useAuth.jsx           # AuthContext provider + login/register/logout
    │   ├── useChat.js            # Chat state, WebSocket, sessions (799 lines)
    │   ├── useKeyboardShortcuts.js # Ctrl+K, Ctrl+/, Ctrl+U, Escape
    │   └── useMembers.js         # Members list + selection
    ├── pages/
    │   ├── LoginPage.jsx         # Animated login with quick-login buttons
    │   ├── RegisterPage.jsx      # Registration with role selection
    │   ├── DashboardPage.jsx     # Customer main page (wires all hooks)
    │   ├── DevDashboardPage.jsx  # Developer operational dashboard
    │   └── MemberProfilePage.jsx # Deep member analytics (997 lines)
    ├── services/
    │   ├── api.js                # Axios instance + 18 API functions
    │   └── auth.js               # Token/user storage + login/register/fetchMe
    └── utils/
        └── constants.js          # API URLs, colors, decision styles, demo scenarios
```

---

## 4. Build & Dev Configuration

### vite.config.js

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,  // WebSocket proxy enabled
      },
    },
  },
});
```

**Key points:**
- All `/api/*` requests are proxied to backend at `localhost:8000`
- WebSocket connections (`/api/ws/*`) are also proxied
- Tailwind CSS v4 uses `@theme` directive in `index.css` (no `tailwind.config.js`)
- Dev server runs on port 5173

### index.html

- Loads **Inter** font from Google Fonts (weights: 300-800)
- Entry script: `src/main.jsx`
- Title: "Laya AI — Claims Intelligence"

---

## 5. Entry Points & Routing

### main.jsx

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
```

### App.jsx — Routes & Providers

**Providers (outermost → innermost):**
1. `BrowserRouter` — React Router
2. `AuthProvider` — User auth context
3. `Toaster` — Sonner toast notifications (top-right, richColors)

**Route Table:**

| Path | Component | Guard | Description |
|---|---|---|---|
| `/` | Redirect | — | → `/login` or appropriate dashboard |
| `/login` | `LoginPage` | PublicRoute | Redirects if authenticated |
| `/register` | `RegisterPage` | PublicRoute | Redirects if authenticated |
| `/dashboard` | `DashboardPage` | ProtectedRoute | Customer chat interface |
| `/dev-dashboard` | `DevDashboardPage` | ProtectedRoute | Developer operational view |
| `/dev-dashboard/member/:memberId` | `MemberProfilePage` | ProtectedRoute | Deep member analytics |

**Route Guards:**
- `ProtectedRoute`: Redirects to `/login` if `!isAuthenticated`. Shows loading spinner while auth is checking.
- `PublicRoute`: Redirects authenticated users to `/dashboard` (customers) or `/dev-dashboard` (developers).

---

## 6. State Management Architecture

The app uses **React Context + Custom Hooks** (no Redux/Zustand).

### State Flow

```
AuthProvider (Context)
  ├── user, isAuthenticated, isDeveloper, isCustomer
  ├── login(email, password) → storeAuth → fetchMe
  ├── register(formData) → storeAuth
  └── logout() → clearAuth → navigate('/login')

useChat (Hook — per DashboardPage instance)
  ├── chatSessions[], activeChatId, messages[]
  ├── isLoading, activeAgent, lastResult, liveTrace
  ├── sendMessage(text, documentData, memberId, fileInfo)
  ├── newChat(), selectChat(id), deleteChat(id), clearChat()
  ├── connectClaimStatusWs(userId) — real-time status push
  └── refreshClaimStatuses(chatSessions) — login-time sync

useMembers (Hook — per DashboardPage instance)
  ├── members[], selectedMember, loading
  ├── selectMember(member)
  └── refreshMember(memberId)

useKeyboardShortcuts (Hook)
  ├── Ctrl+K → newChat
  ├── Ctrl+/ → togglePanel
  ├── Ctrl+U → triggerUpload
  └── Escape → close actions
```

### Persistence

| Data | Storage | Sync |
|---|---|---|
| Auth token | `localStorage['laya_token']` | Set on login/register, cleared on logout/401 |
| User object | `localStorage['laya_user']` | Updated on login/register |
| Chat sessions | `localStorage['laya_chat_sessions_{userId}']` | Written on every session change |
| Active chat ID | `localStorage['laya_active_chat_{userId}']` | Written on chat switch |
| Server history | Backend `GET /api/chat/history` | Merged on mount + every 30s |

---

## 7. Services — API & Auth

### services/api.js

**Axios Instance Configuration:**
- `baseURL: '/api'` (proxied to backend)
- `timeout: 60000` (60 seconds — AI pipeline can be slow)
- **Request interceptor**: Auto-attaches `Authorization: Bearer <token>` header
- **Response interceptor**: On 401, calls `clearAuth()` and redirects to `/login`

**All 18 Exported API Functions:**

| Function | Method | Endpoint | Used By | Description |
|---|---|---|---|---|
| `fetchMembers()` | GET | `/members/` | useMembers, DevDashboardPage | List all members |
| `fetchMember(id)` | GET | `/members/{id}` | useMembers.refreshMember | Single member detail |
| `sendChat(payload)` | POST | `/chat/` | useChat (HTTP fallback) | Send chat message |
| `fetchClaims(memberId)` | GET | `/claims/?member_id=` | DevDashboardPage | Member's claims |
| `fetchChatHistory()` | GET | `/chat/history` | useChat | All user's chat sessions |
| `fetchChatSession(id)` | GET | `/chat/history/{id}` | useChat | Single session messages |
| `uploadDocument(file)` | POST | `/chat/upload` | FileUpload, ChatWindow | OCR document upload |
| `fetchClaimsQueue()` | GET | `/queue/claims` | DevDashboardPage | All claims for dev review |
| `fetchAnalytics()` | GET | `/queue/analytics` | DevDashboardPage | Dashboard KPI stats |
| `runAIAnalysis(claimId)` | POST | `/queue/claims/{id}/analyze` | ClaimReviewPanel | Run AI on specific claim |
| `submitClaimReview(data)` | POST | `/queue/claims/review` | ClaimReviewPanel | Submit human decision |
| `fetchMembersOverview()` | GET | `/members/overview` | DevDashboardPage | Risk scores overview |
| `fetchMemberProfile(id)` | GET | `/members/{id}/profile` | MemberProfilePage | Full member analytics |
| `fetchMemberDocuments(id)` | GET | `/members/{id}/documents` | MemberProfilePage | Member's uploaded docs |
| `fetchAllDocuments()` | GET | `/members/documents/all` | DevDashboardPage | All documents |
| `fetchActivities()` | GET | `/queue/activities` | DevDashboardPage | Activity log entries |
| `getFilePreviewUrl(docId)` | — | `/members/documents/{id}/file` | PdfPreview | Builds file URL string |
| `submitCallbackRequest(data)` | POST | `/chat/callback` | CallbackRequestModal | Customer callback request |

### services/auth.js

**Storage Keys:**
- `TOKEN_KEY = 'laya_token'`
- `USER_KEY = 'laya_user'`

**Functions:**

| Function | Description |
|---|---|
| `getToken()` | Read token from localStorage |
| `getStoredUser()` | Read user JSON from localStorage |
| `storeAuth(token, user)` | Save both to localStorage |
| `clearAuth()` | Remove both from localStorage |
| `loginUser(email, password)` | POST `/api/auth/login` with form data |
| `registerUser(formData)` | POST `/api/auth/register` with JSON |
| `fetchMe()` | GET `/api/auth/me` — validate token, get user |

---

## 8. Hooks — Custom React Hooks

### useAuth.jsx (75 lines)

**File:** `src/hooks/useAuth.jsx`

Creates `AuthContext` with `AuthProvider` wrapper component.

**State:**
- `user` — Current user object or null
- `loading` — True while validating token on mount

**Exposed via context:**
- `user`, `loading`
- `login(email, password)` — Calls `loginUser`, stores auth, fetchMe
- `register(formData)` — Calls `registerUser`, stores auth
- `logout()` — Clears auth, navigates to `/login`
- `isAuthenticated` — Boolean: `!!user`
- `isDeveloper` — Boolean: `user?.role === 'developer'`
- `isCustomer` — Boolean: `user?.role === 'customer'`

**Mount behavior:** Checks for existing token → calls `fetchMe()` → sets user or clears auth.

---

### useChat.js (799 lines)

**File:** `src/hooks/useChat.js` — The largest and most complex hook.

**State:**
```
chatSessions[]         — Array of { id, title, messages[], created_at }
activeChatId           — Currently selected chat session ID
messages[]             — Messages for the active chat
isLoading              — True while AI is processing
activeAgent            — Name of currently active agent (shown in typing indicator)
lastResult             — Last AI decision result object
liveTrace[]            — Real-time agent trace entries from WebSocket
```

**Key Methods:**

| Method | Description |
|---|---|
| `sendMessage(text, documentData, memberId, fileInfo)` | Sends message via WebSocket (primary) or HTTP POST (fallback). Includes session_id for multi-turn. Streams agent_trace in real-time. |
| `newChat()` | Creates new chat session, generates UUID |
| `selectChat(id)` | Switches active chat, loads messages |
| `deleteChat(id)` | Removes chat session from state + localStorage |
| `clearChat()` | Clears messages in active chat |
| `connectClaimStatusWs(userId)` | Opens WebSocket at `/api/ws/claim-status/{userId}` for real-time developer review pushes |
| `refreshClaimStatuses(sessions)` | On login, scans all PENDING claims and fetches latest status from backend |

**WebSocket Flow (sendMessage):**

```
1. Opens WebSocket: ws://localhost:8000/api/ws/chat
2. Sends JSON: { message, member_id, document_data, file_info, session_id }
3. Receives streaming chunks:
   - { type: "agent_trace", content: "..." }     → liveTrace[], activeAgent
   - { type: "chunk", content: "..." }           → Appended to AI message
   - { type: "result", decision, payout, ... }   → lastResult, ClaimCard data
   - { type: "done" }                            → isLoading=false, cleanup
4. On WebSocket error → falls back to HTTP POST /api/chat/
```

**Claim Status WebSocket:**
- Connects to `ws://host/api/ws/claim-status/{userId}`
- Receives: `{ type: "claim_update", claim_id, status, reviewer_notes, payout_amount }`
- Finds matching PENDING message in chat sessions → updates its `lastResult` with statusUpdated=true
- Triggers toast notification via Sonner

**localStorage persistence:**
- Scoped per user: `laya_chat_sessions_{userId}`, `laya_active_chat_{userId}`
- Sessions saved after every mutation
- On mount: loads from localStorage, then merges with backend history (fetchChatHistory)
- Backend merge: deduplicates by session ID, adds server-only sessions

---

### useKeyboardShortcuts.js (44 lines)

**File:** `src/hooks/useKeyboardShortcuts.js`

| Shortcut | Action | Callback Param |
|---|---|---|
| `Ctrl+K` | New chat | `onNewChat` |
| `Ctrl+/` | Toggle agent panel | `onTogglePanel` |
| `Ctrl+U` | Open file upload | `onUpload` |
| `Escape` | Close/cancel | `onEscape` |

Attaches `keydown` listener on mount, removes on unmount. Prevents default browser behavior for bound shortcuts.

---

### useMembers.js (79 lines)

**File:** `src/hooks/useMembers.js`

**State:**
- `members[]` — All members from backend
- `selectedMember` — Currently selected member object
- `loading` — Fetch loading state

**Methods:**
- `selectMember(member)` — Sets selectedMember
- `refreshMember(memberId)` — Re-fetches single member, updates in members[] and selectedMember

**Mount behavior:** Calls `fetchMembers()` on mount, populates list.

---

## 9. Pages — Full Page Components

### LoginPage.jsx (333 lines)

**Route:** `/login`

**Features:**
- Animated particle background with floating gradient orbs
- Split layout: Left branding panel + Right login card
- **Quick-login buttons** for demo:
  - Developer: `admin@laya.ie` / `admin123`
  - Customer: `customer@laya.ie` / `customer123`
  - Test: `test@laya.ie` / `test123`
- Manual email/password form
- Error display with AnimatePresence
- Redirects to `/dashboard` on successful login

**Data flow:** `handleLogin()` → `useAuth.login(email, password)` → triggers redirect per role.

---

### RegisterPage.jsx (~280 lines)

**Route:** `/register`

**Features:**
- Role selector cards: Customer (Stethoscope icon) or Developer (Code2 icon)
- Form fields: first_name, last_name, email, password
- Conditional `member_id` field (only for customers) — links to insurance member
- Password show/hide toggle
- Minimum 6-character password validation
- Link back to login

**Data flow:** `handleSubmit()` → `useAuth.register(form)` → redirect to `/dashboard`.

---

### DashboardPage.jsx (240 lines)

**Route:** `/dashboard` — The main customer experience page.

**Hooks used:**
- `useAuth()` — user, isDeveloper
- `useMembers()` — members, selectedMember, selectMember, refreshMember
- `useChat()` — all chat state and methods
- `useKeyboardShortcuts()` — keyboard shortcuts

**Key behaviors:**
1. **Auto-select member for customers:** If `user.member_id` exists, finds and selects matching member on mount
2. **Claim status WebSocket:** Calls `connectClaimStatusWs(user.id)` to receive real-time review pushes
3. **Login status refresh:** On mount, calls `refreshClaimStatuses(chatSessions)` to sync any PENDING→resolved claims that happened while user was offline
4. **Member data refresh:** When a PENDING claim gets resolved, refreshes the selected member's data to update usage bars
5. **Architecture view toggle:** Developers can toggle between chat and `ArchitectureView`

**Renders:**
```
<Layout
  left={<LeftSidebar ... />}
  center={showArchitecture ? <ArchitectureView .../> : <ChatWindow .../>}
  right={<AgentPanel .../>}
/>
```

---

### DevDashboardPage.jsx (767 lines)

**Route:** `/dev-dashboard` — Developer-only operational dashboard.

**Access control:** Redirects non-developers to `/dashboard`.

**Structure:**
1. **Top navigation bar** — Laya logo, refresh button, chat view link, user avatar
2. **AnalyticsCards** — 6 KPI cards (Total Members, Total Claims, Approved, Rejected, AI Accuracy, Avg Processing)
3. **4 Tabbed views:**

| Tab | Components | Description |
|---|---|---|
| Claims Queue | `ClaimsQueue` + `ClaimReviewPanel` | Split view: table left, AI review right |
| Members | Grid of member cards | Searchable, clickable → navigates to MemberProfilePage |
| Documents | Table + `PdfPreview` panel | All uploaded docs with extraction data |
| Activity Log | Live monitor table | Activity entries with type icons, timestamps |

**API calls on mount:**
- `fetchClaimsQueue()` → claims queue data
- `fetchAnalytics()` → KPI statistics
- `fetchMembers()` → members list
- `fetchMembersOverview()` → risk scores
- `fetchAllDocuments()` → all documents
- `fetchActivities()` → activity log

**Claim review flow:**
1. Select claim in `ClaimsQueue` → opens in `ClaimReviewPanel`
2. Click "Run AI Analysis" → `runAIAnalysis(claim.claim_id)` → shows AI recommendation
3. Developer chooses: Approve / Reject / Escalate
4. Optional: Override payout amount, add review notes
5. Submit → `submitClaimReview(data)` → refreshes queue

---

### MemberProfilePage.jsx (997 lines)

**Route:** `/dev-dashboard/member/:memberId` — Deep member analytics.

**Access control:** Developer-only.

**Sections:**
1. **Back navigation** — Link to `/dev-dashboard`
2. **Hero card** — Gradient blue card with member photo, name, ID, scheme, policy dates
3. **AI Quick Stats card** — 4 stats: Total Claims, Needs Review, Approval Rate, Risk Score
4. **Key Metrics row** — 5 MetricCards (Total Claims, Approved, Total Claimed, Quarterly Receipts, Risk Score)
5. **Risk Factors banner** — Amber strip showing risk factors (when present)
6. **AI-Powered Claims Review** — Two-column: Claims table (7-col) + ClaimReviewPanel (always visible)
7. **Uploaded Documents** — Grid of document cards with extraction data
8. **Tabbed Analytics:**
   - **Overview** — Usage Limits bars, Claims Status PieChart, Risk Assessment RadialBarChart
   - **Claims Analysis** — Claims by Treatment BarChart, Claims Over Time AreaChart
   - **Spending** — Spending by Treatment horizontal BarChart

**API calls on mount:**
- `fetchMemberProfile(memberId)` → full analytics object
- `fetchClaims(memberId)` → claims list
- `fetchMemberDocuments(memberId)` → documents

**Charts (Recharts):**
- `PieChart` — Claims status distribution (Approved/Rejected/Pending)
- `BarChart` — Claims count by treatment type
- `AreaChart` — Claims trend over time
- `RadialBarChart` — Risk score gauge (0-100)
- `BarChart (horizontal)` — Spending by treatment type

**Internal components (defined in same file):**
- `MetricCard` — Animated stat card
- `UsageLimitBar` — Progress bar with color thresholds
- `TabButton` — Tab selector with active state and optional count badge
- `CustomTooltip` — Styled Recharts tooltip

---

## 10. Components — UI Building Blocks

### Layout.jsx (9 lines)

Simple 3-panel grid wrapper:
```jsx
export default function Layout({ left, center, right }) {
  return <div className="layout-3panel">{left}{center}{right}</div>;
}
```

CSS class `layout-3panel` in `index.css` defines the 3-column layout.

---

### LeftSidebar.jsx (~400 lines)

**Panel:** Left sidebar (290px, blue gradient background)

**Sections (top to bottom):**
1. **Brand logo** — Laya Healthcare shield icon + "Laya" text
2. **New Chat button** — `Ctrl+K` shortcut hint, calls `onNewChat`
3. **Chat sessions list** — Scrollable, each item shows title + timestamp, hover reveals delete button
4. **Member selector** — Dropdown of all members (filtered for customers to show only their linked member)
5. **Selected member card** — Shows name, scheme, status when a member is selected
6. **User profile section** — Avatar initials, name, email, role badge (developer/customer)
7. **Developer Dashboard link** — Only shown if `isDeveloper`
8. **Logout button**

**Props:** `chatSessions, activeChatId, onSelectChat, onNewChat, onDeleteChat, members, selectedMember, onSelectMember, user, onLogout, isDeveloper`

---

### ChatWindow.jsx (~500 lines)

**Panel:** Center panel (flex-grow)

**Sections (top to bottom):**
1. **Top bar** — Selected member name/ID, architecture toggle (dev-only), panel toggle button, callback request button (Headphones icon)
2. **Messages area** — Scrollable. Shows `WelcomeScreen` when empty, otherwise maps messages to `MessageBubble`. Includes scroll-to-bottom button.
3. **Typing indicator** — Shows when `isLoading=true` with bouncing dots and active agent name
4. **Smart suggestions** — `SmartSuggestions` shown after last AI response
5. **PdfPreview** — Compact preview when document is staged for upload
6. **Input area:**
   - Upload button (Paperclip icon) — triggers hidden file input
   - Voice input button (Mic icon) — Web Speech API, locale `en-IE`
   - Textarea — Auto-expanding, Enter to send (Shift+Enter for newline)
   - Send button (ArrowUp icon)
7. **CallbackRequestModal** — Rendered at bottom, controlled by `showCallbackModal` state

**Document upload flow:**
1. User clicks upload button or drags file
2. `uploadDocument(file)` → OCR extraction on backend
3. `setDocumentData(extractedData)` + `setUploadedFile(fileInfo)`
4. Compact `PdfPreview` shown above input
5. Next `sendMessage()` includes `documentData` and `fileInfo`
6. After send, document data is cleared

**Voice input:**
- Uses `webkitSpeechRecognition` (Chrome) or `SpeechRecognition`
- Locale: `en-IE` (Irish English)
- Continuous mode, interim results
- Pink pulsing border when active

---

### AgentPanel.jsx (~400 lines)

**Panel:** Right sidebar (380px, collapsible)

**5-Stage Pipeline Visualization:**

| Stage | Label | Keywords to Detect |
|---|---|---|
| 1 | Setup | `setup`, `loaded`, `member` |
| 2 | Parallel Validation | `intake`, `eligibility`, `waiting`, `threshold` |
| 3 | Principal Agent | `principal`, `routing`, `route` |
| 4 | Treatment Review | `outpatient`, `hospital`, `exception`, `gp`, `consultant` |
| 5 | Final Decision | `decision`, `approved`, `rejected`, `payout` |

**Stage status detection:** Scans `agentTrace[]` for keywords → assigns status: pending (gray), active (blue, spinning), completed (green), failed (red).

**Decision Card:** Shown when `lastResult` exists:
- Color-coded: green (APPROVED), red (REJECTED), amber (PENDING)
- Displays payout amount with Euro icon
- Shows reasoning text

**Member Info Card:** When `selectedMember` exists:
- 7 usage progress bars: GP Visits, Consultant, Prescriptions, Dental/Optical, Therapy, Scans, Hospital Days
- Color thresholds: green (<70%), amber (70-99%), red (100%/maxed)
- Quarterly receipts display (accumulated vs €150 threshold)

---

### MessageBubble.jsx (~300 lines)

**Purpose:** Renders a single chat message (user or AI).

**User messages:**
- Right-aligned, gradient blue background (`from-laya-blue to-laya-blue-mid`)
- Pink avatar circle with user initials
- Plain text content

**AI messages:**
- Left-aligned, white background with blue-left border
- Shield avatar (Laya branding)
- Content rendered via `ReactMarkdown` with `prose-chat` CSS class
- **Document attachment button** — If message has `file_info`, shows button that opens `PdfPreviewModal`
- **ClaimCard** — If message has a `result` (decision), renders `ClaimCard` inline
- **Status update banner** — If `statusUpdated=true`, shows green banner with review details (reviewer decision, payout, notes)

**Animation:** Spring entrance animation via Framer Motion.

---

### WelcomeScreen.jsx (~259 lines)

**Purpose:** Empty state shown when chat has no messages.

**Hero section:**
- Animated shield icon with scale animation
- "How can I help you today?" heading

**6 Capability Cards:**

| Card | Icon | Pre-filled Document |
|---|---|---|
| GP Visit | Stethoscope | `treatment_type: "GP Visit"`, `total_cost: 65`, etc. |
| Consultant | User | `treatment_type: "Consultant"`, `total_cost: 150` |
| Prescription | Pill | `treatment_type: "Prescription"`, `total_cost: 45` |
| Hospital Stay | Building2 | `treatment_type: "Hospital Stay"`, `total_cost: 500` |
| Dental | Smile | `treatment_type: "Dental"`, `total_cost: 120` |
| Scan | Scan | `treatment_type: "Scan"`, `total_cost: 200` |

Each card auto-populates with the selected member's ID and name. Clicking a card calls `onSendMessage` with the pre-filled document data, instantly starting a claim flow.

---

### SmartSuggestions.jsx (~200 lines)

**Purpose:** Context-aware suggestion chips shown after AI responses.

**Suggestion generation logic (`getSuggestions`):**

| Decision | Suggestions |
|---|---|
| `APPROVED` | "Submit another claim", "What's my remaining coverage?", "Payment timeline?" |
| `REJECTED` | "Why was it rejected?", "Can I appeal?", "What documents are needed?", "Talk to a person" (callback) |
| `PARTIALLY_APPROVED` | "Why partial?", "Claim remaining amount?" |
| `PENDING` | "What info is needed?", "How long will it take?" |
| (no decision) | "Submit a new claim", "Check my coverage", "View my plan details" |

**Usage-based warnings:**
- GP visits ≥ 8 → "You're nearing your GP visit limit"
- Hospital days ≥ 35 → "Hospital day limit approaching"

**Max 4 suggestions displayed.** Each chip is color-coded by type:
- `action` → blue
- `question` → teal
- `warning` → amber
- `callback` → pink

Clicking a chip calls `onSuggestionClick(text)` which sends it as a chat message. The `callback` type opens `CallbackRequestModal` instead.

---

### ClaimCard.jsx (~200 lines)

**Purpose:** Displays claim decision result in chat.

**AnimatedCounter:** Custom implementation with cubic ease-out for smooth payout counting animation.

**Two variants:**

1. **PENDING variant** ("Under Review"):
   - Hourglass icon, amber coloring
   - "Your claim is currently being reviewed by our team"
   - Animated progress bar (shimmer)
   - Claim reference with copy button

2. **Decision variant** (APPROVED/REJECTED/PARTIALLY APPROVED):
   - `StatusBadge` with decision
   - Animated payout counter (`AnimatedCounter` → `€XX.XX`)
   - Flags (amber badges with AlertTriangle)
   - `needs_info` text (if present)
   - `source_url` — Link to IPID document ("View Policy Source")
   - `AgentTrace` — expandable timeline of agent routing steps
   - Copy claim reference button

---

### ClaimReviewPanel.jsx (~417 lines)

**Purpose:** AI-assisted human review panel for developers.

**Empty state:** "Select a claim to review" prompt with Brain icon.

**When claim is selected:**

1. **Claim Details card** — Member, Treatment, Date, Practitioner, Amount, Scheme, Current Status
2. **Run AI Analysis button** — Triggers `onRunAI(claim)` → calls backend AI pipeline
3. **AI Processing indicator** — Spinning loader while AI analyzes
4. **AI Result section:**
   - AI Decision badge (APPROVED/REJECTED) with confidence percentage
   - Payout amount
   - Reasoning text box
   - Flags (amber warnings)
   - Source Document Citations (IPID references with highlighted text)
   - Agent Trace (expandable)
5. **Human Decision section:**
   - 3 buttons: Approve (ThumbsUp), Reject (ThumbsDown), Escalate (AlertTriangle)
   - Payout override input (only when Approve selected)
   - Review notes textarea
   - Submit button → `onSubmitReview({ claim_id, member_id, decision, reviewer_notes, payout_amount })`

**This is the core "AI assists, human decides" workflow.**

---

### ClaimsQueue.jsx (~393 lines)

**Purpose:** Developer claims queue table with filtering and sorting.

**Features:**
- **Search** — Filters by member name, claim ID, treatment type, member ID, practitioner
- **Status filter pills** — All / Approved / Rejected / Pending (with counts)
- **Priority filter pills** — All / 🔴 High / 🟡 Medium / 🟢 Low
- **Sortable columns** — Member, Date, Amount, Priority, Status (click header to toggle)
- **12-column grid table** — Member (avatar+name), Treatment, Date, Practitioner, Amount, Priority, Status, Action

**Priority system:** Each claim has a `priority` object with `level` (HIGH/MEDIUM/LOW), `score` (numeric), and `reasons[]`. Displayed via `PriorityBadge` component.

**Row click:** Calls `onSelectClaim(claim)` → opens in `ClaimReviewPanel`.

**Props:** `claims, loading, onSelectClaim, selectedClaimId, onRefresh`

---

### AnalyticsCards.jsx (~100 lines)

**Purpose:** Developer dashboard KPI stat cards.

**6 cards displayed:**

| Metric | Icon | Color |
|---|---|---|
| Total Members | Users | Blue gradient |
| Total Claims | FileText | Blue-mid |
| Approved | CheckCircle | Green |
| Rejected | XCircle | Coral |
| AI Accuracy | Brain | Pink gradient |
| Avg. Processing | Zap | Amber |

Each card has animated entrance (staggered delay). Loading state shows skeleton placeholders.

**Props:** `analytics` object (from `fetchAnalytics()`), `loading`

---

### ArchitectureView.jsx (591 lines)

**Purpose:** Live interactive architecture diagram showing the full agent pipeline.

**10 nodes mapped to backend graph:**

| Node | Type | Backend Equivalent |
|---|---|---|
| User Input | endpoint | — |
| Setup Node | process | `setup_node` |
| Intake Agent | validation | `parent_1_intake` |
| Eligibility Agent | validation | `parent_2_eligibility` |
| Principal Agent | router | `principal_agent` |
| Outpatient Agent | specialist | `parent_3_outpatient` |
| Hospital Agent | specialist | `parent_4_hospital` |
| Exceptions Agent | specialist | `parent_5_exceptions` |
| Decision Agent | decision | `decision_node` |
| Final Result | endpoint | — |

**Flow layout (FLOW_ROWS):**
```
Row 1: [user]
Row 2: [setup]
Row 3: [intake, eligibility]     ← PARALLEL label
Row 4: [principal]
Row 5: [outpatient, hospital, exceptions]  ← ROUTE label
Row 6: [decision]
Row 7: [result]
```

**Real-time status detection:** `getNodeStatus()` scans `agentTrace[]` for keywords matching each node → assigns: pending, active (spinning), completed (green), failed (red), skipped (dashed).

**Interactive:** Click any node to see its description, child agents, and trace log entries. Legend at bottom.

**Node type color coding:**
- Endpoint → blue
- Process → indigo
- Validation → amber
- Router → pink
- Specialist → sky/blue
- Decision → purple

---

### AgentTrace.jsx (~90 lines)

**Purpose:** Expandable vertical timeline of agent routing steps.

**Used by:** `ClaimCard` (in chat messages)

**Features:**
- Collapsible via button click: "Agent Trace (N steps)"
- Vertical timeline with colored dots:
  - Green (CheckCircle) — entry contains "approved" or "passed"
  - Red (XCircle) — entry contains "rejected" or "failed"
  - Gray (Circle) — neutral step
  - Spinning (Loader) — last step while processing
- Animated entrance per step (staggered)

---

### StatusBadge.jsx (~35 lines)

**Purpose:** Decision status badge pill.

**Decisions & icons:**

| Decision | Icon | Style (from constants.js) |
|---|---|---|
| APPROVED | CheckCircle | Green bg, white text |
| REJECTED | XCircle | Red bg, white text |
| PARTIALLY APPROVED | AlertCircle | Amber bg |
| PENDING | Clock | Blue bg |
| ACTION REQUIRED | HelpCircle | Custom |

---

### PdfPreview.jsx (~250 lines)

**Purpose:** Document preview component with 3 modes.

**Compact mode** (`compact=true`):
- Small thumbnail (192×128px)
- PDF: iframe at 50% scale
- Image: `<img>` with object-cover
- Click opens PdfPreviewModal

**Full panel mode** (default):
- Expandable panel with header (filename, open-in-tab, maximize, close)
- PDF: full iframe
- Image: centered with object-contain
- Other: download prompt

**PdfPreviewModal** (exported separately):
- Full-screen modal with backdrop blur
- Max-width 4xl, 85vh height
- Header with filename and "Open in tab" button
- Close on backdrop click or X button

---

### FileUpload.jsx (~170 lines)

**Purpose:** Drag-and-drop document upload with demo scenario selector.

**Upload zone:**
- Drag-and-drop area with visual feedback (border color change)
- Click to open file picker
- Accepts: `.pdf`, `.png`, `.jpg`, `.jpeg`
- Upload flow: `processFile(file)` → `uploadDocument(file)` → `onDocumentReady(extractedData, fileInfo)`
- States: empty (Upload icon), uploading (spinner), uploaded (filename with clear button)

**Demo scenarios:**
- Displays 4 demo scenario buttons from `DEMO_SCENARIOS` constant
- Each scenario has pre-built document data
- Click → `useDemoDoc(scenario)` → `onDocumentReady(scenario.document, scenario)`

**Props:** `onDocumentReady(extractedData, fileInfo)`

---

### MemberInfo.jsx (~180 lines)

**Purpose:** Member details card with usage statistics.

**Sections:**
1. **Header** — Blue gradient bar with avatar initials, name, member ID, status badge
2. **Personal info** — Scheme name, Policy start date
3. **Usage stats** — 6 `UsageBar` components:
   - GP Visits (max 10)
   - Consultant (max 10)
   - Prescriptions (max 4)
   - Dental/Optical (max 10)
   - Scans (max 10)
   - Hospital Days (max 40)
4. **Quarterly Receipts** — Accumulated vs €150 threshold
5. **Recent Claims** — List of claim rows (treatment, amount, status badge)

**UsageBar internal component:** Progress bar with color thresholds:
- `<70%` → blue (`bg-laya-blue-mid`)
- `70-99%` → amber (`bg-laya-amber`)
- `100%` → red (`bg-laya-coral`) + "MAXED" label

---

### MembersOverview.jsx (~100 lines)

**Purpose:** Developer dashboard risk monitor widget.

**Shows:** List of members sorted by risk score, each with:
- Avatar with initials
- Name, member ID, claim count
- `RiskBadge` — High (≥60, red), Medium (30-59, amber), Low (<30, green)
- Click → navigates to `/dev-dashboard/member/{id}`

---

### CallbackRequestModal.jsx

**Purpose:** Customer callback request for human assistance.

**Built in Phase 1 of development. Structure:**
1. **Issue category selector** — Claim Dispute, Coverage Question, Technical Issue, Billing, Other
2. **Description textarea** — Required, describes the issue
3. **Urgency picker** — Low / Medium / High
4. **Contact method** — Phone / Email
5. **Member details display** — Shows linked member info
6. **Submit** → `submitCallbackRequest(data)` → shows success state with ticket ID

---

## 11. Utilities & Constants

### utils/constants.js

**Exported values:**

```javascript
// API URLs
export const API_BASE_URL = '/api';
export const WS_BASE_URL = `ws://${window.location.host}/api`;

// Laya brand colors
export const COLORS = {
  blue: '#003DA5',
  blueMid: '#0072CE',
  pink: '#E6007E',
  teal: '#00A99D',
  navy: '#1B3A6B',
  coral: '#E85D4A',
  green: '#27AE60',
  amber: '#F59E0B',
};

// Decision badge styles
export const DECISION_STYLES = {
  'APPROVED':            { bg: 'bg-green-500',  text: 'text-white', label: 'APPROVED' },
  'REJECTED':            { bg: 'bg-red-500',    text: 'text-white', label: 'REJECTED' },
  'PARTIALLY APPROVED':  { bg: 'bg-amber-500',  text: 'text-white', label: 'PARTIAL' },
  'PENDING':             { bg: 'bg-blue-500',   text: 'text-white', label: 'PENDING' },
  'ACTION REQUIRED':     { bg: 'bg-pink-600',   text: 'text-white', label: 'ACTION REQUIRED' },
};

// 4 Demo Scenarios (for FileUpload and DevDashboard)
export const DEMO_SCENARIOS = [
  { id: 'waiting-period', name: 'Waiting Period',    member: 'MEM-1001', document: { ... } },
  { id: 'threshold',      name: 'Threshold Test',    member: 'MEM-1002', document: { ... } },
  { id: 'annual-limit',   name: 'Annual Limit',      member: 'MEM-1003', document: { ... } },
  { id: 'duplicate',      name: 'Duplicate Claim',   member: 'MEM-1005', document: { ... } },
];
```

Each demo scenario includes a full `document` object with `treatment_type`, `practitioner_name`, `treatment_date`, `total_cost`, and `clinic_name`.

---

## 12. Styling System

### Tailwind CSS v4 with @theme

The project uses **Tailwind CSS v4** which replaces `tailwind.config.js` with the `@theme` directive in `index.css`.

**Brand color tokens defined in `@theme`:**

```css
@theme {
  --color-laya-blue: #003DA5;
  --color-laya-blue-mid: #0072CE;
  --color-laya-blue-light: #4DA3FF;
  --color-laya-blue-pale: #E8F4FD;
  --color-laya-pink: #E6007E;
  --color-laya-pink-light: #FF4DA6;
  --color-laya-pink-pale: #FFF0F7;
  --color-laya-navy: #1B3A6B;
  --color-laya-teal: #00A99D;
  --color-laya-coral: #E85D4A;
  --color-laya-green: #27AE60;
  --color-laya-amber: #F59E0B;
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
}
```

These enable Tailwind classes like `bg-laya-blue`, `text-laya-pink`, `border-laya-coral`, etc.

### Key CSS Classes in index.css (890 lines)

| Class | Purpose |
|---|---|
| `.layout-3panel` | Flexbox container: sidebar + center + panel |
| `.panel-left` | 290px fixed-width, blue gradient sidebar |
| `.panel-center` | flex-grow, main content area |
| `.panel-right` | 380px fixed-width, collapsible agent panel |
| `.panel-right.collapsed` | 0px width, hidden overflow |
| `.glass-*` | Glass morphism variants (blur, transparency) |
| `.gradient-laya` | Linear gradient blue→pink |
| `.gradient-laya-hero` | Hero section gradient (blue→blue-mid→pink) |
| `.gradient-mesh` | Multi-gradient mesh background |
| `.capability-card` | WelcomeScreen cards with hover effects |
| `.pipeline-step` | AgentPanel pipeline stage with connecting line |
| `.step-dot.*` | Pipeline dot states: pending/active/completed/failed |
| `.prose-chat` | Markdown rendering overrides for AI messages |
| `.chat-session-item` | LeftSidebar session list items |
| `.member-select-dark` | Dark-themed dropdown in sidebar |
| `.badge-developer` | Pink gradient role badge |
| `.badge-customer` | Blue gradient role badge |
| `.dev-stat-card` | Developer dashboard metric cards |
| `.dev-claims-queue` | Claims queue container |
| `.claim-row` | Claims queue table rows |
| `.decision-btn.*` | Approve/Reject/Escalate buttons |
| `.source-citations-panel` | IPID citation panel |
| `.citation-card` | Individual citation card |
| `.profile-hero-card` | MemberProfile hero header |
| `.profile-chart-card` | MemberProfile chart containers |
| `.skeleton` | Loading skeleton shimmer |
| `.suggestion-chip` | SmartSuggestions chip |
| `.status-update-banner` | Real-time claim status update |
| `kbd` | Keyboard shortcut badges |

### Animations

| Animation | Class | Duration | Use |
|---|---|---|---|
| `agent-pulse` | `.agent-pulse` | 1.8s | Active agent dots |
| `float` | `.float` | 3s | Floating elements |
| `fadeInUp` | `.fade-in-up` | 0.4s | General entrance |
| `slideInRight` | `.slide-in-right` | 0.35s | Right panel entrance |
| `slideInLeft` | `.slide-in-left` | 0.35s | Left panel entrance |
| `scaleIn` | `.scale-in` | 0.3s | Scale-up entrance |
| `dotBounce` | `.typing-dot` | 1.4s | Typing indicator dots |
| `shimmer` | `.skeleton` | 1.5s | Loading skeletons |
| `gradientShift` | `.gradient-animate` | 4s | Moving gradients |
| `borderGlow` | `.border-glow` | 2s | Glowing borders |
| `voicePulse` | `.voice-pulse` | 1.5s | Voice input active |
| `aiPulse` | `.ai-pulse` | 2s | AI analyze button |

### Responsive Breakpoints

| Breakpoint | Changes |
|---|---|
| `≤1024px` | Sidebar collapses to 72px; Right panel becomes absolute overlay |
| `≤768px` | Sidebar hidden entirely; Right panel becomes full-width |

---

## 13. Frontend ↔ Backend API Map

### Complete mapping of which component calls which API function → which backend endpoint:

| Component / Hook | API Function | HTTP Method | Backend Endpoint | Backend Router |
|---|---|---|---|---|
| `useChat` | `sendChat()` | POST | `/api/chat/` | `routers/chat.py` |
| `useChat` | `fetchChatHistory()` | GET | `/api/chat/history` | `routers/chat.py` |
| `useChat` | `fetchChatSession(id)` | GET | `/api/chat/history/{id}` | `routers/chat.py` |
| `useChat` | WebSocket | WS | `/api/ws/chat` | `routers/chat.py` |
| `useChat` | Claim Status WS | WS | `/api/ws/claim-status/{userId}` | `routers/chat.py` |
| `ChatWindow` | `uploadDocument(file)` | POST | `/api/chat/upload` | `routers/chat.py` |
| `CallbackRequestModal` | `submitCallbackRequest()` | POST | `/api/chat/callback` | `routers/chat.py` |
| `useMembers` | `fetchMembers()` | GET | `/api/members/` | `routers/members.py` |
| `useMembers` | `fetchMember(id)` | GET | `/api/members/{id}` | `routers/members.py` |
| `MemberProfilePage` | `fetchMemberProfile(id)` | GET | `/api/members/{id}/profile` | `routers/members.py` |
| `MemberProfilePage` | `fetchMemberDocuments(id)` | GET | `/api/members/{id}/documents` | `routers/members.py` |
| `DevDashboardPage` | `fetchAllDocuments()` | GET | `/api/members/documents/all` | `routers/members.py` |
| `DevDashboardPage` | `fetchMembersOverview()` | GET | `/api/members/overview` | `routers/members.py` |
| `DevDashboardPage` | `fetchClaimsQueue()` | GET | `/api/queue/claims` | `routers/queue.py` |
| `DevDashboardPage` | `fetchAnalytics()` | GET | `/api/queue/analytics` | `routers/queue.py` |
| `DevDashboardPage` | `fetchActivities()` | GET | `/api/queue/activities` | `routers/queue.py` |
| `ClaimReviewPanel` | `runAIAnalysis(id)` | POST | `/api/queue/claims/{id}/analyze` | `routers/queue.py` |
| `ClaimReviewPanel` | `submitClaimReview()` | POST | `/api/queue/claims/review` | `routers/queue.py` |
| `DevDashboardPage` | `fetchClaims(memberId)` | GET | `/api/claims/?member_id=` | `routers/claims.py` |
| `useAuth` | `loginUser()` | POST | `/api/auth/login` | `routers/auth.py` |
| `useAuth` | `registerUser()` | POST | `/api/auth/register` | `routers/auth.py` |
| `useAuth` | `fetchMe()` | GET | `/api/auth/me` | `routers/auth.py` |

---

## 14. WebSocket Connections

### 1. Chat WebSocket (Agent Trace Streaming)

**URL:** `ws://host/api/ws/chat`

**Initiated by:** `useChat.sendMessage()` in `useChat.js`

**Purpose:** Stream AI agent processing in real-time as the multi-agent pipeline runs.

**Message flow:**

```
Client → Server:
{
  "message": "I need to submit a GP visit claim",
  "member_id": "MEM-1001",
  "document_data": { ... },
  "file_info": { "name": "receipt.pdf" },
  "session_id": "uuid-..." 
}

Server → Client (multiple messages):
{ "type": "agent_trace", "content": "🔧 Setup: Loading member MEM-1001..." }
{ "type": "agent_trace", "content": "📋 Intake: Form classification..." }
{ "type": "agent_trace", "content": "✅ Eligibility: Waiting period cleared" }
{ "type": "chunk", "content": "Based on your " }
{ "type": "chunk", "content": "GP visit claim..." }
{ "type": "result", "decision": "APPROVED", "payout_amount": 35, "flags": [], ... }
{ "type": "done" }
```

**Error handling:** On WebSocket failure, falls back to HTTP POST `/api/chat/`.

### 2. Claim Status WebSocket (Real-time Review Push)

**URL:** `ws://host/api/ws/claim-status/{userId}`

**Initiated by:** `useChat.connectClaimStatusWs(userId)` in `DashboardPage`

**Purpose:** Push claim status updates from developer reviews to customer chat in real-time.

**Message flow:**

```
Server → Client:
{
  "type": "claim_update",
  "claim_id": "CLM-20260115-ABCD",
  "status": "APPROVED",
  "reviewer_notes": "All documentation verified",
  "payout_amount": 35.00
}
```

**Client handling:**
1. Finds the PENDING message with matching `claim_id` across all chat sessions
2. Updates the message's `lastResult` with new status
3. Sets `statusUpdated: true` flag (triggers green banner in MessageBubble)
4. Saves to localStorage
5. Shows Sonner toast notification: "Claim CLM-... has been APPROVED"
6. Refreshes selected member data if applicable

---

## 15. Data Flow Diagrams

### Customer Claim Submission Flow

```
User types message + uploads document
        │
        ▼
ChatWindow.handleSend()
        │
        ▼
useChat.sendMessage(text, documentData, memberId, fileInfo)
        │
        ├── [Primary] Opens WebSocket /api/ws/chat
        │               │
        │               ├── Receives agent_trace → liveTrace[] → AgentPanel updates
        │               ├── Receives chunks → AI message text streams in
        │               ├── Receives result → ClaimCard renders in chat
        │               └── Receives done → isLoading=false
        │
        └── [Fallback] POST /api/chat/ → receives full response
```

### Developer Review Flow

```
DevDashboardPage / MemberProfilePage
        │
        ▼
ClaimsQueue → select claim → ClaimReviewPanel
        │
        ▼
"Run AI Analysis" → runAIAnalysis(claim_id)
        │                    │
        │                    ▼
        │             Backend runs 6-agent pipeline
        │                    │
        │                    ▼
        │             Returns: ai_decision, ai_payout, reasoning, flags, citations
        │
        ▼
Developer sees AI recommendation → chooses Approve/Reject/Escalate
        │
        ▼
submitClaimReview({ claim_id, member_id, decision, reviewer_notes, payout_amount })
        │
        ▼
Backend updates DB + broadcasts via Claim Status WebSocket
        │
        ▼
Customer's useChat receives update → MessageBubble shows green banner
```

### Auth Flow

```
LoginPage / RegisterPage
        │
        ▼
useAuth.login(email, password) / useAuth.register(formData)
        │
        ▼
auth.js: loginUser() / registerUser() → POST /api/auth/login or /register
        │
        ▼
Receives { access_token, user }
        │
        ▼
storeAuth(token, user) → localStorage
        │
        ▼
fetchMe() → GET /api/auth/me → validates token
        │
        ▼
Sets user in AuthContext → isAuthenticated=true
        │
        ▼
PublicRoute redirects to /dashboard or /dev-dashboard
```

---

## 16. Component Hierarchy Tree

```
App.jsx
├── BrowserRouter
│   ├── AuthProvider (useAuth)
│   │   ├── Toaster (sonner)
│   │   └── Routes
│   │       ├── /login → LoginPage
│   │       ├── /register → RegisterPage
│   │       ├── /dashboard → ProtectedRoute → DashboardPage
│   │       │   ├── hooks: useChat, useMembers, useKeyboardShortcuts
│   │       │   └── Layout
│   │       │       ├── LeftSidebar
│   │       │       │   └── Member selector, Chat sessions, User profile
│   │       │       ├── ChatWindow (or ArchitectureView)
│   │       │       │   ├── WelcomeScreen (empty state)
│   │       │       │   │   └── 6 capability cards
│   │       │       │   ├── MessageBubble[] (messages)
│   │       │       │   │   ├── ReactMarkdown (AI content)
│   │       │       │   │   ├── ClaimCard (decision result)
│   │       │       │   │   │   ├── StatusBadge
│   │       │       │   │   │   ├── AnimatedCounter
│   │       │       │   │   │   └── AgentTrace
│   │       │       │   │   └── PdfPreviewModal (document)
│   │       │       │   ├── SmartSuggestions
│   │       │       │   ├── PdfPreview (compact)
│   │       │       │   └── CallbackRequestModal
│   │       │       └── AgentPanel
│   │       │           ├── 5-stage pipeline visualization
│   │       │           ├── Decision card
│   │       │           └── MemberInfo / Usage bars
│   │       ├── /dev-dashboard → ProtectedRoute → DevDashboardPage
│   │       │   ├── AnalyticsCards
│   │       │   ├── Tab: Claims Queue
│   │       │   │   ├── ClaimsQueue
│   │       │   │   └── ClaimReviewPanel
│   │       │   ├── Tab: Members
│   │       │   │   └── Member grid (navigate to MemberProfilePage)
│   │       │   ├── Tab: Documents
│   │       │   │   └── PdfPreview (panel mode)
│   │       │   └── Tab: Activity Log
│   │       └── /dev-dashboard/member/:memberId → ProtectedRoute → MemberProfilePage
│   │           ├── Hero card
│   │           ├── AI Quick Stats
│   │           ├── MetricCards
│   │           ├── Claims table + ClaimReviewPanel
│   │           ├── Uploaded Documents grid
│   │           └── Analytics tabs (Recharts)
```

---

## 17. Feature Addition Guide

### Adding a New Page

1. **Create page component:** `src/pages/NewPage.jsx`
2. **Add route in `App.jsx`:**
   ```jsx
   <Route path="/new-page" element={<ProtectedRoute><NewPage /></ProtectedRoute>} />
   ```
3. **Add navigation link** in `LeftSidebar.jsx` (customer) or `DevDashboardPage.jsx` top nav (developer)

### Adding a New API Call

1. **Add function in `services/api.js`:**
   ```js
   export async function fetchNewData(params) {
     const { data } = await api.get('/new-endpoint', { params });
     return data;
   }
   ```
2. **Create corresponding backend endpoint** in `backend/app/routers/` (see `backend_docs.md`)
3. **Call from component or hook:**
   ```js
   import { fetchNewData } from '../services/api';
   const data = await fetchNewData({ key: value });
   ```

### Adding a New Component

1. **Create component file:** `src/components/NewComponent.jsx`
2. **Follow existing patterns:**
   - Import icons from `lucide-react`
   - Use `framer-motion` for animations
   - Use Tailwind classes with Laya color tokens (`bg-laya-blue`, `text-laya-navy`, etc.)
   - Accept data via props
3. **Import and render** in the appropriate parent (page or another component)

### Adding a New Hook

1. **Create hook file:** `src/hooks/useNewHook.js`
2. **Follow pattern:**
   ```js
   import { useState, useEffect } from 'react';
   import { fetchNewData } from '../services/api';

   export function useNewHook() {
     const [data, setData] = useState(null);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
       fetchNewData().then(setData).finally(() => setLoading(false));
     }, []);

     return { data, loading };
   }
   ```
3. **Wire into page** (e.g., `DashboardPage.jsx`)

### Adding a New Tab to Developer Dashboard

1. **Add tab key** to `activeTab` state options in `DevDashboardPage.jsx`
2. **Add tab button** in the tab bar section
3. **Add tab content panel** in the `AnimatePresence` section
4. **Add any new API calls** needed

### Adding a Smart Suggestion

1. **Edit `SmartSuggestions.jsx`** → `getSuggestions()` function
2. Add new suggestion object:
   ```js
   { text: 'Suggestion text', type: 'action|question|warning|callback', icon: LucideIcon }
   ```
3. If type is `callback`, it triggers `CallbackRequestModal` instead of sending as chat message

### Adding a New Chat Feature

1. **State:** Add to `useChat.js` state if needed
2. **UI:** Add to `ChatWindow.jsx` (input area, top bar, or message area)
3. **API:** Add to `services/api.js` if backend communication needed
4. **WebSocket:** If real-time, extend WebSocket message handling in `useChat.js`

### Adding to the Agent Pipeline Visualization

1. **ArchitectureView.jsx:** Add node to `NODES` array and row to `FLOW_ROWS`
2. **AgentPanel.jsx:** Add stage to pipeline steps array with detection keywords

### Styling a New Feature

1. Use Tailwind utility classes with Laya tokens:
   - `bg-laya-blue`, `text-laya-navy`, `border-laya-pink`, etc.
2. For complex/reusable styles, add CSS class in `index.css`
3. Follow existing animation patterns (Framer Motion for interactive, CSS for decorative)
4. Glass morphism: `bg-white/80 backdrop-blur-xl border border-blue-100`
5. Card pattern: `bg-white rounded-xl border border-blue-100 shadow-sm p-4`

---

## 18. Key Patterns & Conventions

### Code Patterns

| Pattern | Convention |
|---|---|
| State management | React Context for auth, custom hooks for features (no Redux) |
| Component style | Functional components with hooks only (no class components) |
| Icon system | `lucide-react` — import specific icons, sized consistently (12-20px) |
| Animations | Framer Motion for component-level, CSS keyframes for decorative |
| Error boundaries | None implemented (add if needed) |
| TypeScript | Not used — plain JavaScript with JSX |
| Linting | No ESLint config present |
| Testing | No frontend tests present |

### Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Components | PascalCase | `ChatWindow.jsx`, `ClaimCard.jsx` |
| Hooks | camelCase with `use` prefix | `useChat.js`, `useMembers.js` |
| API functions | camelCase with verb prefix | `fetchMembers()`, `submitClaimReview()` |
| CSS classes | kebab-case | `layout-3panel`, `panel-left`, `dev-stat-card` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL`, `DEMO_SCENARIOS` |
| Files | PascalCase for components, camelCase for utils/hooks | `ClaimCard.jsx`, `constants.js` |

### Design Tokens (Quick Reference)

| Token | Hex | Use |
|---|---|---|
| `laya-blue` | #003DA5 | Primary brand, buttons, links |
| `laya-blue-mid` | #0072CE | Secondary blue, active states |
| `laya-pink` | #E6007E | Accent, developer features, AI branding |
| `laya-navy` | #1B3A6B | Dark text, headings |
| `laya-teal` | #00A99D | Source citations, tertiary accent |
| `laya-coral` | #E85D4A | Errors, rejected states |
| `laya-green` | #27AE60 | Success, approved states |
| `laya-amber` | #F59E0B | Warnings, pending states |

### Common Component Props Pattern

```jsx
// Page-level orchestration:
<ChildComponent
  data={stateFromHook}          // Data from custom hook
  loading={loadingFromHook}     // Loading state
  onAction={handlerFunction}    // Event handler (defined in page)
  selectedId={selectedState}    // Selection state
  user={user}                   // From useAuth
/>
```

### Backend Cross-Reference

For backend endpoint implementations, database schema, AI agent pipeline details, and prompt engineering, see:
- **`backend/backend_docs.md`** — Complete backend documentation
- **`docs/archicture.md`** — System architecture
- **`docs/dataplan.md`** — Database plan
- **Database:** `backend/app/models/database.py` — JSON-based storage
- **AI Pipeline:** `backend/app/agents/graph.py` — LangGraph multi-agent graph

---

*Last updated: Generated from complete source code analysis.*
*Frontend version: React 19 + Vite 6 + Tailwind CSS 4*
