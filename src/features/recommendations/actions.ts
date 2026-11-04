"use server";

import { authorize } from "@/features/auth/session";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { prisma } from "@/lib/db";
import { peopleAtLimit, rankCandidates, type Recommendation } from "./engine";
import { loadCandidates } from "./loader";

export type Suggestions = {
  suggestions: Recommendation[];
  atLimit: { userId: string; name: string; activeTasks: number }[];
};

export async function getSuggestions(projectId: string, categoryId: string): Promise<ActionResult<Suggestions>> {
  const auth = await authorize(projectId, "suggestions:view");
  if (!auth.ok) return fail(auth.message);
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return fail("Choose a category.");
  const candidates = await loadCandidates(projectId, categoryId);
  return ok({
    suggestions: rankCandidates({ categoryName: category.name }, candidates),
    atLimit: peopleAtLimit(candidates),
  });
}
