import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("consumer username directory contract", () => {
  it("parses only the canonical nullable username field", () => {
    const client = source("src/lib/admin-api/user-directory.ts");

    expect(client).toContain("username: string | null");
    expect(client).toContain('item.username !== null && typeof item.username !== "string"');
    expect(client).not.toMatch(/email.*username|phone.*username|displayName.*username/i);
  });

  it("shows username truthfully and keeps missing legacy values empty", () => {
    const page = source("app/users/page.tsx");

    expect(page).toContain('row.username ? `@${row.username}` : "—"');
    expect(page).toContain("جست‌وجوی نام، username یا حساب");
    expect(page).toContain("username canonical");
  });
});
