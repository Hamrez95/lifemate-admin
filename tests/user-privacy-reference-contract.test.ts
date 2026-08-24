import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Users / User 360 privacy reference", () => {
  it("uses the approved privacy asset through next/image without exposing sensitive fields", () => {
    const directory = source("app/users/page.tsx");
    const detail = source("app/users/[accountId]/page.tsx");

    expect(directory).toContain('import Image from "next/image"');
    expect(detail).toContain('import Image from "next/image"');
    expect(directory).toContain('/design-assets/user-privacy-hero-v1.png');
    expect(detail).toContain('/design-assets/user-privacy-hero-v1.png');
    expect(directory).toContain('width={720}');
    expect(directory).toContain('height={560}');
    expect(detail).toContain('width={720}');
    expect(detail).toContain('height={560}');
    expect(directory).not.toMatch(/phone|email|health_observations|women_calendar/i);
  });

  it("keeps temporary sensitive access visibly disabled until Core exposes a canonical contract", () => {
    const detail = source("app/users/[accountId]/page.tsx");

    expect(detail).toContain("endpoint canonical برای درخواست دسترسی موقت در Core موجود نیست");
    expect(detail).toContain("AAL2 الزامی");
    expect(detail).toContain("Permission اختصاصی");
    expect(detail).toContain("دلیل اجباری");
    expect(detail).toContain("مدت محدود");
    expect(detail).toContain("Idempotency");
    expect(detail).toContain("Audit اجباری");
    expect(detail).toContain("<button type=\"button\" disabled");
    expect(detail).not.toMatch(/\/api\/v1\/users\/.*temporary|break-glass\/request/i);
  });

  it("retains canonical user read models and the existing audited account action boundary", () => {
    const directoryClient = source("src/lib/admin-api/user-directory.ts");
    const detailClient = source("src/lib/admin-api/user-detail.ts");
    const actionClient = source("src/lib/admin-api/user-actions.ts");

    expect(directoryClient).toContain("/api/v1/users");
    expect(detailClient).toContain("/api/v1/users/${accountId}");
    expect(actionClient).toContain('"Idempotency-Key"');
    expect(actionClient).toContain("reason");
    expect(directoryClient).not.toContain(".from(");
    expect(detailClient).not.toContain(".from(");
  });
});
