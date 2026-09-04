import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();
const router = Router();
const credentials = z.object({ email: z.string().email(), password: z.string().min(8) });

function tokenFor(userId: string) {
  return jwt.sign({}, env.JWT_SECRET, { subject: userId, expiresIn: '7d' });
}

router.post('/register', async (request, response) => {
  const parsed = credentials.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Email and password are required' });
  const email = parsed.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return response.status(409).json({ error: 'An account already exists for this email' });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash } });
  return response.status(201).json({ token: tokenFor(user.id), user: { id: user.id, email: user.email } });
});

router.post('/login', async (request, response) => {
  const parsed = credentials.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Email and password are required' });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return response.status(401).json({ error: 'Invalid credentials' });
  return response.json({ token: tokenFor(user.id), user: { id: user.id, email: user.email } });
});

router.get('/me', requireAuth, async (request: AuthenticatedRequest, response) => {
  const user = await prisma.user.findUnique({ where: { id: request.userId }, select: { id: true, email: true, createdAt: true } });
  if (!user) return response.status(404).json({ error: 'User not found' });
  return response.json({ user });
});

export default router;
