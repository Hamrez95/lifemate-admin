import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-DATA-001 analytics catalog", () => {
  it("reads the canonical catalog through the Admin API only", () => {
    const client = source("src/lib/admin-api/analytics-catalog.ts");

    expect(client).toContain("/api/v1/analytics/catalog");
    expect(client).toContain('cache: "no-store"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("women_calendar");
    expect(client).not.toContain("medications");
    expect(client).not.toContain("health_observations");
  });

  it("requires explicit version, source, freshness and availability metadata", () => {
    const client = source("src/lib/admin-api/analytics-catalog.ts");

    expect(client).toContain("eventTaxonomyVersion");
    expect(client).toContain("kpiDictionaryVersion");
    expect(client).toContain("definitionVersion");
    expect(client).toContain("eventSources");
    expect(client).toContain("freshnessRule");
    expect(client).toContain('"unavailable"');
  });

  it("documents unavailable as distinct from zero and forbids fake backfill", () => {
    const docs = source("docs/project/ANALYTICS_TAXONOMY.md");

    expect(docs).toContain("does not mean zero");
    expect(docs).toContain("No fake historical backfill");
    expect(docs).toContain("analytics.read");
    expect(docs).toContain("Asia/Tehran");
  });
});
