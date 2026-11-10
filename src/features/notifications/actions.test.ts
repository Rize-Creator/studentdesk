import { beforeEach, describe, expect, it, vi } from "vitest";
import { authorize } from "@/features/auth/session";
import { prisma } from "@/lib/db";
import { sendReadinessNow } from "./actions";
import { sendPending, sendWaitingAfterResponse } from "./mailer";
import { queueNotifications } from "./queue";
import { draftReadinessReports } from "./reports";

vi.mock("@/features/auth/session", () => ({ authorize: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { notification: { findFirst: vi.fn() } } }));
vi.mock("./mailer", () => ({ sendPending: vi.fn(), sendWaitingAfterResponse: vi.fn() }));
vi.mock("./queue", () => ({ queueNotifications: vi.fn() }));
vi.mock("./reports", () => ({ draftReadinessReports: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authorize).mockResolvedValue({ ok: true } as never);
  vi.mocked(prisma.notification.findFirst).mockResolvedValue(null);
  vi.mocked(draftReadinessReports).mockResolvedValue([]);
  vi.mocked(queueNotifications).mockResolvedValue(["report-1", "report-2"]);
});

describe("sendReadinessNow", () => {
  it("reports success when its own emails went out, even if an unrelated email is failing", async () => {
    // The report's two emails succeed. One older email from somewhere else keeps failing.
    vi.mocked(sendPending).mockImplementation(async (options) => (options?.ids ? { sent: 2, failed: 0 } : { sent: 2, failed: 1 }));
    const result = await sendReadinessNow("p1");
    expect(result).toMatchObject({ ok: true, data: { sent: 2 } });
    expect(sendPending).toHaveBeenCalledWith({ ids: ["report-1", "report-2"] });
  });

  it("still sends any other waiting emails, after the response", async () => {
    vi.mocked(sendPending).mockResolvedValue({ sent: 2, failed: 0 });
    await sendReadinessNow("p1");
    expect(sendWaitingAfterResponse).toHaveBeenCalledOnce();
  });

  it("reports a failure when one of its own emails fails", async () => {
    vi.mocked(sendPending).mockResolvedValue({ sent: 1, failed: 1 });
    expect((await sendReadinessNow("p1")).ok).toBe(false);
  });

  it("asks people to wait when a report went out in the last 5 minutes", async () => {
    vi.mocked(prisma.notification.findFirst).mockResolvedValue({ id: "recent" } as never);
    expect((await sendReadinessNow("p1")).ok).toBe(false);
    expect(queueNotifications).not.toHaveBeenCalled();
  });
});
