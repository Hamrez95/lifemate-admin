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
    expect(sidebar).toContain("pendingNavigation");
    expect(sidebar).toContain("onNavigate={onNavigateTo(workspacePath)}");
    expect(sidebar).toContain("window.setTimeout(() => setPendingNavigation(null), 5000)");
    expect(sidebar).toContain("const activePathname =");
    expect(sidebar).toContain('aria-current={isPrimaryRoute ? "page" : undefined}');
  });

  it("measures real sidebar transitions in the production performance harness", () => {
    const performanceSpec = source("e2e/performance-baseline.spec.ts");
    const navigationSpec = source("e2e/performance-client-navigation.spec.ts");
    const workflow = source(".github/workflows/performance-audit.yml");

    expect(performanceSpec).toContain("records active navigation feedback latency");
    expect(performanceSpec).toContain('page.waitForURL(`**${target}`, { waitUntil: "commit" })');
    expect(performanceSpec).toContain('metric: "sidebar-click-to-aria-current-ms"');
    expect(performanceSpec).toContain("containsRealUserData: false");
    expect(performanceSpec).toContain('aria-current="page"');
    expect(navigationSpec).toContain("supports keyboard activation of Sidebar workspaces");
    expect(navigationSpec).toContain('operationsLink.press("Enter")');
    expect(workflow).toContain('"e2e/performance-client-navigation.spec.ts"');
  });
});
