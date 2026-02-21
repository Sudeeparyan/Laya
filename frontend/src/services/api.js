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

export default api;
