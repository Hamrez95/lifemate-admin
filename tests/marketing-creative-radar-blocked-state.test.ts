import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("app/marketing/creative-radar/page.tsx", "utf8");

describe("Creative Radar truthful blocked workspace", () => {
  it("does not invent radar signals, recommendations, or publishing while its API is unavailable", () => {
    expect(page).toContain('state="unavailable"');
    expect(page).toMatch(/هیچ\s+reference،\s+trend،\s+score یا توصیهٔ ساختگی نمایش داده نمی‌شود/);
    expect(page).toContain("بازتولید creative");
    expect(page).toContain('href="/marketing/content-studio"');
  });
});
