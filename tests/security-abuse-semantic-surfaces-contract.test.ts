import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Security abuse semantic surfaces", () => {
  it("keeps abuse rules, retire controls and feedback theme-safe", () => {
    const abuseCss = read("app/security/abuse/abuse.module.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(abuseCss).toContain("var(--lm-surface-raised)");
    expect(abuseCss).toContain("var(--lm-focus)");
    expect(abuseCss).toContain("var(--lm-danger)");
    expect(abuseCss).toContain("min-height: 44px");
    expect(abuseCss).toContain("@media (max-width: 640px)");
    expect(abuseCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Security abuse semantic-surface wave");
  });
});
