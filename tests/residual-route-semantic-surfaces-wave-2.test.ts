import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Residual route semantic-surface wave 2", () => {
  it("keeps remaining admin route surfaces theme-safe", () => {
    const filePaths = [
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

    const files = filePaths.map((file) => read(file));

    for (const css of files) {
      expect(css).toMatch(/var\(--(?:lm-)?surface(?:-raised)?\)/);
      expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    }

    expect(files[0]).toContain("var(--lm-orange-soft)");
    expect(files[1]).toContain("var(--lm-danger)");
    expect(files[2]).toContain("var(--lm-violet)");
    expect(files[8]).toContain("var(--lm-focus)");
    expect(files[12]).toContain("var(--lm-shadow)");
  });
});
