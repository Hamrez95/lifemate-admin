import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "app/commerce/entitlements/adjustments/AdjustmentForm.tsx"),
  "utf8",
);

describe("Admin #252 destructive product access confirmation", () => {
  it("requires an informed confirmation before Reduce or Revoke can execute", () => {
    expect(source).toContain('operation === "Reduce" || operation === "Revoke"');
    expect(source).toContain("requiresDestructiveConfirmation && !destructiveConfirmed");
    expect(source).toContain("اثر کاهش یا لغو را در پیش‌نمایش بررسی کرده‌ام");
    expect(source).toContain('name="confirmed"');
  });
});
