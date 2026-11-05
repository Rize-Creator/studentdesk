"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendReadinessNow } from "@/features/notifications/actions";
import { safeCall } from "@/lib/action-result";

export function SendReportButton({ projectId }: { projectId: string }) {
  const [pending, setPending] = useState(false);

  async function send() {
    setPending(true);
    const result = await safeCall(() => sendReadinessNow(projectId));
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Readiness Report sent to leads and advisers");
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={send}>
      <Send aria-hidden />
      {pending ? "Sending..." : "Send Readiness Report"}
    </Button>
  );
}
