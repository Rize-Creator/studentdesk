export function assertSeedAllowed(env: Record<string, string | undefined>): void {
  if (env.ALLOW_DEMO_RESET !== "true" || env.LMS_MODE !== "mock") {
    throw new Error("Refusing to reset data: set ALLOW_DEMO_RESET=true and LMS_MODE=mock.");
  }
}
