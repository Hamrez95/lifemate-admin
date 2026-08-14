import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-USR-003 User Action Menu", () => {
  it("keeps user mutations on the server-side Admin API boundary", () => {
    const client = source("src/lib/admin-api/user-actions.ts");

    expect(client).toContain("/api/v1/users/${input.accountId}/actions/${input.action}");
    expect(client).toContain('method: "POST"');
    expect(client).toContain('"Idempotency-Key": input.idempotencyKey');
    expect(client).toContain('Authorization: `Bearer ${token}`');
    expect(client).toContain('cache: "no-store"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
  });

  it("requires users.suspend before rendering actionable controls", () => {
    const page = source("app/users/[accountId]/page.tsx");
    const menu = source("app/users/[accountId]/UserActionMenu.tsx");

    expect(page).toContain('admin.permissions.includes("users.suspend")');
    expect(page).toContain("canManage={canManageUsers}");
    expect(menu).toContain("برای تعلیق یا بازگردانی حساب، مجوز users.suspend لازم است");
  });

  it("supports only suspend and restore with an explicit reason and duplicate-submit guard", () => {
    const menu = source("app/users/[accountId]/UserActionMenu.tsx");
    const action = source("app/users/[accountId]/actions.ts");

    expect(menu).toContain('action: "suspend"');
    expect(menu).toContain('action: "restore"');
    expect(menu).toContain('name="reason"');
    expect(menu).toContain("minLength={10}");
    expect(menu).toContain('name="idempotencyKey"');
    expect(menu).toContain("disabled={pending");
    expect(action).toContain("performUserAccountAction");
    expect(action).toContain("revalidatePath(`/users/${accountId}`)");
  });

  it("communicates conflict and privileged-target outcomes without optimistic unsafe state", () => {
    const action = source("app/users/[accountId]/actions.ts");

    expect(action).toContain('result.code === "admin_target_denied"');
    expect(action).toContain('result.code === "self_target_denied"');
    expect(action).toContain('result.code === "invalid_account_transition"');
    expect(action).not.toContain("optimistic");
  });

  it("uses an accessible native confirmation dialog and privacy-safe copy", () => {
    const menu = source("app/users/[accountId]/UserActionMenu.tsx");
    const css = source("app/users/[accountId]/user-action-menu.module.css");

    expect(menu).toContain("<dialog");
    expect(menu).toContain('aria-labelledby="user-action-dialog-title"');
    expect(menu).toContain('aria-live="polite"');
    expect(menu).toContain("از ثبت اطلاعات سلامت یا جزئیات حساس غیرضروری خودداری کنید");
    expect(css).toContain("::backdrop");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("prefers-reduced-motion");
  });
});
