import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-USR-002 / ADM-USR-004 User 360 detail", () => {
  it("reads User Detail and its activity timeline through the Admin API only", () => {
    const client = source("src/lib/admin-api/user-detail.ts");
    expect(client).toContain("/api/v1/users/${accountId}");
    expect(client).toContain("/api/v1/users/${accountId}/activity?");
    expect(client).toContain('cache: "no-store"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("contact_points");
    expect(client).not.toContain("women_calendar");
    expect(client).not.toContain("medications");
    expect(client).not.toContain("health_observations");
  });

  it("distinguishes HTTP-200 contract mismatch from transport and backend failures", () => {
    const client = source("src/lib/admin-api/user-detail.ts");
    expect(client).toContain("parseUserDetailResponse");
    expect(client).toContain('reason: "contract_mismatch"');
    expect(client).toContain('reason: "transport"');
    expect(client).toContain('reason: "backend"');
    expect(client).toContain(
      'value === "ready" || value === "empty" || value === "forbidden" || value === "unavailable"',
    );
    expect(client).toContain('freshness.status === "fresh" || freshness.status === "stale"');
  });

  it("keeps the base route permission-aware and surfaces isolated section states", () => {
    const page = source("app/users/[accountId]/page.tsx");
    expect(page).toContain('admin.permissions.includes("users.read.basic")');
    expect(page).toContain('admin.permissions.includes("support.read")');
    expect(page).toContain('state="loading"');
    expect(page).toContain('state="forbidden"');
    expect(page).toContain('state="unavailable"');
    expect(page).toContain('state="empty"');
    expect(page).toContain("data.commerce.state");
    expect(page).toContain("data.relationships.state");
    expect(page).toContain("data.adminActivity.state");
  });

  it("renders canonical relationship types generically so care roles survive schema migration", () => {
    const page = source("app/users/[accountId]/page.tsx");
    expect(page).toContain("relationship.relationshipType");
    expect(page).toContain("relationship.status");
    expect(page).not.toContain('relationship.relationshipType === "Parent"');
    expect(page).not.toContain('relationship.relationshipType === "Caregiver"');
  });

  it("provides deep-linkable Persian-first tabs without fabricating unavailable support data", () => {
    const page = source("app/users/[accountId]/page.tsx");
    for (const tab of [
      "overview",
      "products",
      "relationships",
      "commerce",
      "support",
      "activity",
    ]) {
      expect(page).toContain(`id: "${tab}"`);
    }
    expect(page).toContain('aria-current={tab.id === activeTab ? "page" : undefined}');
    expect(page).toContain("ADM-SUP-001");
    expect(page).toContain("داده ساختگی نمایش داده نمی‌شود");
  });

  it("paginates the admin activity timeline on the server", () => {
    const page = source("app/users/[accountId]/page.tsx");
    const client = source("src/lib/admin-api/user-detail.ts");
    expect(page).toContain("<AdminPagination");
    expect(page).toContain("getUserActivity(accountId, page, ACTIVITY_PAGE_SIZE)");
    expect(client).toContain("pageSize: String(safePageSize)");
    expect(client).toContain("signal: AbortSignal.timeout(10_000)");
  });

  it("keeps sensitive-health access outside ordinary User Detail", () => {
    const page = source("app/users/[accountId]/page.tsx");
    expect(page).toContain("مرز حریم خصوصی");
    expect(page).toContain("break-glass");
    expect(page).not.toContain("health.read.elevated");
    expect(page).not.toContain("women_health.read.elevated");
  });

  it("provides keyboard, semantic timeline and reduced-motion styling", () => {
    const page = source("app/users/[accountId]/page.tsx");
    const css = source("app/users/[accountId]/user-detail.module.css");
    expect(page).toContain('aria-busy="true"');
    expect(page).toContain("<dl");
    expect(page).toContain("<Link");
    expect(page).toContain("<time dateTime=");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("prefers-reduced-motion");
  });
});
