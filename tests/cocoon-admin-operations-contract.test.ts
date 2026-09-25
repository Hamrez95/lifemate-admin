import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("Cocoon Admin operations privacy contract", () => {
  it("keeps Cocoon operations server-authorized and privacy-minimized", () => {
    const page = source("app/operations/cocoon/page.tsx");

    expect(page).toContain('admin.permissions.includes("operations.read")');
    expect(page).toContain("AdminPageState");
    expect(page).toContain('state="unavailable"');
    expect(page).toContain("privacy-safe");
    expect(page).not.toMatch(
      /health_observations|pregnant_users|gestational_age|\.from\(|fetch\(/i,
    );
  });

  it("does not expose browser-side clinical content mutations", () => {
    const page = source("app/operations/cocoon/content/page.tsx");
    const operations = source("app/operations/page.tsx");

    expect(page).toContain('admin.permissions.includes("operations.read")');
    expect(page).toContain("Contract pending");
    expect(page).toContain("Publish و rollback فعال نیستند");
    expect(page).toContain("disabled>\n                  باز کردن Preview");
    expect(page).not.toMatch(/fetch\(|use server|createAction|publishAction|rollbackAction/);
    expect(operations).toContain('href: "/operations/cocoon"');
    expect(operations).toContain('href: "/operations/cocoon/content"');
  });
});
