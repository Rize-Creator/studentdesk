"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { ProjectDashboard } from "@/features/metrics/queries";

const REFRESH_MS = 15_000;

export function useProjectDashboard(projectId: string, initial: ProjectDashboard) {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ["dashboard", projectId],
    initialData: initial,
    refetchInterval: REFRESH_MS,
    queryFn: async (): Promise<ProjectDashboard> => {
      const response = await fetch(`/api/projects/${projectId}/dashboard`);
      if (!response.ok) throw new Error("Couldn't refresh the dashboard.");
      return response.json();
    },
  });

  // Keeps the side panel's summary in step with this data.
  const signature = JSON.stringify(data.byStatus);
  const lastSignature = useRef(signature);
  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    router.refresh();
  }, [router, signature]);

  return data;
}
