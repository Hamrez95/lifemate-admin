import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Break-glass console security contract", () => {
  it("uses only the server-side canonical Admin API", () => {
    const client = source("src/lib/admin-api/break-glass.ts");
    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/security/break-glass/requests");
    expect(client).toContain('cache: "no-store"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("SUPABASE_DB_URL");
  });

  it("keeps request and approval authorities separate and explicit", () => {
    const page = source("app/security/break-glass/page.tsx");
    const actions = source("app/security/break-glass/actions.ts");
    expect(page).toContain('security.break_glass.request');
    expect(page).toContain('security.break_glass.approve');
    expect(actions).toContain("confirm-break-glass-request");
    expect(actions).toContain("confirm-break-glass-change");
    expect(actions).toContain("idempotencyKey");
  });

  it("does not render raw health fields or infer access from relationships", () => {
    const page = source("app/security/break-glass/page.tsx");
    const client = source("src/lib/admin-api/break-glass.ts");
    for (const forbidden of ["medications", "diagnosis", "women_calendar", "health_observations", "service_role"]) {
      expect(page).not.toContain(forbidden);
      expect(client).not.toContain(forbidden);
    }
    expect(page).toContain("Relationship یا Founder role");
  });
});
