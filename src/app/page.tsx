import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { getSessionUser } from "@/features/auth/session";

const SUGGESTIONS = [
  { name: "Carlo Bautista", match: 76, reason: "Completed 12 Logistics tasks", detail: "12 of 14 tasks on time, 3 active tasks" },
  { name: "Juan Dela Cruz", match: 69, reason: "Logistics Head, Foundation Day 2025", detail: "9 of 10 tasks on time, 3 active tasks" },
  { name: "Maria Santos", match: 48, reason: "No Logistics tasks yet", detail: "5 of 6 tasks on time, no active tasks" },
];

const STAGES = [
  { name: "Backlog", cards: 1 },
  { name: "To Do", cards: 3 },
  { name: "In Progress", cards: 3 },
  { name: "Review", cards: 2 },
  { name: "Done", cards: 4 },
];

const PROBLEMS = [
  { title: "Updates get lost", text: "Tasks and decisions end up scattered across group chats and spreadsheets, so it's hard to find the latest version." },
  { title: "Work piles up on a few people", text: "Leads tend to ask the same reliable members, and it's hard to see who already has too much to do." },
  { title: "Progress is hard to see", text: "Leads and advisers have to keep asking for updates to find out if an event or project is ready." },
];

const FACTORS = [
  { name: "Experience in the category", weight: 30, text: "How many tasks like this they've finished." },
  { name: "Current workload", weight: 30, text: "How many tasks they're handling right now." },
  { name: "On-time record", weight: 25, text: "How often they finish by the deadline." },
  { name: "Committee role", weight: 15, text: "Whether they've held a role in this category." },
];

const FEATURES = [
  { name: "Task board", text: "Move tasks through five stages. Members move their own work, and leads approve it." },
  { name: "Dashboard", text: "See progress, workload and overdue tasks, with a status of On Track, At Risk or Behind and the reasons why." },
  { name: "Timeline", text: "See tasks grouped under their milestones, with a line marking today." },
  { name: "Email reminders", text: "Get an email when you're assigned a task, when one is due soon, and when one is overdue." },
  { name: "Readiness Report", text: "Leads and advisers get a daily summary by email, and can send one at any time." },
  { name: "Member history", text: "Leads and advisers can check the tasks a member has finished and their on-time record." },
];

const ROLES = [
  { who: "Project leads", what: "Create tasks, see who to assign and why, and approve finished work." },
  { who: "Members", what: "See what's assigned to you, move it along the board, and submit your deliverable." },
  { who: "Faculty advisers", what: "Check readiness any time on the dashboard and get a summary report by email, with no need to ask for updates." },
];

