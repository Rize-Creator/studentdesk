import { after } from "next/server";
import nodemailer from "nodemailer";
import { isDemoMode } from "@/features/lms";
import { prisma } from "@/lib/db";
import { htmlToText, isAllowedRecipient } from "./recipients";

const MAX_ATTEMPTS = 3;
const DEFAULT_LIMIT = 100;
// A send that was cut off leaves its email claimed. After this long, a later send may pick it up again.
const STALE_CLAIM_MS = 2 * 60 * 1000;

export async function sendPending(options: { ids?: string[]; limit?: number } = {}) {
  const rows = await prisma.notification.findMany({
    where: {
      attempts: { lt: MAX_ATTEMPTS },
      OR: [
        { status: "FAILED" },
        { status: "PENDING", attempts: 0 },
        // Claimed but never finished, so the send that claimed it must have been cut off.
        { status: "PENDING", attempts: { gt: 0 }, createdAt: { lt: new Date(Date.now() - STALE_CLAIM_MS) } },
      ],
      ...(options.ids ? { id: { in: options.ids } } : {}),
    },
    include: { recipient: { select: { email: true, lmsId: true } } },
    orderBy: { createdAt: "asc" },
    take: options.limit ?? DEFAULT_LIMIT,
  });
  if (rows.length === 0) return { sent: 0, failed: 0 };

  const useSmtp = process.env.EMAIL_MODE === "smtp";
  const transport = useSmtp
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      })
    : null;
  const from = `"${process.env.EMAIL_FROM ?? "StudentDesk"}" <${process.env.GMAIL_USER}>`;

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    // Two sends can overlap, such as the daily job running twice, or someone sending a Readiness Report while
    // another email is going out. Each email is claimed first, and only the send that claims it delivers it.
    const claim = await prisma.notification.updateMany({
      where: { id: row.id, status: row.status, attempts: row.attempts },
      data: { status: "PENDING", attempts: { increment: 1 } },
    });
    if (claim.count === 0) continue;
    try {
      if (transport) {
        if (!isAllowedRecipient(row.recipient, isDemoMode(), process.env.DEMO_INBOX ?? "")) {
          throw new Error("Recipient isn't allowed in demo mode.");
        }
        await transport.sendMail({
          from,
          to: row.recipient.email,
          subject: row.subject,
          html: row.body,
          text: htmlToText(row.body),
        });
      } else {
        console.info(`[email:log] ${row.type}: ${row.subject}`);
      }
      await prisma.notification.update({
        where: { id: row.id },
        data: { status: "SENT", sentAt: new Date(), lastError: null },
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      await prisma.notification.update({
        where: { id: row.id },
        data: {
          status: "FAILED",
          lastError: (error instanceof Error ? error.message : "Unknown error").slice(0, 500),
        },
      });
    }
  }
  return { sent, failed };
}

// Sends after the response is finished, so email can't slow down or break the change itself.
export function sendAfterResponse(ids: string[]) {
  if (ids.length === 0) return;
  after(async () => {
    try {
      await sendPending({ ids });
    } catch (error) {
      console.error("Couldn't send queued emails", error);
    }
  });
}

// Sends everything still waiting, after the response is finished.
export function sendWaitingAfterResponse() {
  after(async () => {
    try {
      await sendPending();
    } catch (error) {
      console.error("Could not send the waiting emails", error);
    }
  });
}
