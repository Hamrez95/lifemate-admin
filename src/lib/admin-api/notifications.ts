import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";

export type NotificationSource = "support" | "security" | "operations" | "finance" | "product";
export type NotificationSeverity = "info" | "warning" | "critical";
export type NotificationSourceStateKind = "ready" | "empty" | "unavailable" | "not_instrumented";

export type NotificationAlert = {
  alertKey: string;
  source: NotificationSource;
  severity: NotificationSeverity;
  title: string;
  summary: string | null;
  occurredAtUtc: string;
  freshnessAtUtc: string;
  isRead: boolean;
  deepLink: string | null;
  canMarkRead: true;
  canAcknowledge: false;
  canDismiss: false;
};

export type NotificationSourceState = {
  source: NotificationSource;
  state: NotificationSourceStateKind;
  total: number | null;
  unreadCount: number | null;
  asOfUtc: string;
  reasonCode: "source_unavailable" | "canonical_source_not_instrumented" | null;
};

export type NotificationCenterData = {
  items: NotificationAlert[];
  page: number;
  pageSize: number;
  knownTotal: number;
  total: number | null;
  knownUnreadCount: number;
  unreadCount: number | null;
  completeness: "complete" | "partial";
  sourceStates: NotificationSourceState[];
  asOfUtc: string;
};

export type NotificationCountData = Pick<
  NotificationCenterData,
  "knownUnreadCount" | "unreadCount" | "completeness" | "sourceStates" | "asOfUtc"
>;

export type NotificationReadStatePayload = {
  alertKey: string;
  source: NotificationSource;
  read: boolean;
};

export type NotificationReadStateData = {
  httpStatus: number;
  code: string;
  alertKey: string;
  source: NotificationSource;
  read: boolean;
  readAtUtc: string | null;
  replayed: boolean;
};

export type NotificationApiResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "invalid"; message?: string }
  | { kind: "conflict"; message?: string }
  | { kind: "unavailable"; correlationId?: string };

