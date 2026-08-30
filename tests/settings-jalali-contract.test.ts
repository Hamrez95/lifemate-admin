import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Settings Persian date contract", () => {
  it("uses the shared Jalali formatter instead of a page-local Gregorian formatter", () => {
    const page = source("app/settings/page.tsx");
    expect(page).toContain('import { formatPersianDateTime } from "@/src/lib/time-zone"');
    expect(page).toContain("formatPersianDateTime(result.preferences.updatedAtUtc)");
    expect(page).not.toContain("new Intl.DateTimeFormat");
  });
});
