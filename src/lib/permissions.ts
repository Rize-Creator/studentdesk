export type ProjectRole = "LEAD" | "MEMBER" | "ADVISER";

export type ProjectAction =
  | "project:edit"
  | "members:manage"
  | "tasks:manage"
  | "suggestions:view"
  | "milestones:manage"
  | "review:decide"
  | "report:send";

const ALLOWED: Record<ProjectAction, readonly ProjectRole[]> = {
  "project:edit": ["LEAD"],
  "members:manage": ["LEAD"],
  "tasks:manage": ["LEAD"],
  "suggestions:view": ["LEAD"],
  "milestones:manage": ["LEAD"],
  "review:decide": ["LEAD"],
  "report:send": ["LEAD", "ADVISER"],
};

export function can(role: ProjectRole, action: ProjectAction): boolean {
  return ALLOWED[action].includes(role);
}

export const ROLE_LABELS: Record<ProjectRole, string> = { LEAD: "Lead", MEMBER: "Member", ADVISER: "Adviser" };
