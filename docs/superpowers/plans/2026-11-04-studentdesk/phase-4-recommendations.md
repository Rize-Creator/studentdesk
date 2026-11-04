# Phase 4: Recommendations

**Read first:** [the overview](../2026-11-04-studentdesk.md), which holds the Global Constraints.

**Done when:** choosing a category shows the top 3 with reasons, the worked example matches, and the lead can pick someone else.

**Branch:** `phase-4-recommendations`

---

### Task 1: Scoring engine

**Files:**
- Create: `src/features/recommendations/engine.ts`
- Test: `src/features/recommendations/engine.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type CandidateRecord = { userId, name, doneInCategory, doneTotal, doneOnTime, activeTasks, categoryRoles: string[] }`
  - `type Recommendation = { rank, userId, name, score, percent, atLimit, reasons: string[] }`
  - `DEFAULT_WEIGHTS`, `WORKLOAD_LIMIT`
  - `rankCandidates(task: { categoryName: string }, candidates: CandidateRecord[], weights?): Recommendation[]`
  - `peopleAtLimit(candidates: CandidateRecord[]): { userId: string; name: string; activeTasks: number }[]`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { peopleAtLimit, rankCandidates, type CandidateRecord } from "./engine";

const task = { categoryName: "Logistics" };

const person = (overrides: Partial<CandidateRecord> & { name: string }): CandidateRecord => ({
  userId: overrides.name.toLowerCase(),
  doneInCategory: 0,
  doneTotal: 0,
  doneOnTime: 0,
  activeTasks: 0,
  categoryRoles: [],
  ...overrides,
});

