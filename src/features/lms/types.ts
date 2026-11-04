export type LmsIdentity = { lmsId: string; name: string; email: string };

export type LmsResult =
  | { ok: true; identity: LmsIdentity }
  | { ok: false; reason: "invalid" | "unavailable" };

export interface LmsClient {
  verifyCredentials(username: string, password: string): Promise<LmsResult>;
}
