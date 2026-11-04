import type { LmsIdentity } from "@/features/lms/types";

// Google sign-in is a demo stand-in until the LMS API arrives, so it only works in mock mode.
export function isGoogleEnabled(env: Record<string, string | undefined>): boolean {
  return env.LMS_MODE === "mock" && Boolean(env.GOOGLE_CLIENT_ID) && Boolean(env.GOOGLE_CLIENT_SECRET);
}

export type GoogleProfile = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

export function googleIdentity(profile: GoogleProfile): LmsIdentity | null {
  if (!profile.sub || !profile.email || profile.email_verified !== true) return null;
  return { lmsId: `google:${profile.sub}`, name: profile.name || profile.email, email: profile.email };
}
