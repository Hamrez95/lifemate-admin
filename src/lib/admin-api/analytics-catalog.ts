import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type AnalyticsEventDefinition = {
  name: string;
  definitionVersion: number;
  domain: string;
  instrumentationState: "instrumented" | "partial" | "planned";
  descriptionFa: string;
  source: string;
  privacyPolicy: string;
};

export type AnalyticsFunnelMetadata = {
  id: "activation";
  stageOrder: number;
  previousStage: string | null;
  privacyThreshold: number;
};

export type AnalyticsKpiDefinition = {
  name: string;
  displayNameFa: string;
  definitionVersion: number;
  unit: "count" | "rate";
  formula: string;
  numerator: string;
  denominator: string | null;
  timeWindow: string;
  timezone: string;
  exclusions: string[];
  eventSources: string[];
  freshnessRule: string;
  availability: "available" | "partial" | "unavailable";
  funnel?: AnalyticsFunnelMetadata;
};

export type AnalyticsCatalog = {
  eventTaxonomyVersion: number;
  kpiDictionaryVersion: number;
  events: AnalyticsEventDefinition[];
  kpis: AnalyticsKpiDefinition[];
  generatedAtUtc: string;
};

export type AnalyticsCatalogResult =
  | { kind: "ok"; data: AnalyticsCatalog }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "unavailable"; correlationId?: string };

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function eventDefinition(value: unknown): value is AnalyticsEventDefinition {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.name === "string" &&
    typeof item.definitionVersion === "number" &&
    typeof item.domain === "string" &&
    (item.instrumentationState === "instrumented" ||
      item.instrumentationState === "partial" ||
      item.instrumentationState === "planned") &&
    typeof item.descriptionFa === "string" &&
    typeof item.source === "string" &&
    typeof item.privacyPolicy === "string"
  );
}

function funnelMetadata(value: unknown): value is AnalyticsFunnelMetadata {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    item.id === "activation" &&
    typeof item.stageOrder === "number" &&
    Number.isInteger(item.stageOrder) &&
    item.stageOrder >= 1 &&
    (item.previousStage === null || typeof item.previousStage === "string") &&
    typeof item.privacyThreshold === "number" &&
    Number.isInteger(item.privacyThreshold) &&
    item.privacyThreshold >= 1
  );
}

function kpiDefinition(value: unknown): value is AnalyticsKpiDefinition {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.name === "string" &&
    typeof item.displayNameFa === "string" &&
    typeof item.definitionVersion === "number" &&
    (item.unit === "count" || item.unit === "rate") &&
    typeof item.formula === "string" &&
    typeof item.numerator === "string" &&
    (item.denominator === null || typeof item.denominator === "string") &&
    typeof item.timeWindow === "string" &&
    typeof item.timezone === "string" &&
    strings(item.exclusions) &&
    strings(item.eventSources) &&
    typeof item.freshnessRule === "string" &&
    (item.availability === "available" ||
      item.availability === "partial" ||
      item.availability === "unavailable") &&
    (item.funnel === undefined || funnelMetadata(item.funnel))
  );
}

function parseCatalog(value: unknown): AnalyticsCatalog | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (
    typeof body.eventTaxonomyVersion !== "number" ||
    typeof body.kpiDictionaryVersion !== "number" ||
    typeof body.generatedAtUtc !== "string" ||
    !Array.isArray(body.events) ||
    !Array.isArray(body.kpis)
  ) {
    return null;
  }
  if (!body.events.every(eventDefinition) || !body.kpis.every(kpiDefinition)) {
    return null;
  }

  return body as unknown as AnalyticsCatalog;
}

async function correlationId(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { correlationId?: unknown };
    return typeof body.correlationId === "string" ? body.correlationId : undefined;
  } catch {
    return undefined;
  }
}

export async function getAnalyticsCatalog(): Promise<AnalyticsCatalogResult> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return { kind: "unauthenticated" };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { kind: "unauthenticated" };

  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}/api/v1/analytics/catalog`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    const parsed = parseCatalog(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  return { kind: "unavailable", correlationId: await correlationId(response) };
}
