import type { Prisma } from "@/generated/prisma/client";
import type { NotificationType } from "./keys";

export type NotificationDraft = {
  recipientId: string;
  projectId: string;
  taskId: string | null;
  type: NotificationType;
  subject: string;
  body: string;
  dedupeKey: string;
};

// skipDuplicates makes repeat runs harmless, because dedupeKey is unique.
export async function queueNotifications(client: Prisma.TransactionClient, drafts: NotificationDraft[]): Promise<string[]> {
  if (drafts.length === 0) return [];
  const rows = await client.notification.createManyAndReturn({
    data: drafts,
    skipDuplicates: true,
    select: { id: true },
  });
  return rows.map((row) => row.id);
}
