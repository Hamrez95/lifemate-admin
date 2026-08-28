import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

async function source(relativePath: string): Promise<string> {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

describe("founder growth analytics contract", () => {
  it("uses only the canonical server-side growth endpoint", async () => {
    const client = await source("src/lib/admin-api/growth-analytics.ts");
    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/analytics/growth");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("getServerAdminAccessToken");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
  });

  it("preserves account/person scope and no-fabrication semantics", async () => {
    const client = await source("src/lib/admin-api/growth-analytics.ts");
    const page = await source("app/analytics/growth/page.tsx");
    expect(client).toContain("accountScoped");
    expect(client).toContain("personScoped");
    expect(client).toContain("noFabrication: true");
    expect(page).toContain("KPIهای فاقد source معتبر");
    expect(page).toContain("Unavailable");
    expect(page).toContain("No fabrication");
  });

  it("requires analytics.read and keeps export unavailable without a canonical contract", async () => {
    const page = await source("app/analytics/growth/page.tsx");
    expect(page).toContain('admin.permissions.includes("analytics.read")');
    expect(page).toContain("aggregate export contract");
    expect(page).toContain("disabled");
  });
});
