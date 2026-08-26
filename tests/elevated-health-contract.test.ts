import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Elevated Health Viewer security contract", () => {
  it("uses server-only canonical API and never a direct database path", () => {
    const client = source("src/lib/admin-api/elevated-health.ts");
    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/security/elevated-health/");
    expect(client).toContain('cache: "no-store"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("SUPABASE_DB_URL");
  });

  it("requires the break-glass request boundary and exact capabilities", () => {
    const page = source("app/security/elevated-health/page.tsx");
    expect(page).toContain("security.break_glass.request");
    expect(page).toContain("health.read.elevated");
    expect(page).toContain("women_health.read.elevated");
    expect(page).toContain("Founder role");
    expect(page).toContain("active Break-glass required on every read");
  });

  it("does not expose export or sensitive free-text fields", () => {
    const page = source("app/security/elevated-health/page.tsx");
    const client = source("src/lib/admin-api/elevated-health.ts");
    for (const forbidden of [
      "privateNotes",
      "note:",
      "instructions:",
      "metadataJson",
      "sourceExternalId",
    ]) {
      expect(page).not.toContain(forbidden);
      expect(client).not.toContain(forbidden);
    }
    expect(page).not.toContain("Export");
    expect(page).not.toContain("خروجی");
  });
});