export default async function GuestHomePage() {
  if (await getSessionUser()) redirect("/home");

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-navy text-white">
        <div className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-8">
          <header className="flex items-center justify-between gap-4">
            <Wordmark />
            <Link href="/sign-in" className="text-sm underline underline-offset-4 hover:text-white/75">
              Sign in
            </Link>
          </header>
        </div>
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-12 pb-16 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-16 lg:pb-24">
          <div>
            <h1 className="text-5xl leading-[1.02] font-bold sm:text-7xl">Who should take this task?</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">
              StudentDesk keeps CCDI events and capstone projects in one place. When you create a task, it suggests who
              to assign, based on each member&apos;s past work and how much they&apos;re already handling. You still decide.
            </p>
            <Link
              href="/sign-in"
              className="mt-8 inline-block rounded-lg bg-brand-red px-6 py-3 font-bold text-white outline-offset-4 outline-white transition-colors hover:bg-white hover:text-brand-red focus-visible:outline-2"
            >
              Sign in with LMS
            </Link>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80">
              Demo version: sample data only. The CCDI LMS isn&apos;t connected yet, so you&apos;ll sign in with a demo account.
            </p>
          </div>

          <figure className="rounded-2xl bg-card p-5 text-foreground shadow-2xl sm:p-7">
            <p className="text-sm text-muted-foreground">New Logistics task, due Nov 20</p>
            <p className="mt-1 font-heading text-2xl font-bold">Book the sound system</p>
            <ol className="mt-5 divide-y divide-border">
              {SUGGESTIONS.map((person, index) => (
                <li key={person.name} className="flex gap-4 py-3">
                  <span className="w-12 shrink-0 font-heading text-2xl font-bold tabular-nums">{person.match}%</span>
                  <div className="min-w-0">
                    <p className="font-bold">{person.name}</p>
                    <p className="text-sm">
                      <span className={index === 0 ? "highlight" : undefined}>{person.reason}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{person.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <figcaption className="mt-2 text-xs text-muted-foreground">Example with sample data.</figcaption>
          </figure>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-14 sm:px-8 sm:py-20">
        <section aria-labelledby="problem-heading">
          <h2 id="problem-heading" className="max-w-2xl text-3xl font-bold">Running a student event shouldn&apos;t depend on who remembers what</h2>
          <ul className="mt-8 grid gap-8 md:grid-cols-3">
            {PROBLEMS.map((problem) => (
              <li key={problem.title} className="border-t-2 border-brand-red pt-4">
                <h3 className="font-bold">{problem.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{problem.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="suggestions-heading" className="mt-16 grid gap-8 sm:mt-24 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div>
            <h2 id="suggestions-heading" className="text-3xl font-bold">How suggestions work</h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
              StudentDesk scores each member from their records and shows the top three, with the reasons for each. It only
              suggests, and the lead makes the final choice.
            </p>
            <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
              Anyone with 5 or more active tasks is placed below everyone else, so the same people don&apos;t keep getting more work.
            </p>
          </div>
          <div>
            <ul className="flex flex-col gap-5">
              {FACTORS.map((factor) => (
                <li key={factor.name}>
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-bold">{factor.name}</h3>
                    <span className="font-heading text-xl font-bold tabular-nums">{factor.weight}%</span>
                  </div>
                  <div aria-hidden className="mt-1.5 h-2 rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${factor.weight}%` }} />
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{factor.text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-muted-foreground">These are draft weights, to be finalized with leads and advisers.</p>
          </div>
        </section>

        <section aria-labelledby="board-heading" className="mt-16 grid gap-8 sm:mt-24 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div>
            <h2 id="board-heading" className="text-3xl font-bold">Everything your group chat keeps losing</h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
              Every task has one owner, one deadline and one place on the board. Anyone on the project can see where
              things stand, and the dashboard updates on its own.
            </p>
          </div>
          <ol className="grid grid-cols-5 gap-1.5 sm:gap-3" aria-label="The five stages of a task">
            {STAGES.map((stage) => (
              <li key={stage.name} className="min-w-0">
                <p className="mb-2 text-xs font-bold sm:text-sm">{stage.name}</p>
                <div className="flex min-h-32 flex-col gap-1.5 rounded-xl bg-secondary p-1.5 sm:gap-2 sm:p-2">
                  {Array.from({ length: stage.cards }, (_, card) => (
                    <div key={card} aria-hidden className="h-7 rounded-md border border-border bg-card sm:h-9" />
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="features-heading" className="mt-16 sm:mt-24">
          <h2 id="features-heading" className="text-3xl font-bold">What&apos;s inside</h2>
          <dl className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.name}>
                <dt className="font-bold">{feature.name}</dt>
                <dd className="mt-1 leading-relaxed text-muted-foreground">{feature.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="roles-heading" className="mt-16 sm:mt-24">
          <h2 id="roles-heading" className="text-3xl font-bold">What you can do depends on your role</h2>
          <dl className="mt-6 divide-y divide-border border-y border-border">
            {ROLES.map((role) => (
              <div key={role.who} className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
                <dt className="font-bold">{role.who}</dt>
                <dd className="max-w-2xl text-muted-foreground">{role.what}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="start-heading" className="mt-16 sm:mt-24">
          <h2 id="start-heading" className="text-3xl font-bold">How to get started</h2>
          <ol className="mt-6 grid list-inside list-decimal gap-3 leading-relaxed marker:font-heading marker:font-bold">
            <li>Open the sign-in page and choose a demo account: Lead, Member or Adviser.</li>
            <li>Open one of the sample projects, or create a project of your own.</li>
            <li>Add your team, then create your first task.</li>
          </ol>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">Once the LMS is connected, you&apos;ll sign in with your CCDI account instead.</p>
        </section>
      </main>

      <footer className="border-t border-border">
        <p className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-muted-foreground sm:px-8">
          StudentDesk is a capstone project for Computer Communication Development Institute, Sorsogon City, A.Y. 2026-2027.
        </p>
      </footer>
    </div>
  );
}
