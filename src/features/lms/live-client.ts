import type { LmsClient } from "./types";

// Replaced in Phase 10, once the teacher provides the API details.
// Until then it reports the LMS as unavailable, so live mode can never accept a login.
export const liveLmsClient: LmsClient = {
  async verifyCredentials() {
    return { ok: false, reason: "unavailable" };
  },
};
