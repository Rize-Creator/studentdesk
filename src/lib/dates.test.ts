import { describe, expect, it } from "vitest";
import {
  addDaysToKey,
  formatDateKeyShort,
  endOfManilaDay,
  formatManilaDate,
  isOnTime,
  manilaDateKey,
  startOfManilaDay,
} from "./dates";

describe("Manila dates", () => {
  it("ends a Manila day at 15:59:59.999 UTC", () => {
    expect(endOfManilaDay("2026-11-07").toISOString()).toBe("2026-11-07T15:59:59.999Z");
  });

  it("starts a Manila day at 16:00 UTC the day before", () => {
    expect(startOfManilaDay("2026-11-07").toISOString()).toBe("2026-11-06T16:00:00.000Z");
  });

  it("uses the Manila date, not the UTC date", () => {
    expect(manilaDateKey(new Date("2026-11-07T15:59:59.000Z"))).toBe("2026-11-07");
    expect(manilaDateKey(new Date("2026-11-07T16:00:00.000Z"))).toBe("2026-11-08");
  });

  it("adds days across a month boundary", () => {
    expect(addDaysToKey("2026-11-30", 1)).toBe("2026-12-01");
  });

  it("formats dates for display", () => {
    expect(formatManilaDate(endOfManilaDay("2026-11-07"))).toBe("Nov 7, 2026");
  });
});

describe("formatDateKeyShort", () => {
  it("shows a short month and day for a date key", () => {
    expect(formatDateKeyShort("2026-11-07")).toBe("Nov 7");
  });
});

describe("isOnTime", () => {
  const deadline = endOfManilaDay("2026-11-07");

  it("counts 11:30 PM Manila on the deadline day as on time", () => {
    expect(isOnTime(new Date("2026-11-07T23:30:00+08:00"), deadline)).toBe(true);
  });

  it("counts the exact deadline as on time", () => {
    expect(isOnTime(deadline, deadline)).toBe(true);
  });

  it("counts midnight the next day as late", () => {
    expect(isOnTime(new Date("2026-11-08T00:00:00+08:00"), deadline)).toBe(false);
  });
});
