# Phase 0: Setup

**Read first:** [the overview](../2026-11-04-studentdesk.md), which holds the Global Constraints.

**Done when:** a live URL's `/api/health` route reports that it reached Neon.

The database schema is done here rather than in Phase 1, so the deploy check runs against the real tables.

**Needs from the user:** the GitHub repo URL, plus Neon, Vercel and Gmail accounts (spec Section 16).

---

### Task 1: Create the app with pinned packages

**Files:**
- Create: the Next.js app in the project root, `vercel.json`, `vitest.config.ts`, `.env.example`
- Modify: `package.json`, `.gitignore`

**Interfaces:**
- Consumes: nothing
- Produces: the `@/` import alias for `src/`, and the scripts `test`, `test:e2e`, `db:migrate`, `db:deploy`, `db:seed`

- [ ] **Step 1: Generate the app**

```bash
npx create-next-app@16.4.5 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --turbopack --yes
```

Expected: success. `docs/` is an allowed existing folder and stays untouched.

- [ ] **Step 2: Pin the framework and install everything else**

```bash
npm install --save-exact next@16.4.5 react@19.3.1 react-dom@19.3.1 react-is@19.3.1 @prisma/client@7.10.1 @prisma/adapter-neon@7.10.1 next-auth@4.24.15 zod@4.6.7 nodemailer@7.0.13 @tanstack/react-query@5.105.3 @dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0 recharts@3.10.1
npm install --save-exact -D prisma@7.10.1 tailwindcss@4.3.4 @tailwindcss/postcss@4.3.4 vitest@5.1.0 @playwright/test@1.64.1 @types/nodemailer tsx dotenv
```

Expected: no `ERESOLVE` errors. If one names `nodemailer` or `next-auth`, stop and check the versions against the Global Constraints.

- [ ] **Step 3: Set up shadcn/ui**

```bash
npx shadcn@4.23.0 init --yes --base-color neutral
npx shadcn@4.23.0 add --yes button input label textarea select dialog dropdown-menu table card badge tabs sonner skeleton separator avatar tooltip
```

- [ ] **Step 4: Edit `package.json`**

Set the name, the Node version and the scripts, keeping the generated `dependencies`:

```json
{
  "name": "studentdesk",
  "engines": { "node": "24.x" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:seed": "tsx prisma/seed.ts",
    "postinstall": "prisma generate"
  }
}
```

npm will warn about `engines` on the local Node 25. That warning is fine to ignore.

- [ ] **Step 5: Create `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["sin1"]
}
```

- [ ] **Step 6: Create `vitest.config.ts`**

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 7: Create `.env.example`**

```bash
# Neon: use the dev branch locally
DATABASE_URL=
DIRECT_URL=

# Auth.js
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# mock or live
LMS_MODE=mock
LMS_BASE_URL=

# log or smtp
EMAIL_MODE=log
GMAIL_USER=
GMAIL_APP_PASSWORD=
EMAIL_FROM=StudentDesk
DEMO_INBOX=

CRON_SECRET=
APP_URL=http://localhost:3000
ALLOW_DEMO_RESET=true
```

- [ ] **Step 8: Update `.gitignore`**

Add these lines, keeping the generated `.env*` rule above them:

```
!.env.example
/src/generated
/test-results
/playwright-report
```

- [ ] **Step 9: Make the local `.env` with generated secrets, without printing them**

```bash
cp .env.example .env
for key in NEXTAUTH_SECRET CRON_SECRET; do sed -i "s|^$key=.*|$key=$(openssl rand -base64 32 | tr -d '/+=')|" .env; done
```

- [ ] **Step 10: Check it builds, then make the first commit**

```bash
npm run build
git init -b main
git add -A
git status --short | grep -E '(^|/)\.env$' && echo "STOP: .env is staged" || echo "OK: .env not staged"
git commit -m "chore: scaffold StudentDesk with pinned stack and add spec and plan"
```

Expected: the build passes and the check prints `OK`.

---

### Task 2: Connect the database and create the schema

**Files:**
- Create: `prisma/schema.prisma`, `prisma.config.ts`, `src/lib/db.ts`, `src/app/api/health/route.ts`

**Interfaces:**
- Consumes: `DATABASE_URL`, `DIRECT_URL`
- Produces: `prisma` from `@/lib/db`, and the generated types and enums from `@/generated/prisma/client`

