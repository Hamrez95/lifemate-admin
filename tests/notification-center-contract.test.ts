import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-PLAT-003 Admin Notification Center / Alerts", () => {
  it("keeps browser notification data behind same-origin server routes", () => {
    const client = source("src/lib/admin-api/notifications.ts");
    const route = source("app/api/admin/notifications/route.ts");
    const countRoute = source("app/api/admin/notifications/count/route.ts");
    const component = source("src/components/shell/NotificationCenter.tsx");

    expect(client).toContain("/api/v1/notifications");
    expect(client).toContain("Authorization: `Bearer ${accessToken}`");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(8_000)");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(route).not.toContain("service_role");
    expect(countRoute).not.toContain("service_role");
    expect(component).toContain("fetch(`/api/admin/notifications/count?${params.toString()}`");
    expect(component).toContain("fetch(`/api/admin/notifications?${params.toString()}`");
    expect(component).not.toContain("adminApiUrl");
  });

  it("permission-filters source requests and never defines a health notification domain", () => {
    const component = source("src/components/shell/NotificationCenter.tsx");
    const client = source("src/lib/admin-api/notifications.ts");

    expect(component).toContain('support: "support.read"');
    expect(component).toContain('security: "security.audit.read"');
    expect(component).toContain('operations: "operations.read"');
    expect(component).toContain('finance: "finance.read"');
    expect(component).toContain('product: "analytics.read"');
    expect(component).toContain("permissionSet.has(sourcePermissions[source])");
    expect(client).not.toContain('"health"');
    expect(client).not.toContain('"women_health"');
    expect(component).not.toContain('"health.read');
    expect(component).not.toContain('"women_health.read');
  });

  it("shows partial unread counts truthfully when an authorized source is incomplete", () => {
    const component = source("src/components/shell/NotificationCenter.tsx");
    const client = source("src/lib/admin-api/notifications.ts");

    expect(component).toContain('data.completeness === "complete"');
    expect(component).toContain("data.knownUnreadCount");
    expect(component).toContain('return "•"');
    expect(component).toContain("شمارش کل به‌صورت بخشی نمایش داده می‌شود");
    expect(component).toContain("هیچ داده نمایشی ساخته نشده است");
    expect(client).toContain('completeness: "complete" | "partial"');
    expect(client).toContain("unreadCount: number | null");
  });

  it("validates source-scoped internal deep links and idempotent read-state writes", () => {
    const client = source("src/lib/admin-api/notifications.ts");
    const route = source("app/api/admin/notifications/route.ts");
    const component = source("src/components/shell/NotificationCenter.tsx");

    expect(client).toContain("SAFE_DEEP_LINK");
    expect(client).toContain('href.includes("//")');
    expect(client).toContain('href.includes("\\\\")');
    expect(route).toContain("ALERT_KEY");
    expect(route).toContain("row.alertKey.startsWith(`${source}:`)");
    expect(route).toContain('request.headers.get("idempotency-key")');
    expect(component).toContain('"idempotency-key": crypto.randomUUID()');
    expect(component).toContain("alert.deepLink");
    expect(component).not.toContain("dangerouslySetInnerHTML");
  });

  it("surfaces source freshness unavailable and not-instrumented states without fake alerts", () => {
    const component = source("src/components/shell/NotificationCenter.tsx");
    const client = source("src/lib/admin-api/notifications.ts");

    expect(client).toContain('"unavailable" | "not_instrumented"');
    expect(client).toContain('"canonical_source_not_instrumented"');
    expect(component).toContain('source.state === "unavailable"');
    expect(component).toContain('source.state === "not_instrumented"');
    expect(component).toContain("منبع canonical هشدار ندارد");
    expect(component).toContain("stale(data.asOfUtc)");
    expect(component).toContain("منبع قدیمی");
  });

  it("is keyboard accessible responsive RTL and not color-only", () => {
    const component = source("src/components/shell/NotificationCenter.tsx");
    const css = source("src/components/shell/notification-center.module.css");

    expect(component).toContain('role="dialog"');
    expect(component).toContain('aria-modal="true"');
    expect(component).toContain('aria-live="polite"');
    expect(component).toContain('event.key === "Escape"');
    expect(component).toContain('event.key !== "Tab"');
    expect(component).toContain("const first = focusable[0]!");
    expect(component).toContain("severityIcons[alert.severity]");
    expect(component).toContain("severityLabels[alert.severity]");
    expect(component).toContain('dir="rtl"');
    expect(css).toContain(":focus-visible");
    expect(css).toContain("max-width: 760px");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("88dvh");
  });

  it("replaces the disabled coming-soon bell in the shared topbar", () => {
    const topbar = source("src/components/shell/Topbar.tsx");

    expect(topbar).toContain("<NotificationCenter />");
    expect(topbar).not.toContain("اعلان‌ها؛ به‌زودی");
    expect(topbar).not.toContain('<button className="icon-button" type="button" disabled');
  });
});
