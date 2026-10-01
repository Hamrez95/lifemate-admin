import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Staff membership semantic surfaces", () => {
  it("keeps role membership actions and dialog feedback theme-safe", () => {
    const membershipCss = read(
      "app/security/roles/[roleCode]/staff-membership-controls.module.css",
    );
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(membershipCss).toContain("var(--lm-surface-raised)");
    expect(membershipCss).toContain("var(--lm-focus)");
    expect(membershipCss).toContain("var(--lm-danger)");
    expect(membershipCss).toContain("@media (max-width: 560px)");
    expect(membershipCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Staff membership semantic-surface wave");
  });
});
