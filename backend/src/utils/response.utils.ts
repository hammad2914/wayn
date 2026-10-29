import type { Response } from 'express';

export const sendSuccess = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ success: true, data });

export const sendError = (res: Response, message: string, status = 400, extra?: object) =>
  res.status(status).json({ success: false, message, ...extra });
