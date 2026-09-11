import { z } from "zod";

/** Accepted section values exposed by the HTTP API. */
export const expenseSections = [
  "mandatory",
  "pleasure",
  "variable",
  "investment",
] as const;

/** Accepted recurrence values exposed by the HTTP API. */
export const recurrenceValues = ["unique", "week", "month", "year"] as const;

/** Schema used when creating a financial entry. */
export const entrySchema = z.object({
  label: z.string().trim().min(1).max(120),
  amount: z.coerce.number().positive().max(100000000),
  section: z.enum(expenseSections),
  recurrence: z.enum(recurrenceValues),
  category: z.string().trim().max(60).optional(),
  note: z.string().trim().max(500).optional(),
  occurredAt: z.string().datetime().optional(),
  parentId: z.string().trim().min(1).optional(),
});

/** Schema used when partially updating a financial entry. */
export const entryUpdateSchema = entrySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);

/** Schema used when selecting entries for an import. */
export const importSelectionSchema = z.object({
  selectedIds: z.array(z.string()).default([]),
});

/** Schema used when creating or validating a savings goal. */
export const goalSchema = z.object({
  name: z.string().trim().min(1).max(120),
  target: z.coerce.number().positive().max(100000000),
  saved: z.coerce.number().min(0).max(100000000).default(0),
  targetDate: z.string().datetime().optional(),
});

/** Schema used when updating the monthly salary. */
export const salarySchema = z.object({
  amount: z.coerce.number().positive().max(100000000),
});

/** Converts an API section value to the corresponding Prisma enum value. */
export function toPrismaSection(section: (typeof expenseSections)[number]) {
  return section.toUpperCase() as
    "MANDATORY" | "PLEASURE" | "VARIABLE" | "INVESTMENT";
}

/** Converts an API recurrence value to the corresponding Prisma enum value. */
export function toPrismaRecurrence(
  recurrence: (typeof recurrenceValues)[number],
) {
  return recurrence.toUpperCase() as "UNIQUE" | "WEEK" | "MONTH" | "YEAR";
}
