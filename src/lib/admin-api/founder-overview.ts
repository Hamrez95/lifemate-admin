import { getKpiValues, type KpiValue } from "@/src/lib/admin-api/analytics-kpis";
import { getCommerceOverview } from "@/src/lib/admin-api/commerce-overview";
import {
  listAdminNotifications,
  type NotificationAlert,
  type NotificationSource,
  type NotificationSourceState,
} from "@/src/lib/admin-api/notifications";
import { getRelationshipOverview } from "@/src/lib/admin-api/relationship-overview";

export type ExecutiveValueState =
  | "ready"
  | "partial"
  | "empty"
  | "unavailable"
  | "not_instrumented";

export type ExecutiveMetric = {
  key: string;
  label: string;
  value: number | null;
  state: ExecutiveValueState;
  tone: "green" | "blue" | "violet" | "orange";
  source: string;
  freshnessStatus: "fresh" | "partial" | "stale" | "unavailable";
  asOfUtc: string | null;
  href: string;
  note: string | null;
};

export type ExecutiveProduct = {
  code: string;
  name: string;
  status: string;
  planCount: number;
};

export type ExecutiveAlertSource = {
  source: NotificationSource;
  state: ExecutiveValueState;
  total: number | null;
  unreadCount: number | null;
  asOfUtc: string | null;
  href: string | null;
};

export type ExecutiveShortcut = {
  label: string;
  href: string;
  helper: string;
};

export type FounderOverviewData = {
  generatedAtUtc: string;
  metrics: ExecutiveMetric[];
  products: {
    state: ExecutiveValueState;
    items: ExecutiveProduct[];
    source: string;
    freshnessStatus: "fresh" | "stale" | "unavailable";
    asOfUtc: string | null;
  } | null;
  alerts: {
    state: ExecutiveValueState;
    items: NotificationAlert[];
    sources: ExecutiveAlertSource[];
    asOfUtc: string | null;
  } | null;
  shortcuts: ExecutiveShortcut[];
};

const NOTIFICATION_PERMISSION: Record<NotificationSource, string> = {
  support: "support.read",
  security: "security.audit.read",
  operations: "operations.read",
  finance: "finance.read",
  product: "analytics.read",
};

const SOURCE_HREF: Record<NotificationSource, string | null> = {
  support: "/support",
  security: "/security",
  operations: "/operations",
  finance: "/finance",
  product: "/analytics",
};

function tehranToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function metricFromKpi(
  value: KpiValue | undefined,
  key: string,
  label: string,
  tone: ExecutiveMetric["tone"],
): ExecutiveMetric {
  if (!value) {
    return {
      key,
      label,
      value: null,
      state: "unavailable",
      tone,
      source: "LifeMate Analytics KPI",
      freshnessStatus: "unavailable",
      asOfUtc: null,
      href: "/analytics",
      note: "KPI canonical در پاسخ موجود نبود.",
    };
  }
  return {
    key,
    label,
    value: value.value,
    state: value.state,
    tone,
    source: value.source,
    freshnessStatus: value.freshness.status,
    asOfUtc: value.freshness.asOfUtc,
    href: "/analytics",
    note: value.reason ?? null,
  };
}

function unavailableMetric(
  key: string,
  label: string,
  tone: ExecutiveMetric["tone"],
  source: string,
  href: string,
): ExecutiveMetric {
  return {
    key,
    label,
    value: null,
    state: "unavailable",
    tone,
    source,
    freshnessStatus: "unavailable",
    asOfUtc: null,
    href,
    note: "منبع در دسترس نبود؛ مقدار صفر فرض نشده است.",
  };
}

function mapNotificationState(state: NotificationSourceState): ExecutiveAlertSource {
  return {
    source: state.source,
    state: state.state,
    total: state.total,
    unreadCount: state.unreadCount,
    asOfUtc: state.asOfUtc,
    href: SOURCE_HREF[state.source],
  };
}

function buildShortcuts(permissions: Set<string>): ExecutiveShortcut[] {
  const candidates = [
    ["users.read.basic", "کاربران", "/users", "دایرکتوری و پروفایل‌های مدیریتی"],
    ["analytics.read", "تحلیل‌ها", "/analytics", "KPIهای canonical و freshness"],
    ["relationships.read", "روابط و رضایت", "/relationships", "Relationship / Consent / Access Grant"],
    ["support.read", "پشتیبانی", "/support", "صف تیکت و SLA"],
    ["commerce.read", "تجارت", "/commerce", "اشتراک، تراکنش و پروموشن"],
  ] as const;

  return candidates
    .filter(([permission]) => permissions.has(permission))
    .map(([, label, href, helper]) => ({ label, href, helper }));
}

