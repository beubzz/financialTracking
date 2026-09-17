import { Router } from "express";
import { z } from "zod";
import {
  Prisma,
  type Prisma as PrismaTypes,
} from "../../generated/prisma/index.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  entrySchema,
  entryUpdateSchema,
  goalSchema,
  importSelectionSchema,
  salarySchema,
  toPrismaRecurrence,
  toPrismaSection,
} from "../lib/finance-validation.js";

const router = Router();

/**
 * Normalizes a YYYY-MM query value to the first UTC day of that month.
 *
 * @param value Optional month query value.
 * @returns The normalized month start date.
 */
function monthStart(value: string | undefined) {
  const date = value ? new Date(`${value}-01T00:00:00.000Z`) : new Date();
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * Loads a user's month or creates it when it does not exist yet.
 *
 * @param userId The owner of the financial month.
 * @param date The normalized month date.
 * @returns The month and its entries ordered by creation time.
 */
async function getOrCreateMonth(userId: string, date: Date) {
  return prisma.financialMonth.upsert({
    where: { userId_month: { userId, month: date } },
    update: {},
    create: { userId, month: date },
    include: { entries: { orderBy: { createdAt: "asc" } } },
  });
}

router.use(requireAuth);

router.get("/month", async (request: AuthenticatedRequest, response) => {
  const month = await getOrCreateMonth(
    request.userId!,
    monthStart(request.query.month as string | undefined),
  );
  return response.json({ month });
});

router.get("/annual", async (request: AuthenticatedRequest, response) => {
  const requestedYear = Number(request.query.year);
  const year = Number.isInteger(requestedYear) && requestedYear >= 2000
    ? requestedYear
    : new Date().getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  const months = await prisma.financialMonth.findMany({
    where: {
      userId: request.userId!,
      month: { gte: start, lt: end },
    },
    include: { entries: { orderBy: { createdAt: "asc" } } },
    orderBy: { month: "asc" },
  });
  return response.json({ year, months });
});

router.patch("/salary", async (request: AuthenticatedRequest, response) => {
  const parsed = salarySchema.safeParse(request.body);
  if (!parsed.success)
    return response
      .status(400)
      .json({ error: "Salary must be a positive number" });
  const month = await getOrCreateMonth(
    request.userId!,
    monthStart(request.query.month as string | undefined),
  );
  const entry = await prisma.moneyEntry.upsert({
    where: { monthId_label: { monthId: month.id, label: "__SALARY__" } },
    update: { amount: parsed.data.amount },
    create: {
      monthId: month.id,
      label: "__SALARY__",
      amount: parsed.data.amount,
      type: "INCOME",
      section: "MANDATORY",
      recurrence: "MONTH",
    },
  });
  return response.json({ salary: entry.amount });
});

router.post("/entries", async (request: AuthenticatedRequest, response) => {
  const parsed = entrySchema.safeParse(request.body);
  if (!parsed.success)
    return response.status(400).json({ error: "Invalid financial entry" });
  const month = await getOrCreateMonth(
    request.userId!,
    monthStart(request.query.month as string | undefined),
  );
  const section = toPrismaSection(parsed.data.section);
  const entryData: PrismaTypes.MoneyEntryUncheckedCreateInput = {
    monthId: month.id,
    label: parsed.data.label,
    amount: parsed.data.amount,
    type: "EXPENSE",
    section,
    recurrence: toPrismaRecurrence(parsed.data.recurrence),
    isRecurring: parsed.data.recurrence !== "unique",
    category: parsed.data.category,
    note: parsed.data.note,
    occurredAt: parsed.data.occurredAt
      ? new Date(parsed.data.occurredAt)
      : undefined,
    parentId: parsed.data.parentId,
  };
  if (parsed.data.parentId) {
    const parent = await prisma.moneyEntry.findFirst({
      where: {
        id: parsed.data.parentId,
        monthId: month.id,
        type: "EXPENSE",
        section: { in: ["VARIABLE", "PLEASURE"] },
        parentId: null,
      },
    });
    if (!parent)
      return response.status(400).json({ error: "Invalid parent entry" });
    if (parent.section !== section)
      return response.status(400).json({ error: "Parent section mismatch" });
  }
  try {
    const entry = await prisma.moneyEntry.create({ data: entryData });
    return response.status(201).json({ entry });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return response.status(409).json({ error: "DUPLICATE_ENTRY_LABEL" });
    throw error;
  }
});

/**
 * Finds source-month expenses that can be copied into a target month.
 *
 * @param userId The owner of both months.
 * @param targetDate The month receiving imported entries.
 * @param sourceDate The month providing candidate entries.
 * @param importAll Whether all expenses should be considered.
 * @returns The target month and entries absent from it.
 */
async function findImportCandidates(
  userId: string,
  targetDate: Date,
  sourceDate: Date,
  importAll: boolean,
) {
  const [source, target] = await Promise.all([
    prisma.financialMonth.findUnique({
      where: { userId_month: { userId, month: sourceDate } },
      include: { entries: true },
    }),
    getOrCreateMonth(userId, targetDate),
  ]);
  if (!source) return { target, candidates: [] as typeof target.entries };
  const existingLabels = new Set(target.entries.map((entry) => entry.label));
  const candidates = source.entries.filter(
    (entry) =>
      entry.type === "EXPENSE" &&
      (importAll || (entry.section === "MANDATORY" && entry.isRecurring)) &&
      !existingLabels.has(entry.label),
  );
  return { target, candidates };
}

router.get(
  "/entries/import-candidates",
  async (request: AuthenticatedRequest, response) => {
    const targetDate = monthStart(request.query.month as string | undefined);
    const sourceDate = request.query.sourceMonth
      ? monthStart(request.query.sourceMonth as string)
      : new Date(
          Date.UTC(
            targetDate.getUTCFullYear(),
            targetDate.getUTCMonth() - 1,
            1,
          ),
        );
    const { candidates } = await findImportCandidates(
      request.userId!,
      targetDate,
      sourceDate,
      request.query.mode === "all",
    );
    return response.json({ entries: candidates });
  },
);

router.post(
  "/entries/import-recurring",
  async (request: AuthenticatedRequest, response) => {
    const parsed = importSelectionSchema.safeParse(request.body);
    if (!parsed.success)
      return response.status(400).json({ error: "Invalid import selection" });
    const targetDate = monthStart(request.query.month as string | undefined);
    const sourceDate = request.query.sourceMonth
      ? monthStart(request.query.sourceMonth as string)
      : new Date(
          Date.UTC(
            targetDate.getUTCFullYear(),
            targetDate.getUTCMonth() - 1,
            1,
          ),
        );
    const importAll = request.query.mode === "all";
    const { target, candidates } = await findImportCandidates(
      request.userId!,
      targetDate,
      sourceDate,
      importAll,
    );
    const selectedIds = new Set(parsed.data.selectedIds);
    const selectedCandidates = candidates.filter((entry) =>
      selectedIds.has(entry.id),
    );
    if (selectedCandidates.length)
      await prisma.moneyEntry.createMany({
        data: selectedCandidates.map((entry) => ({
          monthId: target.id,
          label: entry.label,
          amount: entry.amount,
          type: entry.type,
          section: entry.section,
          recurrence: entry.recurrence,
          isRecurring: entry.isRecurring,
          category: entry.category,
          note: entry.note,
          parentId: entry.parentId,
        })),
      });
    const month = await prisma.financialMonth.findUniqueOrThrow({
      where: { id: target.id },
      include: { entries: { orderBy: { createdAt: "asc" } } },
    });
    return response.json({ imported: selectedCandidates.length, month });
  },
);

router.patch(
  "/entries/:id",
  async (request: AuthenticatedRequest, response) => {
    const parsed = entryUpdateSchema.safeParse(request.body);
    if (!parsed.success)
      return response.status(400).json({ error: "Invalid financial entry" });
    const entryId =
      typeof request.params.id === "string"
        ? request.params.id
        : request.params.id[0];
    const existing = await prisma.moneyEntry.findFirst({
      where: {
        id: entryId,
        type: "EXPENSE",
        month: { userId: request.userId },
      },
    });
    if (!existing)
      return response.status(404).json({ error: "Entry not found" });
    const { section, recurrence, occurredAt, parentId, ...rest } = parsed.data;
    if (parentId !== undefined && parentId) {
      const parent = await prisma.moneyEntry.findFirst({
        where: {
          id: parentId,
          monthId: existing.monthId,
          type: "EXPENSE",
          section: { in: ["VARIABLE", "PLEASURE"] },
          parentId: null,
          NOT: { id: existing.id },
        },
      });
      if (
        !parent ||
        (section &&
          parent.section !==
            (section === "variable"
              ? "VARIABLE"
              : section === "pleasure"
                ? "PLEASURE"
                : section === "mandatory"
                  ? "MANDATORY"
                  : "INVESTMENT"))
      )
        return response.status(400).json({ error: "Invalid parent entry" });
    }
    try {
      const entry = await prisma.moneyEntry.update({
        where: { id: existing.id },
        data: {
          ...rest,
          ...(section
            ? {
                section: toPrismaSection(section),
              }
            : {}),
          ...(recurrence
            ? {
                recurrence: toPrismaRecurrence(recurrence),
                isRecurring: recurrence !== "unique",
              }
            : {}),
          ...(occurredAt ? { occurredAt: new Date(occurredAt) } : {}),
          ...(parentId !== undefined ? { parentId: parentId || null } : {}),
        },
      });
      return response.json({ entry });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        return response.status(409).json({ error: "DUPLICATE_ENTRY_LABEL" });
      throw error;
    }
  },
);

router.get("/goals", async (request: AuthenticatedRequest, response) =>
  response.json({
    goals: await prisma.goal.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: "desc" },
    }),
  }),
);

