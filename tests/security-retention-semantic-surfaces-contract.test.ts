import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Security retention semantic surfaces", () => {
  it("keeps retention controls, statuses and focus states theme-safe", () => {
    const retentionCss = read("app/security/retention/retention.module.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(retentionCss).toContain("var(--lm-surface-raised)");
    expect(retentionCss).toContain("var(--lm-focus)");
    expect(retentionCss).toContain("var(--lm-green-soft)");
    expect(retentionCss).toContain("min-height: 44px");
    expect(retentionCss).toContain("@media (max-width: 640px)");
    expect(retentionCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Security retention semantic-surface wave");
  });
});
