import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("app/marketing/review-publish/page.tsx", "utf8");

describe("Review & Publish truthful blocked workspace", () => {
  it("does not invent approval, provider readiness, or publish success", () => {
    expect(page).toContain('state="unavailable"');
    expect(page).toMatch(/approval یا Published ساختگی/);
    expect(page).toContain("OutcomeUnknown");
    expect(page).toContain('href="/marketing/content-calendar"');
  });
});
