# StudentDesk System Design

**Date:** November 4, 2026
**Based on:** the StudentDesk manuscript, Chapters I to III
**Status:** Awaiting review

## 1. Goal

Build StudentDesk as the manuscript describes it, in two tracks:

- **Defense build:** a working, deployed system to show at the oral defense on Saturday, November 7, 2026.
- **After the defense:** the remaining RAD work, ending in the evaluated and deployed system for the final defense. That date isn't known yet, so these phases are ordered but not dated.

### What success means on Saturday

1. The system is live on a public URL, hosted in Singapore.
2. The Chapter III workflow runs live: sign in, create a project, assign a task using a suggestion, move the task across the board, and receive the email.
3. Lead, member and adviser accounts each see only what their role allows.
4. Recommendations come from a real calculation over stored records, with a reason for each suggestion.
5. The team can say clearly what is real and what is still pending.

### What won't be finished by Saturday

- The real LMS connection, unless the teacher's API and a test account arrive by Friday.
- User interviews, prototype feedback cycles and the ISO/IEC 25010 evaluation. This spec assumes the interviews haven't happened yet.
- Real past records. The demo uses sample data, labelled as sample.

## 2. Stack

This is the Chapter III stack, with versions pinned. Don't install with `@latest`, because npm's `latest` tag for `prisma` currently points to an 8.0 release candidate.

| Purpose | Package | Version |
|---|---|---|
| Framework | `next`, `react`, `react-dom` | 16.4.5, 19.3.1, 19.3.1 |
| Database access | `prisma`, `@prisma/client`, `@prisma/adapter-neon` | 7.10.1 |
| Sign-in | `next-auth` (Auth.js) | 4.24.15 |
| Styling | `tailwindcss`, shadcn/ui | 4.3.4, CLI 4.23.0 |
| Drag and drop | `@dnd-kit/core`, `@dnd-kit/sortable` | 6.3.1, 10.0.0 |
| Charts | `recharts` | 3.10.1 |
| Data refresh | `@tanstack/react-query` | 5.105.3 |
| Validation | `zod` | 4.6.7 |
| Email | `nodemailer` | 10.3.1 |
| Tests | `vitest`, `@playwright/test` | 5.1.0, 1.64.1 |

- **Auth.js version:** v4.24.15 is the stable release and supports Next 16. v5 is still in beta. If v4 fails with Next 16 during Phase 1, fall back to `5.0.0-beta.32`.
- **Nodemailer version:** 10.3.1, because 7.x has open security advisories. An npm override lets it satisfy next-auth's optional peer, which only its unused email provider needs.
- **Hosting:** Vercel (free Hobby plan) in `sin1`, on Node 24.x. Neon (free plan) in `aws-ap-southeast-1`.
- **Prisma with Neon:** the app connects through the pooled connection string using the adapter. Migrations use the direct connection string, set in `prisma.config.ts`.
- **Time zone:** every date is shown and calculated in `Asia/Manila`.

## 3. Scope

### In the defense build

- Guest home page
- "Sign in with LMS" through a mock LMS
- Projects: create, edit, archive, with type event or academic
- Members: add, remove, set role, set committee title and category
- Milestones
- Tasks: title, description, category, priority, assignee, deadline, milestone
- Five-stage Kanban board with drag and drop
- Deliverable submission as a link and a note
- Recommendations with reasons, and a member history view
- My Work page, project dashboard, adviser overview, timeline
- Email alerts, Readiness Summary Report, daily scheduled job

### Left out for now

These can return in Phase 11 if users ask for them:

- File upload
- Task comments or chat (only the send-back note exists)
- Sprints
- Email invites or join links
- In-app notifications
- A screen for changing the weights
- An admin role

### Excluded by the manuscript

Automated event scheduling, SMS, syncing with external systems other than LMS sign-in, and a native or offline mobile app.

## 4. Architecture

One Next.js App Router application, with no separate backend.

```
Sign-in       Auth.js Credentials → LMS adapter (mock now, real API later)
Changes       Server Action → session check → Zod check → permission check → Prisma → Neon
Live updates  TanStack Query polls GET route handlers while the tab is visible
Emails        Notification row saved with the change → sent after the response → Gmail
Daily job     Vercel Cron → reminders, Readiness Reports, retries of failed emails
```

