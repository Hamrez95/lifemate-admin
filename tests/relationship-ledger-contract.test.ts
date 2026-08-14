import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-REL-002 Relationship Consent Access Grant Ledger", () => {
  it("uses the Admin API only and keeps sensitive domains out of the client", () => {
    const client = source("src/lib/admin-api/relationship-ledger.ts");

    expect(client).toContain("/api/v1/relationships/ledger");
    expect(client).toContain('cache: "no-store"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("women_calendar");
    expect(client).not.toContain("medications");
    expect(client).not.toContain("health_observations");
  });

  it("shows evidence provenance instead of presenting derived timestamps as invented audit events", () => {
    const page = source("app/relationships/ledger/page.tsx");

    expect(page).toContain("رویداد canonical ذخیره‌شده");
    expect(page).toContain("Lifecycle timestamp");
    expect(page).toContain("هیچ audit ساختگی");
    expect(page).toContain("relationships.read");
  });

  it("supports type status date filters and shared server pagination", () => {
    const page = source("app/relationships/ledger/page.tsx");

    expect(page).toContain('name="from"');
    expect(page).toContain('name="to"');
    expect(page).toContain('name="kind"');
    expect(page).toContain('name="status"');
    expect(page).toContain("AdminPagination");
  });

  it("has a colorful responsive accessible timeline layer", () => {
    const css = source("app/relationships/ledger/ledger.module.css");

    expect(css).toContain("var(--lm-green)");
    expect(css).toContain("var(--lm-violet)");
    expect(css).toContain("var(--lm-blue)");
    expect(css).toContain("focus-visible");
    expect(css).toContain("max-width: 680px");
    expect(css).toContain("prefers-reduced-motion");
  });
});
