import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Admin auth semantic surfaces", () => {
  it("keeps sign-in and profile security surfaces theme-safe", () => {
    const authCss = read("app/admin-auth-enhanced.css");

    expect(authCss).toContain("var(--lm-surface-raised)");
    expect(authCss).toContain("var(--lm-green-soft)");
    expect(authCss).toContain("var(--lm-shadow)");
    expect(authCss).toContain("@media (max-width: 680px)");
    expect(authCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
  });
});
