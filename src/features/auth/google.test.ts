import { describe, expect, it } from "vitest";
import { googleIdentity, isGoogleEnabled } from "./google";

describe("isGoogleEnabled", () => {
  const keys = { GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" };

  it("is on in demo mode when both keys are set", () => {
    expect(isGoogleEnabled({ ...keys, LMS_MODE: "mock" })).toBe(true);
  });

  it("is off once the real LMS is connected, so it can't become a back door", () => {
    expect(isGoogleEnabled({ ...keys, LMS_MODE: "live" })).toBe(false);
  });

  it("is off when a key is missing", () => {
    expect(isGoogleEnabled({ GOOGLE_CLIENT_ID: "id", LMS_MODE: "mock" })).toBe(false);
    expect(isGoogleEnabled({ GOOGLE_CLIENT_SECRET: "secret", LMS_MODE: "mock" })).toBe(false);
  });
});

describe("googleIdentity", () => {
  const profile = { sub: "123", email: "maria@gmail.com", email_verified: true, name: "Maria Peña" };

  it("keeps Google accounts apart from LMS IDs", () => {
    expect(googleIdentity(profile)).toEqual({ lmsId: "google:123", name: "Maria Peña", email: "maria@gmail.com" });
  });

  it("refuses an unverified email", () => {
    expect(googleIdentity({ ...profile, email_verified: false })).toBeNull();
  });

  it("refuses a profile with no email or ID", () => {
    expect(googleIdentity({ ...profile, email: undefined })).toBeNull();
    expect(googleIdentity({ ...profile, sub: undefined })).toBeNull();
  });

  it("falls back to the email when Google gives no name", () => {
    expect(googleIdentity({ ...profile, name: undefined })?.name).toBe("maria@gmail.com");
  });
});
