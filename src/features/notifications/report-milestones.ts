const UPCOMING_MS = 14 * 24 * 60 * 60 * 1000;

type DashboardMilestone = { title: string; dueDate: string; complete: boolean; overdue: boolean };

// Splits a project's unfinished milestones into the two lists the Readiness Report shows.
// Overdue ones get their own list, so they don't appear under "the next 14 days".
export function reportMilestones(milestones: DashboardMilestone[], now: Date) {
  const open = milestones
    .filter((milestone) => !milestone.complete)
    .map((milestone) => ({ title: milestone.title, dueDate: new Date(milestone.dueDate), overdue: milestone.overdue }));
  const forEmail = ({ title, dueDate }: { title: string; dueDate: Date }) => ({ title, dueDate });
  return {
    overdue: open.filter((milestone) => milestone.overdue).map(forEmail),
    upcoming: open.filter((milestone) => !milestone.overdue && milestone.dueDate.getTime() - now.getTime() <= UPCOMING_MS).map(forEmail),
  };
}
