import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const adminApiDir = resolve(process.cwd(), "src/lib/admin-api");

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function adminClientSources(): Array<{ name: string; content: string }> {
  return readdirSync(adminApiDir)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => ({
      name,
      content: readFileSync(resolve(adminApiDir, name), "utf8"),
    }));
}

describe("Command Center canonical data-model parity", () => {
  it("keeps every Admin data client behind the canonical server API", () => {
    for (const client of adminClientSources()) {
      expect(client.content, client.name).not.toContain(".from(");
      expect(client.content, client.name).not.toContain("service_role");
      expect(client.content, client.name).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(client.content, client.name).not.toContain("DATABASE_URL");
    }
  });

  it("pins migration-sensitive primary surfaces to their canonical endpoints", () => {
    const contracts = [
      ["src/lib/admin-api/user-directory.ts", "/api/v1/users"],
      ["src/lib/admin-api/relationship-overview.ts", "/api/v1/relationships/overview"],
      ["src/lib/admin-api/relationship-ledger.ts", "/api/v1/relationships/ledger"],
      ["src/lib/admin-api/analytics-kpis.ts", "/api/v1/analytics/kpis"],
      ["src/lib/admin-api/support-queue.ts", "/api/v1/support/tickets"],
      ["src/lib/admin-api/commerce-overview.ts", "/api/v1/commerce/overview"],
      ["src/lib/admin-api/finance-overview.ts", "/api/v1/finance/overview"],
    ] as const;

    for (const [path, endpoint] of contracts) {
      expect(source(path), path).toContain(endpoint);
    }
  });

  it("keeps known not-yet-canonical capabilities visibly unavailable", () => {
    expect(source("app/ai/daily-brief/page.tsx")).toContain(
      "این قابلیت هنوز به قرارداد Core متصل نشده است",
    );
    expect(source("app/finance/scenario/page.tsx")).toContain(
      "Scenario API · Unavailable",
    );
    expect(source("app/operations/page.tsx")).toContain(
      "Operational visibility هنوز به قرارداد Core متصل نشده است",
    );
    expect(source("app/analytics/funnel/page.tsx")).toContain(
      "endpoint اختصاصی funnel هنوز در Core وجود ندارد",
    );
  });
});
