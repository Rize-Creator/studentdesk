import type { ClientRect, CollisionDetection, UniqueIdentifier } from "@dnd-kit/core";
import { describe, expect, it } from "vitest";
import { boardCollision } from "./board-collision";

const rect = (left: number, top: number, width: number, height: number): ClientRect => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

// Positions measured from the real board at 1536px wide, with an empty Review column.
const DROPPABLES: [UniqueIdentifier, ClientRect][] = [
  ["TODO", rect(588, 226, 224, 1350)],
  ["IN_PROGRESS", rect(824, 226, 224, 1350)],
  ["REVIEW", rect(1060, 226, 224, 1350)],
  ["DONE", rect(1296, 226, 224, 1350)],
  ["my-card", rect(832, 250, 208, 109)],
  ["other-card", rect(832, 395, 208, 115)],
  ["done-1", rect(1304, 250, 208, 129)],
  ["done-2", rect(1304, 387, 208, 129)],
];

function collide(pointer: { x: number; y: number } | null, dragged: ClientRect) {
  const args = {
    active: { id: "my-card" },
    collisionRect: dragged,
    droppableRects: new Map(DROPPABLES),
    droppableContainers: DROPPABLES.map(([id, value]) => ({
      id,
      key: String(id),
      data: { current: undefined },
      disabled: false,
      node: { current: null },
      rect: { current: value },
    })),
    pointerCoordinates: pointer,
  } as unknown as Parameters<CollisionDetection>[0];
  return boardCollision(args)[0]?.id;
}

// The dragged card follows the pointer, so its rect is offset from where it was grabbed.
const draggedAt = (x: number, y: number) => rect(x - 104, y - 20, 208, 109);

describe("boardCollision", () => {
  it("drops into the empty column under the pointer, not a nearby card", () => {
    expect(collide({ x: 1176, y: 384 }, draggedAt(1176, 384))).toBe("REVIEW");
  });

  it("uses the empty column even near the edge closest to Done", () => {
    expect(collide({ x: 1270, y: 300 }, draggedAt(1270, 300))).toBe("REVIEW");
  });

  it("picks a card when the pointer is on it, so the drop position is exact", () => {
    expect(collide({ x: 1400, y: 450 }, draggedAt(1400, 450))).toBe("done-2");
  });

  it("picks the column when the pointer is below its cards", () => {
    expect(collide({ x: 1400, y: 1000 }, draggedAt(1400, 1000))).toBe("DONE");
  });

  it("picks the nearest column when the pointer is in the gap beside it", () => {
    expect(collide({ x: 1056, y: 600 }, draggedAt(1056, 600))).toBe("REVIEW");
  });

  it("picks the column when the pointer is above it, over its heading", () => {
    expect(collide({ x: 1176, y: 200 }, draggedAt(1176, 200))).toBe("REVIEW");
  });

  it("still finds a target for keyboard drags, which have no pointer", () => {
    expect(collide(null, rect(832, 395, 208, 115))).toBeDefined();
  });
});
