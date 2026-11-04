import type { ProjectRole } from "@/lib/permissions";

export function wouldRemoveLastLead(
  members: { userId: string; role: ProjectRole }[],
  change: { userId: string; newRole?: ProjectRole },
): boolean {
  if (change.newRole === "LEAD") return false;
  const remainingLeads = members.filter((m) => m.role === "LEAD" && m.userId !== change.userId);
  const target = members.find((m) => m.userId === change.userId);
  return target?.role === "LEAD" && remainingLeads.length === 0;
}
