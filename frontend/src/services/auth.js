// Auth API service — login, register, token management

import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const TOKEN_KEY = 'laya_token';
const USER_KEY = 'laya_user';

const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach token to every request
authApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function storeAuth(data) {
  localStorage.setItem(TOKEN_KEY, data.token);
  const user = { ...data };
  delete user.token;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function loginUser(email, password) {
  const { data } = await authApi.post('/auth/login', { email, password });
  storeAuth(data);
  return data;
}

export async function registerUser({ email, password, first_name, last_name, role, member_id }) {
  const { data } = await authApi.post('/auth/register', {
    email, password, first_name, last_name, role, member_id,
  });
  storeAuth(data);
  return data;
}

export async function fetchMe() {
  const { data } = await authApi.get('/auth/me');
  localStorage.setItem(USER_KEY, JSON.stringify(data));
  return data;
}

export default authApi;
