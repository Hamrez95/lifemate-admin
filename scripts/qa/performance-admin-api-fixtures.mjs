const SYNTHETIC_ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const FIXTURE_TIME_UTC = "2026-09-10T00:00:00.000Z";

const notificationSourceStates = ["support", "security", "operations", "finance", "product"].map(
  (source) => ({
    source,
    state: "empty",
    total: 0,
    unreadCount: 0,
    asOfUtc: FIXTURE_TIME_UTC,
    reasonCode: null,
  }),
);

function analyticsKpis(url) {
  const product = url.searchParams.get("product");
  return {
    query: {
      from: url.searchParams.get("from") ?? "2026-09-01",
      to: url.searchParams.get("to") ?? "2026-09-10",
      product:
        product === "wellmate" || product === "caremate" || product === "women_health"
          ? product
          : null,
    },
    values: [
      {
        name: "active_users",
        definitionVersion: 1,
        state: "unavailable",
        value: null,
        numerator: null,
        denominator: null,
        source: "synthetic-performance-fixture",
        freshness: { status: "unavailable", asOfUtc: FIXTURE_TIME_UTC },
        reason: "Synthetic fixture preserves unavailable analytics truth.",
      },
    ],
    generatedAtUtc: FIXTURE_TIME_UTC,
  };
}

function userDirectory(url) {
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.max(1, Number.parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20);
  return {
    items: [
      {
        accountId: SYNTHETIC_ACCOUNT_ID,
        personId: null,
        displayName: "Synthetic QA User",
        username: "synthetic_qa_user",
        status: "Active",
        applicationCodes: ["wellmate"],
        createdAtUtc: "2026-09-01T00:00:00.000Z",
        lastActiveAtUtc: FIXTURE_TIME_UTC,
      },
    ],
    page,
    pageSize,
    total: 1,
    freshness: { status: "fresh", asOfUtc: FIXTURE_TIME_UTC },
  };
}

function userDetail() {
  return {
    account: {
      state: "ready",
      data: {
        id: SYNTHETIC_ACCOUNT_ID,
        username: "synthetic_qa_user",
        status: "Active",
        createdAtUtc: "2026-09-01T00:00:00.000Z",
      },
    },
    person: {
      state: "ready",
      data: {
        id: "22222222-2222-4222-8222-222222222222",
        displayName: "Synthetic QA User",
        locale: "fa-IR",
        timeZone: "Asia/Tehran",
      },
    },
    products: {
      state: "ready",
      data: [
        {
          applicationCode: "wellmate",
          applicationName: "WellMate",
          status: "Active",
          enrolledAtUtc: "2026-09-01T00:00:00.000Z",
          lastActiveAtUtc: FIXTURE_TIME_UTC,
        },
      ],
    },
    commerce: { state: "empty" },
    relationships: { state: "empty" },
    adminActivity: { state: "ready", data: { total: 0, latest: [] } },
    freshness: { status: "fresh", asOfUtc: FIXTURE_TIME_UTC },
  };
}

function notifications(url) {
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.max(1, Number.parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20);
  return {
    items: [],
    page,
    pageSize: Math.min(25, pageSize),
    knownTotal: 0,
    total: 0,
    knownUnreadCount: 0,
    unreadCount: 0,
    completeness: "complete",
    sourceStates: notificationSourceStates,
    asOfUtc: FIXTURE_TIME_UTC,
  };
}

function notificationCount() {
  return {
    knownUnreadCount: 0,
    unreadCount: 0,
    completeness: "complete",
    sourceStates: notificationSourceStates,
    asOfUtc: FIXTURE_TIME_UTC,
  };
}

function auditLog(url) {
  return {
    events: [],
    nextCursor: null,
    filters: {
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    },
    freshness: { status: "fresh", asOfUtc: FIXTURE_TIME_UTC },
  };
}

function operationsSnapshot() {
  return {
    services: [
      {
        key: "admin-api",
        state: "unknown",
        source: "synthetic-performance-fixture",
        latencyMs: null,
        checkedAtUtc: FIXTURE_TIME_UTC,
      },
    ],
    backgroundJobs: { state: "unknown", source: "synthetic-performance-fixture" },
    deployments: {
      state: "unknown",
      source: "synthetic-performance-fixture",
      releaseReference: null,
    },
    providers: { state: "unknown", source: "synthetic-performance-fixture" },
    incidents: {
      state: "unknown",
      source: "synthetic-performance-fixture",
      activeCount: null,
    },
    freshness: { status: "fresh", asOfUtc: FIXTURE_TIME_UTC },
  };
}

function commandCenterPreferences() {
  return {
    preferences: {
      locale: "fa-IR",
      timeZone: "Asia/Tehran",
      displayName: "Synthetic QA Operator",
      version: 1,
      updatedAtUtc: null,
    },
    capabilities: {
      supportedLocales: ["fa-IR", "en"],
      mutableFields: ["locale", "timeZone", "displayName"],
      secretsEditable: false,
    },
  };
}

export function getPerformanceAdminApiFixture(method, url) {
  if (method !== "GET") return null;

  if (url.pathname === "/api/v1/analytics/kpis") return analyticsKpis(url);
  if (url.pathname === "/api/v1/analytics/catalog") {
    return {
      eventTaxonomyVersion: 1,
      kpiDictionaryVersion: 1,
      events: [],
      kpis: [],
      generatedAtUtc: FIXTURE_TIME_UTC,
    };
  }
  if (url.pathname === "/api/v1/notifications/count") return notificationCount();
  if (url.pathname === "/api/v1/notifications") return notifications(url);
  if (url.pathname === "/api/v1/audit") return auditLog(url);
  if (url.pathname === "/api/v1/users") return userDirectory(url);
  if (url.pathname === `/api/v1/users/${SYNTHETIC_ACCOUNT_ID}`) return userDetail();
  if (url.pathname === "/api/v1/operations/snapshot") return operationsSnapshot();
  if (url.pathname === "/api/v1/settings/preferences") return commandCenterPreferences();

  return null;
}
