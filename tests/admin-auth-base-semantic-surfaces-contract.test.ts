import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Base auth semantic surfaces", () => {
  it("keeps the auth card, MFA state and security note theme-safe", () => {
    const authCss = read("app/admin-auth.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(authCss).toContain("var(--lm-surface-raised)");
    expect(authCss).toContain("var(--lm-focus)");
    expect(authCss).toContain("var(--lm-violet-soft)");
    expect(authCss).toContain("@media (max-width: 680px)");
    expect(authCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Base auth semantic-surface wave");
  });
});
