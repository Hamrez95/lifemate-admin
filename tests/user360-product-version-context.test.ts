import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Admin #190 User 360 product version context", () => {
  it("uses the canonical account version API behind analytics permission", () => {
    const layout = source("app/users/[accountId]/layout.tsx");
    const client = source("src/lib/admin-api/product-release.ts");

    expect(layout).toContain('admin.permissions.includes("analytics.product_versions.read")');
    expect(layout).toContain("getAccountProductVersions(accountId)");
    expect(client).toContain("/api/v1/analytics/accounts/");
    expect(client).toContain("/product-versions");
  });

  it("shows version/platform/rollout context without sensitive identifiers", () => {
    const layout = source("app/users/[accountId]/layout.tsx");
    expect(layout).toContain("item.platform");
    expect(layout).toContain("item.appVersion");
    expect(layout).toContain("item.buildNumber");
    expect(layout).toContain("item.rolloutCohort");
    expect(layout).not.toContain("deviceId");
    expect(layout).not.toContain("healthData");
    expect(layout).not.toContain("phone");
  });

  it("fails closed when canonical telemetry is unavailable and uses framework navigation", () => {
    const layout = source("app/users/[accountId]/layout.tsx");
    expect(layout).toContain("داده جایگزین ساخته نمی‌شود");
    expect(layout).toContain('import Link from "next/link"');
    expect(layout).toContain('<Link href="/operations/releases">');
  });
});
