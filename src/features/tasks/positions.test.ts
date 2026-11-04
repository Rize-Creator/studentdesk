import { describe, expect, it } from "vitest";
import { positionAtEnd, positionBetween } from "./positions";

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
