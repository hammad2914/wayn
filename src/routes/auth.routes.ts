import { Router } from 'express';
import {
  signup, verifyOTP, login, resendOTP, me, refresh, logout,
  forgotPassword, resetPassword, updateProfile, changePassword,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public
router.post('/signup',           signup);
router.post('/verify-otp',       verifyOTP);
router.post('/login',            login);
router.post('/resend-otp',       resendOTP);
router.post('/forgot-password',  forgotPassword);
router.post('/reset-password',   resetPassword);

// Token management (cookie-based, no Authorization header needed)
router.post('/refresh',          refresh);
router.post('/logout',           logout);

// Protected
router.get('/me',                requireAuth, me);
router.patch('/profile',         requireAuth, updateProfile);
router.post('/change-password',  requireAuth, changePassword);

export default router;
