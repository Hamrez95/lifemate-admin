import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("security reference pages", () => {
  it("keeps Security Command Center aligned with references 18-19 without inventing break-glass", () => {
    const page = source("app/security/page.tsx");

    expect(page).toContain("References 18–20");
    expect(page).toContain("Reference 19 · Effective assignments");
    expect(page).toContain("Break-glass هنوز متصل نیست");
    expect(page).toContain("roleAssignable=false");
    expect(page).toContain("getSecurityRbacMatrix");
    expect(page).not.toContain("service_role");
    expect(page).not.toContain("from(\"");
  });

  it("keeps Audit Explorer aligned with reference 20 and fail-closed server paging", () => {
    const page = source("app/security/audit/page.tsx");

    expect(page).toContain("Reference 20 · READ ONLY");
    expect(page).toContain("supportsServerPaging");
    expect(page).toContain("نتیجه فیلترشده جعل نمی‌شود");
    expect(page).toContain("payload خام، metadata محرمانه و secret");
    expect(page).not.toContain("service_role");
    expect(page).not.toContain("supabase.from");
  });
});
