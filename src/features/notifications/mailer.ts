import { after } from "next/server";
import nodemailer from "nodemailer";
import { isDemoMode } from "@/features/lms";
import { prisma } from "@/lib/db";
import { htmlToText, isAllowedRecipient } from "./recipients";

const MAX_ATTEMPTS = 3;
const DEFAULT_LIMIT = 100;

export async function sendPending(options: { ids?: string[]; limit?: number } = {}) {
  const rows = await prisma.notification.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: MAX_ATTEMPTS },
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
        data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 }, lastError: null },
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      await prisma.notification.update({
        where: { id: row.id },
        data: {
          status: "FAILED",
          attempts: { increment: 1 },
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
