import { describe, expect, it } from "vitest";
import { dropTarget, positionAtEnd, positionBetween } from "./positions";

describe("card positions", () => {
  it("starts an empty column at 1000", () => {
    expect(positionAtEnd(null)).toBe(1000);
  });

  it("adds to the end of a column", () => {
    expect(positionAtEnd(3000)).toBe(4000);
  });

  it("places a card between two others", () => {
    expect(positionBetween(1000, 2000)).toBe(1500);
  });

  it("places a card at the top", () => {
    expect(positionBetween(null, 1000)).toBe(0);
  });

  it("places a card at the bottom", () => {
    expect(positionBetween(2000, null)).toBe(3000);
  });

  it("handles an empty column", () => {
    expect(positionBetween(null, null)).toBe(1000);
  });
});

describe("dropTarget", () => {
  const cards = [
    { id: "a", status: "TODO" as const, position: 1000 },
    { id: "b", status: "TODO" as const, position: 2000 },
    { id: "c", status: "TODO" as const, position: 3000 },
    { id: "d", status: "REVIEW" as const, position: 1000 },
  ];

  it("drops at the end of a column when dropped on the column", () => {
    expect(dropTarget(cards, "a", "REVIEW")).toEqual({ to: "REVIEW", beforeId: "d", afterId: null });
  });

  it("drops into an empty column", () => {
    expect(dropTarget(cards, "a", "DONE")).toEqual({ to: "DONE", beforeId: null, afterId: null });
  });

  it("drops above a card from another column", () => {
    expect(dropTarget(cards, "d", "b")).toEqual({ to: "TODO", beforeId: "a", afterId: "b" });
  });

  it("drops below a card when dragging down within a column", () => {
    expect(dropTarget(cards, "a", "b")).toEqual({ to: "TODO", beforeId: "b", afterId: "c" });
  });

  it("drops above a card when dragging up within a column", () => {
    expect(dropTarget(cards, "c", "b")).toEqual({ to: "TODO", beforeId: "a", afterId: "b" });
  });

  it("does nothing when dropped on itself", () => {
    expect(dropTarget(cards, "b", "b")).toBeNull();
  });
});
