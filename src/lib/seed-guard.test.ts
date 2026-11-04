import { describe, expect, it } from "vitest";
import { assertSeedAllowed } from "./seed-guard";

describe("assertSeedAllowed", () => {
  it("allows a reset only with both settings", () => {
    expect(() => assertSeedAllowed({ ALLOW_DEMO_RESET: "true", LMS_MODE: "mock" })).not.toThrow();
  });

  it.each([
    [{ ALLOW_DEMO_RESET: "true", LMS_MODE: "live" }],
    [{ ALLOW_DEMO_RESET: "false", LMS_MODE: "mock" }],
    [{ LMS_MODE: "mock" }],
    [{}],
  ])("refuses %j", (env) => {
    expect(() => assertSeedAllowed(env)).toThrow("Refusing to reset data");
  });
});
