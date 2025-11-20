import { Router } from 'express';
import { prisma } from '../prismaClient';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/auth';
import { env } from '../env';
import { rateLimit } from '../middleware/rateLimit';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';

const registerSchema = z.object({
  email: z
    .string({ required_error: 'Missing email or password' })
    .min(1, 'Missing email or password')
    .email('Invalid email'),
  password: z.string({ required_error: 'Missing email or password' }).min(6, 'password too weak'),
});

const loginSchema = z
  .object({
    email: z.string().optional(),
    password: z.string().optional(),
    idToken: z.string().optional(),
  })
  .refine(body => Boolean(body.idToken || (body.email && body.password)), {
    message: 'Missing email or password',
    path: ['email'],
  });

const refreshSchema = z.object({
  refreshToken: z.string({ required_error: 'Missing token' }).min(1, 'Missing token'),
});

type RegisterBody = z.infer<typeof registerSchema>;
type LoginBody = z.infer<typeof loginSchema>;
type RefreshBody = z.infer<typeof refreshSchema>;

const authRouter = Router();

authRouter.post(
  '/auth/register',
  rateLimit('auth_register', { max: 30 }),
  validateRequest(registerSchema, {
    onError: error => ({ body: { error: error.issues[0]?.message ?? 'Invalid email' } }),
  }),
  async (req, res) => {
    const { email, password } = req.body as RegisterBody;
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({ data: { email, passwordHash } });
      const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: '1h' });
      return res.status(201).json({ token, user: { id: user.id, email: user.email } });
    } catch (err: any) {
      if (err?.code === 'P2002') return res.status(409).json({ error: 'Email already registered' });
      return res.status(500).json({ error: 'Register failed' });
    }
  }
);

authRouter.post(
  '/auth/login',
  rateLimit('auth_login', { max: 60 }),
  validateRequest(loginSchema, {
    onError: error => ({ body: { error: error.issues[0]?.message ?? 'Invalid credentials' } }),
  }),
  async (req, res) => {
    const { email, password, idToken } = req.body as LoginBody;

    // If idToken present, verify with Firebase and find/create corresponding user
    if (idToken) {
      try {
        const { admin } = await import('../firebaseAdmin');
        const decoded = await admin.auth().verifyIdToken(idToken as string);
        const uid = decoded.uid as string;
        // Find user by uid first, then by email
        let user = await prisma.user.findUnique({ where: { id: uid } });
        if (!user && decoded.email) {
          user = await prisma.user.findUnique({ where: { email: decoded.email } });
        }
        if (!user) {
          // create a local user record with firebase uid
          user = await prisma.user.create({
            data: { id: uid, email: decoded.email ?? undefined } as any,
          });
        }
        const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: '1h' });
        return res.json({ token, user: { id: user.id, email: user.email } });
      } catch {
        return res.status(401).json({ error: 'Invalid idToken' });
      }
    }

    const user = await prisma.user.findUnique({ where: { email: email! } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password!, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token, user: { id: user.id, email: user.email } });
  }
);

authRouter.post('/auth/forgot-password', async (_req, res) => {
  return res.status(202).json({ message: 'If the email exists, a reset has been sent.' });
});

authRouter.post('/auth/logout', async (_req, res) => res.status(200).json({ ok: true }));

// POST /auth/refresh - expects { refreshToken }
authRouter.post(
  '/auth/refresh',
  validateRequest(refreshSchema, {
    statusCode: 401,
    onError: error => ({
      status: 401,
      body: { error: error.issues[0]?.message ?? 'Missing token' },
    }),
  }),
  async (req, res) => {
    const { refreshToken } = req.body as RefreshBody;
    try {
      // Use the top-level jwt import (mocked in tests) instead of dynamic import
      const payload: any = (jwt as any).verify(refreshToken, env.JWT_SECRET);
      if (!payload?.userId) return res.status(401).json({ error: 'Invalid token' });
      const token = (jwt as any).sign({ userId: payload.userId }, env.JWT_SECRET, {
        expiresIn: '1h',
      });
      return res.json({ token });
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
);

// GET /auth/me - return current user info
authRouter.get('/auth/me', requireAuth, async (req, res) => {
  const uid = (req as any).user?.userId as string;
  if (!uid) return res.status(401).json({ error: 'Missing token' });
  const u = await prisma.user.findUnique({ where: { id: uid } });
  if (!u) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: { id: u.id, email: u.email } });
});

export { authRouter };
