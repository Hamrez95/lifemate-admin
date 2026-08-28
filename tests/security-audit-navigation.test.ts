import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("ADM-SEC-003 audit navigation", () => {
  it("shows the audit sub-route only within Security and only with audit read permission", () => {
    const sidebar = source("src/components/shell/Sidebar.tsx");
    expect(sidebar).toContain('admin.permissions.includes("security.audit.read")');
    expect(sidebar).toContain('workspace.slug === "security" && active && canReadAudit');
    expect(sidebar).toContain('href="/security/audit"');
    expect(sidebar).toContain('aria-label="گزارش ممیزی"');
  });

  it("marks nested routes rather than their parent workspace as the current page", () => {
    const sidebar = source("src/components/shell/Sidebar.tsx");
    expect(sidebar).toContain('pathname === "/security/audit"');
    expect(sidebar).toContain('pathname.startsWith("/security/audit/")');
    expect(sidebar).toContain('pathname === "/research"');
    expect(sidebar).toContain('pathname.startsWith("/research/")');
    expect(sidebar).toContain('pathname === "/experiments"');
    expect(sidebar).toContain('pathname.startsWith("/experiments/")');
    expect(sidebar).toContain('aria-current={auditActive ? "page" : undefined}');
    expect(sidebar).toContain('aria-current={experimentsActive ? "page" : undefined}');
    expect(sidebar).toContain(
      'active && !auditActive && !researchActive && !experimentsActive',
    );
  });
});
