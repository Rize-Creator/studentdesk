export type CandidateRecord = {
  userId: string;
  name: string;
  doneInCategory: number;
  doneTotal: number;
  doneOnTime: number;
  activeTasks: number;
  categoryRoles: string[];
};

export type Recommendation = {
  rank: number;
  userId: string;
  name: string;
  score: number;
  percent: number;
  atLimit: boolean;
  reasons: string[];
};

// Draft values. The manuscript says these are finalized with leads and advisers.
export const DEFAULT_WEIGHTS = { experience: 0.3, onTime: 0.25, availability: 0.3, committee: 0.15 };
export const WORKLOAD_LIMIT = 5;
const TOP_COUNT = 3;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function peopleAtLimit(candidates: CandidateRecord[]) {
  return candidates
    .filter((person) => person.activeTasks >= WORKLOAD_LIMIT)
    .map(({ userId, name, activeTasks }) => ({ userId, name, activeTasks }));
}

function buildReasons(person: CandidateRecord, categoryName: string, atLimit: boolean): string[] {
  const reasons: string[] = [];
  if (person.doneTotal === 0) {
    reasons.push("No task history yet");
  } else {
    reasons.push(
      person.doneInCategory > 0
        ? `Completed ${plural(person.doneInCategory, `${categoryName} task`)}`
        : `No ${categoryName} tasks yet`,
    );
    reasons.push(`${person.doneOnTime} of ${plural(person.doneTotal, "task")} on time`);
  }
  if (atLimit) reasons.push(`Heavy workload: ${plural(person.activeTasks, "active task")}`);
  else reasons.push(person.activeTasks === 0 ? "No active tasks" : plural(person.activeTasks, "active task"));
  if (person.categoryRoles.length > 0) reasons.push(person.categoryRoles[0]);
  return reasons;
}

export function rankCandidates(
  task: { categoryName: string },
  candidates: CandidateRecord[],
  weights = DEFAULT_WEIGHTS,
): Recommendation[] {
  const topExperience = Math.max(0, ...candidates.map((c) => c.doneInCategory));

  return candidates
    .map((person) => {
      const experience = topExperience === 0 ? 0 : person.doneInCategory / topExperience;
      // The +2 and +4 start everyone at 50%, so one on-time task can't outrank a long record.
      const onTime = (person.doneOnTime + 2) / (person.doneTotal + 4);
      const availability = Math.max(0, 1 - person.activeTasks / WORKLOAD_LIMIT);
      const committee = person.categoryRoles.length > 0 ? 1 : 0;
      const score =
        weights.experience * experience +
        weights.onTime * onTime +
        weights.availability * availability +
        weights.committee * committee;
      const atLimit = person.activeTasks >= WORKLOAD_LIMIT;
      return { person, atLimit, score: Number(score.toFixed(6)) };
    })
    .sort(
      (a, b) =>
        Number(a.atLimit) - Number(b.atLimit) ||
        b.score - a.score ||
        a.person.activeTasks - b.person.activeTasks ||
        a.person.name.localeCompare(b.person.name),
    )
    .slice(0, TOP_COUNT)
    .map(({ person, atLimit, score }, index) => ({
      rank: index + 1,
      userId: person.userId,
      name: person.name,
      score,
      // toFixed first, so a value like 86.4999999 from float maths still rounds to 87.
      percent: Math.round(Number((score * 100).toFixed(4))),
      atLimit,
      reasons: buildReasons(person, task.categoryName, atLimit),
    }));
}
