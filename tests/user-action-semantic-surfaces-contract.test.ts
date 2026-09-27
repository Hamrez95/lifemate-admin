import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 User action semantic surfaces", () => {
  it("keeps destructive and restorative actions theme-safe and accessible", () => {
    const actionCss = read("app/users/[accountId]/user-action-menu.module.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(actionCss).toContain("color-mix(in srgb, var(--lm-danger)");
    expect(actionCss).toContain("var(--lm-focus)");
    expect(actionCss).toContain("var(--lm-green-soft)");
    expect(actionCss).toContain("@media (max-width: 680px)");
    expect(actionCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("User action semantic-surface wave");
  });
});
