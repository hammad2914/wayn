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
const backendClient = axios.create({
  baseURL: BACKEND_API,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export const authAPI = {
  signup:         (body: object) => backendClient.post('/auth/signup',           body),
  verifyOTP:      (body: object) => backendClient.post('/auth/verify-otp',       body),
  login:          (body: object) => backendClient.post('/auth/login',            body),
  resendOTP:      (body: object) => backendClient.post('/auth/resend-otp',       body),
  forgotPassword: (body: object) => backendClient.post('/auth/forgot-password',  body),
  resetPassword:  (body: object) => backendClient.post('/auth/reset-password',   body),
  me:             (token: string) =>
    backendClient.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
  updateProfile: (body: object, token: string) =>
    backendClient.patch('/auth/profile', body, { headers: { Authorization: `Bearer ${token}` } }),
  changePassword: (body: object, token: string) =>
    backendClient.post('/auth/change-password', body, { headers: { Authorization: `Bearer ${token}` } }),
};

export default externalClient;
