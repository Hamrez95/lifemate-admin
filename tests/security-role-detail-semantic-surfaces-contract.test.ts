import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Security role detail semantic surfaces", () => {
  it("keeps role permissions and member states theme-safe", () => {
    const roleCss = read("app/security/roles/[roleCode]/role-detail.module.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(roleCss).toContain("var(--lm-surface-raised)");
    expect(roleCss).toContain("var(--lm-focus)");
    expect(roleCss).toContain("var(--lm-orange-soft)");
    expect(roleCss).toContain(".mobileMembers");
    expect(roleCss).toContain("@media (max-width: 700px)");
    expect(roleCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Security role detail semantic-surface wave");
  });
});
