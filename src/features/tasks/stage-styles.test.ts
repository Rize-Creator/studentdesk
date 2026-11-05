import { describe, expect, it } from "vitest";
import { STAGE_STYLES } from "./stage-styles";
import { TASK_STATUSES } from "./transitions";

describe("STAGE_STYLES", () => {
  it("gives every stage its own color", () => {
    for (const part of ["badge", "icon", "edge"] as const) {
      const colors = TASK_STATUSES.map((status) => STAGE_STYLES[status][part]);
      expect(new Set(colors).size).toBe(TASK_STATUSES.length);
    }
  });

  it("keeps red for overdue and high priority, not for a stage", () => {
    for (const status of TASK_STATUSES) {
      expect(Object.values(STAGE_STYLES[status]).join(" ")).not.toMatch(/red/);
    }
  });
});
