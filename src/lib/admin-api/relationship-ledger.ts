import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";
import type { RelationshipOverviewKind } from "@/src/lib/admin-api/relationship-overview";

export type RelationshipLedgerItem = {
  ledgerId: string;
  entityId: string;
  kind: RelationshipOverviewKind;
  eventType: string;
  status: string;
  subjectPersonId: string | null;
  type: string | null;
  purpose: string | null;
  context: string | null;
  scopeCount: number | null;
  occurredAtUtc: string;
  evidence: "event" | "lifecycle_timestamp";
};

export type RelationshipLedgerResponse = {
  items: RelationshipLedgerItem[];
  total: number;
  page: number;
  pageSize: number;
  filters: {
    kind: RelationshipOverviewKind | null;
    status: string | null;
    from: string;
    to: string;
  };
  freshness: {
    status: "fresh" | "stale";
    asOfUtc: string;
  };
};

export type RelationshipLedgerResult =
  | { kind: "ok"; data: RelationshipLedgerResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid"; correlationId?: string }
  | { kind: "unavailable"; correlationId?: string };

function validKind(value: unknown): value is RelationshipOverviewKind {
  return value === "relationship" || value === "consent" || value === "access_grant";
}

function validItem(value: unknown): value is RelationshipLedgerItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.ledgerId === "string" &&
    typeof item.entityId === "string" &&
    validKind(item.kind) &&
    typeof item.eventType === "string" &&
    typeof item.status === "string" &&
    (item.subjectPersonId === null || typeof item.subjectPersonId === "string") &&
    (item.type === null || typeof item.type === "string") &&
    (item.purpose === null || typeof item.purpose === "string") &&
    (item.context === null || typeof item.context === "string") &&
    (item.scopeCount === null || typeof item.scopeCount === "number") &&
    typeof item.occurredAtUtc === "string" &&
    (item.evidence === "event" || item.evidence === "lifecycle_timestamp")
  );
}

function parseResponse(value: unknown): RelationshipLedgerResponse | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.items) || !body.items.every(validItem)) return null;
  if (
    typeof body.total !== "number" ||
    typeof body.page !== "number" ||
    typeof body.pageSize !== "number"
  ) {
    return null;
  }
  if (!body.filters || typeof body.filters !== "object") return null;
  const filters = body.filters as Record<string, unknown>;
  if (filters.kind !== null && !validKind(filters.kind)) return null;
  if (filters.status !== null && typeof filters.status !== "string") return null;
  if (typeof filters.from !== "string" || typeof filters.to !== "string") return null;
  if (!body.freshness || typeof body.freshness !== "object") return null;
  const freshness = body.freshness as Record<string, unknown>;
  if (
    (freshness.status !== "fresh" && freshness.status !== "stale") ||
    typeof freshness.asOfUtc !== "string"
  ) {
    return null;
  }
  return body as unknown as RelationshipLedgerResponse;
}

async function correlationId(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { correlationId?: unknown };
    return typeof body.correlationId === "string" ? body.correlationId : undefined;
  } catch {
    return undefined;
  }
}

export async function getRelationshipLedger(
  params: URLSearchParams,
): Promise<RelationshipLedgerResult> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return { kind: "unauthenticated" };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { kind: "unauthenticated" };

  const config = getPublicRuntimeConfig();
  const query = params.toString();
  const url = `${config.adminApiUrl}/api/v1/relationships/ledger${query ? `?${query}` : ""}`;
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
  if (response.status === 400) {
    return { kind: "invalid", correlationId: await correlationId(response) };
  }
  return { kind: "unavailable", correlationId: await correlationId(response) };
}
