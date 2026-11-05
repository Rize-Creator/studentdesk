import { STAGE_STYLES } from "@/features/tasks/stage-styles";
import { STATUS_LABELS, type TaskStatus } from "@/features/tasks/transitions";
import { cn } from "@/lib/utils";

export function StageBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap", STAGE_STYLES[status].badge)}>
      {STATUS_LABELS[status]}
    </span>
  );
}
