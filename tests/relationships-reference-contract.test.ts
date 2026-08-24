import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Relationships / Consent reference contract", () => {
  it("uses the approved hero asset and canonical read models only", () => {
    const page = source("app/relationships/page.tsx");
    const overview = source("src/lib/admin-api/relationship-overview.ts");
    const ledger = source("src/lib/admin-api/relationship-ledger.ts");

    expect(page).toContain('src="/design-assets/relationships-consent-hero-v1.png"');
    expect(overview).toContain("/api/v1/relationships/overview");
    expect(ledger).toContain("/api/v1/relationships/ledger");
    expect(overview).not.toContain(".from(");
    expect(ledger).not.toContain(".from(");
  });

  it("keeps raw medical and sensitive contact data outside the workspace", () => {
    const page = source("app/relationships/page.tsx");
    const overview = source("src/lib/admin-api/relationship-overview.ts");

    for (const sensitiveSource of [
      "women_calendar",
      "medications",
      "health_observations",
      "contact_points",
      "service_role",
    ]) {
      expect(overview).not.toContain(sensitiveSource);
    }
    expect(page).toContain("داده پزشکی خام");
    expect(page).toContain("حداقل‌سازی داده");
  });

  it("makes sensitive actions fail closed until a canonical mutation contract exists", () => {
    const page = source("app/relationships/page.tsx");

    expect(page).toContain("Permission:");
    expect(page).toContain("Confirmation:");
    expect(page).toContain("mutation canonical");
    expect(page).toContain('type="button" disabled');
    expect(page).toContain("endpoint موجود نیست");
    expect(page).not.toMatch(/fetch\([^)]*relationships[^)]*(revoke|extend|update)/i);
  });

  it("covers loading, empty, error, unavailable and forbidden states", () => {
    const page = source("app/relationships/page.tsx");

    expect(page).toContain('state="loading"');
    expect(page).toContain('state="empty"');
    expect(page).toContain('state="error"');
    expect(page).toContain('state="unavailable"');
    expect(page).toContain('state="forbidden"');
    expect(page).toContain("relationships.read");
  });

  it("exposes relationships, pending requests, grants, consents and canonical history navigation", () => {
    const page = source("app/relationships/page.tsx");

    expect(page).toContain("درخواست‌ها");
    expect(page).toContain("kind=relationship&status=Pending");
    expect(page).toContain("kind=access_grant");
    expect(page).toContain("kind=consent");
    expect(page).toContain("/relationships/ledger");
  });
});
