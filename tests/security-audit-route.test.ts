import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("ADM-SEC-003 audit read surface boundary", () => {
  it("requires the canonical audit permission before rendering", () => {
    const page = source("app/security/audit/page.tsx");
    expect(page).toContain('admin.permissions.includes("security.audit.read")');
    expect(page).toContain('redirect("/forbidden")');
  });

  it("fetches only through the authenticated server-side Admin API without caching", () => {
    const client = source("src/lib/admin-api/audit-log.ts");
    expect(client).toContain("createServerSupabaseClient");
    expect(client).toContain('url.searchParams.set("limit"');
    expect(client).toContain('url.searchParams.set("from"');
    expect(client).toContain('url.searchParams.set("to"');
    expect(client).toContain('url.searchParams.set("cursor"');
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("Authorization: `Bearer ${token}`");
    expect(client).not.toMatch(/\.from\(|service_role|SUPABASE_SERVICE|DATABASE_URL/i);
  });

  it("uses canonical server date filters and cursor pagination without browser simulation", () => {
    const page = source("app/security/audit/page.tsx");
    const client = source("src/lib/admin-api/audit-log.ts");
    expect(page).toContain('type="date"');
    expect(page).toContain("nextCursor");
    expect(page).toContain("صفحه بعد");
    expect(page).toContain("cursor پایدار");
    expect(client).toContain("Math.min(100");
    expect(client).not.toMatch(/offset|localStorage|sessionStorage/);
  });

  it("fails safe when frontend lands before the canonical backend paging contract", () => {
    const page = source("app/security/audit/page.tsx");
    const contract = source("src/lib/admin-api/audit-log-contract.ts");
    expect(contract).toContain("supportsServerPaging: false");
    expect(contract).toContain("hasAnyNewContractField");
    expect(page).toContain("contractUnavailable");
    expect(page).toContain("disabled={!serverPagingAvailable}");
    expect(page).toContain("نتیجه فیلترشده جعل نمی‌شود");
  });

  it("keeps raw metadata and direct database access out of the view", () => {
    const page = source("app/security/audit/page.tsx");
    expect(page).not.toMatch(/metadataJson|metadata_json|providerPayload|rawPayload/);
    expect(page).not.toMatch(/\.from\(|service_role|SUPABASE_SERVICE|DATABASE_URL/i);
  });
});
