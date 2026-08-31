import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

async function source(path: string) {
  return await readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Admin #252 · authorised product access from User 360", () => {
  it("exposes the workflow from User 360 only for entitlement-adjust permissions", async () => {
    const layout = await source("app/users/[accountId]/layout.tsx");
    expect(layout).toContain("commerce.entitlement.adjust.request");
    expect(layout).toContain("commerce.entitlement.adjust.execute");
    expect(layout).toContain("Manage product access");
    expect(layout).toContain("source=user360");
  });

  it("uses friendly Product and existing-access pickers instead of raw target UUID entry", async () => {
    const form = await source("app/commerce/entitlements/adjustments/AdjustmentForm.tsx");
    expect(form).toContain('name="targetId"');
    expect(form).toContain("products.map");
    expect(form).toContain("product.name");
    expect(form).toContain("product.code");
    expect(form).toContain("انتخاب دسترسی موجود");
    expect(form).toContain("item.featureCode");
    expect(form).not.toContain('placeholder="UUID محصول یا Offer"');
    expect(form).not.toContain('placeholder="برای Grant خالی"');
  });

  it("binds existing changes to optimistic entitlement versions and excludes FREE baseline", async () => {
    const form = await source("app/commerce/entitlements/adjustments/AdjustmentForm.tsx");
    const userClient = await source("src/lib/admin-api/user-detail.ts");
    expect(form).toContain('name="expectedEntitlementVersion"');
    expect(form).toContain('item.source !== "FREE"');
    expect(form).toContain("selectedEntitlement?.version");
    expect(userClient).toContain("version: number");
    expect(userClient).toContain("Number.isInteger(entitlement.version)");
  });

  it("records structured reason categories, keeps canonical safety boundaries and refreshes User 360", async () => {
    const form = await source("app/commerce/entitlements/adjustments/AdjustmentForm.tsx");
    const actions = await source("app/commerce/entitlements/adjustments/actions.ts");
    for (const reason of [
      "Prize/raffle",
      "Goodwill",
      "Support remedy",
      "Partnership",
      "Internal beta",
      "Other",
    ]) {
      expect(form).toContain(reason);
      expect(actions).toContain(reason);
    }
    expect(form).toContain("این workflow فقط Entitlement تجاری را تغییر می‌دهد");
    expect(form).toContain("جعلی ایجاد نمی‌شود");
    expect(actions).toContain("revalidatePath(`/users/${parsed.input.subjectAccountId}`)");
    expect(actions).not.toContain("service_role");
  });

  it("fails closed when canonical User 360 commerce or catalog data is unavailable", async () => {
    const page = await source("app/commerce/entitlements/adjustments/page.tsx");
    expect(page).toContain("workflowReady");
    expect(page).toContain('userData?.commerce.state === "ready"');
    expect(page).toContain('catalogResult?.kind === "ok"');
    expect(page).toContain("Product ID دستی جایگزین نمی‌شود");
  });
});
