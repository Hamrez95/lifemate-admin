import "server-only";

import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export const advisorTopics = ["product_overview", "acquisition", "activity"] as const;
export type AdvisorTopic = (typeof advisorTopics)[number];

export type AdvisorEvidence = {
  sourceId: string;
  label: string;
  state: "ready" | "partial" | "unavailable";
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  source: string;
  freshness: {
    status: "fresh" | "partial" | "unavailable";
    asOfUtc: string;
  };
  caveat: string | null;
};

export type AdvisorFinding = {
  severity: "info" | "attention";
  title: string;
  detail: string;
  evidenceIds: string[];
};

export type AdvisorInsight = {
  topic: AdvisorTopic;
  mode: "deterministic";
  summary: string;
  findings: AdvisorFinding[];
  evidence: AdvisorEvidence[];
  caveats: string[];
  generatedAtUtc: string;
  model: {
    status: "not_configured";
    fallbackUsed: true;
    note: string;
  };
};

export type AdvisorResult =
  | { kind: "ok"; data: AdvisorInsight }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message?: string }
  | { kind: "invalid"; code?: string; message?: string }
  | { kind: "unavailable"; correlationId?: string };

type Problem = { code?: unknown; title?: unknown; correlationId?: unknown };

const TOPICS = new Set<string>(advisorTopics);

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function instant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function nullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function parseEvidence(value: unknown): AdvisorEvidence | null {
  const item = object(value);
  const freshness = object(item?.freshness);
  if (!item || !freshness) return null;
  if (
    typeof item.sourceId !== "string" ||
    typeof item.label !== "string" ||
    !["ready", "partial", "unavailable"].includes(String(item.state)) ||
    !nullableNumber(item.value) ||
    !nullableNumber(item.numerator) ||
    !nullableNumber(item.denominator) ||
    typeof item.source !== "string" ||
    !["fresh", "partial", "unavailable"].includes(String(freshness.status)) ||
    !instant(freshness.asOfUtc) ||
    (item.caveat !== null && typeof item.caveat !== "string")
  ) {
    return null;
  }
  return {
    sourceId: item.sourceId,
    label: item.label,
    state: item.state as AdvisorEvidence["state"],
    value: item.value,
    numerator: item.numerator,
    denominator: item.denominator,
    source: item.source,
    freshness: {
      status: freshness.status as AdvisorEvidence["freshness"]["status"],
      asOfUtc: freshness.asOfUtc,
    },
    caveat: item.caveat,
  };
}

function parseFinding(value: unknown): AdvisorFinding | null {
  const item = object(value);
  if (!item || !Array.isArray(item.evidenceIds)) return null;
  if (
    (item.severity !== "info" && item.severity !== "attention") ||
    typeof item.title !== "string" ||
    typeof item.detail !== "string" ||
    item.evidenceIds.some((id) => typeof id !== "string")
  ) {
    return null;
  }
  return {
    severity: item.severity,
    title: item.title,
    detail: item.detail,
    evidenceIds: item.evidenceIds as string[],
  };
}

function parseInsight(value: unknown): AdvisorInsight | null {
  const body = object(value);
  const model = object(body?.model);
  if (!body || !model || !Array.isArray(body.findings) || !Array.isArray(body.evidence) || !Array.isArray(body.caveats)) {
    return null;
  }
  const findings = body.findings.map(parseFinding);
  const evidence = body.evidence.map(parseEvidence);
  if (
    !TOPICS.has(String(body.topic)) ||
    body.mode !== "deterministic" ||
    typeof body.summary !== "string" ||
    findings.some((item) => !item) ||
    evidence.some((item) => !item) ||
    body.caveats.some((item) => typeof item !== "string") ||
    !instant(body.generatedAtUtc) ||
    model.status !== "not_configured" ||
    model.fallbackUsed !== true ||
    typeof model.note !== "string"
  ) {
    return null;
  }
  return {
    topic: body.topic as AdvisorTopic,
    mode: "deterministic",
    summary: body.summary,
    findings: findings as AdvisorFinding[],
    evidence: evidence as AdvisorEvidence[],
    caveats: body.caveats as string[],
    generatedAtUtc: body.generatedAtUtc,
    model: {
      status: "not_configured",
      fallbackUsed: true,
      note: model.note,
    },
  };
}

async function bearer(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();
  if (error || !claimsData?.claims?.sub) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function getAdvisorInsight(
  topic: AdvisorTopic,
  question: string | null,
): Promise<AdvisorResult> {
  if (!advisorTopics.includes(topic) || (question && (question.length < 2 || question.length > 500))) {
    return { kind: "invalid" };
  }
  const token = await bearer();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  try {
    const response = await fetch(`${config.adminApiUrl}/api/v1/ai/advisor/insights`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ topic, question }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    if (response.ok) {
      const parsed = parseInsight(body);
      return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
    }
    const problem = object(body) as Problem | null;
    const message = typeof problem?.title === "string" ? problem.title : undefined;
    const code = typeof problem?.code === "string" ? problem.code : undefined;
    if (response.status === 401) return { kind: "unauthenticated" };
    if (response.status === 403) return { kind: "forbidden", message };
    if (response.status === 400) return { kind: "invalid", code, message };
    return {
      kind: "unavailable",
      correlationId:
        typeof problem?.correlationId === "string" ? problem.correlationId : undefined,
    };
  } catch {
    return { kind: "unavailable" };
  }
}
