import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken } from '../utils/jwt.utils';
import { sendSuccess, sendError } from '../utils/response.utils';
import { generateOTP, saveOTP, saveOTPWithExpiry, validateOTP, markOTPUsed } from '../services/otp.service';
import { sendOTPEmail, sendPasswordResetEmail } from '../services/email.service';
import type { AuthRequest } from '../middleware/auth.middleware';

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
    data: { email, username, companyName, fullName, passwordHash, phone, country },
  });

  // Create default usage record
  await prisma.usage.create({ data: { userId: user.id } });

  // OTP
  const otp = generateOTP();
  await saveOTP(user.id, otp);
  let emailSent = false;
  let emailError = '';
  try {
    await sendOTPEmail(email, otp, fullName);
    emailSent = true;
  } catch (err) {
    emailError = err instanceof Error ? err.message : 'SMTP error';
    console.error('[signup] OTP email failed:', emailError);
  }

  sendSuccess(res, {
    userId: user.id,
    emailSent,
    emailError: emailSent ? undefined : emailError,
    message: emailSent
      ? 'Account created. Check your email for the OTP.'
      : 'Account created but email delivery failed. Use resend OTP below.',
  }, 201);
};

// ── Verify OTP ────────────────────────────────────────────────────────────────
export const verifyOTP = async (req: Request, res: Response) => {
  const { userId, otp } = req.body as { userId: string; otp: string };
  if (!userId || !otp) { sendError(res, 'userId and otp are required'); return; }

  const otpRecord = await validateOTP(userId, otp);
  if (!otpRecord) { sendError(res, 'Invalid or expired OTP', 400); return; }

  await markOTPUsed(otpRecord.id);
  const user = await prisma.user.update({
    where: { id: userId },
    data:  { isVerified: true },
    include: { usage: true },
  });

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  sendSuccess(res, {
    token,
    user: { id: user.id, email: user.email, fullName: user.fullName, username: user.username,
            companyName: user.companyName, country: user.country, role: user.role, usage: user.usage },
  });
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
  if (!user.isVerified) { sendError(res, 'Please verify your email first', 403, { needsVerification: true, userId: user.id }); return; }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) { sendError(res, 'Invalid credentials', 401); return; }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  sendSuccess(res, {
    token,
    user: { id: user.id, email: user.email, fullName: user.fullName, username: user.username,
            companyName: user.companyName, country: user.country, role: user.role, usage: user.usage },
  });
};

// ── Resend OTP ────────────────────────────────────────────────────────────────
export const resendOTP = async (req: Request, res: Response) => {
  const { userId } = req.body as { userId: string };
  if (!userId) { sendError(res, 'userId is required'); return; }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) { sendError(res, 'User not found', 404); return; }
  if (user.isVerified) { sendError(res, 'Account already verified'); return; }

  const otp = generateOTP();
  await saveOTP(user.id, otp);
  let emailSent = false;
  let emailError = '';
  try {
    await sendOTPEmail(user.email, otp, user.fullName);
    emailSent = true;
  } catch (err) {
    emailError = err instanceof Error ? err.message : 'SMTP error';
    console.error('[resend-otp] Email failed:', emailError);
  }

  if (!emailSent) {
    sendError(res, `Email delivery failed: ${emailError}. Check your SMTP configuration.`, 502, { emailSent: false });
    return;
  }
  sendSuccess(res, { emailSent: true, message: 'New OTP sent to your email' });
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

  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond with success to prevent email enumeration attacks
  if (!user) {
    sendSuccess(res, { message: 'If an account exists with that email, a reset link has been sent.' });
    return;
  }

  const token = generateOTP();
  await saveOTPWithExpiry(user.id, token, 5); // 5-minute expiry

  try {
    await sendPasswordResetEmail(email, user.fullName, user.id, token);
    sendSuccess(res, { message: 'Password reset link sent. Check your email — it expires in 5 minutes.' });
  } catch (err) {
    console.error('[forgotPassword] Email send failed:', err);
    sendError(res, 'Failed to send reset email. Please try again later.', 502);
  }
};

// ── Reset Password ────────────────────────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response) => {
  const { userId, token, newPassword } = req.body as { userId: string; token: string; newPassword: string };
  if (!userId || !token || !newPassword) {
    sendError(res, 'userId, token, and newPassword are required'); return;
  }
  if (newPassword.length < 8) { sendError(res, 'Password must be at least 8 characters', 400); return; }

  const otpRecord = await validateOTP(userId, token);
  if (!otpRecord) { sendError(res, 'Reset link is invalid or has expired. Please request a new one.', 400); return; }

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
