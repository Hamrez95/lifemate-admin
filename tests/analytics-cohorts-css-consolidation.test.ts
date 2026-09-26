import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ARCH-01 Cohorts stylesheet consolidation", () => {
  it("keeps the live Cohorts route on the canonical reference stylesheet", () => {
    const page = read("app/analytics/cohorts/page.tsx");
    const architecture = read("scripts/ui-architecture-check.mjs");
    const inventory = read("docs/project/UX_V2_UI_INVENTORY.json");

    expect(page).toContain('import styles from "./cohorts-reference.module.css";');
    expect(page).not.toContain('import styles from "./cohorts.module.css";');
    expect(architecture).not.toContain("app/analytics/cohorts/cohorts.module.css");
    expect(inventory).not.toContain("app/analytics/cohorts/cohorts.module.css");
  });

  it("does not leave a superseded Cohorts stylesheet on disk", () => {
    expect(() => read("app/analytics/cohorts/cohorts.module.css")).toThrow();
  });
});
