import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { getSessionUser } from "@/features/auth/session";

const SUGGESTIONS = [
  { name: "Carlo Bautista", match: 76, reason: "Completed 12 Logistics tasks", detail: "12 of 14 tasks on time, 3 active tasks" },
  { name: "Juan Dela Cruz", match: 69, reason: "Logistics Head, Foundation Day 2025", detail: "9 of 10 tasks on time, 3 active tasks" },
  { name: "Maria Santos", match: 48, reason: "No Logistics tasks yet", detail: "5 of 6 tasks on time, no active tasks" },
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
  { name: "Role", weight: 15, text: "Whether they've held a role in this category." },
];

const STEPS = [
  { title: "Create a task", text: "The lead adds the task, its category and its deadline." },
  { title: "Get suggestions", text: "StudentDesk suggests who to assign, and the lead chooses." },
  { title: "Do the work", text: "The member moves it along the board and submits it for review." },
  { title: "Review it", text: "The lead marks it Done, or sends it back with a note." },
  { title: "Stay updated", text: "The people involved get an email, and the dashboard updates." },
];

const FEATURES = [
  { name: "Task board", text: "Move tasks through five stages. Members move their own work, and leads approve it." },
  { name: "Dashboard", text: "See progress, workload and overdue tasks, with a status of On Track, At Risk or Behind and the reasons why." },
  { name: "Timeline", text: "See tasks grouped under their milestones, with a line marking today." },
  { name: "Email reminders", text: "Get an email when you're assigned a task, when one is due soon, and when one is overdue." },
  { name: "Readiness Report", text: "Leads and advisers get a daily summary by email, and can send one at any time." },
  { name: "Member history", text: "Leads and advisers can check the tasks a member has finished and their on-time record." },
];

const SECTIONS = [
  { href: "#problem", label: "Problem" },
  { href: "#see-it", label: "See it" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#roles", label: "Roles" },
];

const ROLES = [
  { who: "Project leads", what: "Create tasks, see who to assign and why, and approve finished work." },
  { who: "Members", what: "See what's assigned to you, move it along the board, and submit your deliverable." },
  { who: "Faculty advisers", what: "Check readiness any time on the dashboard and get a summary report by email, with no need to ask for updates." },
];

const SECTION_SPACE = "mt-20 scroll-mt-6 sm:mt-28";
const HEADING = "text-3xl font-bold sm:text-4xl";
const BODY = "text-lg leading-relaxed text-foreground/80";

function Screenshot({ src, alt, width, height, title, text, sizes }: { src: string; alt: string; width: number; height: number; title: string; text: string; sizes: string }) {
  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <Image src={src} alt={alt} width={width} height={height} sizes={sizes} className="h-auto w-full rounded-xl border border-border shadow-lg" />
      <figcaption>
        <span className="block text-xl font-bold">{title}</span>
        <span className={`mt-1 block ${BODY}`}>{text}</span>
      </figcaption>
    </figure>
  );
}

