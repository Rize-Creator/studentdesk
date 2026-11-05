import { execFileSync } from "node:child_process";
import path from "node:path";

const TSX = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
const CLI = path.join(process.cwd(), "tests", "e2e", "db-cli.ts");

function run<T>(command: string, ...args: string[]): T {
  const output = execFileSync(process.execPath, [TSX, CLI, command, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  return JSON.parse(output.trim().split("\n").at(-1)!) as T;
}

export const db = {
  findTask: (projectId: string, title: string) =>
    run<{ id: string; status: string; recommendedRank: number | null }>("findTask", projectId, title),
  getTask: (taskId: string) => run<{ status: string; deliverableUrl: string | null }>("getTask", taskId),
  countNotifications: (taskId: string, type: string) => run<number>("countNotifications", taskId, type),
  historyOf: (taskId: string) => run<string[]>("historyOf", taskId),
  deleteProject: (projectId: string) => run<boolean>("deleteProject", projectId),
};
