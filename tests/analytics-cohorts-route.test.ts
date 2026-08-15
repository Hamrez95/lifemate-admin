import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("ADM-ANL-002 cohort workspace routing and privacy", () => {
  it("is discoverable from the canonical analytics workspace", () => {
    expect(source("app/analytics/page.tsx")).toContain('href="/analytics/cohorts"');
  });

  it("keeps the browser contract aggregate-only and suppresses small cohorts server-side", () => {
    const contract = source("src/lib/admin-api/analytics-cohorts.ts");

    expect(contract).toContain("COHORT_SUPPRESSION_THRESHOLD = 20");
    expect(contract).toContain("size: suppressed ? null : point.value");
    expect(contract).not.toMatch(/accountId|userId|personId|phone|email/i);
  });

  it("does not expose a user-level export action", () => {
    const page = source("app/analytics/cohorts/page.tsx");

    expect(page).not.toMatch(
      /export csv|download csv|user-level export|خروجی کاربران/i,
    );
    expect(page).toContain("app_opened history");
    expect(page).toContain("profile_completed");
  });
});
