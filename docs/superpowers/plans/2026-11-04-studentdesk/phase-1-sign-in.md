# Phase 1: Sign-in

**Read first:** [the overview](../2026-11-04-studentdesk.md), which holds the Global Constraints.

**Done when:** all three demo roles can sign in and out, a wrong password shows the right message, and signed-out visitors can't open app pages.

**Branch:** `phase-1-sign-in`

---

### Task 1: Permission rules

**Files:**
- Create: `src/lib/permissions.ts`, `src/lib/action-result.ts`
- Test: `src/lib/permissions.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type ProjectRole = "LEAD" | "MEMBER" | "ADVISER"`
  - `type ProjectAction`
  - `can(role: ProjectRole, action: ProjectAction): boolean`
  - `type ActionResult<T = undefined>`, `ok(data?)`, `fail(message, fieldErrors?)`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { can, type ProjectAction } from "./permissions";

const LEAD_ONLY: ProjectAction[] = [
  "project:edit",
  "members:manage",
  "tasks:manage",
  "suggestions:view",
  "milestones:manage",
  "review:decide",
];

describe("can", () => {
  it.each(LEAD_ONLY)("lets only leads do %s", (action) => {
    expect(can("LEAD", action)).toBe(true);
    expect(can("MEMBER", action)).toBe(false);
    expect(can("ADVISER", action)).toBe(false);
  });

  it("lets leads and advisers send the report, but not members", () => {
    expect(can("LEAD", "report:send")).toBe(true);
    expect(can("ADVISER", "report:send")).toBe(true);
    expect(can("MEMBER", "report:send")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/permissions.test.ts`
Expected: FAIL, because `./permissions` doesn't exist.

- [ ] **Step 3: Create `src/lib/permissions.ts`**

```ts
export type ProjectRole = "LEAD" | "MEMBER" | "ADVISER";

export type ProjectAction =
  | "project:edit"
  | "members:manage"
  | "tasks:manage"
  | "suggestions:view"
  | "milestones:manage"
  | "review:decide"
  | "report:send";

const ALLOWED: Record<ProjectAction, readonly ProjectRole[]> = {
  "project:edit": ["LEAD"],
  "members:manage": ["LEAD"],
  "tasks:manage": ["LEAD"],
  "suggestions:view": ["LEAD"],
  "milestones:manage": ["LEAD"],
  "review:decide": ["LEAD"],
  "report:send": ["LEAD", "ADVISER"],
};

export function can(role: ProjectRole, action: ProjectAction): boolean {
  return ALLOWED[action].includes(role);
}
```

- [ ] **Step 4: Create `src/lib/action-result.ts`**

```ts
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export function ok(): ActionResult;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(message: string, fieldErrors?: Record<string, string[]>) {
  return { ok: false as const, message, fieldErrors };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/permissions.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/permissions.ts src/lib/permissions.test.ts src/lib/action-result.ts
git commit -m "feat: add project permission rules"
```

---

### Task 2: Manila date helpers

**Files:**
- Create: `src/lib/dates.ts`
- Test: `src/lib/dates.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `endOfManilaDay(key: string): Date` and `startOfManilaDay(key: string): Date`, where `key` is `YYYY-MM-DD`
  - `manilaDateKey(date: Date): string`
  - `addDaysToKey(key: string, days: number): string`
  - `isOnTime(completedAt: Date, deadline: Date): boolean`
  - `formatManilaDate(date: Date): string`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  addDaysToKey,
  endOfManilaDay,
  formatManilaDate,
  isOnTime,
  manilaDateKey,
  startOfManilaDay,
} from "./dates";

describe("Manila dates", () => {
  it("ends a Manila day at 15:59:59.999 UTC", () => {
    expect(endOfManilaDay("2026-11-07").toISOString()).toBe("2026-11-07T15:59:59.999Z");
  });

  it("starts a Manila day at 16:00 UTC the day before", () => {
    expect(startOfManilaDay("2026-11-07").toISOString()).toBe("2026-11-06T16:00:00.000Z");
  });

  it("uses the Manila date, not the UTC date", () => {
    expect(manilaDateKey(new Date("2026-11-07T15:59:59.000Z"))).toBe("2026-11-07");
    expect(manilaDateKey(new Date("2026-11-07T16:00:00.000Z"))).toBe("2026-11-08");
  });

  it("adds days across a month boundary", () => {
    expect(addDaysToKey("2026-11-30", 1)).toBe("2026-12-01");
  });

  it("formats dates for display", () => {
    expect(formatManilaDate(endOfManilaDay("2026-11-07"))).toBe("Nov 7, 2026");
  });
});

describe("isOnTime", () => {
  const deadline = endOfManilaDay("2026-11-07");

  it("counts 11:30 PM Manila on the deadline day as on time", () => {
    expect(isOnTime(new Date("2026-11-07T23:30:00+08:00"), deadline)).toBe(true);
  });

  it("counts the exact deadline as on time", () => {
    expect(isOnTime(deadline, deadline)).toBe(true);
  });

  it("counts midnight the next day as late", () => {
    expect(isOnTime(new Date("2026-11-08T00:00:00+08:00"), deadline)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/dates.test.ts`
Expected: FAIL, because `./dates` doesn't exist.

- [ ] **Step 3: Create `src/lib/dates.ts`**

```ts
export const MANILA_TZ = "Asia/Manila";

export function endOfManilaDay(key: string): Date {
  return new Date(`${key}T23:59:59.999+08:00`);
}

export function startOfManilaDay(key: string): Date {
  return new Date(`${key}T00:00:00.000+08:00`);
}

export function manilaDateKey(date: Date): string {
  // The en-CA locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDaysToKey(key: string, days: number): string {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isOnTime(completedAt: Date, deadline: Date): boolean {
  return completedAt.getTime() <= deadline.getTime();
}

export function formatManilaDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/dates.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/dates.ts src/lib/dates.test.ts
git commit -m "feat: add Manila date helpers"
```

---

### Task 3: LMS adapter with a mock client

**Files:**
- Create: `src/features/lms/types.ts`, `src/features/lms/mock-client.ts`, `src/features/lms/live-client.ts`, `src/features/lms/index.ts`
- Test: `src/features/lms/lms.test.ts`

**Interfaces:**
- Consumes: `LMS_MODE`, `DEMO_INBOX`
- Produces:
  - `type LmsIdentity = { lmsId: string; name: string; email: string }`
  - `type LmsResult`, `interface LmsClient`
  - `getLmsClient(mode?: string): LmsClient`
  - `DEMO_ACCOUNTS: DemoAccount[]`, `DEMO_PASSWORD`, `demoEmail(username, inbox?)`
  - `isDemoMode(mode?: string): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { getLmsClient, isDemoMode } from "./index";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, demoEmail } from "./mock-client";

describe("mock LMS", () => {
  const client = getLmsClient("mock");
  const lead = DEMO_ACCOUNTS.find((account) => account.quickPick === "Lead")!;

  it("accepts a demo account and returns an identity", async () => {
    const result = await client.verifyCredentials(lead.username, DEMO_PASSWORD);
    expect(result).toMatchObject({ ok: true, identity: { lmsId: lead.lmsId, name: lead.name } });
  });

  it("refuses a wrong password", async () => {
    const result = await client.verifyCredentials(lead.username, "wrong");
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("refuses an unknown username", async () => {
    const result = await client.verifyCredentials("nobody", DEMO_PASSWORD);
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("offers one quick-pick account per role", () => {
    const picks = DEMO_ACCOUNTS.map((account) => account.quickPick).filter(Boolean);
    expect(picks.sort()).toEqual(["Adviser", "Lead", "Member"]);
  });
});

describe("demoEmail", () => {
  it("plus-addresses the demo inbox", () => {
    expect(demoEmail("maria.santos", "studentdesk@gmail.com")).toBe(
      "studentdesk+mariasantos@gmail.com",
    );
  });

  it("uses a non-routable address when no inbox is set", () => {
    expect(demoEmail("maria.santos", "")).toBe("mariasantos@example.test");
  });
});

describe("choosing a client", () => {
  it("never falls back to the mock for any mode except mock", async () => {
    for (const mode of ["live", "", undefined, "MOCK"]) {
      expect(isDemoMode(mode)).toBe(false);
      const result = await getLmsClient(mode).verifyCredentials("maria.santos", DEMO_PASSWORD);
      expect(result).toEqual({ ok: false, reason: "unavailable" });
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/lms/lms.test.ts`
Expected: FAIL, because `./index` doesn't exist.

- [ ] **Step 3: Create `src/features/lms/types.ts`**

```ts
export type LmsIdentity = { lmsId: string; name: string; email: string };

export type LmsResult =
  | { ok: true; identity: LmsIdentity }
  | { ok: false; reason: "invalid" | "unavailable" };

export interface LmsClient {
  verifyCredentials(username: string, password: string): Promise<LmsResult>;
}
```

- [ ] **Step 4: Create `src/features/lms/mock-client.ts`**

```ts
import type { LmsClient } from "./types";

export const DEMO_PASSWORD = "demo1234";

export type DemoAccount = {
  username: string;
  lmsId: string;
  name: string;
  quickPick?: "Lead" | "Member" | "Adviser";
};

// Fictional people. No real student or faculty data belongs here.
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: "maria.santos", lmsId: "DEMO-001", name: "Maria Santos", quickPick: "Lead" },
  { username: "juan.delacruz", lmsId: "DEMO-002", name: "Juan Dela Cruz", quickPick: "Member" },
  { username: "ana.reyes", lmsId: "DEMO-003", name: "Ana Reyes" },
  { username: "paolo.garcia", lmsId: "DEMO-004", name: "Paolo Garcia" },
  { username: "liza.mendoza", lmsId: "DEMO-005", name: "Liza Mendoza" },
  { username: "carlo.bautista", lmsId: "DEMO-006", name: "Carlo Bautista" },
  { username: "elena.ramos", lmsId: "DEMO-007", name: "Prof. Elena Ramos", quickPick: "Adviser" },
  { username: "mark.villanueva", lmsId: "DEMO-008", name: "Prof. Mark Villanueva" },
];

export function demoEmail(username: string, inbox = process.env.DEMO_INBOX ?? ""): string {
  const tag = username.replace(/[^a-z0-9]/gi, "");
  const [local, domain] = inbox.split("@");
  return domain ? `${local}+${tag}@${domain}` : `${tag}@example.test`;
}

export const mockLmsClient: LmsClient = {
  async verifyCredentials(username, password) {
    const account = DEMO_ACCOUNTS.find((candidate) => candidate.username === username);
    if (!account || password !== DEMO_PASSWORD) return { ok: false, reason: "invalid" };
    return {
      ok: true,
      identity: { lmsId: account.lmsId, name: account.name, email: demoEmail(account.username) },
    };
  },
};
```

- [ ] **Step 5: Create `src/features/lms/live-client.ts`**

```ts
import type { LmsClient } from "./types";

// Replaced in Phase 10, once the teacher provides the API details.
// Until then it reports the LMS as unavailable, so live mode can never accept a login.
export const liveLmsClient: LmsClient = {
  async verifyCredentials() {
    return { ok: false, reason: "unavailable" };
  },
};
```

- [ ] **Step 6: Create `src/features/lms/index.ts`**

```ts
import { liveLmsClient } from "./live-client";
import { mockLmsClient } from "./mock-client";
import type { LmsClient } from "./types";

export function isDemoMode(mode = process.env.LMS_MODE): boolean {
  return mode === "mock";
}

export function getLmsClient(mode = process.env.LMS_MODE): LmsClient {
  return isDemoMode(mode) ? mockLmsClient : liveLmsClient;
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/features/lms/lms.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/features/lms
git commit -m "feat: add LMS adapter with mock client"
```

---

### Task 4: Auth.js sign-in and session helpers

**Files:**
- Create: `src/features/auth/options.ts`, `src/features/auth/session.ts`, `src/types/next-auth.d.ts`, `src/app/api/auth/[...nextauth]/route.ts`

**Interfaces:**
- Consumes: `getLmsClient()`, `prisma`
- Produces:
  - `authOptions`, and `SIGN_IN_ERRORS = { invalid: "InvalidCredentials", unavailable: "LmsUnavailable" }`
  - `type SessionUser = { id: string; name: string; email: string }`
  - `getSessionUser(): Promise<SessionUser | null>`
  - `requireUser(): Promise<SessionUser>`, which redirects to `/sign-in`
  - `getMembership(projectId, userId)`, which returns the member with its project, or `null`
  - `requireMember(projectId)`, which returns `{ user, member, project }`, or shows the not-found page

- [ ] **Step 1: Create `src/types/next-auth.d.ts`**

```ts
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; name: string; email: string };
  }
}
```

- [ ] **Step 2: Create `src/features/auth/options.ts`**

```ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getLmsClient } from "@/features/lms";
import { prisma } from "@/lib/db";

export const SIGN_IN_ERRORS = {
  invalid: "InvalidCredentials",
  unavailable: "LmsUnavailable",
} as const;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/sign-in" },
  providers: [
    CredentialsProvider({
      name: "LMS",
      credentials: {
        username: { label: "LMS username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username?.trim();
        const password = credentials?.password;
        if (!username || !password) throw new Error(SIGN_IN_ERRORS.invalid);

        // The password goes only to the LMS client. It is never saved or logged.
        const result = await getLmsClient().verifyCredentials(username, password);
        if (!result.ok) throw new Error(SIGN_IN_ERRORS[result.reason]);

        const { lmsId, name, email } = result.identity;
        const user = await prisma.user.upsert({
          where: { lmsId },
          update: { name, email, lastLoginAt: new Date() },
          create: { lmsId, name, email, lastLoginAt: new Date() },
        });
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      return session;
    },
  },
};
```

- [ ] **Step 3: Create `src/app/api/auth/[...nextauth]/route.ts`**

```ts
import NextAuth from "next-auth";
import { authOptions } from "@/features/auth/options";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

- [ ] **Step 4: Create `src/features/auth/session.ts`**

```ts
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/features/auth/options";
import { prisma } from "@/lib/db";

export type SessionUser = { id: string; name: string; email: string };

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  return user;
}

export function getMembership(projectId: string, userId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    include: { project: true },
  });
}

export async function requireMember(projectId: string) {
  const user = await requireUser();
  const member = await getMembership(projectId, user.id);
  // People outside a project get "not found", so they can't tell it exists.
  if (!member) notFound();
  return { user, member, project: member.project };
}
```

- [ ] **Step 5: Check that next-auth works with Next 16**

Run `npm run dev`, then:

```bash
curl -s http://localhost:3000/api/auth/providers
```

Expected: JSON naming the `credentials` provider. If this route errors because of Next 16, follow the fallback in the Global Constraints: install `next-auth@5.0.0-beta.32` and stop to rewrite this task for the v5 API before continuing.

- [ ] **Step 6: Run the type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/auth src/types src/app/api/auth
git commit -m "feat: add Auth.js sign-in through the LMS adapter"
```

---

### Task 5: Sample data

**Files:**
- Create: `src/lib/seed-guard.ts`, `prisma/seed.ts`
- Test: `src/lib/seed-guard.test.ts`

**Interfaces:**
- Consumes: `DEMO_ACCOUNTS`, `demoEmail`, the date helpers, `prisma`
- Produces: `assertSeedAllowed(env)`, the four categories, and sample projects with these readiness results: Foundation Day 2026 is At Risk, Capstone Group 3 is On Track, Intramurals 2026 is Behind. Paolo Garcia sits at the workload limit, which demonstrates the warning.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { assertSeedAllowed } from "./seed-guard";

describe("assertSeedAllowed", () => {
  it("allows a reset only with both settings", () => {
    expect(() => assertSeedAllowed({ ALLOW_DEMO_RESET: "true", LMS_MODE: "mock" })).not.toThrow();
  });

  it.each([
    [{ ALLOW_DEMO_RESET: "true", LMS_MODE: "live" }],
    [{ ALLOW_DEMO_RESET: "false", LMS_MODE: "mock" }],
    [{ LMS_MODE: "mock" }],
    [{}],
  ])("refuses %j", (env) => {
    expect(() => assertSeedAllowed(env)).toThrow("Refusing to reset data");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/seed-guard.test.ts`
Expected: FAIL, because `./seed-guard` doesn't exist.

- [ ] **Step 3: Create `src/lib/seed-guard.ts`**

```ts
export function assertSeedAllowed(env: Record<string, string | undefined>): void {
  if (env.ALLOW_DEMO_RESET !== "true" || env.LMS_MODE !== "mock") {
    throw new Error("Refusing to reset data: set ALLOW_DEMO_RESET=true and LMS_MODE=mock.");
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/seed-guard.test.ts`
Expected: PASS

- [ ] **Step 5: Create `prisma/seed.ts`**

```ts
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { DEMO_ACCOUNTS, demoEmail } from "../src/features/lms/mock-client";
import { addDaysToKey, endOfManilaDay, manilaDateKey, startOfManilaDay } from "../src/lib/dates";
import { prisma } from "../src/lib/db";
import { assertSeedAllowed } from "../src/lib/seed-guard";

type Role = "LEAD" | "MEMBER" | "ADVISER";
type Status = "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
type Priority = "LOW" | "MEDIUM" | "HIGH";
type Seat = [username: string, role: Role, committeeCategory?: string, committeeTitle?: string];
type Row = [title: string, category: string, priority: Priority, status: Status, assignee: string | null, deadlineOffset: number, milestone: number | null];

const CATEGORIES = ["Logistics", "Documentation", "Creatives", "Finance"];

const TITLES: Record<string, string[]> = {
  Logistics: ["Reserve the venue", "Arrange chairs and tables", "Coordinate the sound system", "Prepare the registration area", "Arrange transportation", "Set up the stage"],
  Documentation: ["Write the activity proposal", "Prepare attendance sheets", "Take event photos", "Write the narrative report", "Draft the program flow", "Compile the post-activity report"],
  Creatives: ["Design the event poster", "Create social media banners", "Design certificates", "Prepare the stage backdrop", "Edit the highlight video", "Design ID lanyards"],
  Finance: ["Prepare the budget plan", "Collect participation fees", "Canvass supplier prices", "Liquidate expenses", "Prepare the financial report", "Track sponsorship funds"],
};

// [username, category, on-time count, late count]
const PAST: { name: string; start: number; target: number; team: Seat[]; work: [string, string, number, number][] }[] = [
  {
    name: "Foundation Day 2025 (sample)", start: -400, target: -340,
    team: [["maria.santos", "LEAD"], ["juan.delacruz", "MEMBER", "Logistics", "Logistics Head"], ["ana.reyes", "MEMBER", "Documentation", "Documentation Head"], ["paolo.garcia", "MEMBER", "Creatives", "Creatives Head"], ["liza.mendoza", "MEMBER", "Finance", "Finance Officer"], ["carlo.bautista", "MEMBER", "Logistics", "Logistics Member"], ["elena.ramos", "ADVISER"]],
    work: [["juan.delacruz", "Logistics", 5, 1], ["ana.reyes", "Documentation", 4, 0], ["paolo.garcia", "Creatives", 4, 1], ["liza.mendoza", "Finance", 3, 0], ["carlo.bautista", "Logistics", 2, 1], ["maria.santos", "Documentation", 2, 0]],
  },
  {
    name: "Intramurals 2025 (sample)", start: -300, target: -260,
    team: [["juan.delacruz", "LEAD"], ["carlo.bautista", "MEMBER", "Logistics", "Logistics Head"], ["ana.reyes", "MEMBER", "Finance", "Treasurer"], ["paolo.garcia", "MEMBER", "Creatives", "Creatives Head"], ["maria.santos", "MEMBER", "Documentation", "Secretary"], ["mark.villanueva", "ADVISER"]],
    work: [["carlo.bautista", "Logistics", 3, 1], ["ana.reyes", "Finance", 2, 1], ["paolo.garcia", "Creatives", 3, 0], ["maria.santos", "Documentation", 3, 1], ["juan.delacruz", "Logistics", 2, 0]],
  },
  {
    name: "Acquaintance Party 2026 (sample)", start: -150, target: -120,
    team: [["liza.mendoza", "LEAD"], ["paolo.garcia", "MEMBER", "Creatives", "Creatives Head"], ["carlo.bautista", "MEMBER", "Logistics", "Logistics Head"], ["ana.reyes", "MEMBER", "Documentation", "Documentation Head"], ["elena.ramos", "ADVISER"]],
    work: [["paolo.garcia", "Creatives", 2, 2], ["carlo.bautista", "Logistics", 3, 0], ["ana.reyes", "Documentation", 2, 0], ["liza.mendoza", "Finance", 3, 1]],
  },
];

const ACTIVE: { name: string; type: "EVENT" | "ACADEMIC"; start: number; target: number; team: Seat[]; milestones: [string, number][]; rows: Row[] }[] = [
  {
    name: "Foundation Day 2026 (sample)", type: "EVENT", start: -21, target: 14,
    team: [["maria.santos", "LEAD"], ["juan.delacruz", "MEMBER", "Logistics", "Logistics Head"], ["ana.reyes", "MEMBER", "Documentation", "Documentation Head"], ["paolo.garcia", "MEMBER", "Creatives", "Creatives Head"], ["liza.mendoza", "MEMBER", "Finance", "Finance Officer"], ["carlo.bautista", "MEMBER", "Logistics", "Logistics Member"], ["elena.ramos", "ADVISER"]],
    milestones: [["Budget approved", -7], ["Venue and permits confirmed", 2], ["Publicity launched", 6], ["Final run-through", 12]],
    rows: [
      ["Prepare the budget plan", "Finance", "HIGH", "DONE", "liza.mendoza", -18, 0],
      ["Canvass supplier prices", "Finance", "MEDIUM", "DONE", "liza.mendoza", -14, 0],
      ["Write the activity proposal", "Documentation", "HIGH", "DONE", "ana.reyes", -16, 0],
      ["Request venue availability", "Logistics", "MEDIUM", "DONE", "juan.delacruz", -12, 1],
      ["Draft the program flow", "Documentation", "MEDIUM", "DONE", "ana.reyes", -10, 3],
      ["Design the event logo", "Creatives", "MEDIUM", "DONE", "paolo.garcia", -9, 2],
      ["Secure the school permit", "Documentation", "HIGH", "DONE", "ana.reyes", -6, 1],
      ["Collect committee contributions", "Finance", "LOW", "DONE", "liza.mendoza", -4, null],
      ["Arrange the stage layout", "Logistics", "LOW", "DONE", "carlo.bautista", -2, 3],
      ["Design the event poster", "Creatives", "HIGH", "REVIEW", "paolo.garcia", 1, 2],
      ["Confirm the venue reservation", "Logistics", "HIGH", "REVIEW", "juan.delacruz", 2, 1],
      ["Book the sound system", "Logistics", "MEDIUM", "IN_PROGRESS", "carlo.bautista", -1, 3],
      ["Create social media banners", "Creatives", "MEDIUM", "IN_PROGRESS", "paolo.garcia", 3, 2],
      ["Prepare attendance sheets", "Documentation", "LOW", "IN_PROGRESS", "ana.reyes", 5, null],
      ["Design certificates", "Creatives", "LOW", "TODO", "paolo.garcia", 7, null],
      ["Arrange transportation", "Logistics", "MEDIUM", "TODO", "juan.delacruz", 8, 3],
      ["Prepare the financial report", "Finance", "LOW", "TODO", "liza.mendoza", 9, null],
      ["Recruit event volunteers", "Logistics", "MEDIUM", "BACKLOG", null, 10, null],
    ],
  },
  {
    name: "Capstone Group 3 Proposal (sample)", type: "ACADEMIC", start: -30, target: 30,
    team: [["juan.delacruz", "LEAD"], ["ana.reyes", "MEMBER"], ["carlo.bautista", "MEMBER"], ["elena.ramos", "ADVISER"], ["mark.villanueva", "ADVISER"]],
    milestones: [["Proposal outline approved", -14], ["Proposal defense", 30]],
    rows: [
      ["Write the Chapter I draft", "Documentation", "HIGH", "DONE", "ana.reyes", -20, 0],
      ["Write the Chapter II draft", "Documentation", "HIGH", "DONE", "ana.reyes", -12, 1],
      ["Build the ERD", "Documentation", "MEDIUM", "DONE", "carlo.bautista", -10, 1],
      ["Design the prototype screens", "Creatives", "MEDIUM", "DONE", "carlo.bautista", -7, 1],
      ["Review related studies", "Documentation", "MEDIUM", "DONE", "juan.delacruz", -5, 1],
      ["Write the Chapter III draft", "Documentation", "HIGH", "IN_PROGRESS", "ana.reyes", 5, 1],
      ["Prepare the evaluation form", "Documentation", "MEDIUM", "TODO", "juan.delacruz", 12, 1],
      ["Prepare the defense slides", "Creatives", "MEDIUM", "TODO", "carlo.bautista", 20, 1],
    ],
  },
  {
    name: "Intramurals 2026 (sample)", type: "EVENT", start: -10, target: 5,
    team: [["paolo.garcia", "LEAD"], ["carlo.bautista", "MEMBER", "Logistics", "Logistics Head"], ["liza.mendoza", "MEMBER", "Finance", "Treasurer"], ["elena.ramos", "ADVISER"], ["mark.villanueva", "ADVISER"]],
    milestones: [["Team registration closed", -2], ["Opening ceremony", 5]],
    rows: [
      ["Open team registration", "Logistics", "MEDIUM", "DONE", "carlo.bautista", -8, 0],
      ["Schedule the games", "Logistics", "HIGH", "IN_PROGRESS", "carlo.bautista", -1, 1],
      ["Design the team banners", "Creatives", "MEDIUM", "IN_PROGRESS", "paolo.garcia", 2, 1],
      ["Collect registration fees", "Finance", "MEDIUM", "TODO", "liza.mendoza", 1, 0],
      ["Prepare the medals", "Logistics", "LOW", "TODO", "paolo.garcia", 3, 1],
      ["Book the referees", "Logistics", "MEDIUM", "BACKLOG", null, 4, 1],
    ],
  },
];

const today = manilaDateKey(new Date());
const day = (offset: number) => addDaysToKey(today, offset);
const midMorning = (offset: number) => new Date(`${day(offset)}T10:00:00.000+08:00`);
const userId = (username: string) => DEMO_ACCOUNTS.find((a) => a.username === username)!.lmsId.toLowerCase();
const categoryId = (name: string) => `category-${name.toLowerCase()}`;

const members: object[] = [];
const milestones: object[] = [];
const tasks: object[] = [];
const history: object[] = [];
const assignments: object[] = [];
let position = 0;

function addTask(input: { projectId: string; leadId: string; title: string; category: string; priority: Priority; status: Status; assigneeId: string | null; deadlineOffset: number; milestoneId: string | null; doneOffset?: number }) {
  const id = randomUUID();
  const createdAt = midMorning(input.deadlineOffset - 7);
  const completedAt = input.status === "DONE" ? midMorning(input.doneOffset ?? input.deadlineOffset - 1) : null;
  position += 1000;
  tasks.push({
    id, projectId: input.projectId, title: input.title, categoryId: categoryId(input.category), priority: input.priority, status: input.status,
    position, assigneeId: input.assigneeId, milestoneId: input.milestoneId, deadline: endOfManilaDay(day(input.deadlineOffset)),
    completedAt, createdById: input.leadId, createdAt,
  });
  history.push({ id: randomUUID(), taskId: id, fromStatus: null, toStatus: "TODO", changedById: input.leadId, changedAt: createdAt });
  if (input.status !== "TODO" && input.status !== "BACKLOG") {
    history.push({ id: randomUUID(), taskId: id, fromStatus: "TODO", toStatus: input.status, changedById: input.assigneeId ?? input.leadId, changedAt: completedAt ?? midMorning(-1) });
  }
  if (input.assigneeId) {
    assignments.push({ id: randomUUID(), taskId: id, assigneeId: input.assigneeId, assignedById: input.leadId, assignedAt: createdAt });
  }
}

function addTeam(projectId: string, team: Seat[]) {
  for (const [username, role, category, title] of team) {
    members.push({ id: randomUUID(), projectId, userId: userId(username), role, committeeCategoryId: category ? categoryId(category) : null, committeeTitle: title ?? null });
  }
}

async function main() {
  assertSeedAllowed(process.env);
  console.log(`Resetting sample data on ${new URL(process.env.DATABASE_URL!).hostname}`);

  await prisma.notification.deleteMany();
  await prisma.project.deleteMany(); // Cascades to members, milestones, tasks, history and assignments.
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  await prisma.category.createMany({ data: CATEGORIES.map((name) => ({ id: categoryId(name), name })) });
  await prisma.user.createMany({
    data: DEMO_ACCOUNTS.map((a) => ({ id: a.lmsId.toLowerCase(), lmsId: a.lmsId, name: a.name, email: demoEmail(a.username) })),
  });

  const projects: object[] = [];

  for (const past of PAST) {
    const projectId = randomUUID();
    const leadId = userId(past.team[0][0]);
    projects.push({ id: projectId, name: past.name, type: "EVENT", status: "ARCHIVED", startDate: startOfManilaDay(day(past.start)), targetDate: endOfManilaDay(day(past.target)), createdById: leadId });
    addTeam(projectId, past.team);
    let titleIndex = 0;
    for (const [username, category, onTime, late] of past.work) {
      for (let i = 0; i < onTime + late; i++) {
        const deadlineOffset = past.target - (i + 1) * 2;
        addTask({
          projectId, leadId, title: TITLES[category][titleIndex++ % TITLES[category].length], category, priority: "MEDIUM", status: "DONE",
          assigneeId: userId(username), deadlineOffset, milestoneId: null,
          doneOffset: i < onTime ? deadlineOffset - 1 : deadlineOffset + 2,
        });
      }
    }
  }

  for (const active of ACTIVE) {
    const projectId = randomUUID();
    const leadId = userId(active.team[0][0]);
    projects.push({ id: projectId, name: active.name, type: active.type, status: "ACTIVE", startDate: startOfManilaDay(day(active.start)), targetDate: endOfManilaDay(day(active.target)), createdById: leadId });
    addTeam(projectId, active.team);
    const milestoneIds = active.milestones.map(([title, offset]) => {
      const id = randomUUID();
      milestones.push({ id, projectId, title, dueDate: endOfManilaDay(day(offset)) });
      return id;
    });
    for (const [title, category, priority, status, assignee, deadlineOffset, milestone] of active.rows) {
      addTask({ projectId, leadId, title, category, priority, status, assigneeId: assignee ? userId(assignee) : null, deadlineOffset, milestoneId: milestone === null ? null : milestoneIds[milestone] });
    }
  }

  await prisma.project.createMany({ data: projects as never });
  await prisma.projectMember.createMany({ data: members as never });
  await prisma.milestone.createMany({ data: milestones as never });
  await prisma.task.createMany({ data: tasks as never });
  await prisma.taskStatusHistory.createMany({ data: history as never });
  await prisma.taskAssignment.createMany({ data: assignments as never });

  console.log(`Created ${projects.length} projects and ${tasks.length} tasks.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 6: Run it on the `dev` database**

```bash
npm run db:seed
```

Expected: `Created 6 projects and ... tasks.`, and the hostname printed is the `dev` branch.

- [ ] **Step 7: Commit**

```bash
git add src/lib/seed-guard.ts src/lib/seed-guard.test.ts prisma/seed.ts
git commit -m "feat: add sample data with a reset guard"
```

---

### Task 6: Guest home page, sign-in page and signed-in layout

Invoke the `frontend-design` skill before starting this task. It sets the look for every later screen.

**Files:**
- Modify: `src/app/layout.tsx` (title "StudentDesk", add the sonner `Toaster`), `src/app/page.tsx`
- Create: `src/app/sign-in/page.tsx`, `src/app/sign-in/sign-in-form.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/home/page.tsx`, `src/app/not-found.tsx`, `src/components/sign-out-button.tsx`

**Interfaces:**
- Consumes: `getSessionUser`, `requireUser`, `isDemoMode`, `DEMO_ACCOUNTS`, `DEMO_PASSWORD`, `SIGN_IN_ERRORS`
- Produces: the `(app)` route group, whose pages are signed-in only, and the `/home` route that later phases fill in

**Screens:**
- **`/` guest home page:** redirects to `/home` if signed in. Explains the platform's purpose, core features (board, recommendations, dashboards, email updates) and how to get started, with a "Sign in with LMS" button. Works at phone width.
- **`/sign-in`:** the form below. In demo mode it shows "Demo mode: LMS not yet connected" and quick-pick buttons.
- **`(app)` layout:** calls `requireUser()`, and shows the logo, Home and Projects links, the user's name and a sign-out button. In demo mode it shows a small "Demo mode: sample data" badge.
- **`/home`:** a greeting for now. Phase 5 replaces it with My Work.

- [ ] **Step 1: Create `src/app/sign-in/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getSessionUser } from "@/features/auth/session";
import { isDemoMode } from "@/features/lms";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/features/lms/mock-client";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage() {
  if (await getSessionUser()) redirect("/home");
  const demo = isDemoMode();
  const quickPicks = demo
    ? DEMO_ACCOUNTS.filter((a) => a.quickPick).map((a) => ({ label: a.quickPick!, username: a.username, name: a.name }))
    : [];
  return <SignInForm demoPassword={demo ? DEMO_PASSWORD : null} quickPicks={quickPicks} />;
}
```

- [ ] **Step 2: Create `src/app/sign-in/sign-in-form.tsx`**

Style it with the design from `frontend-design`, but keep this behavior:

```tsx
"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ERROR_MESSAGES: Record<string, string> = {
  InvalidCredentials: "That username or password is wrong.",
  LmsUnavailable: "The LMS can't be reached right now. Please try again in a few minutes.",
};

type QuickPick = { label: string; username: string; name: string };

export function SignInForm({ demoPassword, quickPicks }: { demoPassword: string | null; quickPicks: QuickPick[] }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await signIn("credentials", { username, password, redirect: false });
    setPending(false);
    if (result?.ok) {
      router.push("/home");
      router.refresh();
      return;
    }
    setError(ERROR_MESSAGES[result?.error ?? ""] ?? "Something went wrong. Please try again.");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-4">
      <h1 className="text-2xl font-semibold">Sign in with LMS</h1>
      {demoPassword && (
        <div className="rounded-md border p-3 text-sm">
          <p className="font-medium">Demo mode: LMS not yet connected</p>
          <p className="mb-2">These are sample accounts. Pick one to fill in the form.</p>
          <div className="flex flex-wrap gap-2">
            {quickPicks.map((pick) => (
              <Button
                key={pick.username}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setUsername(pick.username);
                  setPassword(demoPassword);
                }}
              >
                {pick.label}: {pick.name}
              </Button>
            ))}
          </div>
        </div>
      )}
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="username">LMS username</Label>
          <Input id="username" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Create `src/components/sign-out-button.tsx`**

```tsx
"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
      Sign out
    </Button>
  );
}
```

- [ ] **Step 4: Build the remaining screens as described above**

Create `src/app/page.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/home/page.tsx` and `src/app/not-found.tsx`.

- [ ] **Step 5: Check it in a browser, on `npm run dev`**

Using the built-in browser on `localhost:3000`:
- Sign in with each quick-pick account, and sign out.
- A wrong password shows the "wrong" message.
- With `LMS_MODE=live` in `.env`, signing in shows the "can't be reached" message. Set it back to `mock` afterward.
- Opening `/home` while signed out goes to `/sign-in`.
- Check the guest home page at phone width.

- [ ] **Step 6: Run all checks**

```bash
npm test
npx tsc --noEmit
npm run build
```

Expected: everything passes.

- [ ] **Step 7: Commit and push for preview**

```bash
git add -A
git commit -m "feat: add guest home page, sign-in page and signed-in layout"
git push -u origin phase-1-sign-in
```

## Phase 1 checklist for the user

Use the preview URL.

1. The guest home page explains StudentDesk and has a "Sign in with LMS" button. Try it on your phone too.
2. The sign-in page shows the demo-mode notice. Sign in as Lead, then sign out. Repeat for Member and Adviser.
3. Type a wrong password. You should see "That username or password is wrong."
4. While signed out, open `/home` directly. You should land on the sign-in page.
5. Tell me anything that looks off, including how the design feels. This sets the look for the rest of the system.
