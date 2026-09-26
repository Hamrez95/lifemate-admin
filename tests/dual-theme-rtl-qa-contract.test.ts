import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("ADM-QA-001 dual-theme RTL/LTR regression contract", () => {
  it("keeps the representative route matrix and all four presentation modes explicit", () => {
    const spec = read("e2e/dual-theme-rtl-regression.spec.ts");
    for (const mode of ["rtl-light", "rtl-dark", "ltr-light", "ltr-dark"]) {
      expect(spec).toContain(`name: "${mode}"`);
    }
    for (const route of [
      "/",
      "/users",
      "/analytics",
      "/support",
      "/commerce",
      "/marketing",
      "/finance",
      "/operations",
      "/security/audit",
      "/profile",
      "/settings",
    ]) {
      expect(spec).toContain(`"${route}"`);
    }
    expect(spec).toContain("AxeBuilder");
    expect(spec).toContain("expectNoViewportOverflow");
  });

  it("keeps visual QA synthetic and documents Buffer as a benchmark, not a copy target", () => {
    const gate = read("docs/qa/COMMAND_CENTER_QA_GATE.md");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");
    expect(gate).toContain("dual-theme-rtl-regression.spec.ts");
    expect(gate).toContain("synthetic");
    expect(research).toContain("Buffer visual/interaction research");
    expect(research).toContain("Do not pixel-match");
  });
});
