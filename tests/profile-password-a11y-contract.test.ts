import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Profile password feedback accessibility contract", () => {
  it("distinguishes success from a failed password change for assistive technology", () => {
    const form = source("src/components/auth/ChangePasswordForm.tsx");
    const styles = source("app/admin-auth-enhanced.css");

    expect(form).toContain('setMessageTone("success")');
    expect(form).toContain('setMessageTone("error")');
    expect(form).toContain('role={messageTone === "error" ? "alert" : "status"}');
    expect(form).toContain('aria-live={messageTone === "error" ? "assertive" : "polite"}');
    expect(styles).toContain('.profile-password-message[data-tone="error"]');
  });
});
