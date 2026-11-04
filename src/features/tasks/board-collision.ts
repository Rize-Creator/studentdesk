import { closestCorners, pointerWithin, type CollisionDetection } from "@dnd-kit/core";
import { TASK_STATUSES, type TaskStatus } from "./transitions";

const isColumn = (id: unknown) => TASK_STATUSES.includes(id as TaskStatus);

// Follows the pointer, because measuring from the dragged card's corners makes
// a nearby card in the next column beat a tall, empty column under the pointer.
export const boardCollision: CollisionDetection = (args) => {
  const { pointerCoordinates, droppableContainers, droppableRects } = args;
  // Keyboard drags have no pointer.
  if (!pointerCoordinates) return closestCorners(args);

  const under = pointerWithin(args);
  if (under.length > 0) {
    // A card wins over its column, so the drop lands at that exact spot.
    return [under.find((hit) => !isColumn(hit.id)) ?? under[0]];
  }

  // Over a heading or the gap between columns: use the column nearest the pointer.
  let nearest: { id: (typeof droppableContainers)[number]["id"]; distance: number } | null = null;
  for (const { id } of droppableContainers) {
    const rect = droppableRects.get(id);
    if (!rect || !isColumn(id)) continue;
    const distance = Math.max(rect.left - pointerCoordinates.x, pointerCoordinates.x - rect.right, 0);
    if (!nearest || distance < nearest.distance) nearest = { id, distance };
  }
  return nearest ? [{ id: nearest.id }] : [];
};
