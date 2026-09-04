import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '../../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const entrySchema = z.object({
  label: z.string().trim().min(1).max(120),
  amount: z.coerce.number().positive().max(100000000),
  section: z.enum(['mandatory', 'pleasure', 'variable']),
  recurrence: z.enum(['week', 'month', 'year']),
});
const salarySchema = z.object({ amount: z.coerce.number().positive().max(100000000) });

function monthStart(value: string | undefined) {
  const date = value ? new Date(`${value}-01T00:00:00.000Z`) : new Date();
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

async function getOrCreateMonth(userId: string, date: Date) {
  return prisma.financialMonth.upsert({
    where: { userId_month: { userId, month: date } },
    update: {},
    create: { userId, month: date },
    include: { entries: { orderBy: { createdAt: 'asc' } } },
  });
}

router.use(requireAuth);

router.get('/month', async (request: AuthenticatedRequest, response) => {
  const month = await getOrCreateMonth(request.userId!, monthStart(request.query.month as string | undefined));
  return response.json({ month });
});

router.patch('/salary', async (request: AuthenticatedRequest, response) => {
  const parsed = salarySchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Salary must be a positive number' });
  const month = await getOrCreateMonth(request.userId!, monthStart(request.query.month as string | undefined));
  const entry = await prisma.moneyEntry.upsert({
    where: { monthId_label: { monthId: month.id, label: '__SALARY__' } },
    update: { amount: parsed.data.amount },
    create: { monthId: month.id, label: '__SALARY__', amount: parsed.data.amount, type: 'INCOME', section: 'MANDATORY', recurrence: 'MONTH' },
  });
  return response.json({ salary: entry.amount });
});

router.post('/entries', async (request: AuthenticatedRequest, response) => {
  const parsed = entrySchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Invalid financial entry' });
  const month = await getOrCreateMonth(request.userId!, monthStart(request.query.month as string | undefined));
  const section = parsed.data.section === 'mandatory' ? 'MANDATORY' : parsed.data.section === 'pleasure' ? 'PLEASURE' : 'VARIABLE';
  const entryData: Prisma.MoneyEntryUncheckedCreateInput = { monthId: month.id, label: parsed.data.label, amount: parsed.data.amount, type: 'EXPENSE', section, recurrence: parsed.data.recurrence.toUpperCase() as 'WEEK' | 'MONTH' | 'YEAR' };
  const entry = await prisma.moneyEntry.create({ data: entryData });
  return response.status(201).json({ entry });
});

router.delete('/entries/:id', async (request: AuthenticatedRequest, response) => {
  const entryId = typeof request.params.id === 'string' ? request.params.id : request.params.id[0];
  if (!entryId) return response.status(404).json({ error: 'Entry not found' });
  const entry = await prisma.moneyEntry.findFirst({ where: { id: entryId, month: { userId: request.userId } } });
  if (!entry || entry.label === '__SALARY__') return response.status(404).json({ error: 'Entry not found' });
  await prisma.moneyEntry.delete({ where: { id: entry.id } });
  return response.status(204).send();
});

export default router;
