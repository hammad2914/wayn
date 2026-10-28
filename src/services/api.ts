import axios from 'axios';
import type { NormalizeRequest, NormalizeResponse, RouteOptimizerRequest, RouteOptimizerResponse } from '../types';
import { BACKEND_API } from '../config/api';

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

// On 401: try silent token refresh once, then force logout.
// A queue holds any concurrent 401s so they all retry after the single refresh
// completes rather than being dropped while isRefreshing is true.
let isRefreshing = false;
type QueueEntry = { resolve: (token: string) => void; reject: (err: unknown) => void };
let refreshQueue: QueueEntry[] = [];

const flushQueue = (token: string) => {
  refreshQueue.forEach(({ resolve }) => resolve(token));
  refreshQueue = [];
};
const rejectQueue = (err: unknown) => {
  refreshQueue.forEach(({ reject }) => reject(err));
  refreshQueue = [];
};

backendClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as (typeof error.config & { _retry?: boolean });

    const isPublic = PUBLIC_PATHS.some(p => original?.url?.includes(p));
    if (error.response?.status !== 401 || original._retry || isPublic) {
      return Promise.reject(error);
    }

    // Another refresh is already in flight — queue this request and wait
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token) => {
            original.headers['Authorization'] = `Bearer ${token}`;
            resolve(backendClient(original));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    original._retry = true;

    try {
      // Cookie is sent automatically (withCredentials)
      const { data } = await backendClient.post<{ data: { token: string } }>('/auth/refresh');
      const newToken = data.data.token;
      localStorage.setItem(TOKEN_KEY, newToken);
      original.headers['Authorization'] = `Bearer ${newToken}`;
      flushQueue(newToken); // replay all queued requests with the new token
      return backendClient(original);
    } catch (err) {
      rejectQueue(err);
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

// ── Address & route engine (our backend) ─────────────────────────────────────
// Geocoding runs at one request a second on OpenStreetMap, so a route with
// many stops can take a while: give these calls far longer than auth calls.
export const normalizeAddress = async (payload: NormalizeRequest): Promise<NormalizeResponse> => {
  const { data } = await backendClient.post<NormalizeResponse>('/engine/normalize', payload, { timeout: 60000 });
  return data;
};

export const optimizeRoute = async (payload: RouteOptimizerRequest): Promise<RouteOptimizerResponse> => {
  const { data } = await backendClient.post<RouteOptimizerResponse>('/engine/optimize-route', payload, { timeout: 120000 });
  return data;
};

// The landing page's try-it box: no sign-in, so it skips the client's token handling.
// A refusal comes back as { error: 'try_limit' | 'try_busy' } rather than as a thrown error.
export type TryResponse = Pick<NormalizeResponse, 'success' | 'original_address' | 'normalized_address' | 'normalized_english'
  | 'components' | 'confidence_score' | 'processing_time_ms' | 'geocoding' | 'error'>;
export const tryAddress = async (address: string, country: string): Promise<TryResponse> => {
  const res = await fetch(`${BACKEND_API}/engine/try`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address, country }),
    signal: AbortSignal.timeout(60000),
  });
  const data = await res.json().catch(() => ({ success: false, error: 'down' }));
  return res.ok || data.error === 'try_limit' || data.error === 'try_busy' ? data : { ...data, success: false, error: 'down' };
};

export default backendClient;
