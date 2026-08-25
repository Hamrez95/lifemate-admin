import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("care relationships in Command Center", () => {
  it("keeps relationship type open for canonical care semantics", () => {
    const overview = source("src/lib/admin-api/relationship-overview.ts");
    const page = source("app/relationships/page.tsx");

    expect(overview).toContain("type: string | null");
    expect(overview).toContain('item.type === null || typeof item.type === "string"');
    expect(page).toContain('return item.type ?? "Relationship"');
    expect(overview).not.toMatch(/type:\s*"Parent"\s*\|/);
  });

  it("does not turn a relationship row into health authorization", () => {
    const page = source("app/relationships/page.tsx");

    expect(page).toContain("Relationship هیچ‌وقت به‌تنهایی");
    expect(page).toContain("Access Grant");
    expect(page).toContain("رضایت صریح");
  });

  it("continues to consume only the canonical server API", () => {
    const overview = source("src/lib/admin-api/relationship-overview.ts");

    expect(overview).toContain("/api/v1/relationships/overview");
    expect(overview).toContain('cache: "no-store"');
    expect(overview).not.toContain("lifemate.care_relationships");
    expect(overview).not.toContain("network.person_relationships");
  });
});
