import { TASK_STATUSES, type TaskStatus } from "./transitions";

const STEP = 1000;

export function positionAtEnd(max: number | null): number {
  return (max ?? 0) + STEP;
}

export function positionBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return STEP;
  if (before === null) return after! - STEP;
  if (after === null) return before + STEP;
  return (before + after) / 2;
}

type Card = { id: string; status: TaskStatus; position: number };

// overId is either a column's status or another card's ID.
export function dropTarget(cards: Card[], activeId: string, overId: string) {
  if (activeId === overId) return null;
  const inColumn = (status: TaskStatus) =>
    cards.filter((c) => c.status === status && c.id !== activeId).sort((a, b) => a.position - b.position);

  if (TASK_STATUSES.includes(overId as TaskStatus)) {
    const column = inColumn(overId as TaskStatus);
    return { to: overId as TaskStatus, beforeId: column.at(-1)?.id ?? null, afterId: null };
  }

  const active = cards.find((c) => c.id === activeId);
  const over = cards.find((c) => c.id === overId);
  if (!active || !over) return null;

  const column = inColumn(over.status);
  const overIndex = column.findIndex((c) => c.id === overId);
  const draggingDown = active.status === over.status && active.position < over.position;
  const insertAt = draggingDown ? overIndex + 1 : overIndex;
  return {
    to: over.status,
    beforeId: column[insertAt - 1]?.id ?? null,
    afterId: column[insertAt]?.id ?? null,
  };
}
