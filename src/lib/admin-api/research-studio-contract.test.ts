import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

async function source(relativePath: string): Promise<string> {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

describe("Founder Research Studio contract", () => {
  it("uses only the canonical server-side Research API", async () => {
    const client = await source("src/lib/admin-api/research-studio.ts");
    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/research/datasets");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("getServerAdminAccessToken");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
  });

  it("keeps Research navigation and page Founder-only", async () => {
    const page = await source("app/research/page.tsx");
    const sidebar = await source("src/components/shell/Sidebar.tsx");
    expect(page).toContain('admin.roles.includes("founder")');
    expect(sidebar).toContain('admin.roles.includes("founder")');
    expect(sidebar).toContain('href="/research"');
  });

  it("does not introduce export-all or raw database fallback", async () => {
    const page = await source("app/research/page.tsx");
    const actions = await source("app/research/actions.ts");
    expect(page).toContain("No raw export-all");
    expect(page).toContain("minimumCohortSize");
    expect(page).toContain("smallCellThreshold");
    expect(page).toContain("Aggregate تنها حالت قابل ساخت است");
    expect(actions).toContain('rowMode: "Aggregate"');
    expect(actions).not.toContain("randomUUID");
  });

  it("preserves a stable Idempotency-Key from each rendered form", async () => {
    const page = await source("app/research/page.tsx");
    const actions = await source("app/research/actions.ts");
    expect(page).toContain('name="idempotencyKey"');
    expect(actions).toContain("idempotencyKey(form)");
    expect(actions).toContain("idempotencyKey: stableKey");
  });

  it("redirects downloads only through a signed https Research URL", async () => {
    const route = await source("app/research/download/[jobId]/route.ts");
    expect(route).toContain("getResearchExportDownload");
    expect(route).toContain('target.protocol !== "https:"');
    expect(route).toContain('response.headers.set("Referrer-Policy", "no-referrer")');
  });
});
