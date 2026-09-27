import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Security audit semantic surfaces", () => {
  it("keeps audit filters, result states and table focus theme-safe", () => {
    const auditCss = read("app/security/audit/audit.module.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(auditCss).toContain("var(--lm-focus)");
    expect(auditCss).toContain("var(--lm-surface-soft)");
    expect(auditCss).toContain("var(--lm-danger)");
    expect(auditCss).toContain("min-height: 42px");
    expect(auditCss).toContain("@media (max-width: 760px)");
    expect(auditCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Security audit semantic-surface wave");
  });
});
