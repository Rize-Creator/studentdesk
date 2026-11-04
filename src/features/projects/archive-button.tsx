"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setProjectArchived } from "@/features/projects/actions";
import { safeCall } from "@/lib/action-result";

export function ArchiveButton({ projectId, archived }: { projectId: string; archived: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const result = await safeCall(() => setProjectArchived(projectId, !archived));
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(archived ? "Project restored" : "Project archived");
    router.refresh();
  }

  return (
    <Button variant="outline" disabled={pending} onClick={toggle}>
      {archived ? "Restore project" : "Archive project"}
    </Button>
  );
}