- [ ] **Step 1: User step: paste the `dev` connection strings**

In the Neon console, create a branch named `dev`. Open **Connect** on that branch and paste into `.env`:
- the **pooled** string (with `-pooler`) as `DATABASE_URL`
- the **direct** string as `DIRECT_URL`

- [ ] **Step 2: Create `prisma.config.ts`**

```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // Plain process.env so `prisma generate` still works on Vercel, which has no direct URL.
  datasource: { url: process.env.DIRECT_URL ?? "" },
});
```

- [ ] **Step 3: Create `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum ProjectType {
  EVENT
  ACADEMIC
}

enum ProjectStatus {
  ACTIVE
  ARCHIVED
}

enum ProjectRole {
  LEAD
  MEMBER
  ADVISER
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
}

enum TaskStatus {
  BACKLOG
  TODO
  IN_PROGRESS
  REVIEW
  DONE
}

enum NotificationType {
  TASK_ASSIGNED
  TASK_IN_REVIEW
  TASK_RETURNED
  TASK_DONE
  MILESTONE_COMPLETED
  DEADLINE_REMINDER
  TASK_OVERDUE
  READINESS_SUMMARY
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
}

model User {
  id          String    @id @default(cuid())
  lmsId       String    @unique
  email       String    @unique
  name        String
  lastLoginAt DateTime?
  createdAt   DateTime  @default(now())

  memberships     ProjectMember[]
  projectsCreated Project[]           @relation("ProjectCreator")
  assignedTasks   Task[]              @relation("TaskAssignee")
  createdTasks    Task[]              @relation("TaskCreator")
  statusChanges   TaskStatusHistory[]
  assignments     TaskAssignment[]    @relation("AssignmentAssignee")
  assignmentsMade TaskAssignment[]    @relation("AssignmentAssigner")
  notifications   Notification[]
}

model Project {
  id          String        @id @default(cuid())
  name        String
  description String        @default("")
  type        ProjectType
  startDate   DateTime
  targetDate  DateTime
  status      ProjectStatus @default(ACTIVE)
  createdById String
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  createdBy     User            @relation("ProjectCreator", fields: [createdById], references: [id])
  members       ProjectMember[]
  milestones    Milestone[]
  tasks         Task[]
  notifications Notification[]
}

model ProjectMember {
  id                  String      @id @default(cuid())
  projectId           String
  userId              String
  role                ProjectRole
  committeeCategoryId String?
  committeeTitle      String?
  joinedAt            DateTime    @default(now())

  project           Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user              User      @relation(fields: [userId], references: [id])
  committeeCategory Category? @relation(fields: [committeeCategoryId], references: [id])

  @@unique([projectId, userId])
  @@index([userId])
}

model Category {
  id   String @id @default(cuid())
  name String @unique

  tasks   Task[]
  members ProjectMember[]
}

model Milestone {
  id          String    @id @default(cuid())
  projectId   String
  title       String
  dueDate     DateTime
  completedAt DateTime?
  createdAt   DateTime  @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tasks   Task[]

  @@index([projectId, dueDate])
}

model Task {
  id              String       @id @default(cuid())
  projectId       String
  title           String
  description     String       @default("")
  categoryId      String
  priority        TaskPriority @default(MEDIUM)
  status          TaskStatus   @default(BACKLOG)
  position        Float        @default(0)
  assigneeId      String?
  milestoneId     String?
  deadline        DateTime
  deliverableUrl  String?
  deliverableNote String?
  completedAt     DateTime?
  createdById     String
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  project       Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)
  category      Category            @relation(fields: [categoryId], references: [id])
  assignee      User?               @relation("TaskAssignee", fields: [assigneeId], references: [id])
  milestone     Milestone?          @relation(fields: [milestoneId], references: [id], onDelete: SetNull)
  createdBy     User                @relation("TaskCreator", fields: [createdById], references: [id])
  history       TaskStatusHistory[]
  assignments   TaskAssignment[]
  notifications Notification[]

  @@index([projectId, status])
  @@index([assigneeId, status])
  @@index([deadline])
}

model TaskStatusHistory {
  id          String      @id @default(cuid())
  taskId      String
  fromStatus  TaskStatus?
  toStatus    TaskStatus
  changedById String
  note        String?
  changedAt   DateTime    @default(now())

  task      Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  changedBy User @relation(fields: [changedById], references: [id])

  @@index([taskId, changedAt])
}

model TaskAssignment {
  id              String   @id @default(cuid())
  taskId          String
  assigneeId      String
  assignedById    String
  recommendedRank Int?
  assignedAt      DateTime @default(now())

  task       Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  assignee   User @relation("AssignmentAssignee", fields: [assigneeId], references: [id])
  assignedBy User @relation("AssignmentAssigner", fields: [assignedById], references: [id])

  @@index([taskId])
}

model Notification {
  id          String             @id @default(cuid())
  recipientId String
  projectId   String?
  taskId      String?
  type        NotificationType
  subject     String
  body        String
  dedupeKey   String             @unique
  status      NotificationStatus @default(PENDING)
  attempts    Int                @default(0)
  sentAt      DateTime?
  lastError   String?
  createdAt   DateTime           @default(now())

  recipient User     @relation(fields: [recipientId], references: [id])
  project   Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  task      Task?    @relation(fields: [taskId], references: [id], onDelete: SetNull)

  @@index([status, attempts])
}
```

