import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-ARCH-01 UI architecture guardrails", () => {
  it("keeps the canonical token owner and paved-path guide explicit", () => {
    const guard = source("scripts/ui-architecture-check.mjs");
    const guide = source("docs/project/BUILDING_ADMIN_UI.md");

    expect(guard).toContain("app/design-system.css");
    expect(guard).toContain("legacyRawColorFiles");
    expect(guide).toContain("Building Admin UI");
    expect(guide).toContain("CSS logical properties");
    expect(guide).toContain("Server authorization");
  });

  it("runs the repository guard and keeps common regressions covered", () => {
    const output = execFileSync(process.execPath, ["scripts/ui-architecture-check.mjs"], {
      cwd: root,
      encoding: "utf8",
    });
    const guard = source("scripts/ui-architecture-check.mjs");

    expect(output).toContain("UI architecture guard passed");
    expect(guard).toContain("uses physical left/right; prefer logical properties");
    expect(guard).toContain("defines a generic UI selector");
    expect(guard).toContain("adds a raw color outside the temporary migration registry");
  });

  it("keeps responsive token overrides in the canonical stylesheet", () => {
    const designSystem = source("app/design-system.css");
    const globals = source("app/globals.css");

    expect(designSystem).toContain("@media (max-width: 1180px)");
    expect(designSystem).toContain("--lm-sidebar-width: 210px");
    expect(globals).not.toContain("--lm-sidebar-width: 210px");
  });
});