### Code layout

```
src/
  app/                     pages, layouts and route handlers
  components/              shared UI, including shadcn/ui
  features/
    auth/                  Auth.js options and session helpers
    lms/                   LmsClient interface, mock client, live client
    projects/              project, member and milestone actions and queries
    tasks/                 task actions and queries, transitions.ts (pure)
    recommendations/       engine.ts (pure), data loader, panel
    metrics/               calculations.ts (pure), dashboard queries
    notifications/         queue, mailer, templates, daily job
  lib/
    db.ts                  Prisma client with the Neon adapter
    permissions.ts         role rules (pure)
    dates.ts               Asia/Manila helpers
    validators/            Zod schemas
prisma/                    schema, migrations, seed
tests/                     Playwright browser test
```

Files marked pure contain no database code, so they can be tested and explained on their own.

### Environment variables

`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `LMS_MODE`, `LMS_BASE_URL`, `EMAIL_MODE`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM`, `DEMO_INBOX`, `CRON_SECRET`, `APP_URL`, `ALLOW_DEMO_RESET`. `NEXTAUTH_URL` is set only for local development, so Vercel preview URLs keep working.

### Environments and Git

- **Neon `main` branch:** the live site's database.
- **Neon `dev` branch:** local development, preview sites and automated tests, so testing never touches the demo data.
- **Git:** each phase is built on its own branch, which gives a Vercel preview URL to test. Once the phase's checklist passes, the branch merges into `main`, which updates the live site.

## 5. Data model

**User:** `id`, `lmsId` (unique), `email` (unique), `name`, `lastLoginAt`, `createdAt`.

**Project:** `id`, `name`, `description`, `type` (EVENT or ACADEMIC), `startDate`, `targetDate`, `status` (ACTIVE or ARCHIVED), `createdById`, `createdAt`, `updatedAt`.

**ProjectMember:** `id`, `projectId`, `userId`, `role` (LEAD, MEMBER or ADVISER), `committeeCategoryId` (optional), `committeeTitle` (optional), `joinedAt`. One row per person per project.

**Category:** `id`, `name` (unique). Seeded with Logistics, Documentation, Creatives and Finance. It's a table so that adding a category doesn't change the schema.

**Milestone:** `id`, `projectId`, `title`, `dueDate`, `completedAt` (optional), `createdAt`. A milestone is complete when the lead marks it complete, or when it has tasks and all of them are Done.

**Task:** `id`, `projectId`, `title`, `description`, `categoryId`, `priority` (LOW, MEDIUM or HIGH), `status` (BACKLOG, TODO, IN_PROGRESS, REVIEW or DONE), `position`, `assigneeId` (optional), `milestoneId` (optional), `deadline`, `deliverableUrl` (optional), `deliverableNote` (optional), `completedAt` (optional), `createdById`, `createdAt`, `updatedAt`.

**TaskStatusHistory:** `id`, `taskId`, `fromStatus` (optional), `toStatus`, `changedById`, `note` (optional), `changedAt`.

