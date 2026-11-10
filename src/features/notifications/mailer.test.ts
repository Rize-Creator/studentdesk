import nodemailer from "nodemailer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { sendPending } from "./mailer";

vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: vi.fn() } }));
vi.mock("@/features/lms", () => ({ isDemoMode: () => false }));
vi.mock("@/lib/db", () => ({ prisma: { notification: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() } } }));

const sendMail = vi.fn();
const row = {
  id: "n1",
  status: "PENDING",
  attempts: 0,
  type: "TASK_ASSIGNED",
  subject: "New task: Book the hall",
  body: "<p>Maria assigned you a task.</p>",
  recipient: { email: "juan@example.test", lmsId: "DEMO-002" },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("EMAIL_MODE", "smtp");
  vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);
  vi.mocked(prisma.notification.findMany).mockResolvedValue([row] as never);
  vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 1 });
  sendMail.mockResolvedValue({});
});

afterEach(() => vi.unstubAllEnvs());

describe("sendPending", () => {
  it("claims an email, delivers it, and marks it sent with one attempt", async () => {
    expect(await sendPending()).toEqual({ sent: 1, failed: 0 });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: "n1", status: "PENDING", attempts: 0 },
      data: { status: "PENDING", attempts: { increment: 1 } },
    });
    expect(sendMail).toHaveBeenCalledOnce();
    expect(sendMail.mock.calls[0][0]).toMatchObject({ to: "juan@example.test", subject: "New task: Book the hall", text: "Maria assigned you a task." });
    const saved = vi.mocked(prisma.notification.update).mock.calls[0][0];
    expect(saved).toMatchObject({ where: { id: "n1" }, data: { status: "SENT", lastError: null } });
    // The attempt was counted when the email was claimed, so it isn't counted a second time.
    expect(saved.data).not.toHaveProperty("attempts");
  });

  it("leaves an email alone when another send has already claimed it", async () => {
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 0 });
    expect(await sendPending()).toEqual({ sent: 0, failed: 0 });
    expect(sendMail).not.toHaveBeenCalled();
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it("records a failed email without throwing, so the change that queued it still stands", async () => {
    sendMail.mockRejectedValue(new Error("Mailbox unavailable"));
    expect(await sendPending()).toEqual({ sent: 0, failed: 1 });
    expect(prisma.notification.update).toHaveBeenCalledWith({ where: { id: "n1" }, data: { status: "FAILED", lastError: "Mailbox unavailable" } });
  });

  it("picks up emails that are waiting, failed, or left claimed by a send that was cut off", async () => {
    await sendPending({ ids: ["n1"] });
    const where = vi.mocked(prisma.notification.findMany).mock.calls[0][0]!.where!;
    expect(where).toMatchObject({ attempts: { lt: 3 }, id: { in: ["n1"] } });
    expect(where.OR).toEqual([
      { status: "FAILED" },
      { status: "PENDING", attempts: 0 },
      { status: "PENDING", attempts: { gt: 0 }, createdAt: { lt: expect.any(Date) } },
    ]);
  });

  it("only records the email in log mode, without using SMTP", async () => {
    vi.stubEnv("EMAIL_MODE", "log");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    expect(await sendPending()).toEqual({ sent: 1, failed: 0 });
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
