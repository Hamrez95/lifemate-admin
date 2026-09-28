import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 User detail semantic surfaces", () => {
  it("keeps User360 identity, tabs, cards and timeline theme-safe", () => {
    const userCss = read("app/users/[accountId]/user-detail.module.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(userCss).toContain("var(--lm-surface-raised)");
    expect(userCss).toContain("var(--lm-focus)");
    expect(userCss).toContain("var(--lm-green-soft)");
    expect(userCss).toContain("min-height: 44px");
    expect(userCss).toContain("@media (max-width: 680px)");
    expect(userCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("User detail semantic-surface wave");
  });
});
