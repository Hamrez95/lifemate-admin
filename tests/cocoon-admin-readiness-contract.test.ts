import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("Cocoon Admin readiness gate contract", () => {
  it("keeps the readiness gate evidence-driven and server-authorized", () => {
    const page = source("app/operations/cocoon/readiness/page.tsx");

    expect(page).toContain('admin.permissions.includes("operations.read")');
    expect(page).toContain('state="unavailable"');
    expect(page).toContain("#261");
    expect(page).toContain("#262");
    expect(page).toContain("#263");
    expect(page).toContain("Needs evidence");
    expect(page).toContain("Fail closed");
    expect(page).not.toMatch(/health_observations|pregnant_users|\.from\(|fetch\(/i);
  });

  it("exposes the readiness path from the canonical Operations links", () => {
    const operations = source("app/operations/page.tsx");
    expect(operations).toContain('href: "/operations/cocoon/readiness"');
  });
});
