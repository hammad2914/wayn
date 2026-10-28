import crypto from 'crypto';
import type { Request, Response, CookieOptions } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.utils';
import { sendSuccess, sendError } from '../utils/response.utils';
import { generateOTP, saveOTPWithExpiry, validateOTP, markOTPUsed } from '../services/otp.service';
import { sendPasswordResetEmail } from '../services/email.service';
import type { AuthRequest } from '../middleware/auth.middleware';

// ── Refresh-token cookie config ───────────────────────────────────────────────
const REFRESH_COOKIE = 'wayn_refresh';
const COOKIE_OPTS: CookieOptions = {
  httpOnly:  true,
  secure:    process.env.NODE_ENV === 'production',
  sameSite:  'strict',
  maxAge:    7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path:      '/api/auth',              // only sent to auth endpoints
};

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/** Generate both tokens, persist refresh token in DB, set cookie. Returns access token. */
async function issueTokens(
  res: Response,
  user: { id: string; email: string; role: string },
): Promise<string> {
  const accessToken  = signAccessToken({ userId: user.id, email: user.email, role: user.role });
  const rawRefresh   = signRefreshToken(user.id);
  const tokenHash    = hashToken(rawRefresh);
  const expiresAt    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Remove any stale refresh tokens for this user, then store the new one
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  await prisma.refreshToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

  res.cookie(REFRESH_COOKIE, rawRefresh, COOKIE_OPTS);
  return accessToken;
}

// ── Schemas ───────────────────────────────────────────────────────────────────
const signupSchema = z.object({
  email:       z.string().email(),
  username:    z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  companyName: z.string().min(2),
  fullName:    z.string().min(2),
  password:    z.string().min(8),
  phone:       z.string().optional(),
  country:     z.string().optional(),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

// ── Signup ────────────────────────────────────────────────────────────────────
export const signup = async (req: Request, res: Response) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, { errors: parsed.error.flatten() });
    return;
  }
  const { email, companyName, fullName, password, phone, country } = parsed.data;

  const emailExists = await prisma.user.findUnique({ where: { email } });
  if (emailExists) { sendError(res, 'Email already registered', 409); return; }

  // Auto-generate a unique username from email prefix
  const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'user';
  let username = baseUsername;
  let attempts = 0;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
    if (++attempts > 10) { username = `${baseUsername}_${Date.now()}`; break; }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, username, companyName, fullName, passwordHash, phone, country, isVerified: true },
  });
  // no email code: the account is ready, so sign in straight away
  const usage = await prisma.usage.create({ data: { userId: user.id } });

  const token = await issueTokens(res, user);
  sendSuccess(res, {
    token,
    user: { id: user.id, email: user.email, fullName: user.fullName, username: user.username,
            companyName: user.companyName, country: user.country, role: user.role, usage,
            createdAt: user.createdAt },
  }, 201);
};

// ── Login ─────────────────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) { sendError(res, 'Validation failed'); return; }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { usage: true },
  });
  if (!user) { sendError(res, 'Invalid credentials', 401); return; }
  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) { sendError(res, 'Invalid credentials', 401); return; }

  const token = await issueTokens(res, user);
  sendSuccess(res, {
    token,
    user: { id: user.id, email: user.email, fullName: user.fullName, username: user.username,
            companyName: user.companyName, country: user.country, role: user.role, usage: user.usage,
            createdAt: user.createdAt },
  });
};

// ── Refresh ───────────────────────────────────────────────────────────────────
export const refresh = async (req: Request, res: Response) => {
  const rawToken = (req.cookies as Record<string, string>)[REFRESH_COOKIE];
  if (!rawToken) { sendError(res, 'No refresh token', 401); return; }

  let userId: string;
  try {
    ({ userId } = verifyRefreshToken(rawToken));
  } catch {
    res.clearCookie(REFRESH_COOKIE, { ...COOKIE_OPTS, maxAge: 0 });
    sendError(res, 'Refresh token invalid or expired', 401);
    return;
  }

  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { userId, tokenHash, expiresAt: { gt: new Date() } },
  });
  if (!stored) {
    res.clearCookie(REFRESH_COOKIE, { ...COOKIE_OPTS, maxAge: 0 });
    sendError(res, 'Refresh token revoked', 401);
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) { sendError(res, 'User not found', 404); return; }

  // Rotate: issue a fresh pair (old record deleted inside issueTokens)
  const token = await issueTokens(res, user);
  sendSuccess(res, { token });
};

// ── Logout ────────────────────────────────────────────────────────────────────
export const logout = async (req: Request, res: Response) => {
  const rawToken = (req.cookies as Record<string, string>)[REFRESH_COOKIE];
  if (rawToken) {
    try {
      const { userId } = verifyRefreshToken(rawToken);
      await prisma.refreshToken.deleteMany({ where: { userId } });
    } catch { /* token already invalid — still clear the cookie */ }
  }
  res.clearCookie(REFRESH_COOKIE, { ...COOKIE_OPTS, maxAge: 0 });
  sendSuccess(res, { message: 'Logged out' });
};

// ── Me ────────────────────────────────────────────────────────────────────────
export const me = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { usage: true },
    omit: { passwordHash: true },
  });
  if (!user) { sendError(res, 'User not found', 404); return; }
  sendSuccess(res, user);
};

// ── Forgot Password ───────────────────────────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  if (!email) { sendError(res, 'Email is required'); return; }

  // Always respond immediately — never block on SMTP
  sendSuccess(res, { message: 'If an account exists with that email, a reset link has been sent.' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const token = generateOTP();
  await saveOTPWithExpiry(user.id, token, 5);

  sendPasswordResetEmail(email, user.fullName, user.id, token).catch((err) => {
    console.error('[forgotPassword] Email send failed:', err);
  });
};

// ── Reset Password ────────────────────────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response) => {
  const { userId, token, newPassword } = req.body as { userId: string; token: string; newPassword: string };
  if (!userId || !token || !newPassword) {
    sendError(res, 'userId, token, and newPassword are required'); return;
  }
  if (newPassword.length < 8) { sendError(res, 'Password must be at least 8 characters', 400); return; }

  const otpRecord = await validateOTP(userId, token);
  if (!otpRecord) {
    sendError(res, 'Reset link is invalid or has expired. Please request a new one.', 400); return;
  }

  await markOTPUsed(otpRecord.id);
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  sendSuccess(res, { message: 'Password reset successfully. You can now log in with your new password.' });
};

// ── Update Profile ────────────────────────────────────────────────────────────
export const updateProfile = async (req: AuthRequest, res: Response) => {
  const { fullName, companyName, phone, country } = req.body as {
    fullName?: string; companyName?: string; phone?: string; country?: string;
  };

  const updated = await prisma.user.update({
    where: { id: req.userId },
    data: {
      ...(fullName    ? { fullName }    : {}),
      ...(companyName ? { companyName } : {}),
      ...(phone       !== undefined ? { phone }   : {}),
      ...(country     !== undefined ? { country } : {}),
    },
    include: { usage: true },
    omit: { passwordHash: true },
  });

  sendSuccess(res, updated);
};

// ── Change Password ───────────────────────────────────────────────────────────
export const changePassword = async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  if (!currentPassword || !newPassword) {
    sendError(res, 'currentPassword and newPassword are required'); return;
  }
  if (newPassword.length < 8) { sendError(res, 'New password must be at least 8 characters', 400); return; }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) { sendError(res, 'User not found', 404); return; }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { sendError(res, 'Current password is incorrect', 401); return; }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: req.userId }, data: { passwordHash } });

  sendSuccess(res, { message: 'Password changed successfully.' });
};
