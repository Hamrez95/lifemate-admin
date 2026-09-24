import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("app/marketing/organic-analytics/page.tsx", "utf8");

describe("Organic Creative Analytics truthful blocked workspace", () => {
  it("does not invent provider metrics, zeroes, or winning creative claims", () => {
    expect(page).toContain('state="unavailable"');
    expect(page).toMatch(/Null صفر نیست/);
    expect(page).toContain("sample size");
    expect(page).toContain('href="/marketing"');
  });
});
