# StudentDesk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working, deployed StudentDesk for the oral defense on Saturday, November 7, 2026, then finish the remaining RAD work for the final defense.

**Architecture:** One Next.js App Router app with Server Actions for changes and polled GET route handlers for live data. Rules (permissions, task moves, scoring, readiness) are pure functions. Sign-in goes through an LMS adapter, and email goes through a database-backed queue.

**Tech Stack:** Next.js, TypeScript, Prisma, PostgreSQL on Neon, Auth.js, Tailwind CSS, shadcn/ui, dnd-kit, Recharts, TanStack Query, Zod, Nodemailer with Gmail SMTP, Vercel with Cron Jobs.

**Spec:** `docs/superpowers/specs/2026-11-04-studentdesk-design.md`

## Phase files

| Phase | File | When |
|---|---|---|
| 0. Setup | [phase-0-setup.md](2026-11-04-studentdesk/phase-0-setup.md) | Wed evening |
| 1. Sign-in | [phase-1-sign-in.md](2026-11-04-studentdesk/phase-1-sign-in.md) | Wed night |
| 2. Projects and tasks | [phase-2-projects-tasks.md](2026-11-04-studentdesk/phase-2-projects-tasks.md) | Thu morning |
| 3. Kanban board | [phase-3-board.md](2026-11-04-studentdesk/phase-3-board.md) | Thu midday |
| 4. Recommendations | [phase-4-recommendations.md](2026-11-04-studentdesk/phase-4-recommendations.md) | Thu afternoon |
| 5. Dashboards | [phase-5-dashboards.md](2026-11-04-studentdesk/phase-5-dashboards.md) | Thu night to Fri morning |
| 6. Email and cron | [phase-6-email-cron.md](2026-11-04-studentdesk/phase-6-email-cron.md) | Fri midday |
| 7. Demo prep | [phase-7-demo-prep.md](2026-11-04-studentdesk/phase-7-demo-prep.md) | Fri afternoon to night |
| 8 to 13. After the defense | [phases-8-13-after-defense.md](2026-11-04-studentdesk/phases-8-13-after-defense.md) | Dates set later |

**Checkpoints:** Phase 3 live by Thursday 3 PM. Phase 5 live by Friday noon. Features stop Friday 6 PM. Code freezes Friday night.

**If behind, cut in this order:** extra mobile polish, then the daily cron (the "send now" button stays), then the timeline view.

## Global Constraints

- Exact versions, installed with `--save-exact`: `next` 16.4.5, `react` and `react-dom` 19.3.1, `prisma`, `@prisma/client` and `@prisma/adapter-neon` 7.10.1, `next-auth` 4.24.15, `tailwindcss` 4.3.4, shadcn CLI 4.23.0, `@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0, `recharts` 3.10.1, `@tanstack/react-query` 5.105.3, `zod` 4.6.7, `nodemailer` 10.3.1 (with an npm override for next-auth's optional peer), `vitest` 5.1.0, `@playwright/test` 1.64.1.
- Never install with `@latest`, because npm's `latest` tag for `prisma` points to an 8.0 release candidate.
- If `next-auth` 4.24.15 fails with Next 16 during Phase 1, fall back to `5.0.0-beta.32`.
- Vercel region `sin1`, Node 24.x. Neon region `aws-ap-southeast-1`.
- Every date is shown and calculated in `Asia/Manila`.
- Every change checks the session, then Zod validation, then the permission, on the server. Every read checks project membership first.
- LMS passwords are never saved or logged.
- Secrets live only in environment variables, and `.env` stays out of Git.
- Sample data is labelled as sample. Sample accounts only email plus-addresses on `DEMO_INBOX`.
- `npm run db:seed` refuses to run unless `ALLOW_DEMO_RESET=true` and `LMS_MODE=mock`.
- The board refreshes every 10 seconds and dashboards every 15 seconds, only while the tab is visible.
- Left out for now: file upload, task comments or chat, sprints, email invites or join links, in-app notifications, a weights screen, an admin role.

## Review Focus

Failure modes the spec implies that a person is most likely to hit. Each one has a test in the task that owns the code.

1. **A deadline near Manila midnight:** a task finished at 11:30 PM Manila on its deadline day counts as on time, whatever time zone the server runs in. Test in Phase 1, Task 2.
2. **A stale board:** someone drags a card that was reassigned to another person a few seconds ago. The server refuses, the card returns and a message explains why. Test in Phase 3, Task 1.
3. **A pasted deliverable link:** `drive.google.com/x` with no `https://` is accepted and fixed, and `javascript:alert(1)` is refused. Test in Phase 2, Task 1.
4. **Names and text in emails:** `Bañas` stays intact and `<script>` in a task title is shown as text, not run. Test in Phase 6, Task 2.
5. **Thin data in recommendations:** a project with one candidate, no candidates, nobody with history, or everyone at the workload limit still returns sensible suggestions with no division by zero. Test in Phase 4, Task 1.

