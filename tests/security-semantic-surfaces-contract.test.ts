import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Security semantic surfaces", () => {
  it("keeps RBAC surfaces theme-safe and responsive", () => {
    const securityCss = read("app/security/security.module.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(securityCss).toContain("var(--lm-surface-raised)");
    expect(securityCss).toContain("var(--lm-focus)");
    expect(securityCss).toContain("var(--lm-text-muted)");
    expect(securityCss).toContain("var(--lm-green-deep)");
    expect(securityCss).toContain(".mobileRoles");
    expect(securityCss).toContain("@media (max-width: 700px)");
    expect(securityCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Security semantic-surface wave");
  });
});
