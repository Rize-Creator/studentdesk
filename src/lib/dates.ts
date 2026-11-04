export const MANILA_TZ = "Asia/Manila";

export function endOfManilaDay(key: string): Date {
  return new Date(`${key}T23:59:59.999+08:00`);
}

export function startOfManilaDay(key: string): Date {
  return new Date(`${key}T00:00:00.000+08:00`);
}

export function manilaDateKey(date: Date): string {
  // The en-CA locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDaysToKey(key: string, days: number): string {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isOnTime(completedAt: Date, deadline: Date): boolean {
  return completedAt.getTime() <= deadline.getTime();
}

export function formatManilaDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
