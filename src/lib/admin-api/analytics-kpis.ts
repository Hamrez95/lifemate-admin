import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";

export type KpiValueState = "ready" | "partial" | "unavailable";

export type KpiValue = {
  name: string;
  definitionVersion: number;
  state: KpiValueState;
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  source: string;
  freshness: {
    status: "fresh" | "partial" | "unavailable";
    asOfUtc: string;
  };
  series?: Array<{
    date: string;
    value: number;
  }>;
  reason?: string;
};

export type AnalyticsKpiValuesResponse = {
  query: {
    from: string;
    to: string;
    product: "wellmate" | "caremate" | "women_health" | null;
  };
  values: KpiValue[];
  generatedAtUtc: string;
};

export type AnalyticsKpiValuesResult =
  | { kind: "ok"; data: AnalyticsKpiValuesResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid"; correlationId?: string }
  | { kind: "unavailable"; correlationId?: string };

function finiteNullable(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function parseValue(value: unknown): KpiValue | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.name !== "string" ||
    typeof item.definitionVersion !== "number" ||
    (item.state !== "ready" && item.state !== "partial" && item.state !== "unavailable") ||
    !finiteNullable(item.value) ||
    !finiteNullable(item.numerator) ||
    !finiteNullable(item.denominator) ||
    typeof item.source !== "string" ||
    !item.freshness ||
    typeof item.freshness !== "object"
  ) {
    return null;
  }

  const freshness = item.freshness as Record<string, unknown>;
  if (
    (freshness.status !== "fresh" &&
      freshness.status !== "partial" &&
      freshness.status !== "unavailable") ||
    typeof freshness.asOfUtc !== "string"
  ) {
    return null;
  }

  if (item.series !== undefined) {
    if (!Array.isArray(item.series)) return null;
    for (const point of item.series) {
      if (!point || typeof point !== "object") return null;
      const candidate = point as Record<string, unknown>;
      if (typeof candidate.date !== "string" || typeof candidate.value !== "number") return null;
    }
  }

  if (item.reason !== undefined && typeof item.reason !== "string") return null;
  return item as unknown as KpiValue;
}

function parseResponse(value: unknown): AnalyticsKpiValuesResponse | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (!body.query || typeof body.query !== "object") return null;
  if (!Array.isArray(body.values) || typeof body.generatedAtUtc !== "string") return null;

  const query = body.query as Record<string, unknown>;
  if (typeof query.from !== "string" || typeof query.to !== "string") return null;
  if (
    query.product !== null &&
    query.product !== "wellmate" &&
    query.product !== "caremate" &&
    query.product !== "women_health"
  ) {
    return null;
  }
  if (!body.values.every((item) => parseValue(item) !== null)) return null;
  return body as unknown as AnalyticsKpiValuesResponse;
}

async function correlationId(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { correlationId?: unknown };
    return typeof body.correlationId === "string" ? body.correlationId : undefined;
  } catch {
    return undefined;
  }
}

export async function getKpiValues(params: URLSearchParams): Promise<AnalyticsKpiValuesResult> {
  const token = await getServerAdminAccessToken();
  if (!token) return { kind: "unauthenticated" };

  const config = getPublicRuntimeConfig();
  const query = params.toString();
  const url = `${config.adminApiUrl}/api/v1/analytics/kpis${query ? `?${query}` : ""}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    const parsed = parseResponse(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 400)
    return { kind: "invalid", correlationId: await correlationId(response) };
  return { kind: "unavailable", correlationId: await correlationId(response) };
}
