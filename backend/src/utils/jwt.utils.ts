import jwt from 'jsonwebtoken';

const ACCESS_SECRET  = process.env.JWT_SECRET           || 'fallback_access_secret';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'fallback_refresh_secret';

export interface JwtPayload {
  userId: string;
  email:  string;
  role:   string;
}

/** Short-lived access token — 15 minutes */
export const signAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });

/** Long-lived refresh token — 7 days */
export const signRefreshToken = (userId: string): string =>
  jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, ACCESS_SECRET) as JwtPayload;

export const verifyRefreshToken = (token: string): { userId: string } =>
  jwt.verify(token, REFRESH_SECRET) as { userId: string };

// Keep old name as alias so nothing outside auth.controller breaks during transition
export const signToken       = signAccessToken;
export const verifyToken     = verifyAccessToken;