export async function getFounderOverview(
  permissions: readonly string[],
  now = new Date(),
): Promise<FounderOverviewData> {
  const permissionSet = new Set(permissions);
  const generatedAtUtc = now.toISOString();
  const to = tehranToday(now);
  const from = shiftDate(to, -29);

  const analyticsPromise = permissionSet.has("analytics.read")
    ? getKpiValues(new URLSearchParams({ from, to }))
    : Promise.resolve(null);
  const relationshipsPromise = permissionSet.has("relationships.read")
    ? getRelationshipOverview(
        new URLSearchParams({ page: "1", pageSize: "5", kind: "relationship", status: "Active" }),
      )
    : Promise.resolve(null);
  const commercePromise = permissionSet.has("commerce.read")
    ? getCommerceOverview(new URLSearchParams({ page: "1", pageSize: "5" }))
    : Promise.resolve(null);

  const requestedNotificationSources = (
    ["support", "security", "operations", "finance", "product"] as const
  ).filter((source) => permissionSet.has(NOTIFICATION_PERMISSION[source]));
  const notificationPromise =
    requestedNotificationSources.length > 0
      ? listAdminNotifications(
          new URLSearchParams({
            page: "1",
            pageSize: "6",
            sources: requestedNotificationSources.join(","),
          }),
        )
      : Promise.resolve(null);

  const [analytics, relationships, commerce, notifications] = await Promise.all([
    analyticsPromise,
    relationshipsPromise,
    commercePromise,
    notificationPromise,
  ]);

  const metrics: ExecutiveMetric[] = [];
  if (permissionSet.has("analytics.read")) {
    if (analytics?.kind === "ok") {
      metrics.push(
        metricFromKpi(
          analytics.data.values.find((item) => item.name === "monthly_active_accounts"),
          "monthly-active-accounts",
          "کاربران فعال · ۳۰ روز",
          "green",
        ),
        metricFromKpi(
          analytics.data.values.find((item) => item.name === "accounts_created"),
          "accounts-created",
          "حساب‌های ایجادشده · ۳۰ روز",
          "blue",
        ),
      );
    } else {
      metrics.push(
        unavailableMetric(
          "monthly-active-accounts",
          "کاربران فعال · ۳۰ روز",
          "green",
          "LifeMate Analytics KPI",
          "/analytics",
        ),
        unavailableMetric(
          "accounts-created",
          "حساب‌های ایجادشده · ۳۰ روز",
          "blue",
          "LifeMate Analytics KPI",
          "/analytics",
        ),
      );
    }
  }

  if (permissionSet.has("relationships.read")) {
    if (relationships?.kind === "ok") {
      metrics.push({
        key: "active-relationships",
        label: "روابط فعال",
        value: relationships.data.total,
        state: relationships.data.total === 0 ? "empty" : "ready",
        tone: "violet",
        source: "LifeMate relationship overview read model",
        freshnessStatus: relationships.data.freshness.status,
        asOfUtc: relationships.data.freshness.asOfUtc,
        href: "/relationships",
        note: "فقط Relationship فعال؛ Consent و Access Grant جداگانه محاسبه می‌شوند.",
      });
    } else {
      metrics.push(
        unavailableMetric(
          "active-relationships",
          "روابط فعال",
          "violet",
          "LifeMate relationship overview read model",
          "/relationships",
        ),
      );
    }
  }

  if (permissionSet.has("commerce.read")) {
    if (commerce?.kind === "ok") {
      metrics.push({
        key: "active-subscriptions",
        label: "اشتراک‌های فعال",
        value: commerce.data.summary.subscriptions.active,
        state: commerce.data.summary.subscriptions.active === 0 ? "empty" : "ready",
        tone: "orange",
        source: "LifeMate Commerce subscription ledger",
        freshnessStatus: commerce.data.freshness.status,
        asOfUtc: commerce.data.freshness.asOfUtc,
        href: "/commerce",
        note: "این عدد اشتراک Active است و به‌عنوان «کاربر پرداخت‌کننده» تفسیر نمی‌شود.",
      });
    } else {
      metrics.push(
        unavailableMetric(
          "active-subscriptions",
          "اشتراک‌های فعال",
          "orange",
          "LifeMate Commerce subscription ledger",
          "/commerce",
        ),
      );
    }
  }

  const products = permissionSet.has("commerce.read")
    ? commerce?.kind === "ok"
      ? {
          state: commerce.data.products.length === 0 ? ("empty" as const) : ("ready" as const),
          items: commerce.data.products.map((product) => ({
            code: product.code,
            name: product.name,
            status: product.status,
            planCount: product.planCount,
          })),
          source: "LifeMate Commerce products",
          freshnessStatus: commerce.data.freshness.status,
          asOfUtc: commerce.data.freshness.asOfUtc,
        }
      : {
          state: "unavailable" as const,
          items: [],
          source: "LifeMate Commerce products",
          freshnessStatus: "unavailable" as const,
          asOfUtc: null,
        }
    : null;

  const alerts =
    requestedNotificationSources.length > 0
      ? notifications?.kind === "ok"
        ? {
            state:
              notifications.data.items.length === 0 ? ("empty" as const) : ("ready" as const),
            items: notifications.data.items,
            sources: notifications.data.sourceStates.map(mapNotificationState),
            asOfUtc: notifications.data.asOfUtc,
          }
        : {
            state: "unavailable" as const,
            items: [],
            sources: requestedNotificationSources.map((source) => ({
              source,
              state: "unavailable" as const,
              total: null,
              unreadCount: null,
              asOfUtc: null,
              href: SOURCE_HREF[source],
            })),
            asOfUtc: null,
          }
      : null;

  return {
    generatedAtUtc,
    metrics,
    products,
    alerts,
    shortcuts: buildShortcuts(permissionSet),
  };
}