- [ ] **Step 4: Validate and create the first migration on `dev`**

```bash
npx prisma validate
npx prisma migrate dev --name init
```

Expected: `Your database is now in sync with your schema`, and `src/generated/prisma/` exists.

- [ ] **Step 5: Create `src/lib/db.ts`**

```ts
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

function createClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Reuse one client across hot reloads in development.
export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 6: Create `src/app/api/health/route.ts`**

```ts
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, database: "connected" });
  } catch {
    return Response.json({ ok: false, database: "unreachable" }, { status: 503 });
  }
}
```

- [ ] **Step 7: Check it locally**

Run `npm run dev`, then in another terminal:

```bash
curl -s http://localhost:3000/api/health
```

Expected: `{"ok":true,"database":"connected"}`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add database schema, Prisma client and health check"
```

---

### Task 3: First deploy

**Files:** none

**Interfaces:**
- Consumes: `/api/health`
- Produces: the live URL, used as `APP_URL`, and preview URLs for every later phase

- [ ] **Step 1: Push to GitHub, using the repo URL from the user**

```bash
git remote add origin <REPO_URL_FROM_USER>
git push -u origin main
```

Windows may open a browser for the user to sign in to GitHub.

- [ ] **Step 2: Apply the migration to the `main` database**

Run from the user's terminal so the string stays out of the logs. They paste the **direct** string for Neon's `main` branch in place of `<NEON_MAIN_DIRECT_URL>`:

```bash
DIRECT_URL="<NEON_MAIN_DIRECT_URL>" npx prisma migrate deploy
```

- [ ] **Step 3: User step: import the repo into Vercel**

In Vercel: **Add New → Project → Import** `studentdesk`. Before deploying, add these under Environment Variables:

| Variable | Production | Preview |
|---|---|---|
| `DATABASE_URL` | Neon `main`, pooled | Neon `dev`, pooled |
| `NEXTAUTH_SECRET` | a new random value | a different random value |
| `CRON_SECRET` | a new random value | a different random value |
| `LMS_MODE` | `mock` | `mock` |
| `EMAIL_MODE` | `log` | `log` |
| `APP_URL` | the production URL, added after the first deploy | leave empty |

To make each random value, run `openssl rand -base64 32` in Git Bash and paste the result.

Set `NEXTAUTH_URL` to the live URL for **Production** only, plus `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` if Google sign-in is ready. Don't set `ALLOW_DEMO_RESET` on Vercel.

- [ ] **Step 4: Check the live site**

```bash
curl -s https://<PROJECT>.vercel.app/api/health
```

Expected: `{"ok":true,"database":"connected"}`

If the deploy shows "does not support collaboration", make the repo public or check the commit author (spec Section 15).

## Phase 0 checklist for the user

1. Open `https://<PROJECT>.vercel.app/api/health`. It should show `"database":"connected"`.
2. In Vercel, open the latest deployment. Under its details, the function region should say Singapore (`sin1`).
3. In Neon, confirm the project is in Singapore and that it has both `main` and `dev` branches.
