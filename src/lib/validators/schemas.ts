import { z } from "zod";

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

function isRealDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// A mistyped year such as 0202 used to be saved. It then broke the project's dashboard, its members' Home page
// and the daily emails for every project, because the date maths can't handle a three-digit year.
const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.")
  .refine(isRealDate, { message: "Choose a real date." })
  .refine((value) => Number(value.slice(0, 4)) >= MIN_YEAR && Number(value.slice(0, 4)) <= MAX_YEAR, {
    message: `Use a year from ${MIN_YEAR} to ${MAX_YEAR}.`,
  });
const title = z.string().trim().min(3, "Use at least 3 characters.").max(120, "Use 120 characters or fewer.");
const description = z.string().trim().max(2000, "Use 2,000 characters or fewer.").default("");
const optionalId = z
  .string()
  .nullish()
  .transform((value) => value?.trim() || null);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max} characters or fewer.`)
    .nullish()
    .transform((value) => value || null);

export function normalizeLink(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
  try {
    const url = new URL(hasScheme ? value : `https://${value}`);
    const isWeb = url.protocol === "http:" || url.protocol === "https:";
    return isWeb && url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
}

export const projectSchema = z
  .object({
    name: title,
    description,
    type: z.enum(["EVENT", "ACADEMIC"]),
    startDate: dateKey,
    targetDate: dateKey,
  })
  .refine((value) => value.targetDate >= value.startDate, {
    path: ["targetDate"],
    message: "The target date can't be before the start date.",
  });

export const memberSchema = z.object({
  userId: z.string().min(1, "Choose a person."),
  role: z.enum(["LEAD", "MEMBER", "ADVISER"]),
  committeeCategoryId: optionalId,
  committeeTitle: optionalText(80),
});

export const milestoneSchema = z.object({ title, dueDate: dateKey });

export const taskSchema = z.object({
  title,
  description,
  categoryId: z.string().min(1, "Choose a category."),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  deadline: dateKey,
  assigneeId: optionalId,
  milestoneId: optionalId,
  recommendedRank: z.coerce.number().int().min(1).max(3).nullish(),
});

export const deliverableSchema = z.object({
  deliverableUrl: z
    .string()
    .nullish()
    .transform((value, ctx) => {
      if (!value?.trim()) return null;
      const link = normalizeLink(value);
      if (!link) {
        ctx.addIssue({ code: "custom", message: "Enter a valid web link." });
        return z.NEVER;
      }
      return link;
    }),
  deliverableNote: optionalText(1000),
});

export const sendBackSchema = z.object({
  note: z.string().trim().min(3, "Tell the assignee what to change.").max(1000, "Use 1,000 characters or fewer."),
});

export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}

export const moveSchema = z.object({
  to: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]),
  beforeId: optionalId,
  afterId: optionalId,
  note: optionalText(1000),
});
