export function splitByOwner<T extends { assigneeId: string | null }>(tasks: T[], viewerId: string) {
  return {
    mine: tasks.filter((task) => task.assigneeId === viewerId),
    others: tasks.filter((task) => task.assigneeId !== viewerId),
  };
}
