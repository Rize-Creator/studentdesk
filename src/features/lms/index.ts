import { liveLmsClient } from "./live-client";
import { mockLmsClient } from "./mock-client";
import type { LmsClient } from "./types";

export function isDemoMode(mode = process.env.LMS_MODE): boolean {
  return mode === "mock";
}

export function getLmsClient(mode = process.env.LMS_MODE): LmsClient {
  return isDemoMode(mode) ? mockLmsClient : liveLmsClient;
}
