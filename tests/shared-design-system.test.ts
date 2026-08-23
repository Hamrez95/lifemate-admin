import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("shared RTL Command Center design system", () => {
  it("keeps one shared shell and page header without changing authorization logic", () => {
    const adminShell = source("src/components/shell/AdminShell.tsx");
    const appShell = source("src/components/ui/AppShell.tsx");
    const topbar = source("src/components/shell/Topbar.tsx");
    const pageHeader = source("src/components/ui/PageHeader.tsx");

    expect(adminShell).toContain("<AppShell");
    expect(appShell).toContain('className="app-shell"');
    expect(topbar).toContain("<PageHeader");
    expect(pageHeader).toContain('aria-label="مسیر صفحه"');
    expect(adminShell).not.toMatch(/\.from\(|service_role|SUPABASE_SERVICE_ROLE/i);
  });

  it("provides shared metric, table and truthful state primitives", () => {
    expect(source("src/components/ui/MetricCard.tsx")).toContain("export function MetricCard");
    expect(source("src/components/ui/DataTable.tsx")).toContain("export function DataTable");
    expect(source("src/components/ui/EmptyState.tsx")).toContain("export function EmptyState");
    expect(source("src/components/ui/LoadingState.tsx")).toContain("Admin API");
    expect(source("src/components/ui/ErrorState.tsx")).toContain("fallback");
    expect(source("src/components/ui/ForbiddenState.tsx")).toContain("سمت سرور");
  });

  it("defines the requested responsive checkpoints", () => {
    const styles = source("app/design-system.css");
    expect(styles).toContain("@media (max-width: 1024px)");
    expect(styles).toContain("@media (max-width: 768px)");
    expect(styles).toContain("@media (max-width: 390px)");
    expect(styles).toContain("direction: rtl");
    expect(styles).toContain("--lm-green");
  });
});
