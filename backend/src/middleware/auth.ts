import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function generateAccessToken(userId: number): string {
  return jwt.sign({ userId, type: 'access' }, JWT_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(userId: number): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): { userId: number } {
  const payload = jwt.verify(token, JWT_SECRET) as { userId: number; type?: string };
  if (payload.type && payload.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return { userId: payload.userId };
}

export function verifyRefreshToken(token: string): { userId: number } {
  const payload = jwt.verify(token, JWT_SECRET) as { userId: number; type?: string };
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return { userId: payload.userId };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  try {
    const payload = verifyAccessToken(header.slice(7));
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
