import { CalendarDays, Crown, Shapes, UserRound } from "lucide-react";
import type { summarizeTasks } from "@/features/projects/summary";
import { formatManilaDate } from "@/lib/dates";
import { ROLE_LABELS, type ProjectRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  type: "EVENT" | "ACADEMIC";
  archived: boolean;
  role: ProjectRole;
  leadNames: string[];
  startDate: Date;
  targetDate: Date;
  summary: ReturnType<typeof summarizeTasks>;
};

function Detail({ icon: Icon, label, value }: { icon: typeof Shapes; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="flex items-center gap-2 text-white/75">
        <Icon aria-hidden className="size-4" />
        {label}
      </dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Stat({ value, label, alert }: { value: number; label: string; alert?: boolean }) {
  return (
    <div className={cn("flex items-baseline gap-1", alert && "rounded-md bg-brand-red px-1.5")}>
      <span className="font-bold tabular-nums">{value}</span>
      <span className={cn("text-xs", alert ? "text-white" : "text-white/75")}>{label}</span>
    </div>
  );
}

export function ProjectPanel({ name, type, archived, role, leadNames, startDate, targetDate, summary }: Props) {
  const typeLabel = type === "EVENT" ? "Event" : "Academic project";
  return (
    <section aria-label="Project summary" className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-white/75">{archived ? `${typeLabel}, archived` : typeLabel}</p>
        <h1 className="mt-1 text-2xl leading-tight font-bold lg:text-3xl">{name}</h1>
      </div>
      <dl className="hidden flex-col gap-3 lg:flex">
        <Detail icon={UserRound} label="Your role" value={ROLE_LABELS[role]} />
        <Detail icon={Crown} label={leadNames.length === 1 ? "Lead" : "Leads"} value={leadNames.join(", ")} />
        <Detail icon={CalendarDays} label="Starts" value={formatManilaDate(startDate)} />
        <Detail icon={CalendarDays} label="Target" value={formatManilaDate(targetDate)} />
      </dl>
      <div className="flex flex-col gap-2">
        <p className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums lg:text-4xl">{summary.percent}%</span>
          <span className="text-sm text-white/75">complete</span>
        </p>
        <div
          role="progressbar"
          aria-label="Tasks done"
          aria-valuenow={summary.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 overflow-hidden rounded-full bg-white/20"
        >
          <div className="h-full rounded-full bg-white" style={{ width: `${summary.percent}%` }} />
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          <Stat value={summary.total} label={summary.total === 1 ? "task" : "tasks"} />
          <Stat value={summary.daysLeft} label={summary.daysLeft === 1 ? "day left" : "days left"} />
          <Stat value={summary.inReview} label="in review" />
          <Stat value={summary.overdue} label="overdue" alert={summary.overdue > 0} />
        </div>
      </div>
    </section>
  );
}
