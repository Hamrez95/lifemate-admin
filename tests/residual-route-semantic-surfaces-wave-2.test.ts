import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Residual route semantic-surface wave 2", () => {
  it("keeps remaining admin route surfaces theme-safe", () => {
    const files = [
      "app/users/[accountId]/user-privacy-reference.module.css",
      "app/commerce/entitlements/adjustments/adjustments.module.css",
      "app/marketing/content-studio/studio.module.css",
      "app/commerce/catalog/catalog-v2.module.css",
      "app/security/break-glass/break-glass.module.css",
      "app/security/elevated-health/elevated-health.module.css",
      "app/commerce/plans/catalog.module.css",
      "app/commerce/promotions/promotions.module.css",
      "app/marketing/media-inbox/media-inbox.module.css",
      "app/privacy/privacy.module.css",
      "app/security/staff/staff.module.css",
      "app/support/support.css",
      "app/users/[accountId]/product-version-context.module.css",
      "src/components/shell/global-command-palette.module.css",
    ];

    for (const file of files) {
      const css = read(file);
      expect(css).toContain("var(--lm-surface-raised)");
      expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    }

    expect(read(files[0])).toContain("var(--lm-orange-soft)");
    expect(read(files[1])).toContain("var(--lm-danger)");
    expect(read(files[2])).toContain("var(--lm-violet)");
    expect(read(files[8])).toContain("var(--lm-focus)");
    expect(read(files[12])).toContain("var(--lm-shadow)");
  });
});
