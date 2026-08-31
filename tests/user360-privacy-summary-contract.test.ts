import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Admin #185 User 360 privacy summary", () => {
  it("consumes only the canonical permission-scoped Core summary route", () => {
    const client = source("src/lib/admin-api/privacy-user-summary.ts");
    const layout = source("app/users/[accountId]/layout.tsx");

    expect(client).toContain("/api/v1/privacy/users/${accountId}/summary");
    expect(client).toContain("getServerAdminAccessToken()");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(10_000)");
    expect(layout).toContain('admin.permissions.includes("privacy.consent.read")');
    expect(layout).toContain("getUserPrivacySummary(accountId)");
  });

  it("keeps the User 360 view read-only and privacy-minimized", () => {
    const client = source("src/lib/admin-api/privacy-user-summary.ts");
    const layout = source("app/users/[accountId]/layout.tsx");

    expect(client).toContain("mutableFromAdmin: false");
    expect(layout).toContain("Admin نمی‌تواند پذیرش یا Opt-in را به‌جای کاربر ثبت کند");
    expect(layout).not.toContain("subjectPersonId");
    expect(layout).not.toContain("documentHash");
    expect(layout).not.toContain("healthData");
    expect(layout).not.toContain("phone");
  });

  it("does not let unrelated operational permission gates hide privacy-only access", () => {
    const layout = source("app/users/[accountId]/layout.tsx");
    expect(layout).toContain(
      "if (!canReadVersions && !canReadPrivacy && !canManageProductAccess) return children;",
    );
    expect(layout).toContain(
      "canReadPrivacy ? getUserPrivacySummary(accountId) : Promise.resolve(null)",
    );
    expect(layout).toContain("Privacy summary فعلاً در دسترس نیست؛ داده جایگزین ساخته نمی‌شود");
  });
});
