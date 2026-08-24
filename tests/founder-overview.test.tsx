import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FounderOverview } from "../src/components/dashboard/FounderOverview";
import type { FounderOverviewData } from "../src/lib/admin-api/founder-overview";

const fixture: FounderOverviewData = {
  generatedAtUtc: "2026-08-15T21:30:00.000Z",
  metrics: [
    {
      key: "monthly-active-accounts",
      label: "کاربران فعال · ۳۰ روز",
      value: 125,
      state: "partial",
      tone: "green",
      source: "ecosystem.app_enrollments.last_active_at_utc current snapshot",
      freshnessStatus: "partial",
      asOfUtc: "2026-08-15T21:29:00.000Z",
      href: "/analytics",
      note: "Current trailing-30-day snapshot only.",
    },
    {
      key: "active-subscriptions",
      label: "اشتراک‌های فعال",
      value: 14,
      state: "ready",
      tone: "orange",
      source: "LifeMate Commerce subscription ledger",
      freshnessStatus: "fresh",
      asOfUtc: "2026-08-15T21:29:30.000Z",
      href: "/commerce",
      note: "این عدد اشتراک Active است و به‌عنوان «کاربر پرداخت‌کننده» تفسیر نمی‌شود.",
    },
    {
      key: "active-relationships",
      label: "روابط فعال",
      value: null,
      state: "unavailable",
      tone: "violet",
      source: "LifeMate relationship overview read model",
      freshnessStatus: "unavailable",
      asOfUtc: null,
      href: "/relationships",
      note: "منبع در دسترس نبود؛ مقدار صفر فرض نشده است.",
    },
  ],
  products: {
    state: "ready",
    items: [{ code: "wellmate", name: "WellMate", status: "Active", planCount: 3 }],
    source: "LifeMate Commerce products",
    freshnessStatus: "fresh",
    asOfUtc: "2026-08-15T21:29:30.000Z",
  },
  alerts: {
    state: "ready",
    items: [
      {
        alertKey: "operations:outbox:lag-warning",
        source: "operations",
        severity: "warning",
        title: "تاخیر Outbox نیاز به توجه دارد",
        summary: "قدیمی‌ترین پیام آماده در صف مانده است.",
        occurredAtUtc: "2026-08-15T21:25:00.000Z",
        freshnessAtUtc: "2026-08-15T21:29:00.000Z",
        isRead: false,
        deepLink: "/operations",
        canMarkRead: true,
        canAcknowledge: false,
        canDismiss: false,
      },
    ],
    sources: [
      {
        source: "operations",
        state: "ready",
        total: 1,
        unreadCount: 1,
        asOfUtc: "2026-08-15T21:29:00.000Z",
        href: "/operations",
      },
      {
        source: "finance",
        state: "not_instrumented",
        total: null,
        unreadCount: null,
        asOfUtc: "2026-08-15T21:29:00.000Z",
        href: "/finance",
      },
    ],
    asOfUtc: "2026-08-15T21:29:00.000Z",
  },
  activity: {
    state: "ready",
    asOfUtc: "2026-08-15T21:29:30.000Z",
    items: [
      {
        id: "evt-1",
        action: "role.membership.updated",
        resourceType: "staff_membership",
        result: "success",
        elevatedAccess: true,
        occurredAtUtc: "2026-08-15T21:29:00.000Z",
      },
    ],
  },
  services: {
    state: "not_instrumented",
    items: [],
    asOfUtc: null,
    reason: "قرارداد canonical برای وضعیت سرویس‌ها در Founder Overview هنوز وجود ندارد.",
  },
  shortcuts: [{ label: "تحلیل‌ها", href: "/analytics", helper: "KPIهای canonical و freshness" }],
};

describe("FounderOverview", () => {
  it("renders canonical values and unavailable states without fabrication", () => {
    const html = renderToStaticMarkup(<FounderOverview data={fixture} />);

    expect(html).toContain("پالس اجرایی LifeMate، فقط بر پایه داده قابل ردیابی");
    expect(html).toContain("founder-ecosystem-hero-v1.png");
    expect(html).toContain("کاربران فعال · ۳۰ روز");
    expect(html).toContain("۱۲۵");
    expect(html).toContain("روابط فعال");
    expect(html).toContain("—");
    expect(html).toContain("منبع متصل نیست");
    expect(html).toContain("تاخیر Outbox نیاز به توجه دارد");
    expect(html).toContain("role.membership.updated");
    expect(html).toContain("وضعیت سرویس‌ها فعلاً در دسترس نیست");
    expect(html).toContain("WellMate");
  });

  it("labels commerce truthfully as active subscriptions rather than paying users", () => {
    const html = renderToStaticMarkup(<FounderOverview data={fixture} />);

    expect(html).toContain("اشتراک‌های فعال");
    expect(html).toContain("به‌عنوان «کاربر پرداخت‌کننده» تفسیر نمی‌شود");
    expect(html).not.toContain(">کاربران پرداخت‌کننده<");
  });
});