export default async function GuestHomePage() {
  if (await getSessionUser()) redirect("/home");

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-navy text-white">
        <div className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-8">
          <header className="flex items-center justify-between gap-4">
            <Wordmark />
            <nav aria-label="Page sections" className="hidden items-center gap-6 lg:flex">
              {SECTIONS.map((section) => (
                <a key={section.href} href={section.href} className="font-medium underline-offset-4 outline-offset-4 outline-white hover:underline focus-visible:outline-2">
                  {section.label}
                </a>
              ))}
            </nav>
            <Link
              href="/sign-in"
              className="rounded-lg bg-white px-4 py-2 font-bold text-navy outline-offset-4 outline-white transition-colors hover:bg-tint focus-visible:outline-2"
            >
              Sign in
            </Link>
          </header>
        </div>
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-12 pb-16 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-16 lg:pb-24">
          <div>
            <h1 className="text-5xl leading-[1.02] font-bold sm:text-7xl">Who should take this task?</h1>
            <p className="mt-6 max-w-xl text-xl leading-relaxed text-white/90">
              StudentDesk keeps CCDI events and capstone projects in one place. When you create a task, it suggests who
              to assign, based on each member&apos;s past work and how much they&apos;re already handling. You still decide.
            </p>
            <Link
              href="/sign-in"
              className="mt-8 inline-block rounded-lg bg-brand-red px-7 py-3.5 text-lg font-bold text-white outline-offset-4 outline-white transition-colors hover:bg-white hover:text-brand-red focus-visible:outline-2"
            >
              Sign in with LMS
            </Link>
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
          </figure>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 sm:px-8 sm:py-24">
        <section id="problem" aria-labelledby="problem-heading" className="scroll-mt-6">
          <h2 id="problem-heading" className={`max-w-3xl ${HEADING}`}>Running a student event shouldn&apos;t depend on who remembers what</h2>
          <ul className="mt-10 grid gap-8 md:grid-cols-3">
            {PROBLEMS.map((problem) => (
              <li key={problem.title} className="border-t-4 border-brand-red pt-4">
                <h3 className="text-xl font-bold">{problem.title}</h3>
                <p className={`mt-2 ${BODY}`}>{problem.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="see-it" aria-labelledby="see-it-heading" className={SECTION_SPACE}>
          <h2 id="see-it-heading" className={HEADING}>See it in action</h2>
          <p className={`mt-4 max-w-3xl ${BODY}`}>
            Every task has one owner, one deadline and one place on the board, so your group chat doesn&apos;t have to keep track. These screens use sample data.
          </p>
          <div className="mt-10 flex flex-col gap-12">
            <Screenshot
              src="/landing/board.jpg"
              alt="The task board, with tasks in five columns from Backlog to Done"
              width={1752}
              height={1020}
              sizes="(min-width: 1152px) 1088px, 100vw"
              title="Task board"
              text="Drag each task from Backlog to Done. Your own tasks are grouped at the top of each column."
            />
            <div className="grid gap-12 md:grid-cols-2 md:gap-8">
              <Screenshot
                src="/landing/dashboard.jpg"
                alt="A project dashboard showing an At Risk status, its reasons, and charts of task progress"
                width={1752}
                height={915}
                sizes="(min-width: 768px) 50vw, 100vw"
                title="Dashboard"
                text="See if a project is On Track, At Risk or Behind, and exactly why."
              />
              <Screenshot
                src="/landing/timeline.jpg"
                alt="A project timeline with tasks grouped under milestones and a line marking today"
                width={1752}
                height={975}
                sizes="(min-width: 768px) 50vw, 100vw"
                title="Timeline"
                text="See every task's dates under its milestone, with a line marking today."
              />
            </div>
          </div>
        </section>

        <section id="how-it-works" aria-labelledby="suggestions-heading" className={`grid gap-10 lg:grid-cols-2 lg:gap-16 ${SECTION_SPACE}`}>
          <div className="flex min-w-0 flex-col gap-4">
            <h2 id="suggestions-heading" className={HEADING}>How suggestions work</h2>
            <p className={BODY}>
              StudentDesk scores each member from their records and shows the top three, with the reasons for each. It only
              suggests, and the lead makes the final choice.
            </p>
            <p className={BODY}>
              Anyone with 5 or more active tasks is placed below everyone else, so the same people don&apos;t keep getting more work.
            </p>
            <Image
              src="/landing/suggestions.jpg"
              alt="Suggested people for a new task, each with a match percent and reasons, and one person marked as having a heavy workload"
              width={816}
              height={612}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="mt-2 h-auto w-full rounded-xl border border-border shadow-lg"
            />
          </div>
          <div>
            <ul className="flex flex-col gap-6">
              {FACTORS.map((factor) => (
                <li key={factor.name}>
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-xl font-bold">{factor.name}</h3>
                    <span className="font-heading text-2xl font-bold tabular-nums">{factor.weight}%</span>
                  </div>
                  <div aria-hidden className="mt-2 h-3 rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${factor.weight}%` }} />
                  </div>
                  <p className={`mt-2 ${BODY}`}>{factor.text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-foreground/80">These are draft weights, to be finalized with leads and advisers.</p>
          </div>
        </section>

        <section aria-labelledby="steps-heading" className={SECTION_SPACE}>
          <h2 id="steps-heading" className={HEADING}>How a task moves</h2>
          <ol aria-label="How a task moves" className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-3">
                <span aria-hidden className="flex size-11 items-center justify-center rounded-full bg-primary font-heading text-lg font-bold text-primary-foreground">{index + 1}</span>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className={BODY}>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="features" aria-labelledby="features-heading" className={SECTION_SPACE}>
          <h2 id="features-heading" className={HEADING}>What&apos;s inside</h2>
          <dl className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.name}>
                <dt className="text-xl font-bold">{feature.name}</dt>
                <dd className={`mt-2 ${BODY}`}>{feature.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="roles" aria-labelledby="roles-heading" className={SECTION_SPACE}>
          <h2 id="roles-heading" className={HEADING}>What you can do depends on your role</h2>
          <dl className="mt-8 divide-y divide-border border-y border-border">
            {ROLES.map((role) => (
              <div key={role.who} className="grid gap-1 py-5 sm:grid-cols-[14rem_1fr] sm:gap-6">
                <dt className="text-xl font-bold">{role.who}</dt>
                <dd className={`max-w-3xl ${BODY}`}>{role.what}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="start-heading" className={`rounded-2xl bg-tint p-6 sm:p-10 ${SECTION_SPACE}`}>
          <h2 id="start-heading" className={HEADING}>How to get started</h2>
          <ol className="mt-6 grid list-inside list-decimal gap-3 text-lg leading-relaxed marker:font-heading marker:font-bold">
            <li>Open the sign-in page and choose a demo account: Lead, Member or Adviser.</li>
            <li>Open one of the sample projects, or create a project of your own.</li>
            <li>Add your team, then create your first task.</li>
          </ol>
          <Link
            href="/sign-in"
            className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 font-bold text-primary-foreground transition-colors hover:bg-primary/85"
          >
            Sign in with LMS
          </Link>
        </section>
      </main>

      <footer className="border-t border-border">
        <p className="mx-auto w-full max-w-6xl px-4 py-6 text-center text-sm text-muted-foreground sm:px-8">
          StudentDesk is a capstone project for Computer Communication Development Institute, Sorsogon City, A.Y. 2026-2027.
        </p>
      </footer>
    </div>
  );
}
