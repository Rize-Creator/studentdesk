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
