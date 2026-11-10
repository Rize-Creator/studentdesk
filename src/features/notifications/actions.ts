"use server";

import { authorize } from "@/features/auth/session";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { prisma } from "@/lib/db";
import { sendPending, sendWaitingAfterResponse } from "./mailer";
import { queueNotifications } from "./queue";
import { draftReadinessReports } from "./reports";

const THROTTLE_MS = 5 * 60 * 1000;

export async function sendReadinessNow(projectId: string): Promise<ActionResult<{ sent: number }>> {
  const auth = await authorize(projectId, "report:send");
  if (!auth.ok) return fail(auth.message);

  const now = new Date();
  const recent = await prisma.notification.findFirst({
    where: { projectId, type: "READINESS_SUMMARY", createdAt: { gte: new Date(now.getTime() - THROTTLE_MS) } },
    select: { id: true },
  });
  if (recent) return fail("A report was sent in the last 5 minutes. Please wait a bit and try again.");

  const ids = await queueNotifications(prisma, await draftReadinessReports(projectId, `now-${now.getTime()}`, now));
  // The message is about this report only. An older email that keeps failing should not make the report look failed.
  const result = await sendPending({ ids });
  // Anything else still waiting goes out after the response.
  sendWaitingAfterResponse();
  return result.failed > 0 ? fail("Some emails couldn't be sent. They'll be retried tomorrow morning.") : ok({ sent: result.sent });
}
