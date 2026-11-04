import type { LmsClient } from "./types";

export const DEMO_PASSWORD = "demo1234";

export type DemoAccount = {
  username: string;
  lmsId: string;
  name: string;
  quickPick?: "Lead" | "Member" | "Adviser";
};

// Fictional people. No real student or faculty data belongs here.
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: "maria.santos", lmsId: "DEMO-001", name: "Maria Santos", quickPick: "Lead" },
  { username: "juan.delacruz", lmsId: "DEMO-002", name: "Juan Dela Cruz", quickPick: "Member" },
  { username: "ana.reyes", lmsId: "DEMO-003", name: "Ana Reyes" },
  { username: "paolo.garcia", lmsId: "DEMO-004", name: "Paolo Garcia" },
  { username: "liza.mendoza", lmsId: "DEMO-005", name: "Liza Mendoza" },
  { username: "carlo.bautista", lmsId: "DEMO-006", name: "Carlo Bautista" },
  { username: "elena.ramos", lmsId: "DEMO-007", name: "Prof. Elena Ramos", quickPick: "Adviser" },
  { username: "mark.villanueva", lmsId: "DEMO-008", name: "Prof. Mark Villanueva" },
];

export function demoEmail(username: string, inbox = process.env.DEMO_INBOX ?? ""): string {
  const tag = username.replace(/[^a-z0-9]/gi, "");
  const [local, domain] = inbox.split("@");
  return domain ? `${local}+${tag}@${domain}` : `${tag}@example.test`;
}

export const mockLmsClient: LmsClient = {
  async verifyCredentials(username, password) {
    const account = DEMO_ACCOUNTS.find((candidate) => candidate.username === username);
    if (!account || password !== DEMO_PASSWORD) return { ok: false, reason: "invalid" };
    return {
      ok: true,
      identity: { lmsId: account.lmsId, name: account.name, email: demoEmail(account.username) },
    };
  },
};
