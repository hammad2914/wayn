import axios from 'axios';
import type { NormalizeRequest, NormalizeResponse, RouteOptimizerRequest, RouteOptimizerResponse } from '../types';
import { EXTERNAL_API, BACKEND_API } from '../config/api';

// ── External Wayn API ──────────────────────────────────────────────────────
const externalClient = axios.create({
  baseURL: EXTERNAL_API.BASE,
  headers: { 'Content-Type': 'application/json', 'X-API-Key': EXTERNAL_API.KEY },
  timeout: 35000,
});

export const normalizeAddress = async (payload: NormalizeRequest): Promise<NormalizeResponse> => {
  const { data } = await externalClient.post<NormalizeResponse>('/normalize', payload);
  return data;
};

export const optimizeRoute = async (payload: RouteOptimizerRequest): Promise<RouteOptimizerResponse> => {
  const { data } = await externalClient.post<RouteOptimizerResponse>('/optimize-route', payload);
  return data;
};

// ── Backend Auth API ──────────────────────────────────────────────────────────
const TOKEN_KEY = 'wayn_token';

// Public endpoints that must never trigger the refresh-retry loop
const PUBLIC_PATHS = [
  '/auth/login', '/auth/signup', '/auth/verify-otp', '/auth/resend-otp',
  '/auth/forgot-password', '/auth/reset-password', '/auth/refresh',
];

const backendClient = axios.create({
  baseURL:         BACKEND_API,
  headers:         { 'Content-Type': 'application/json' },
  timeout:         15000,
  withCredentials: true, // send the refresh-token cookie on every request
});

// Inject stored access token automatically
backendClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// On 401: try silent token refresh once, then force logout
let isRefreshing = false;
backendClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as (typeof error.config & { _retry?: boolean });

    const isPublic = PUBLIC_PATHS.some(p => original?.url?.includes(p));
    if (error.response?.status !== 401 || original._retry || isPublic) {
      return Promise.reject(error);
    }

    if (isRefreshing) return Promise.reject(error);
    isRefreshing = true;
    original._retry = true;

    try {
      // Cookie is sent automatically (withCredentials)
      const { data } = await backendClient.post<{ data: { token: string } }>('/auth/refresh');
      const newToken = data.data.token;
      localStorage.setItem(TOKEN_KEY, newToken);
      original.headers['Authorization'] = `Bearer ${newToken}`;
      return backendClient(original);
    } catch {
      // Refresh failed — force logout via custom event (AuthContext listens)
      window.dispatchEvent(new Event('wayn:logout'));
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

export const authAPI = {
  signup:         (body: object) => backendClient.post('/auth/signup',          body),
  verifyOTP:      (body: object) => backendClient.post('/auth/verify-otp',      body),
  login:          (body: object) => backendClient.post('/auth/login',           body),
  resendOTP:      (body: object) => backendClient.post('/auth/resend-otp',      body),
  forgotPassword: (body: object) => backendClient.post('/auth/forgot-password', body),
  resetPassword:  (body: object) => backendClient.post('/auth/reset-password',  body),
  refresh:        ()             => backendClient.post('/auth/refresh'),
  logout:         ()             => backendClient.post('/auth/logout'),
  me:             ()             => backendClient.get('/auth/me'),
  updateProfile:  (body: object) => backendClient.patch('/auth/profile',        body),
  changePassword: (body: object) => backendClient.post('/auth/change-password', body),
};

export default externalClient;
