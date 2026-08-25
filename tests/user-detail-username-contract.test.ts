import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("User 360 canonical username contract (#146)", () => {
  it("accepts only the canonical nullable username from the Admin API", () => {
    const client = source("src/lib/admin-api/user-detail.ts");

    expect(client).toContain("username: string | null");
    expect(client).toContain(
      'typeof account.data.username !== "string" && account.data.username !== null',
    );
    expect(client).not.toContain('split("@")');
    expect(client).not.toContain("contact_points");
    expect(client).not.toContain("staff_profiles");
  });

  it("renders the nullable canonical username in the privacy-safe account summary", () => {
    const page = source("app/users/[accountId]/page.tsx");

    expect(page).toContain("account.username");
    expect(page).toContain('account.username ? `@${account.username}` : "—"');
    expect(page).toContain("بدون اطلاعات تماس یا داده سلامت");
    expect(page).not.toContain('split("@")');
    expect(page).not.toContain("service_role");
  });
});
