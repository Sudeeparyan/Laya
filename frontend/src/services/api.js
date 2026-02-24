// API service — Axios wrapper for backend communication

import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s for LLM calls
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('laya_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('laya_token');
      localStorage.removeItem('laya_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Fetch all members (summary view for sidebar).
 */
export async function fetchMembers() {
  const { data } = await api.get('/members');
  return data.members;
}

/**
 * Fetch full member record by ID.
 */
export async function fetchMember(memberId) {
  const { data } = await api.get(`/members/${memberId}`);
  return data;
}

/**
 * Send a chat/claim request to the AI pipeline.
 */
export async function sendChat(payload) {
  const { data } = await api.post('/chat', payload);
  return data;
}

/**
 * Fetch claims history for a member.
 */
export async function fetchClaims(memberId) {
  const { data } = await api.get(`/claims/${memberId}`);
  return data.claims;
}

/**
 * Fetch the authenticated user's chat history (all sessions).
 */
export async function fetchChatHistory() {
  const { data } = await api.get('/chat/history');
  return data;
}

/**
 * Fetch a specific chat session by ID.
 */
export async function fetchChatSession(sessionId) {
  const { data } = await api.get(`/chat/session/${sessionId}`);
  return data;
}

/**
 * Upload a document for OCR processing.
 */
export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ── Developer Dashboard Queue API ──────────────────

/**
 * Fetch all claims across all members for the developer queue.
 */
export async function fetchClaimsQueue() {
  const { data } = await api.get('/queue/claims');
  return data;
}

/**
 * Fetch dashboard analytics (stats, risk scores, etc.).
 */
export async function fetchAnalytics() {
  const { data } = await api.get('/queue/analytics');
  return data;
}

/**
 * Run the AI pipeline on a claim for developer-assisted review.
 */
export async function runAIAnalysis(payload) {
  const { data } = await api.post('/queue/ai-analyze', payload);
  return data;
}

/**
 * Submit the developer's final human decision on a claim.
 */
export async function submitClaimReview(payload) {
  const { data } = await api.post('/queue/review', payload);
  return data;
}

/**
 * Fetch all members with full details (developer overview).
 */
export async function fetchMembersOverview() {
  const { data } = await api.get('/queue/members-overview');
  return data;
}

/**
 * Fetch comprehensive member profile with analytics.
 */
export async function fetchMemberProfile(memberId) {
  const { data } = await api.get(`/members/${memberId}/profile`);
  return data;
}

/**
 * Fetch uploaded documents for a specific member (developer view).
 */
export async function fetchMemberDocuments(memberId) {
  const { data } = await api.get(`/queue/member-documents/${memberId}`);
  return data;
}

/**
 * Fetch all uploaded documents across all members (developer view).
 */
export async function fetchAllDocuments() {
  const { data } = await api.get(`/queue/all-documents`);
  return data;
}

/**
 * Fetch recent user activities for developer monitoring.
 */
export async function fetchActivities(memberId = null, limit = 50) {
  const params = { limit };
  if (memberId) params.member_id = memberId;
  const { data } = await api.get('/queue/activities', { params });
  return data;
}

/**
 * Get the URL for previewing an uploaded file.
 */
export function getFilePreviewUrl(docId) {
  return `${API_BASE_URL}/files/${docId}`;
}

/**
 * Submit a customer care callback request.
 */
export async function submitCallbackRequest(payload) {
  const { data } = await api.post('/callback-request', payload);
  return data;
}

export default api;
