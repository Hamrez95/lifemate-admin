import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Commerce conversion and gift audit contract", () => {
  it("uses server-only canonical Admin API reads with no direct database path", () => {
    const client = source("src/lib/admin-api/commerce-subscription-audit.ts");
    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/commerce/conversions");
    expect(client).toContain("/api/v1/commerce/gifts");
    expect(client).toContain('cache: "no-store"');
    expect(client).not.toMatch(/service_role|SERVICE_ROLE|SUPABASE_DB_URL|DATABASE_URL|from\(/);
  });

  it("does not expose claim secrets, phone hashes or health/reproductive data in the audit UI", () => {
    const client = source("src/lib/admin-api/commerce-subscription-audit.ts");
    const page = source("app/commerce/operations/audit/page.tsx");
    for (const value of [client, page]) {
      expect(value).not.toMatch(
        /claimTokenHash|claim_token_hash|recipientPhoneHash|recipient_phone_hash|rawClaim|periodDate|pregnancy|menstrual|fertility|healthPayload/,
      );
    }
    expect(page).toContain("formatPersianDateTime");
    expect(page).toContain('active="audit"');
  });
});
