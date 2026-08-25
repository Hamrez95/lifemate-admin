import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Operations reference 17 and Settings reference 27", () => {
  it("keeps operations visibility truthful and server-authorized", () => {
    const page = source("app/operations/page.tsx");
    expect(page).toContain('includes("operations.read")');
    expect(page).toContain("Operational visibility");
    expect(page).toContain("Unavailable");
    expect(page).not.toContain("99.9%");
    expect(page).not.toContain("p95:");
  });

  it("keeps settings fail-closed without client secrets or unsupported writes", () => {
    const page = source("app/settings/page.tsx");
    expect(page).toContain('includes("settings.read")');
    expect(page).toContain("ذخیره تغییرات — در دسترس نیست");
    expect(page).toContain("Confirmation الزامی است");
    expect(page).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(page).not.toContain("process.env");
    expect(page).not.toContain("fetch(");
  });

  it("preserves RTL and long-text responsive safeguards", () => {
    const css = source("app/ops-settings.module.css");
    expect(css).toContain("direction: rtl");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain("@media (max-width: 768px)");
  });
});
