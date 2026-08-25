import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function sourceFiles(relativeDir: string): string[] {
  const dir = path.join(root, relativeDir);
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const absolute = path.join(dir, entry);
    const relative = path.relative(root, absolute).replaceAll("\\", "/");
    if (statSync(absolute).isDirectory()) {
      files.push(...sourceFiles(relative));
    } else if (/\.(?:ts|tsx)$/.test(entry)) {
      files.push(relative);
    }
  }
  return files;
}

function occurrences(value: string, needle: string): number {
  return value.split(needle).length - 1;
}

describe("core route performance contract", () => {
  it("keeps target-route image priority limited to intentional above-the-fold heroes", () => {
    expect(source("app/login/page.tsx")).toContain("priority");
    expect(source("src/components/dashboard/FounderOverview.tsx")).toContain("priority");

    for (const file of [
      "app/users/page.tsx",
      "app/commerce/page.tsx",
      "app/security/audit/page.tsx",
      "app/security/layout.tsx",
    ]) {
      expect(source(file), file).not.toMatch(/\bpriority\b/);
    }
  });

  it("uses the sprout asset only in shared empty/success state components", () => {
    const allowed = new Set([
      "src/components/admin-data-table/admin-page-state.tsx",
      "src/components/ui/EmptyState.tsx",
      "src/components/ui/SuccessState.tsx",
    ]);
    const offenders = [...sourceFiles("app"), ...sourceFiles("src")].filter((file) => {
      if (allowed.has(file)) return false;
      return source(file).includes("/design-assets/empty-success-sprout-v1.png");
    });
    expect(offenders).toEqual([]);
  });

  it("does not duplicate canonical fetch clients in the primary server routes", () => {
    const calls = [
      ["app/page.tsx", "getFounderOverview("],
      ["app/users/page.tsx", "getUserDirectory("],
      ["app/relationships/page.tsx", "getRelationshipOverview("],
      ["app/commerce/page.tsx", "getCommerceOverview("],
      ["app/security/audit/page.tsx", "getAuditLog("],
    ] as const;

    for (const [file, call] of calls) {
      expect(occurrences(source(file), call), file).toBe(1);
    }
  });

  it("keeps the responsive browser gate on all requested core routes", () => {
    const e2e = source("e2e/core-routes-responsive.spec.ts");
    for (const route of [
      "/login",
      'path: "/"',
      "/users",
      "/relationships",
      "/commerce",
      "/security/audit",
    ]) {
      expect(e2e).toContain(route);
    }
  });
});