**TaskAssignment:** `id`, `taskId`, `assigneeId`, `assignedById`, `recommendedRank` (1 to 3, empty if the pick wasn't a suggestion), `assignedAt`.

**Notification:** `id`, `recipientId`, `projectId` (optional), `taskId` (optional), `type`, `subject`, `body`, `dedupeKey` (unique), `status` (PENDING, SENT or FAILED), `attempts`, `sentAt` (optional), `lastError` (optional), `createdAt`.

### Rules that keep the data correct

- A task's deadline is a date, stored as the end of that day in Manila.
- `completedAt` is set when a task enters Done and cleared if it leaves Done.
- A task move updates `Task`, adds a `TaskStatusHistory` row and adds any `Notification` rows in one database transaction.
- Done tasks can't be deleted, because recommendations depend on their records.
- Removing a member unassigns their unfinished tasks. Finished tasks keep their record.

## 6. Roles and permissions

Roles belong to a project, so one person can be a lead on one project and a member on another. Roles are read from the database on every request, as Chapter III specifies.

| Action | Lead | Member | Adviser |
|---|---|---|---|
| View the project, board, dashboard and timeline | Yes | Yes | Yes |
| Edit or archive the project | Yes | No | No |
| Manage members and roles | Yes | No | No |
| Create, edit or delete tasks, and assign them | Yes | No | No |
| See suggestions | Yes | No | No |
| Create or edit milestones | Yes | No | No |
| Move tasks | Any task | Own tasks, between To Do, In Progress and Review | No |
| Submit a deliverable | Any task | Own tasks | No |
| Mark Done, or send back from Review with a note | Yes | No | No |
| Send the Readiness Report now | Yes | No | Yes |

- Anyone signed in can create a project and becomes its lead.
- Leads add people who have signed in at least once.
- A project must always have at least one lead.
- Archived projects are read-only.
- People who aren't in a project get a "not found" page for it.

These are draft rules, to confirm with users in Phase 8.

## 7. Task workflow

Stages are Backlog, To Do, In Progress, Review and Done.

- **Backlog** is the lead's planning space, so members can't move tasks out of it.
- A task needs an assignee before it can enter In Progress, Review or Done.
- **Moving to Review** opens a dialog for the deliverable link and note. Both are optional, since some tasks produce nothing to link.
- **Sending back from Review** opens a dialog that requires a note. The note is saved in the history and emailed to the assignee.
- **Without dragging:** the task detail view has a status dropdown, for phones and keyboard users.
- **Task detail** shows every move and assignment.
- **If two people move the same card,** the last move wins and the next refresh corrects the other screen. The server checks every move again.
- **Refresh rate:** the board refreshes every 10 seconds, dashboards every 15 seconds, and only while the tab is visible. The manuscript's wording of "near real time" is the accurate description of this.

## 8. Recommendation engine

`rankCandidates(task, candidates, weights)` is a pure function. Candidates are the project's leads and members, not advisers. Each person's numbers come from all their records across every project, including archived ones.

| Factor | Weight | Calculation |
|---|---|---|
| Experience | 30% | Their Done tasks in this category ÷ the highest count among the candidates (0 if nobody has any) |
| On-time record | 25% | (on-time Done tasks + 2) ÷ (all Done tasks + 4) |
| Availability | 30% | 1 − (active tasks ÷ 5), never below 0. Active means To Do, In Progress or Review |
| Committee roles | 15% | 1 if they've held a committee role in this category, otherwise 0 |

- **Score:** the weighted sum, shown as a percentage.
- **On-time:** a Done task is on time if it was completed at or before its deadline.
- **Starting point:** the "+2" and "+4" mean everyone starts at 50%, so one on-time task can't outrank a long record.
- **Workload limit:** anyone with 5 or more active tasks ranks below everyone under the limit, whatever their score, and shows a warning.
- **Ties:** fewer active tasks first, then alphabetical by name.
- **Shown to the lead:** the top 3, with one reason per factor. The lead can still choose anyone.
- **No history:** the reason reads "No task history yet", and the score then mostly reflects availability, which spreads work evenly until records build up.
- **Logging:** each assignment stores the suggestion's rank, which gives an acceptance rate for Chapter IV.
- **Weights:** they live in one config file. They're drafts, and the manuscript says they'll be finalized with leads and advisers.

Worked example: 6 Logistics tasks done (the highest in the group), 5 of 6 tasks on time, 1 active task, and a past Logistics Head role.

Score = 0.30 × 1 + 0.25 × 0.70 + 0.30 × 0.80 + 0.15 × 1 = 0.865, shown as 87%.

**Member history view:** shows a person's past roles, Done tasks per category and on-time record. This delivers the manuscript's "Role-History Task Tracking".

## 9. Dashboards

**My Work** (the home page after sign-in): my tasks by due date, overdue count, my projects.

**Project dashboard:**
- Readiness status and completion percentage
- Task counts per stage and per category
- Progress over time, built from the status history
- Overdue tasks and upcoming milestones
- Member workload
- A "Send Readiness Report" button

**Adviser overview:** every project the person advises, with readiness, completion, overdue count and next milestone.

**Timeline:** milestones and task deadlines on a date scale.

### Readiness status (draft rules)

- **Completion** is Done tasks ÷ all tasks.
- **Expected** is the percentage of time passed between `startDate` and `targetDate`, capped at 0 to 100.
- **Behind:** an overdue high-priority task, an overdue milestone, or completion 25 or more points below expected.
- **At Risk:** any overdue task, or completion 10 or more points below expected.
- **On Track:** everything else.
- A project with no tasks shows "No tasks yet".

## 10. Notifications

Each change saves its `Notification` rows with the change itself. Sending happens after the response using Next.js `after()`, so email can't slow down or break a task move. Every dedupe key below also starts with the event type, so a reminder and an overdue notice for the same task never clash.

| Event | Recipients | Dedupe key |
|---|---|---|
| Task assigned | Assignee | assignment ID + recipient |
| Moved to Review | Leads | history ID + recipient |
| Sent back or marked Done | Assignee | history ID + recipient |
| Milestone completed | Leads and advisers | milestone ID + recipient |
| Due today or tomorrow | Assignee | task ID + deadline + recipient |
| Overdue | Assignee and leads | task ID + deadline + recipient |
| Daily Readiness Report | Advisers and leads | project ID + Manila date + recipient |
| "Send now" Readiness Report | Advisers and leads | project ID + timestamp + recipient |

- The person who made a change isn't emailed about it.
- The deadline reminder is timed for the day before the deadline, because the job only runs once a day.
- "Send now" works at most once every 5 minutes per project, and also sends any emails still waiting.
- Archived projects get no reminders or reports.

**Readiness Report contents:** project name, readiness status, completion percentage, counts per stage, overdue tasks, tasks in Review, milestones due within 14 days, and a dashboard link.

**Daily job** at `/api/cron/daily`, schedule `0 23 * * *` (7 AM in Manila, up to 59 minutes late on the free plan):
1. Check the `CRON_SECRET` header.
2. Queue reminders and overdue notices.
3. Queue Readiness Reports.
4. Send waiting and failed emails with fewer than 3 attempts, up to 100 per run.

Running the job twice sends nothing extra, because of the dedupe keys.

**Email modes:** `EMAIL_MODE=log` records emails without sending, for development. `EMAIL_MODE=smtp` sends through Gmail.

**Demo inbox:** sample accounts use plus-addressing on one project Gmail address (`name+lead@gmail.com`), so all the emails land in one inbox you can show live. Sample accounts never email anyone else.

## 11. Sign-in and the LMS adapter

```ts
interface LmsClient {
  verifyCredentials(username: string, password: string): Promise<
    | { ok: true; identity: { lmsId: string; name: string; email: string } }
    | { ok: false; reason: "invalid" | "unavailable" }
  >;
}
```

1. The user enters their LMS username and password.
2. The Auth.js Credentials provider calls the adapter chosen by `LMS_MODE`.
3. On success, the `User` row is created or updated, and the password is discarded.
4. Auth.js issues a 7-day JWT session holding only the user's ID, name and email.

**Mock mode:** a fixed list of fictional accounts. The sign-in page shows a "Demo mode: LMS not yet connected" notice and quick-pick buttons for lead, member and adviser.

**Live mode:** the same interface, using the teacher's API. Mock accounts and the reset script don't work in this mode.

### What to ask the teacher about the API

1. What are the base URL and login endpoint, and is it HTTPS?
2. What does the login request look like? Is an API key needed?
3. What comes back on success? We need a unique ID, full name and **email**.
4. What comes back for a wrong password, and what for a server error?
5. Can we have a test account?
6. Can it be reached from the internet, or only on the campus network? Vercel can't reach a campus-only server.
7. Are there rate limits or an IP allow-list?
8. Is the school fine with another app handling students' LMS passwords?

## 12. Errors and security

- **Every change:** session check, then Zod validation, then permission check, all on the server. Forms show errors beside each field.
- **Every read:** checks project membership first.
- **Failed drag:** the card returns to its old column and a message appears.
- **Failed email:** the change still saves, the error is recorded and the daily job retries.
- **LMS down:** shows "The LMS can't be reached right now", not "wrong password".
- **Slow first load after idle:** pages show loading skeletons while Neon wakes up.
- **LMS passwords:** never saved or logged.
- **Deliverable links:** only `http` and `https` URLs are accepted, which blocks `javascript:` links.
- **Emails:** user text is escaped.
- **Secrets:** only in environment variables, and `.env` stays out of Git.
- **Sample data reset:** `npm run db:seed` wipes and recreates sample data. It refuses to run unless `ALLOW_DEMO_RESET=true` and `LMS_MODE=mock`.
- **Sample dates:** set relative to today, so overdue and upcoming items are still correct after resetting on Saturday.

Sign-in rate limiting waits for Phase 10, because mock accounts hold no real credentials.

## 13. Testing

**Automated, with Vitest:**
- Scoring: the worked example, the workload limit at exactly 5, ties, and no history
- Move rules for every role
- Readiness: exactly 10 and 25 points, no tasks, a past target date
- On-time: completed exactly at the deadline
- Zod rules such as the link check

**Automated, with Playwright:** one full run of the Chapter III workflow against the `dev` database.

**By you:** a short checklist after each phase, tried on that phase's preview URL. A phase merges to the live site only after you pass it.

## 14. Phases

### Before the defense

Together these make the first RAD prototype, built from the manuscript's requirements.

| Phase | When | Work | Done when |
|---|---|---|---|
| 0. Setup | Wed evening | Accounts, repo, Next.js app with pinned packages, shadcn/ui, Neon `main` and `dev` branches, Vercel in `sin1` | A live URL shows a page that reads from Neon |
| 1. Sign-in | Wed night | Prisma schema and first migration, sample data, mock LMS, Auth.js, guest home page, sign-in page, signed-in layout, permission rules | All three demo roles can sign in and out, a wrong password shows the right message, and signed-out visitors can't open app pages |
| 2. Projects and tasks | Thu morning | Projects, members and roles, milestones, task forms, validation | A lead can set up a project from nothing, and members and advisers can't change what they shouldn't |
| 3. Kanban board | Thu midday | Five columns, drag and drop, status dropdown, move rules, deliverable and send-back dialogs, history, task detail, live refresh | Moves are saved, appear in a second browser within about 10 seconds, and a member can't mark a task Done |
| 4. Recommendations | Thu afternoon | Engine and tests, data loader, panel in the task form, logging, member history view | Choosing a category shows the top 3 with reasons, the worked example matches, and the lead can pick someone else |
| 5. Dashboards | Thu night to Fri morning | Metrics and tests, My Work, project dashboard, adviser overview, readiness, timeline | The numbers match the board, and an adviser sees every project they advise |
| 6. Email and cron | Fri midday | Queue, templates, Gmail, event emails, Readiness Report, send-now, daily job | Real emails arrive, a failed email doesn't block a move, and running the job twice sends no duplicates |
| 7. Demo prep | Fri afternoon to night | Mobile check, empty and error states, browser test, demo script, panel Q&A notes, backup recording, a code walkthrough for all four members | The full demo runs clean twice on the live site, and the recording is saved |
| Saturday | Nov 7 | Reset sample data, open the site a few minutes early, rehearse, present | The defense is done |

**Checkpoints:**
- Phase 3 is live by Thursday 3 PM.
- Phase 5 is live by Friday noon.
- Features stop Friday 6 PM, and after that only bugs get fixed.
- Code freezes Friday night.

**If we fall behind, cut in this order:**
1. Extra mobile polish
2. The daily cron (the "send now" button stays)
3. The timeline view

### After the defense

| Phase | RAD phase | Work |
|---|---|---|
| 8 | Requirements Planning | Interviews and observation; confirm roles, permissions, categories, weights, the workload limit, readiness rules and email frequency; apply panel comments; check what the Data Privacy Act of 2012 requires |
| 9 | User Design | Representative users try the system; revise and repeat until they agree; finalize the database schema |
| 10 | Construction | Connect the real LMS, handle missing emails, add sign-in rate limiting |
| 11 | Construction | Apply feedback, add anything left out if users ask for it, load real past records if available, add a way to add members who haven't signed in yet |
| 12 | Cutover | Test cases on desktop and mobile, ISO/IEC 25010 questionnaire, analysis for Chapter IV, final fixes |
| 13 | Cutover | Remove demo mode and sample data, add a privacy notice, set up real accounts, orient users, recheck hosting (Vercel's free plan is for non-commercial personal use) |

## 15. Risks

| Risk | Plan |
|---|---|
| The LMS API arrives late or can't be reached from Vercel | The mock adapter keeps everything working. Question 6 in Section 11 finds out early |
| The LMS API doesn't return email | Ask the user for their email at first sign-in, in Phase 10 |
| Gmail blocks or fails during the demo | Show the sent email from an earlier run in the backup recording |
| Poor internet at the venue | Phone hotspot, plus the backup recording |
| Neon wakes slowly | Open the site a few minutes early |
| Vercel blocks deploys from a private repo | People report this on the free plan when commits come from another author. Use a public repo, or test the first deploy early |
| A library doesn't work with Next 16 | Versions are pinned, and Phase 1 tests sign-in before anything depends on it |

## 16. What only you can set up

Nobody else can create these accounts for you. Don't paste any passwords or connection strings into chat. You'll paste them into a `.env` file and into Vercel's settings yourself.

1. **GitHub:** create an empty repo named `studentdesk` with no README. A public repo avoids the Vercel problem in Section 15 and lets teammates commit later, but anyone can then read the code, so it must never contain secrets or real student data.
2. **Neon:** create a project named `studentdesk` in **AWS Asia Pacific (Singapore)**. Keep the page with the connection strings handy.
3. **Vercel:** sign up with your GitHub account on the free Hobby plan. You'll import the repo after the first push.
4. **Gmail:** create a separate account for the project, turn on 2-Step Verification, then create an App Password named `StudentDesk`.
5. **Optional:** send a logo or the school colors if you'd like them used.

## 17. Notes for the defense

| If the panel asks | Honest answer |
|---|---|
| Where's the AI? | It's a history-based recommender that scores members from stored records using a transparent weighted formula. It doesn't train a model, since no real data exists yet. Chapter II supports structured decision support with human oversight (Estrellado and Miranda, 2023; Cacho, 2024), and the lead always decides |
| Is it real time? | Near real time. Screens refresh every 10 to 15 seconds, as Chapter III describes |
| Is the LMS connected? | Not yet. Sign-in goes through an adapter with a mock LMS until the API is available, and swapping it in won't affect the rest of the system |
| Is this real data? | No. It's sample data, labelled as sample |
| Why build before the interviews? | RAD uses working prototypes to get feedback. This is the first prototype, and interviews and user testing are next |
| How is student data protected? | LMS passwords aren't stored, permissions are checked on the server, and secrets are kept out of the code. A Data Privacy Act review is planned in Phase 8 |
| Can you explain this code? | All four members should be able to walk through one module each. If your school has rules on AI coding tools, follow them and be upfront about the tools you used |

## Appendix: Manuscript fixes

The manuscript itself hasn't been edited. Line numbers refer to the exported Markdown file.

### Fix before the defense

1. **Old stack (lines 137 and 163):** both say StudentDesk uses React.js, Node.js, Express.js and MySQL. Chapters I and III say Next.js, PostgreSQL and Prisma.
2. **Interviews in the past tense (lines 401 to 407):** these say the researchers "interviewed" and "observed", but line 479 says they "will interview". If the interviews haven't happened, the past tense is inaccurate.
3. **Leftover draft (lines 253 to 386):** an older review of literature is still in the document, with member names in its headings, such as "Foreign Literature - Cyra".
4. **"Single sign-on" (lines 84, 125, 133 and 175):** with the Credentials approach in line 427, users type their LMS password into StudentDesk, and it forwards the password to the LMS. That isn't true single sign-on, so "sign-in using LMS credentials" is more accurate.

### Smaller corrections

5. **Name spelling (lines 153 and 155):** "Baña and Peralta" should be "Bañas and Peralta", as in line 183 and the end notes.
6. **Year (lines 25 and 95):** Bakker and Demerouti is cited as 2017 in the text and 2016 in the end notes.
7. **Respondents (lines 393 to 397 and 401):** line 401 adds "IT experts" and uses a different title, "An AI Event Organizer".
8. **Email recipients (line 82):** this says notifications go to faculty advisers, while lines 60 and 441 include other users.
9. **Rule-based and AI (line 127):** this calls the system "rule-based", which is accurate but sits awkwardly with "AI-assisted". See Section 17 for how to explain it.
10. **Figure 1 (line 195):** the caption has no image in this export, so check the original document.
