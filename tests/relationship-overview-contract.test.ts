import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseRelationshipOverviewResponse } from "@/src/lib/admin-api/relationship-overview";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-REL-001 Relationship Consent overview", () => {
  it("uses the Admin API and never queries sensitive tables from the browser", () => {
    const client = source("src/lib/admin-api/relationship-overview.ts");

    expect(client).toContain("/api/v1/relationships/overview");
    expect(client).toContain('cache: "no-store"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("women_calendar");
    expect(client).not.toContain("medications");
    expect(client).not.toContain("health_observations");
  });

  it("accepts a production-shaped payload with multiple active care relationships", () => {
    const payload = {
      summary: [{ kind: "relationship", status: "Active", total: 5 }],
      items: Array.from({ length: 5 }, (_, index) => ({
        id: `relationship-${index + 1}`,
        kind: "relationship",
        status: "Active",
        subjectPersonId: `person-${index + 1}`,
        type: "Caregiver",
        purpose: null,
        context: null,
        scopeCount: null,
        version: null,
        scopes: null,
        startedAtUtc: "2026-08-30T00:00:00.000Z",
        endedAtUtc: null,
        occurredAtUtc: "2026-08-30T00:00:00.000Z",
      })),
      total: 5,
      page: 1,
      pageSize: 25,
      filters: { kind: null, status: null },
      freshness: { status: "fresh", asOfUtc: "2026-08-30T00:00:00.000Z" },
    };

    const parsed = parseRelationshipOverviewResponse(payload);

    expect(parsed).not.toBeNull();
    expect(parsed?.items).toHaveLength(5);
    expect(parsed?.items.every((item) => item.kind === "relationship")).toBe(true);
    expect(parsed?.items.every((item) => item.status === "Active")).toBe(true);
  });

  it("keeps parser failures distinct from a truthful canonical empty result", () => {
    const canonicalEmpty = {
      summary: [],
      items: [],
      total: 0,
      page: 1,
      pageSize: 25,
      filters: { kind: null, status: null },
      freshness: { status: "fresh", asOfUtc: "2026-08-30T00:00:00.000Z" },
    };

    expect(parseRelationshipOverviewResponse(canonicalEmpty)?.items).toEqual([]);
    expect(parseRelationshipOverviewResponse({ items: [] })).toBeNull();
  });

  it("keeps Relationship, Consent and Access Grant visibly independent", () => {
    const page = source("app/relationships/page.tsx");

    expect(page).toContain("Relationship");
    expect(page).toContain("Consent");
    expect(page).toContain("Access Grant");
    expect(page).toContain("به‌تنهایی هیچ مجوز داده‌ای ایجاد نمی‌کند");
    expect(page).toContain("relationships.read");
  });

  it("accepts canonical care-role relationship labels without hard-coding family types", () => {
    const client = source("src/lib/admin-api/relationship-overview.ts");
    const page = source("app/relationships/page.tsx");

    expect(client).toContain('(item.type === null || typeof item.type === "string")');
    expect(page).toContain('return item.type ?? "Relationship"');
    expect(page).not.toContain('item.type === "Parent"');
    expect(page).not.toContain('item.type === "Spouse"');
    expect(page).not.toContain('item.type === "Caregiver"');
  });

  it("does not invent default filters that can hide canonical relationships", () => {
    const page = source("app/relationships/page.tsx");

    expect(page).toContain('for (const key of ["page", "pageSize", "kind", "status"] as const)');
    expect(page).not.toContain('params.set("kind", "relationship")');
    expect(page).not.toContain('params.set("status", "Active")');
  });

  it("uses shared server pagination, truthful page states and the canonical ledger route", () => {
    const page = source("app/relationships/page.tsx");

    expect(page).toContain("AdminPagination");
    expect(page).toContain('state="forbidden"');
    expect(page).toContain('state="unavailable"');
    expect(page).toContain('state="empty"');
    expect(page).toContain('href="/relationships/ledger"');
    expect(page).toContain("مشاهده Ledger کامل");
  });

  it("ships a polished responsive LifeMate trust visual language", () => {
    const css = source("app/relationships/relationships.module.css");

    expect(css).toContain("var(--lm-green)");
    expect(css).toContain("var(--lm-violet)");
    expect(css).toContain("var(--lm-blue)");
    expect(css).toContain("@media (max-width: 680px)");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain(":focus-visible");
  });
});
