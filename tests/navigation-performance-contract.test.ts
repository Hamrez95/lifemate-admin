import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("PERF-02 navigation feedback contract", () => {
  it("derives the active workspace from the client pathname", () => {
    const sidebar = source("src/components/shell/Sidebar.tsx");

    expect(sidebar).toContain("usePathname");
    expect(sidebar).toContain("routeActiveSlug");
    expect(sidebar).toContain("routeMatchesWorkspace");
    expect(sidebar).toContain('aria-current={isPrimaryRoute ? "page" : undefined}');
  });

  it("measures real sidebar transitions in the production performance harness", () => {
    const performanceSpec = source("e2e/performance-baseline.spec.ts");

    expect(performanceSpec).toContain("keeps selected navigation synchronized");
    expect(performanceSpec).toContain('page.waitForURL(`**${target}`, { waitUntil: "commit" })');
    expect(performanceSpec).toContain('aria-current="page"');
  });
});
