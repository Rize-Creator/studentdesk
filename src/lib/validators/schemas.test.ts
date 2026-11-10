import { describe, expect, it } from "vitest";
import { deliverableSchema, milestoneSchema, normalizeLink, projectSchema, sendBackSchema, taskSchema } from "./schemas";

describe("normalizeLink", () => {
  it("keeps a full link", () => {
    expect(normalizeLink("https://drive.google.com/file/abc")).toBe("https://drive.google.com/file/abc");
  });

  it("adds https to a pasted link with no protocol", () => {
    expect(normalizeLink("  drive.google.com/x ")).toBe("https://drive.google.com/x");
  });

  it.each(["javascript:alert(1)", "data:text/html,hi", "ftp://files.example.com/a", "not a link", "localhost"])(
    "refuses %s",
    (raw) => {
      expect(normalizeLink(raw)).toBeNull();
    },
  );
});

describe("deliverableSchema", () => {
  it("allows an empty link and note", () => {
    expect(deliverableSchema.parse({ deliverableUrl: "", deliverableNote: "" })).toEqual({
      deliverableUrl: null,
      deliverableNote: null,
    });
  });

  it("reports a bad link on its field", () => {
    const result = deliverableSchema.safeParse({ deliverableUrl: "javascript:alert(1)" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["deliverableUrl"]);
  });
});

describe("projectSchema", () => {
  const valid = { name: "Foundation Day", type: "EVENT", startDate: "2026-11-01", targetDate: "2026-12-01" };

  it("accepts a valid project", () => {
    expect(projectSchema.safeParse(valid).success).toBe(true);
  });

  it("refuses a target date before the start date", () => {
    const result = projectSchema.safeParse({ ...valid, targetDate: "2026-10-01" });
    expect(result.error?.issues[0].path).toEqual(["targetDate"]);
  });
});

describe("taskSchema", () => {
  const valid = { title: "Book the sound system", categoryId: "c1", priority: "HIGH", deadline: "2026-11-07" };

  it("treats an empty assignee as no assignee", () => {
    expect(taskSchema.parse({ ...valid, assigneeId: "" }).assigneeId).toBeNull();
  });

  it("requires a deadline", () => {
    expect(taskSchema.safeParse({ ...valid, deadline: "" }).success).toBe(false);
  });

  it("keeps a title with Filipino characters intact", () => {
    expect(taskSchema.parse({ ...valid, title: "Ipadala kay Bañas" }).title).toBe("Ipadala kay Bañas");
  });
});

describe("sendBackSchema", () => {
  it("requires a note", () => {
    expect(sendBackSchema.safeParse({ note: "  " }).success).toBe(false);
  });
});

describe("dates", () => {
  const project = { name: "Foundation Day", type: "EVENT", startDate: "2026-11-01", targetDate: "2026-12-01" };
  const task = { title: "Book the hall", categoryId: "category-logistics", priority: "MEDIUM", deadline: "2026-11-20" };
  const messages = (result: { error?: { issues: { message: string }[] } }) => result.error?.issues.map((issue) => issue.message) ?? [];

  it("refuses a mistyped year, which used to break the project's pages", () => {
    const result = projectSchema.safeParse({ ...project, startDate: "0202-11-05" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["startDate"]);
    expect(messages(result)).toContain("Use a year from 2000 to 2100.");
  });

  it("refuses years too far ahead as well", () => {
    expect(projectSchema.safeParse({ ...project, targetDate: "2206-12-01" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...project, startDate: "1999-12-31" }).success).toBe(false);
  });

  it("accepts the first and last years allowed", () => {
    expect(projectSchema.safeParse({ ...project, startDate: "2000-01-01", targetDate: "2100-12-31" }).success).toBe(true);
  });

  it("refuses a date that isn't on the calendar", () => {
    expect(messages(taskSchema.safeParse({ ...task, deadline: "2026-02-31" }))).toContain("Choose a real date.");
    expect(taskSchema.safeParse({ ...task, deadline: "2026-13-01" }).success).toBe(false);
  });

  it("accepts February 29 only in a leap year", () => {
    expect(taskSchema.safeParse({ ...task, deadline: "2028-02-29" }).success).toBe(true);
    expect(taskSchema.safeParse({ ...task, deadline: "2027-02-29" }).success).toBe(false);
  });

  it("checks task deadlines and milestone due dates the same way", () => {
    expect(taskSchema.safeParse({ ...task, deadline: "0202-11-05" }).success).toBe(false);
    expect(milestoneSchema.safeParse({ title: "Budget approved", dueDate: "0202-11-05" }).success).toBe(false);
    expect(milestoneSchema.safeParse({ title: "Budget approved", dueDate: "2026-11-05" }).success).toBe(true);
  });
});
