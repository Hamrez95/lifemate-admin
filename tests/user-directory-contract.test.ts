import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-USR-001 security and UI contract", () => {
  it("calls the Admin API instead of reading Supabase tables from the browser surface", () => {
    const client = source("src/lib/admin-api/user-directory.ts");

    expect(client).toContain("/api/v1/users");
    expect(client).toContain('cache: "no-store"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("contact_points");
    expect(client).not.toContain("women_calendar");
    expect(client).not.toContain("medications");
  });

  it("renders only the canonical nullable consumer username", () => {
    const client = source("src/lib/admin-api/user-directory.ts");
    const page = source("app/users/page.tsx");

    expect(client).toContain("username: string | null");
    expect(client).toContain("item.username !== null");
    expect(client).toContain('typeof item.username !== "string"');
    expect(client).toContain('typeof item.username === "string" ? item.username : null');
    expect(page).toContain("row.username");
    expect(page).toContain("username canonical");
    expect(page).not.toContain('split("@")');
    expect(page).not.toContain("staff_profiles");
  });

  it("keeps the route permission-aware and implements all required page states", () => {
    const page = source("app/users/page.tsx");

    expect(page).toContain('admin.permissions.includes("users.read.basic")');
    expect(page).toContain('state="loading"');
    expect(page).toContain('state="forbidden"');
    expect(page).toContain('state="error"');
    expect(page).toContain('state="unavailable"');
    expect(page).toContain("AdminDataTable");
    expect(page).toContain("User 360");
  });

  it("keeps filtering and pagination server-driven", () => {
    const page = source("app/users/page.tsx");

    expect(page).toContain("parseTableQuery");
    expect(page).toContain("parseFilterState");
    expect(page).toContain("toTableSearchParams");
    expect(page).toContain("pageSize");
    expect(page).toContain("previousHref");
    expect(page).toContain("nextHref");
  });
});
