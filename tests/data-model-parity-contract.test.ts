import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const canonicalClients = [
  ["src/lib/admin-api/user-directory.ts", "/api/v1/users"],
  ["src/lib/admin-api/relationship-overview.ts", "/api/v1/relationships/overview"],
  ["src/lib/admin-api/analytics-kpis.ts", "/api/v1/analytics/kpis"],
  ["src/lib/admin-api/support-queue.ts", "/api/v1/support/tickets"],
  ["src/lib/admin-api/commerce-overview.ts", "/api/v1/commerce/overview"],
  ["src/lib/admin-api/finance-profit-loss.ts", "/api/v1/finance/profit-loss"],
] as const;

const forbiddenBrowserDataPaths = [
  ".from(",
  "service_role",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
] as const;

describe("Command Center canonical data-model parity gate", () => {
  it.each(canonicalClients)("pins %s to canonical Admin API route %s", (path, endpoint) => {
    const client = source(path);

    expect(client).toContain(endpoint);
    expect(client).toContain('cache: "no-store"');
    for (const forbidden of forbiddenBrowserDataPaths) {
      expect(client).not.toContain(forbidden);
    }
  });

  it("keeps marketing attribution explicitly not instrumented instead of inventing joins", () => {
    const client = source("src/lib/admin-api/marketing-overview.ts");

    expect(client).toContain('state: "not_instrumented"');
    expect(client).toContain("getKpiValues");
    expect(client).toContain("attribution هنوز source canonical ندارند");
    expect(client).not.toContain(".from(");
  });

  it("keeps Operations explicit unavailable until Core owns a canonical read model", () => {
    const page = source("app/operations/page.tsx");

    expect(page).toContain("Operational visibility هنوز به قرارداد Core متصل نشده است");
    expect(page).toContain("Unavailable");
    expect(page).not.toContain(".from(");
  });

  it("keeps Finance Scenario persistence disabled until a canonical contract exists", () => {
    const page = source("app/finance/scenario/page.tsx");

    expect(page).toContain("Scenario API · Unavailable");
    expect(page).toContain("ذخیره سناریو — در دسترس نیست");
    expect(page).not.toContain(".from(");
  });

  it("documents Settings as a dependency rather than adding a direct database fallback", () => {
    const page = source("app/settings/page.tsx");

    expect(page).not.toContain(".from(");
    expect(page).not.toContain("service_role");
  });
});
