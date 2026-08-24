import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

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

  it("keeps Relationship, Consent and Access Grant visibly independent", () => {
    const page = source("app/relationships/page.tsx");

    expect(page).toContain("Relationship");
    expect(page).toContain("Consent");
    expect(page).toContain("Access Grant");
    expect(page).toContain("به‌تنهایی هیچ مجوز داده‌ای ایجاد نمی‌کند");
    expect(page).toContain("relationships.read");
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
