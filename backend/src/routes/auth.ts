import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { eq, or } from 'drizzle-orm';
import db from '../db/connection.js';
import { users } from '../db/schema.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  authMiddleware,
} from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;
    logger.debug('POST /auth/register', { email, username });

    if (!email || !username || !password) {
      res.status(400).json({ error: 'Email, username, and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const existing = db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.email, email), eq(users.username, username)))
      .get();

    if (existing) {
      res.status(409).json({ error: 'Email or username already taken' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const newUser = db
      .insert(users)
      .values({ email, username, password_hash: passwordHash })
      .returning()
      .get();

    const accessToken = generateAccessToken(newUser.id);
    const refreshToken = generateRefreshToken(newUser.id);

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: newUser.id, email: newUser.email, username: newUser.username, created_at: newUser.created_at },
    });
  } catch (err) {
    logger.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    logger.debug('POST /auth/login', { email });

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/refresh', (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    logger.debug('POST /auth/refresh');
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const payload = verifyRefreshToken(refreshToken);
    const newAccessToken = generateAccessToken(payload.userId);
    const newRefreshToken = generateRefreshToken(payload.userId);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  const user = db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      created_at: users.created_at,
    })
    .from(users)
    .where(eq(users.id, req.userId!))
    .get();

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(user);
});

export default router;