describe("rankCandidates", () => {
  it("matches the worked example in the spec", () => {
    const [top] = rankCandidates(task, [
      person({
        name: "Juan",
        doneInCategory: 6,
        doneTotal: 6,
        doneOnTime: 5,
        activeTasks: 1,
        categoryRoles: ["Logistics Head, Foundation Day 2025 (sample)"],
      }),
    ]);
    expect(top.score).toBeCloseTo(0.865);
    expect(top.percent).toBe(87);
    expect(top.reasons).toEqual([
      "Completed 6 Logistics tasks",
      "5 of 6 tasks on time",
      "1 active task",
      "Logistics Head, Foundation Day 2025 (sample)",
    ]);
  });

  it("returns at most three people, ranked from 1", () => {
    const result = rankCandidates(task, ["A", "B", "C", "D"].map((name) => person({ name })));
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("scores experience against the highest count in the group", () => {
    const result = rankCandidates(task, [
      person({ name: "More", doneInCategory: 4, doneTotal: 4, doneOnTime: 4 }),
      person({ name: "Less", doneInCategory: 2, doneTotal: 4, doneOnTime: 4 }),
    ]);
    expect(result[0].name).toBe("More");
    expect(result[0].score - result[1].score).toBeCloseTo(0.3 * 0.5);
  });

  it("doesn't let one on-time task beat a long record", () => {
    const result = rankCandidates(task, [
      person({ name: "One", doneTotal: 1, doneOnTime: 1 }),
      person({ name: "Long", doneTotal: 20, doneOnTime: 19 }),
    ]);
    expect(result[0].name).toBe("Long");
  });

  it("ranks anyone at the workload limit below everyone under it, and warns", () => {
    const result = rankCandidates(task, [
      person({ name: "Busy", doneInCategory: 10, doneTotal: 10, doneOnTime: 10, activeTasks: 5, categoryRoles: ["Head, X"] }),
      person({ name: "Free" }),
    ]);
    expect(result.map((r) => r.name)).toEqual(["Free", "Busy"]);
    expect(result[1].atLimit).toBe(true);
    expect(result[1].reasons).toContain("Heavy workload: 5 active tasks");
  });

  it("doesn't flag someone just under the limit", () => {
    const [only] = rankCandidates(task, [person({ name: "Nearly", activeTasks: 4 })]);
    expect(only.atLimit).toBe(false);
  });

  it("keeps availability at 0 above the limit", () => {
    const [only] = rankCandidates(task, [person({ name: "Over", activeTasks: 9 })]);
    expect(only.score).toBeCloseTo(0.25 * 0.5);
  });

  it("breaks ties by fewer active tasks, then by name", () => {
    const sameScore = rankCandidates(task, [person({ name: "Zed" }), person({ name: "Abe" })]);
    expect(sameScore.map((r) => r.name)).toEqual(["Abe", "Zed"]);
  });

  // Review Focus 5: thin data.
  it("returns nothing when there are no candidates", () => {
    expect(rankCandidates(task, [])).toEqual([]);
  });

  it("works with one candidate and no history anywhere", () => {
    const [only] = rankCandidates(task, [person({ name: "New" })]);
    expect(only.score).toBeCloseTo(0.25 * 0.5 + 0.3);
    expect(only.reasons).toEqual(["No task history yet", "No active tasks"]);
  });

  it("still ranks when everyone is at the limit", () => {
    const result = rankCandidates(task, [
      person({ name: "A", activeTasks: 5 }),
      person({ name: "B", activeTasks: 6, doneInCategory: 3, doneTotal: 3, doneOnTime: 3 }),
    ]);
    expect(result.map((r) => r.name)).toEqual(["B", "A"]);
    expect(result.every((r) => r.atLimit)).toBe(true);
  });

  it("says when someone has history but none in this category", () => {
    const [only] = rankCandidates(task, [person({ name: "Other", doneTotal: 2, doneOnTime: 1 })]);
    expect(only.reasons[0]).toBe("No Logistics tasks yet");
    expect(only.reasons[1]).toBe("1 of 2 tasks on time");
  });
});

describe("peopleAtLimit", () => {
  it("lists only people at or over the limit", () => {
    const result = peopleAtLimit([
      person({ name: "Busy", activeTasks: 5 }),
      person({ name: "Nearly", activeTasks: 4 }),
    ]);
    expect(result).toEqual([{ userId: "busy", name: "Busy", activeTasks: 5 }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/recommendations/engine.test.ts`
Expected: FAIL, because `./engine` doesn't exist.

- [ ] **Step 3: Create `src/features/recommendations/engine.ts`**

```ts
export type CandidateRecord = {
  userId: string;
  name: string;
  doneInCategory: number;
  doneTotal: number;
  doneOnTime: number;
  activeTasks: number;
  categoryRoles: string[];
};

export type Recommendation = {
  rank: number;
  userId: string;
  name: string;
  score: number;
  percent: number;
  atLimit: boolean;
  reasons: string[];
};

// Draft values. The manuscript says these are finalized with leads and advisers.
export const DEFAULT_WEIGHTS = { experience: 0.3, onTime: 0.25, availability: 0.3, committee: 0.15 };
export const WORKLOAD_LIMIT = 5;
const TOP_COUNT = 3;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function peopleAtLimit(candidates: CandidateRecord[]) {
  return candidates
    .filter((person) => person.activeTasks >= WORKLOAD_LIMIT)
    .map(({ userId, name, activeTasks }) => ({ userId, name, activeTasks }));
}

function buildReasons(person: CandidateRecord, categoryName: string, atLimit: boolean): string[] {
  const reasons: string[] = [];
  if (person.doneTotal === 0) {
    reasons.push("No task history yet");
  } else {
    reasons.push(
      person.doneInCategory > 0
        ? `Completed ${plural(person.doneInCategory, `${categoryName} task`)}`
        : `No ${categoryName} tasks yet`,
    );
    reasons.push(`${person.doneOnTime} of ${plural(person.doneTotal, "task")} on time`);
  }
  if (atLimit) reasons.push(`Heavy workload: ${plural(person.activeTasks, "active task")}`);
  else reasons.push(person.activeTasks === 0 ? "No active tasks" : plural(person.activeTasks, "active task"));
  if (person.categoryRoles.length > 0) reasons.push(person.categoryRoles[0]);
  return reasons;
}

export function rankCandidates(
  task: { categoryName: string },
  candidates: CandidateRecord[],
  weights = DEFAULT_WEIGHTS,
): Recommendation[] {
  const topExperience = Math.max(0, ...candidates.map((c) => c.doneInCategory));

  return candidates
    .map((person) => {
      const experience = topExperience === 0 ? 0 : person.doneInCategory / topExperience;
      // The +2 and +4 start everyone at 50%, so one on-time task can't outrank a long record.
      const onTime = (person.doneOnTime + 2) / (person.doneTotal + 4);
      const availability = Math.max(0, 1 - person.activeTasks / WORKLOAD_LIMIT);
      const committee = person.categoryRoles.length > 0 ? 1 : 0;
      const score =
        weights.experience * experience +
        weights.onTime * onTime +
        weights.availability * availability +
        weights.committee * committee;
      const atLimit = person.activeTasks >= WORKLOAD_LIMIT;
      return { person, atLimit, score: Number(score.toFixed(6)) };
    })
    .sort(
      (a, b) =>
        Number(a.atLimit) - Number(b.atLimit) ||
        b.score - a.score ||
        a.person.activeTasks - b.person.activeTasks ||
        a.person.name.localeCompare(b.person.name),
    )
    .slice(0, TOP_COUNT)
    .map(({ person, atLimit, score }, index) => ({
      rank: index + 1,
      userId: person.userId,
      name: person.name,
      score,
      // toFixed first, so a value like 86.4999999 from float maths still rounds to 87.
      percent: Math.round(Number((score * 100).toFixed(4))),
      atLimit,
      reasons: buildReasons(person, task.categoryName, atLimit),
    }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/recommendations/engine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/recommendations
git commit -m "feat: add history-based recommendation scoring"
```

---

### Task 2: Loading each person's records

**Files:**
- Create: `src/features/recommendations/records.ts`, `src/features/recommendations/loader.ts`, `src/features/recommendations/actions.ts`
- Test: `src/features/recommendations/records.test.ts`

**Interfaces:**
- Consumes: `isOnTime`, `prisma`, `authorize`, `rankCandidates`, `ok`, `fail`
- Produces:
  - `buildCandidateRecords(input): CandidateRecord[]`, a pure function
  - `loadCandidates(projectId, categoryId): Promise<CandidateRecord[]>`
  - `type Suggestions = { suggestions: Recommendation[]; atLimit: { userId: string; name: string; activeTasks: number }[] }`
  - `getSuggestions(projectId, categoryId): Promise<ActionResult<Suggestions>>`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildCandidateRecords } from "./records";

const deadline = new Date("2026-11-07T15:59:59.999Z");
const early = new Date("2026-11-06T02:00:00.000Z");
const late = new Date("2026-11-08T02:00:00.000Z");

describe("buildCandidateRecords", () => {
  const records = buildCandidateRecords({
    categoryId: "logistics",
    people: [
      { id: "juan", name: "Juan" },
      { id: "ana", name: "Ana" },
    ],
    doneTasks: [
      { assigneeId: "juan", categoryId: "logistics", deadline, completedAt: early },
      { assigneeId: "juan", categoryId: "logistics", deadline, completedAt: late },
      { assigneeId: "juan", categoryId: "finance", deadline, completedAt: early },
    ],
    activeCounts: [{ assigneeId: "juan", count: 2 }],
    roles: [
      { userId: "juan", committeeTitle: "Logistics Head", projectName: "Foundation Day 2025 (sample)" },
      { userId: "juan", committeeTitle: null, projectName: "Intramurals 2025 (sample)" },
    ],
  });

  it("counts Done tasks in the category and overall", () => {
    expect(records[0]).toMatchObject({ doneInCategory: 2, doneTotal: 3 });
  });

  it("counts on-time tasks overall", () => {
    expect(records[0].doneOnTime).toBe(2);
  });

  it("carries active counts", () => {
    expect(records[0].activeTasks).toBe(2);
  });

  it("words committee roles, with a fallback when there's no title", () => {
    expect(records[0].categoryRoles).toEqual([
      "Logistics Head, Foundation Day 2025 (sample)",
      "Committee member, Intramurals 2025 (sample)",
    ]);
  });

  it("gives zeros to someone with no records", () => {
    expect(records[1]).toEqual({
      userId: "ana",
      name: "Ana",
      doneInCategory: 0,
      doneTotal: 0,
      doneOnTime: 0,
      activeTasks: 0,
      categoryRoles: [],
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/recommendations/records.test.ts`
Expected: FAIL, because `./records` doesn't exist.

- [ ] **Step 3: Create `src/features/recommendations/records.ts`**

```ts
import { isOnTime } from "@/lib/dates";
import type { CandidateRecord } from "./engine";

type BuildInput = {
  categoryId: string;
  people: { id: string; name: string }[];
  doneTasks: { assigneeId: string | null; categoryId: string; deadline: Date; completedAt: Date | null }[];
  activeCounts: { assigneeId: string | null; count: number }[];
  roles: { userId: string; committeeTitle: string | null; projectName: string }[];
};

export function buildCandidateRecords(input: BuildInput): CandidateRecord[] {
  return input.people.map((person) => {
    const done = input.doneTasks.filter((task) => task.assigneeId === person.id);
    return {
      userId: person.id,
      name: person.name,
      doneInCategory: done.filter((task) => task.categoryId === input.categoryId).length,
      doneTotal: done.length,
      doneOnTime: done.filter((task) => task.completedAt && isOnTime(task.completedAt, task.deadline)).length,
      activeTasks: input.activeCounts.find((row) => row.assigneeId === person.id)?.count ?? 0,
      categoryRoles: input.roles
        .filter((role) => role.userId === person.id)
        .map((role) => `${role.committeeTitle ?? "Committee member"}, ${role.projectName}`),
    };
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/recommendations/records.test.ts`
Expected: PASS

- [ ] **Step 5: Create `src/features/recommendations/loader.ts`**

```ts
import { prisma } from "@/lib/db";
import { buildCandidateRecords } from "./records";

export async function loadCandidates(projectId: string, categoryId: string) {
  const members = await prisma.projectMember.findMany({
    where: { projectId, role: { in: ["LEAD", "MEMBER"] } },
    include: { user: { select: { id: true, name: true } } },
  });
  const ids = members.map((member) => member.userId);

  // Records come from every project, including archived ones.
  const [doneTasks, active, roles] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: { in: ids }, status: "DONE" },
      select: { assigneeId: true, categoryId: true, deadline: true, completedAt: true },
    }),
    prisma.task.groupBy({
      by: ["assigneeId"],
      where: {
        assigneeId: { in: ids },
        status: { in: ["TODO", "IN_PROGRESS", "REVIEW"] },
        project: { status: "ACTIVE" },
      },
      _count: { _all: true },
    }),
    prisma.projectMember.findMany({
      where: { userId: { in: ids }, committeeCategoryId: categoryId },
      include: { project: { select: { name: true } } },
    }),
  ]);

  return buildCandidateRecords({
    categoryId,
    people: members.map((member) => member.user),
    doneTasks,
    activeCounts: active.map((row) => ({ assigneeId: row.assigneeId, count: row._count._all })),
    roles: roles.map((role) => ({
      userId: role.userId,
      committeeTitle: role.committeeTitle,
      projectName: role.project.name,
    })),
  });
}
```

- [ ] **Step 6: Create `src/features/recommendations/actions.ts`**

```ts
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
```

A `"use server"` file can only export async functions at runtime. The `Suggestions` type export is erased at build time, so it's allowed.

- [ ] **Step 7: Check against the sample data**

Create a scratch script outside `src` and run it, printing the Foundation Day 2026 suggestions for Logistics and Creatives:
- **Logistics:** Carlo Bautista should rank first at about 76%, and Juan Dela Cruz second at about 69%.
- **Creatives:** Paolo Garcia has the most Creatives history, but has 5 active tasks. He should be missing from the top 3 and listed in `atLimit`.

If the numbers look wrong, check them by hand against the formula in the spec before changing anything. Delete the script afterward.

- [ ] **Step 8: Run the type check and commit**

```bash
npx tsc --noEmit
git add src/features/recommendations
git commit -m "feat: load member records for recommendations"
```

---

### Task 3: Suggestion panel and member history

**Files:**
- Create: `src/features/recommendations/suggestion-panel.tsx`, `src/features/recommendations/history.ts`, `src/app/(app)/projects/[projectId]/members/[userId]/page.tsx`
- Modify: `src/features/tasks/task-form.tsx`, `src/app/(app)/projects/[projectId]/members/page.tsx`

**Interfaces:**
- Consumes: `getSuggestions`, `Recommendation`, `TaskForm`, `requireMember`, `getMembership`, `isOnTime`, `prisma`
- Produces: `SuggestionPanel` with props `{ projectId, categoryId, selectedUserId, onPick(userId) }`, and `getMemberHistory(userId)`

**Behavior:**
- **Panel:** appears in `TaskForm` once a category is chosen, and reloads when the category changes. While loading it shows a skeleton.
- **Each suggestion:** rank, name, match percentage, reasons as a short list, and an "Assign" button with the accessible name `Assign <name>` that fills in the assignee dropdown. People at the limit show the warning in a caution color.
- **Held back:** anyone in `atLimit` who isn't in the top 3 appears under the list as "Not suggested: Paolo Garcia is at the workload limit (5 active tasks)."
- **The lead's choice:** the assignee dropdown still lists every lead and member, so the lead can pick anyone. A short line says: "Suggestions help you decide. You choose who to assign."
- **Logging:** on submit, `recommendedRank` is set from the suggestions shown, using `suggestions.find((s) => s.userId === assigneeId)?.rank ?? null`. Any pick in the top 3 counts, however the lead picked it.
- **Empty states:** with no candidates, it says "Add members to this project to get suggestions." If suggestions fail to load, it says so in a line and the form still works.
- **Member history page:** past roles and projects, Done tasks per category, and on-time record, for one person. Allowed for that person, and for leads and advisers of the project. Others get the not-found page. Linked from the members list and from names in the panel.

- [ ] **Step 1: Create `src/features/recommendations/history.ts`**

```ts
import { isOnTime } from "@/lib/dates";
import { prisma } from "@/lib/db";

export async function getMemberHistory(userId: string) {
  const [memberships, doneTasks] = await Promise.all([
    prisma.projectMember.findMany({
      where: { userId },
      include: { project: { select: { id: true, name: true, status: true } }, committeeCategory: true },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.task.findMany({
      where: { assigneeId: userId, status: "DONE" },
      include: { category: true },
    }),
  ]);

  const perCategory = new Map<string, number>();
  for (const task of doneTasks) {
    perCategory.set(task.category.name, (perCategory.get(task.category.name) ?? 0) + 1);
  }

  return {
    memberships,
    doneTotal: doneTasks.length,
    doneOnTime: doneTasks.filter((task) => task.completedAt && isOnTime(task.completedAt, task.deadline)).length,
    perCategory: [...perCategory.entries()].map(([name, count]) => ({ name, count })),
  };
}
```

- [ ] **Step 2: Build the panel and the history page as described above**

- [ ] **Step 3: Check it in a browser, on `npm run dev`**

As Maria on Foundation Day 2026, open "New task":
- Choose Logistics. The panel lists Carlo first and Juan second, with reasons for each.
- Choose Creatives. Paolo isn't in the top 3, and the "Not suggested" line names him with his 5 active tasks.
- Assign a suggestion and save. In the database, or through a temporary log, confirm the `TaskAssignment` row has `recommendedRank` set.
- Pick someone outside the top 3 and save. `recommendedRank` should be empty.
- As Juan, opening another member's history URL shows the not-found page, and his own works.

- [ ] **Step 4: Run all checks**

```bash
npm test
npx tsc --noEmit
npm run build
```

Expected: everything passes.

- [ ] **Step 5: Commit and push for preview**

```bash
git add -A
git commit -m "feat: add suggestion panel and member history"
git push -u origin phase-4-recommendations
```

## Phase 4 checklist for the user

Use the preview URL, signed in as **Lead**, on Foundation Day 2026.

1. Click **New task** and choose the **Logistics** category. You should see 3 people with a match percentage and reasons, with Carlo and Juan at the top.
2. Change the category to **Creatives**. Paolo has the most experience but also a heavy workload, so a "Not suggested" line should name him instead of listing him in the top 3.
3. Click **Assign** on a suggestion and save. The task should appear on the board under that person.
4. Create another task and pick someone who wasn't suggested. It should still work.
5. Open a member's name to see their history. Do the roles and task counts make sense?
6. Sign in as **Member** and check that you can't see any suggestions.
7. Tell me if any reason reads oddly. These are what the panel will read.
