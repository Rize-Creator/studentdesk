import { cn } from "@/lib/utils";

const STYLES = {
  LOW: { label: "Low", chip: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  MEDIUM: { label: "Medium", chip: "bg-tint text-primary", dot: "bg-primary" },
  HIGH: { label: "High", chip: "bg-brand-red/10 text-brand-red", dot: "bg-brand-red" },
};

export function PriorityChip({ priority }: { priority: keyof typeof STYLES }) {
  const style = STYLES[priority];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold", style.chip)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}
