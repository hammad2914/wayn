import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import usageRoutes from './routes/usage.routes';
import engineRoutes from './routes/engine.routes';

const app = express();

// Render (and most cloud hosts) sit behind a reverse proxy that adds
// X-Forwarded-For. Without this, express-rate-limit can't identify real client
// IPs and throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use('/public', express.static(path.join(__dirname, '..', 'public')));
const allowedOrigins = (process.env.CLIENT_URL || 'https://wayn-app.vercel.app')
  .split(',')
  .map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Global rate limiter
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

// Auth-specific stricter limiter
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many requests' } });

app.use('/api/auth',  authLimiter, authRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/engine', engineRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

export default app;
