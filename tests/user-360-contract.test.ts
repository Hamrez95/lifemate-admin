import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-USR-002 User 360", () => {
  it("reads User 360 through the Admin API only", () => {
    const client = source("src/lib/admin-api/user-detail.ts");

    expect(client).toContain("/api/v1/users/${accountId}");
    expect(client).toContain('cache: "no-store"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("contact_points");
    expect(client).not.toContain("women_calendar");
    expect(client).not.toContain("medications");
    expect(client).not.toContain("health_observations");
  });

  it("keeps the base route permission-aware and surfaces isolated section states", () => {
    const page = source("app/users/[accountId]/page.tsx");

    expect(page).toContain('admin.permissions.includes("users.read.basic")');
    expect(page).toContain('state="loading"');
    expect(page).toContain('state="forbidden"');
    expect(page).toContain('state="unavailable"');
    expect(page).toContain('state="empty"');
    expect(page).toContain("data.commerce.state");
    expect(page).toContain("data.relationships.state");
    expect(page).toContain("data.adminActivity.state");
  });

  it("keeps sensitive-health access outside ordinary User 360", () => {
    const page = source("app/users/[accountId]/page.tsx");

    expect(page).toContain("مرز حریم خصوصی");
    expect(page).toContain("break-glass");
    expect(page).not.toContain("health.read.elevated");
    expect(page).not.toContain("women_health.read.elevated");
  });

  it("provides keyboard and semantic loading cues", () => {
    const page = source("app/users/[accountId]/page.tsx");

    expect(page).toContain('aria-busy="true"');
    expect(page).toContain("<dl");
    expect(page).toContain("<Link");
  });
});
