import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-PLAT-002 Secure Global Search / Command Palette", () => {
  it("keeps the browser behind a same-origin server Admin API boundary", () => {
    const client = source("src/lib/admin-api/global-search.ts");
    const route = source("app/api/admin/search/route.ts");
    const palette = source("src/components/shell/GlobalCommandPalette.tsx");

    expect(client).toContain("/api/v1/search");
    expect(client).toContain("Authorization: `Bearer ${accessToken}`");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(8_000)");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(route).toContain('const ALLOWED_PARAMS = new Set(["q", "types", "page", "pageSize"])');
    expect(route).not.toContain("service_role");
    expect(palette).toContain("/api/admin/search?");
    expect(palette).not.toContain("adminApiUrl");
  });

  it("maps search domains to existing RBAC permissions and excludes health", () => {
    const palette = source("src/components/shell/GlobalCommandPalette.tsx");
    const client = source("src/lib/admin-api/global-search.ts");

    expect(palette).toContain('users: "users.read.basic"');
    expect(palette).toContain('support: "support.read"');
    expect(palette).toContain('commerce: "commerce.read"');
    expect(palette).toContain('campaigns: "marketing.read"');
    expect(palette).not.toContain("health.read");
    expect(palette).not.toContain("women_health.read");
    expect(client).not.toContain("women_health");
    expect(client).not.toContain("health.read");
  });

  it("stores only non-sensitive static command keys in local recent history", () => {
    const palette = source("src/components/shell/GlobalCommandPalette.tsx");

    expect(palette).toContain("lifemate.command-palette.recent-safe-commands.v1");
    expect(palette).toContain("JSON.stringify(next.map(({ key }) => ({ key })))");
    expect(palette).toContain("نه query و نه شناسه رکورد");
    expect(palette).not.toContain("localStorage.setItem(RECENTS_KEY, query");
  });

  it("supports keyboard shortcut escape arrows enter focus trap and screen-reader semantics", () => {
    const palette = source("src/components/shell/GlobalCommandPalette.tsx");
    const css = source("src/components/shell/global-command-palette.module.css");

    expect(palette).toContain("event.metaKey || event.ctrlKey");
    expect(palette).toContain('event.key === "Escape"');
    expect(palette).toContain('event.key === "ArrowDown"');
    expect(palette).toContain('event.key === "ArrowUp"');
    expect(palette).toContain('event.key === "Enter"');
    expect(palette).toContain('event.key === "Tab"');
    expect(palette).toContain('role="dialog"');
    expect(palette).toContain('aria-modal="true"');
    expect(palette).toContain('role="combobox"');
    expect(palette).toContain('role="listbox"');
    expect(palette).toContain('role="option"');
    expect(css).toContain(":focus-visible");
    expect(css).toContain("max-width: 760px");
    expect(css).toContain("prefers-reduced-motion");
  });

  it("renders loading empty forbidden stale unavailable and rate-limit states without fake data", () => {
    const palette = source("src/components/shell/GlobalCommandPalette.tsx");
    const client = source("src/lib/admin-api/global-search.ts");

    expect(palette).toContain('kind: "loading"');
    expect(palette).toContain('kind: "forbidden"');
    expect(palette).toContain('kind: "rate_limited"');
    expect(palette).toContain("نتیجه‌ای در دامنه‌های مجاز پیدا نشد");
    expect(palette).toContain("snapshot جست‌وجو قدیمی است");
    expect(palette).toContain("منبع canonical جست‌وجو ندارد");
    expect(client).toContain('availability: "unavailable"');
    expect(client).toContain("total: null");
  });

  it("activates the palette from the shared topbar instead of a dead search control", () => {
    const topbar = source("src/components/shell/Topbar.tsx");

    expect(topbar).toContain("<GlobalCommandPalette />");
    expect(topbar).not.toContain("search-coming-soon");
    expect(topbar).not.toContain('placeholder="جست‌وجو و فرمان..."');
  });
});
