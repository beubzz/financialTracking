import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { sendActionEmail } from '../lib/mail.js';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';

const router = Router();
const credentials = z.object({ email: z.string().email(), password: z.string().min(8) });

function tokenFor(userId: string) {
  return jwt.sign({}, env.JWT_SECRET, { subject: userId, expiresIn: '7d' });
}

function rawToken() { return crypto.randomBytes(32).toString('hex'); }
function tokenHash(token: string) { return crypto.createHash('sha256').update(token).digest('hex'); }

router.post('/register', async (request, response) => {
  const parsed = credentials.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Email and password are required' });
  const email = parsed.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return response.status(409).json({ error: 'An account already exists for this email' });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash } });
  const rawVerificationToken = rawToken();
  await prisma.verificationToken.create({ data: { userId: user.id, tokenHash: tokenHash(rawVerificationToken), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
  await sendActionEmail(email, 'Vérifiez votre adresse e-mail Ledgerly', `${env.FRONTEND_URL}/verify-email?token=${rawVerificationToken}`, 'Vérifiez votre adresse e-mail Ledgerly');
  return response.status(201).json({ token: tokenFor(user.id), user: { id: user.id, email: user.email }, emailVerificationRequired: true });
});

router.post('/login', async (request, response) => {
  const parsed = credentials.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Email and password are required' });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return response.status(401).json({ error: 'Invalid credentials' });
  return response.json({ token: tokenFor(user.id), user: { id: user.id, email: user.email, emailVerified: Boolean(user.emailVerified) } });
});

router.get('/me', requireAuth, async (request: AuthenticatedRequest, response) => {
  const user = await prisma.user.findUnique({ where: { id: request.userId }, select: { id: true, email: true, createdAt: true, emailVerified: true } });
  if (!user) return response.status(404).json({ error: 'User not found' });
  return response.json({ user });
});

router.get('/verify-email', async (request, response) => {
  const token = typeof request.query.token === 'string' ? request.query.token : '';
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash: tokenHash(token) } });
  if (!record || record.expiresAt < new Date()) return response.status(400).json({ error: 'Verification link is invalid or expired' });
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.delete({ where: { id: record.id } }),
  ]);
  return response.json({ message: 'Email verified successfully' });
});

router.post('/forgot-password', async (request, response) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(request.body);
  if (parsed.success) {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (user) {
      const rawResetToken = rawToken();
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: tokenHash(rawResetToken), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
      await sendActionEmail(user.email, 'Réinitialisez votre mot de passe Ledgerly', `${env.FRONTEND_URL}/reset-password?token=${rawResetToken}`, 'Réinitialisez votre mot de passe Ledgerly');
    }
  }
  return response.json({ message: 'If an account exists, a reset email has been sent' });
});

router.post('/reset-password', async (request, response) => {
  const parsed = z.object({ token: z.string().min(20), password: z.string().min(8) }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Invalid reset request' });
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: tokenHash(parsed.data.token) } });
  if (!record || record.expiresAt < new Date()) return response.status(400).json({ error: 'Reset link is invalid or expired' });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.delete({ where: { id: record.id } }),
  ]);
  return response.json({ message: 'Password updated successfully' });
});

export default router;
