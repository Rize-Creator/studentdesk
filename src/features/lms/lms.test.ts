import { describe, expect, it } from "vitest";
import { getLmsClient, isDemoMode } from "./index";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, demoEmail } from "./mock-client";

describe("mock LMS", () => {
  const client = getLmsClient("mock");
  const lead = DEMO_ACCOUNTS.find((account) => account.quickPick === "Lead")!;

  it("accepts a demo account and returns an identity", async () => {
    const result = await client.verifyCredentials(lead.username, DEMO_PASSWORD);
    expect(result).toMatchObject({ ok: true, identity: { lmsId: lead.lmsId, name: lead.name } });
  });

  it("refuses a wrong password", async () => {
    const result = await client.verifyCredentials(lead.username, "wrong");
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("refuses an unknown username", async () => {
    const result = await client.verifyCredentials("nobody", DEMO_PASSWORD);
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("offers one quick-pick account per role", () => {
    const picks = DEMO_ACCOUNTS.map((account) => account.quickPick).filter(Boolean);
    expect(picks.sort()).toEqual(["Adviser", "Lead", "Member"]);
  });
});

describe("demoEmail", () => {
  it("plus-addresses the demo inbox", () => {
    expect(demoEmail("maria.santos", "studentdesk@gmail.com")).toBe(
      "studentdesk+mariasantos@gmail.com",
    );
  });

  it("uses a non-routable address when no inbox is set", () => {
    expect(demoEmail("maria.santos", "")).toBe("mariasantos@example.test");
  });
});

describe("choosing a client", () => {
  it("never falls back to the mock for any mode except mock", async () => {
    for (const mode of ["live", "", undefined, "MOCK"]) {
      expect(isDemoMode(mode)).toBe(false);
      const result = await getLmsClient(mode).verifyCredentials("maria.santos", DEMO_PASSWORD);
      expect(result).toEqual({ ok: false, reason: "unavailable" });
    }
  });
});
