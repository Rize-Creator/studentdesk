import { CircleAlert, CircleCheck, Minus, TriangleAlert, type LucideIcon } from "lucide-react";
import { READINESS_LABELS, type ReadinessStatus } from "@/features/metrics/calculations";
import { cn } from "@/lib/utils";

const STYLES: Record<ReadinessStatus, { icon: LucideIcon; className: string }> = {
  NO_TASKS: { icon: Minus, className: "bg-muted text-muted-foreground" },
  ON_TRACK: { icon: CircleCheck, className: "bg-tint text-primary" },
  AT_RISK: { icon: TriangleAlert, className: "bg-brand-red/10 text-brand-red" },
  BEHIND: { icon: CircleAlert, className: "bg-brand-red text-white" },
};

// Always an icon and a word, so status never depends on color alone.
export function ReadinessBadge({ status, className }: { status: ReadinessStatus; className?: string }) {
  const { icon: Icon, className: style } = STYLES[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-bold", style, className)}>
      <Icon aria-hidden className="size-4" />
      {READINESS_LABELS[status]}
    </span>
  );
}
