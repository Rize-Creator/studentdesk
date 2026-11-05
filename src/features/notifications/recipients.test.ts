import { describe, expect, it } from "vitest";
import { htmlToText, isAllowedRecipient } from "./recipients";

describe("isAllowedRecipient", () => {
  const inbox = "studentdesk@gmail.com";
  const demoUser = (email: string) => ({ email, lmsId: "DEMO-002" });

  it("allows plus-addresses of the demo inbox in demo mode", () => {
    expect(isAllowedRecipient(demoUser("studentdesk+mariasantos@gmail.com"), true, inbox)).toBe(true);
    expect(isAllowedRecipient(demoUser("studentdesk@gmail.com"), true, inbox)).toBe(true);
  });

  it("refuses anyone else in demo mode", () => {
    expect(isAllowedRecipient(demoUser("someone@gmail.com"), true, inbox)).toBe(false);
    expect(isAllowedRecipient(demoUser("studentdesk+a@yahoo.com"), true, inbox)).toBe(false);
    expect(isAllowedRecipient(demoUser("studentdesk+a@gmail.com"), true, "")).toBe(false);
  });

  it("allows people who signed in with Google in demo mode, at their own address", () => {
    expect(isAllowedRecipient({ email: "someone@gmail.com", lmsId: "google:12345" }, true, inbox)).toBe(true);
    expect(isAllowedRecipient({ email: "someone@gmail.com", lmsId: "google:12345" }, true, "")).toBe(true);
  });

  it("doesn't treat an ID that only contains the word google as a Google user", () => {
    expect(isAllowedRecipient({ email: "someone@gmail.com", lmsId: "DEMO-google:1" }, true, inbox)).toBe(false);
  });

  it("allows anyone outside demo mode", () => {
    expect(isAllowedRecipient(demoUser("teacher@ccdi.edu.ph"), false, "")).toBe(true);
  });
});

describe("htmlToText", () => {
  it("removes tags and restores escaped characters", () => {
    expect(htmlToText("<p>Hi &amp; <strong>welcome</strong></p><p>Line &lt;2&gt;</p>")).toBe("Hi & welcome\nLine <2>");
  });
});
