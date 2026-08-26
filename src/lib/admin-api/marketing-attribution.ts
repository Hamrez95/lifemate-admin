import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type MarketingAttributionResponse = {
  taxonomy: {
    model: string;
    attributionState: "not_instrumented";
    dimensions: string[];
    supportedFacts: string[];
    unsupportedFacts: string[];
    note: string;
  };
  filters: {
    from: string | null;
    to: string | null;
    product: string | null;
    channel: string | null;
    campaignId: string | null;
  };
  items: Array<{
    productCode: string | null;
    channelCode: string | null;
    campaignCount: number;
    activeCampaignCount: number;
    completedCampaignCount: number;
  }>;
  performanceMetrics: Array<{
    name: "spend" | "revenue" | "conversions" | "cac" | "roas";
    state: "unavailable";
    value: null;
    reason: string;
  }>;
  freshness: {
    status: "partial";
    asOfUtc: string;
    source: string;
    note: string;
  };
};

export type MarketingAttributionResult =
  | { kind: "ok"; data: MarketingAttributionResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid"; correlationId?: string }
  | { kind: "unavailable"; correlationId?: string };

function finiteCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function parseResponse(value: unknown): MarketingAttributionResponse | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (!body.taxonomy || typeof body.taxonomy !== "object") return null;
  if (!body.filters || typeof body.filters !== "object") return null;
  if (!body.freshness || typeof body.freshness !== "object") return null;
  if (!Array.isArray(body.items) || !Array.isArray(body.performanceMetrics)) return null;

  const taxonomy = body.taxonomy as Record<string, unknown>;
  if (
    typeof taxonomy.model !== "string" ||
    taxonomy.attributionState !== "not_instrumented" ||
    !Array.isArray(taxonomy.dimensions) ||
    !Array.isArray(taxonomy.supportedFacts) ||
    !Array.isArray(taxonomy.unsupportedFacts) ||
    typeof taxonomy.note !== "string"
  ) return null;

  for (const item of body.items) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    if (
      (row.productCode !== null && typeof row.productCode !== "string") ||
      (row.channelCode !== null && typeof row.channelCode !== "string") ||
      !finiteCount(row.campaignCount) ||
      !finiteCount(row.activeCampaignCount) ||
      !finiteCount(row.completedCampaignCount)
    ) return null;
  }

  for (const metric of body.performanceMetrics) {
    if (!metric || typeof metric !== "object") return null;
    const row = metric as Record<string, unknown>;
    if (
      !["spend", "revenue", "conversions", "cac", "roas"].includes(String(row.name)) ||
      row.state !== "unavailable" ||
      row.value !== null ||
      typeof row.reason !== "string"
    ) return null;
  }

  const freshness = body.freshness as Record<string, unknown>;
  if (
    freshness.status !== "partial" ||
    typeof freshness.asOfUtc !== "string" ||
    typeof freshness.source !== "string" ||
    typeof freshness.note !== "string"
  ) return null;

  return body as unknown as MarketingAttributionResponse;
}

async function correlationId(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { correlationId?: unknown };
    return typeof body.correlationId === "string" ? body.correlationId : undefined;
  } catch {
    return undefined;
  }
}

export async function getMarketingAttribution(
  params: URLSearchParams,
): Promise<MarketingAttributionResult> {
  const token = await getServerAdminAccessToken();
  if (!token) return { kind: "unauthenticated" };

  const config = getPublicRuntimeConfig();
  const query = params.toString();
  const url = `${config.adminApiUrl}/api/v1/marketing/attribution${query ? `?${query}` : ""}`;
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
  if (response.status === 400) return { kind: "invalid", correlationId: await correlationId(response) };
  return { kind: "unavailable", correlationId: await correlationId(response) };
}
