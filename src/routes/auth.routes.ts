import { Router } from 'express';
import {
  signup, verifyOTP, login, resendOTP, me,
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

// Protected
router.get('/me',                requireAuth, me);
router.patch('/profile',         requireAuth, updateProfile);
router.post('/change-password',  requireAuth, changePassword);

export default router;