## How this plan handles detail

- **Rules and data** (schema, permissions, move rules, scoring, readiness, notification keys, the LMS adapter) have complete code and tests in the phase files.
- **Screens** list the exact files, data and behavior instead of full JSX. Writing every screen twice would use time the deadline doesn't have, and how they look gets decided while building, using the `frontend-design` skill.

## File map

```
src/app/                                  pages, layouts, route handlers
src/components/ui/                        shadcn/ui components
src/components/query-provider.tsx         TanStack Query provider
src/features/auth/options.ts              Auth.js options
src/features/auth/session.ts              requireUser, requireMember
src/features/lms/types.ts                 LmsClient interface
src/features/lms/mock-client.ts           demo accounts
src/features/lms/live-client.ts           real API (Phase 10)
src/features/lms/index.ts                 picks a client from LMS_MODE
src/features/projects/actions.ts          project and milestone changes
src/features/projects/members.ts          member changes
src/features/projects/member-rules.ts     last-lead rule (pure)
src/features/projects/queries.ts          project reads
src/features/tasks/transitions.ts         move rules (pure)
src/features/tasks/positions.ts           card ordering (pure)
src/features/tasks/actions.ts             task changes
src/features/tasks/queries.ts             board and task reads
src/features/recommendations/engine.ts    scoring (pure)
src/features/recommendations/loader.ts    builds candidate records
src/features/metrics/calculations.ts      readiness and counts (pure)
src/features/metrics/queries.ts           dashboard reads
src/features/notifications/keys.ts        dedupe keys (pure)
src/features/notifications/templates.ts   email text (pure)
src/features/notifications/queue.ts       saves notification rows
src/features/notifications/mailer.ts      Nodemailer, sendPending
src/features/notifications/daily-job.ts   reminders and reports
src/lib/db.ts                             Prisma client
src/lib/dates.ts                          Manila date helpers
src/lib/permissions.ts                    role rules (pure)
src/lib/action-result.ts                  shared action return type
src/lib/validators/                       Zod schemas
prisma/schema.prisma                      database schema
prisma/seed.ts                            sample data
tests/e2e/                                Playwright test
```

## How each phase runs

1. Create the branch `phase-N-short-name` from `main`.
2. Work through the tasks in order, using test-first steps for pure logic.
3. Give the user the command to push the branch, which creates a Vercel preview URL.
4. Give the user the phase's checklist and that URL.
5. When the user passes the checklist, guide them to merge into `main`, which updates the live site.

Run migrations by hand with `npx prisma migrate deploy`: on the `dev` database when a phase's schema changes, and on `main` before merging. After Phase 1 merges, seed the `main` database once, using the command in Phase 7, Task 4, so the live site has sample data if time runs short.
Commit messages have no attribution trailer.

Claude commits locally. The user does every push, merge to `main` and Vercel deploy, following step-by-step guidance.