router.post("/goals", async (request: AuthenticatedRequest, response) => {
  const parsed = goalSchema.safeParse(request.body);
  if (!parsed.success)
    return response.status(400).json({ error: "Invalid goal" });
  const goal = await prisma.goal.create({
    data: {
      userId: request.userId!,
      name: parsed.data.name,
      target: parsed.data.target,
      saved: parsed.data.saved,
      targetDate: parsed.data.targetDate
        ? new Date(parsed.data.targetDate)
        : undefined,
    },
  });
  return response.status(201).json({ goal });
});

router.patch("/goals/:id", async (request: AuthenticatedRequest, response) => {
  const parsed = goalSchema.partial().safeParse(request.body);
  if (!parsed.success)
    return response.status(400).json({ error: "Invalid goal" });
  const goalId =
    typeof request.params.id === "string"
      ? request.params.id
      : request.params.id[0];
  const existing = await prisma.goal.findFirst({
    where: { id: goalId, userId: request.userId },
  });
  if (!existing) return response.status(404).json({ error: "Goal not found" });
  const { targetDate, ...rest } = parsed.data;
  const goal = await prisma.goal.update({
    where: { id: goalId },
    data: {
      ...rest,
      ...(targetDate ? { targetDate: new Date(targetDate) } : {}),
    },
  });
  return response.json({ goal });
});

router.delete("/goals/:id", async (request: AuthenticatedRequest, response) => {
  const goalId =
    typeof request.params.id === "string"
      ? request.params.id
      : request.params.id[0];
  await prisma.goal.deleteMany({
    where: { id: goalId, userId: request.userId },
  });
  return response.status(204).send();
});

router.delete(
  "/entries/:id",
  async (request: AuthenticatedRequest, response) => {
    const entryId =
      typeof request.params.id === "string"
        ? request.params.id
        : request.params.id[0];
    if (!entryId)
      return response.status(404).json({ error: "Entry not found" });
    const entry = await prisma.moneyEntry.findFirst({
      where: { id: entryId, month: { userId: request.userId } },
    });
    if (!entry || entry.label === "__SALARY__")
      return response.status(404).json({ error: "Entry not found" });
    await prisma.moneyEntry.delete({ where: { id: entry.id } });
    return response.status(204).send();
  },
);

export default router;
