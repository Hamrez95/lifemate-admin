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
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("Authorization: `Bearer ${token}`");
    expect(client).not.toMatch(/\.from\(|service_role|SUPABASE_SERVICE|DATABASE_URL/i);
  });

  it("does not simulate unavailable server date filters or pagination", () => {
    const page = source("app/security/audit/page.tsx");
    const client = source("src/lib/admin-api/audit-log.ts");
    expect(page).toContain("فیلتر تاریخ");
    expect(page).toContain("قابلیت‌ها را شبیه‌سازی نمی‌کند");
    expect(client).not.toMatch(/cursor|offset|fromDate|toDate|dateFrom|dateTo/);
  });

  it("keeps raw metadata and direct database access out of the view", () => {
    const page = source("app/security/audit/page.tsx");
    expect(page).not.toMatch(/metadataJson|metadata_json|providerPayload|rawPayload/);
    expect(page).not.toMatch(/\.from\(|service_role|SUPABASE_SERVICE|DATABASE_URL/i);
  });
});
