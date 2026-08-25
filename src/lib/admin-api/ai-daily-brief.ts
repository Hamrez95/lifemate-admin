import "server-only";

import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type DailyBriefEvidence = {
  id: string;
  metric: string;
  value: number | null;
  state: "ready" | "partial" | "unavailable";
  source: string;
  freshness: { status: "fresh" | "partial" | "unavailable"; asOfUtc: string };
  caveat: string | null;
};

export type DailyBriefItem = {
  id: string;
  severity: "info" | "attention";
  title: string;
  detail: string;
  evidenceIds: string[];
};

export type DailyBrief = {
  state: "ready" | "partial" | "unavailable";
  changes: DailyBriefItem[];
  attention: DailyBriefItem[];
  actions: DailyBriefItem[];
  evidence: DailyBriefEvidence[];
  caveats: string[];
  generatedAtUtc: string;
};

export type DailyBriefResult =
  | { kind: "ok"; brief: DailyBrief }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "unavailable"; correlationId?: string };

async function accessToken(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function isItem(value: unknown): value is DailyBriefItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    (item.severity === "info" || item.severity === "attention") &&
    typeof item.title === "string" &&
    typeof item.detail === "string" &&
    Array.isArray(item.evidenceIds) &&
    item.evidenceIds.every((id) => typeof id === "string")
  );
}

function isEvidence(value: unknown): value is DailyBriefEvidence {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  const freshness = item.freshness;
  return Boolean(
    typeof item.id === "string" &&
      typeof item.metric === "string" &&
      (item.value === null || typeof item.value === "number") &&
      (item.state === "ready" || item.state === "partial" || item.state === "unavailable") &&
      typeof item.source === "string" &&
      (item.caveat === null || typeof item.caveat === "string") &&
      freshness &&
      typeof freshness === "object" &&
      !Array.isArray(freshness) &&
      ["fresh", "partial", "unavailable"].includes(
        String((freshness as Record<string, unknown>).status),
      ) &&
      typeof (freshness as Record<string, unknown>).asOfUtc === "string",
  );
}

export function parseDailyBrief(value: unknown): DailyBrief | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (
    body.state !== "ready" &&
    body.state !== "partial" &&
    body.state !== "unavailable"
  ) return null;
  if (
    !Array.isArray(body.changes) ||
    !body.changes.every(isItem) ||
    !Array.isArray(body.attention) ||
    !body.attention.every(isItem) ||
    !Array.isArray(body.actions) ||
    !body.actions.every(isItem) ||
    !Array.isArray(body.evidence) ||
    !body.evidence.every(isEvidence) ||
    !Array.isArray(body.caveats) ||
    !body.caveats.every((item) => typeof item === "string") ||
    typeof body.generatedAtUtc !== "string"
  ) return null;
  return body as DailyBrief;
}

export async function getDailyBrief(): Promise<DailyBriefResult> {
  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}/api/v1/ai/daily-brief`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (response.ok) {
    const brief = parseDailyBrief(await response.json());
    return brief ? { kind: "ok", brief } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  try {
    const body = (await response.json()) as Record<string, unknown>;
    return {
      kind: "unavailable",
      correlationId: typeof body.correlationId === "string" ? body.correlationId : undefined,
    };
  } catch {
    return { kind: "unavailable" };
  }
}
