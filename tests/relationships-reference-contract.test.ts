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

  it("keeps sensitive mutations permission-gated, canonical and fail closed", () => {
    const page = source("app/relationships/page.tsx");
    const client = source("src/lib/admin-api/relationship-access-grant-actions.ts");
    const actions = source("app/relationships/actions.ts");

    expect(page).toContain("relationships.access_grant.write");
    expect(page).toContain("AAL2 · Audited");
    expect(page).toContain("immutable audit");
    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/relationships/access-grants/");
    expect(client).toContain('"Idempotency-Key": input.idempotencyKey');
    expect(actions).toContain('"confirm-access-grant-change"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
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