const SOURCES = new Set<NotificationSource>([
  "support",
  "security",
  "operations",
  "finance",
  "product",
]);
const SEVERITIES = new Set<NotificationSeverity>(["info", "warning", "critical"]);
const SOURCE_STATES = new Set<NotificationSourceStateKind>([
  "ready",
  "empty",
  "unavailable",
  "not_instrumented",
]);
const ALERT_KEY = /^[a-z][a-z0-9._:-]{2,179}$/;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const SAFE_DEEP_LINK: Record<NotificationSource, RegExp> = {
  support: new RegExp(`^/support/${UUID}$`, "i"),
  security: /^\/security(?:[/?#].*)?$/,
  operations: /^\/operations(?:[/?#].*)?$/,
  finance: /^\/finance(?:[/?#].*)?$/,
  product: /^\/analytics(?:[/?#].*)?$/,
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= max ? value : null;
}

function nullableText(value: unknown, max: number): string | null | undefined {
  if (value === null) return null;
  return text(value, max) ?? undefined;
}

function integer(value: unknown, max = 1_000_000): number | null {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= max
    ? Number(value)
    : null;
}

function iso(value: unknown): string | null {
  const candidate = text(value, 64);
  return candidate && !Number.isNaN(Date.parse(candidate)) ? candidate : null;
}

function nullableInteger(value: unknown): number | null | undefined {
  if (value === null) return null;
  return integer(value) ?? undefined;
}

function parseSourceState(value: unknown): NotificationSourceState | null {
  const row = record(value);
  if (!row || typeof row.source !== "string" || !SOURCES.has(row.source as NotificationSource)) {
    return null;
  }
  if (
    typeof row.state !== "string" ||
    !SOURCE_STATES.has(row.state as NotificationSourceStateKind)
  ) {
    return null;
  }
  const total = nullableInteger(row.total);
  const unreadCount = nullableInteger(row.unreadCount);
  const asOfUtc = iso(row.asOfUtc);
  if (total === undefined || unreadCount === undefined || !asOfUtc) return null;
  const reasonCode = row.reasonCode;
  if (
    reasonCode !== null &&
    reasonCode !== "source_unavailable" &&
    reasonCode !== "canonical_source_not_instrumented"
  ) {
    return null;
  }
  const state = row.state as NotificationSourceStateKind;
  if ((state === "ready" || state === "empty") && (total === null || unreadCount === null)) {
    return null;
  }
  if (
    (state === "unavailable" || state === "not_instrumented") &&
    (total !== null || unreadCount !== null)
  ) {
    return null;
  }
  return {
    source: row.source as NotificationSource,
    state,
    total,
    unreadCount,
    asOfUtc,
    reasonCode,
  };
}

function safeDeepLink(source: NotificationSource, value: unknown): string | null | undefined {
  if (value === null) return null;
  const href = text(value, 320);
  if (!href || href.includes("//") || href.includes("\\") || !SAFE_DEEP_LINK[source].test(href)) {
    return undefined;
  }
  return href;
}

function parseAlert(value: unknown): NotificationAlert | null {
  const row = record(value);
  if (!row || typeof row.source !== "string" || !SOURCES.has(row.source as NotificationSource)) {
    return null;
  }
  const source = row.source as NotificationSource;
  const alertKey = text(row.alertKey, 180);
  const title = text(row.title, 240);
  const summary = nullableText(row.summary, 480);
  const occurredAtUtc = iso(row.occurredAtUtc);
  const freshnessAtUtc = iso(row.freshnessAtUtc);
  const deepLink = safeDeepLink(source, row.deepLink);
  if (
    !alertKey ||
    !ALERT_KEY.test(alertKey) ||
    !alertKey.startsWith(`${source}:`) ||
    typeof row.severity !== "string" ||
    !SEVERITIES.has(row.severity as NotificationSeverity) ||
    !title ||
    summary === undefined ||
    !occurredAtUtc ||
    !freshnessAtUtc ||
    typeof row.isRead !== "boolean" ||
    deepLink === undefined ||
    row.canMarkRead !== true ||
    row.canAcknowledge !== false ||
    row.canDismiss !== false
  ) {
    return null;
  }
  return {
    alertKey,
    source,
    severity: row.severity as NotificationSeverity,
    title,
    summary,
    occurredAtUtc,
    freshnessAtUtc,
    isRead: row.isRead,
    deepLink,
    canMarkRead: true,
    canAcknowledge: false,
    canDismiss: false,
  };
}

function parseSourceStates(value: unknown): NotificationSourceState[] | null {
  if (!Array.isArray(value) || value.length > SOURCES.size) return null;
  const states = value.map(parseSourceState);
  if (states.some((item) => item === null)) return null;
  const parsed = states as NotificationSourceState[];
  if (new Set(parsed.map((item) => item.source)).size !== parsed.length) return null;
  return parsed;
}

function parseList(value: unknown): NotificationCenterData | null {
  const body = record(value);
  if (!body || !Array.isArray(body.items)) return null;
  const items = body.items.map(parseAlert);
  if (items.some((item) => item === null)) return null;
  const page = integer(body.page, 10);
  const pageSize = integer(body.pageSize, 25);
  const knownTotal = integer(body.knownTotal);
  const total = nullableInteger(body.total);
  const knownUnreadCount = integer(body.knownUnreadCount);
  const unreadCount = nullableInteger(body.unreadCount);
  const sourceStates = parseSourceStates(body.sourceStates);
  const asOfUtc = iso(body.asOfUtc);
  if (
    page === null ||
    page < 1 ||
    pageSize === null ||
    pageSize < 1 ||
    knownTotal === null ||
    total === undefined ||
    knownUnreadCount === null ||
    unreadCount === undefined ||
    !sourceStates ||
    !asOfUtc ||
    (body.completeness !== "complete" && body.completeness !== "partial")
  ) {
    return null;
  }
  if (body.completeness === "complete" && (total === null || unreadCount === null)) return null;
  if (body.completeness === "partial" && (total !== null || unreadCount !== null)) return null;
  return {
    items: items as NotificationAlert[],
    page,
    pageSize,
    knownTotal,
    total,
    knownUnreadCount,
    unreadCount,
    completeness: body.completeness,
    sourceStates,
    asOfUtc,
  };
}

function parseCount(value: unknown): NotificationCountData | null {
  const body = record(value);
  if (!body) return null;
  const knownUnreadCount = integer(body.knownUnreadCount);
  const unreadCount = nullableInteger(body.unreadCount);
  const sourceStates = parseSourceStates(body.sourceStates);
  const asOfUtc = iso(body.asOfUtc);
  if (
    knownUnreadCount === null ||
    unreadCount === undefined ||
    !sourceStates ||
    !asOfUtc ||
    (body.completeness !== "complete" && body.completeness !== "partial")
  ) {
    return null;
  }
  if (body.completeness === "complete" && unreadCount === null) return null;
  if (body.completeness === "partial" && unreadCount !== null) return null;
  return {
    knownUnreadCount,
    unreadCount,
    completeness: body.completeness,
    sourceStates,
    asOfUtc,
  };
}

function parseReadState(value: unknown): NotificationReadStateData | null {
  const body = record(value);
  if (!body || body.code !== "ok" || body.httpStatus !== 200) return null;
  if (typeof body.source !== "string" || !SOURCES.has(body.source as NotificationSource))
    return null;
  const source = body.source as NotificationSource;
  const alertKey = text(body.alertKey, 180);
  const readAtUtc = body.readAtUtc === null ? null : iso(body.readAtUtc);
  if (
    !alertKey ||
    !ALERT_KEY.test(alertKey) ||
    !alertKey.startsWith(`${source}:`) ||
    typeof body.read !== "boolean" ||
    (body.readAtUtc !== null && !readAtUtc) ||
    typeof body.replayed !== "boolean"
  ) {
    return null;
  }
  return {
    httpStatus: 200,
    code: "ok",
    alertKey,
    source,
    read: body.read,
    readAtUtc,
    replayed: body.replayed,
  };
}

async function token(): Promise<string | null> {
  return await getServerAdminAccessToken();
}

async function problem(response: Response): Promise<{ message?: string; correlationId?: string }> {
  try {
    const body = record(await response.json());
    return {
      message: typeof body?.title === "string" ? body.title : undefined,
      correlationId: typeof body?.correlationId === "string" ? body.correlationId : undefined,
    };
  } catch {
    return {};
  }
}

async function requestAdmin(
  path: string,
  init?: RequestInit,
): Promise<{ response: Response } | { result: NotificationApiResult<never> }> {
  const accessToken = await token();
  if (!accessToken) return { result: { kind: "unauthenticated" } };
  const config = getPublicRuntimeConfig();
  try {
    const response = await fetch(`${config.adminApiUrl}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    return { response };
  } catch {
    return { result: { kind: "unavailable" } };
  }
}

async function mapFailure<T>(response: Response): Promise<NotificationApiResult<T>> {
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 404) return { kind: "not_found" };
  const issue = await problem(response);
  if (response.status === 400) return { kind: "invalid", message: issue.message };
  if (response.status === 409) return { kind: "conflict", message: issue.message };
  return { kind: "unavailable", correlationId: issue.correlationId };
}

export async function listAdminNotifications(
  params: URLSearchParams,
): Promise<NotificationApiResult<NotificationCenterData>> {
  const request = await requestAdmin(`/api/v1/notifications?${params.toString()}`);
  if ("result" in request) return request.result;
  if (!request.response.ok) return mapFailure(request.response);
  const parsed = parseList(await request.response.json());
  return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
}

export async function countAdminNotifications(
  params: URLSearchParams,
): Promise<NotificationApiResult<NotificationCountData>> {
  const request = await requestAdmin(`/api/v1/notifications/count?${params.toString()}`);
  if ("result" in request) return request.result;
  if (!request.response.ok) return mapFailure(request.response);
  const parsed = parseCount(await request.response.json());
  return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
}

export async function setAdminNotificationReadState(
  payload: NotificationReadStatePayload,
  idempotencyKey: string,
): Promise<NotificationApiResult<NotificationReadStateData>> {
  if (!/^[A-Za-z0-9._:-]{8,180}$/.test(idempotencyKey)) {
    return { kind: "invalid", message: "Idempotency-Key نامعتبر است." };
  }
  const request = await requestAdmin("/api/v1/notifications/actions/read-state", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  if ("result" in request) return request.result;
  if (!request.response.ok) return mapFailure(request.response);
  const parsed = parseReadState(await request.response.json());
  return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
}
