import "server-only";

import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

import type { MarketingCampaignResult } from "./marketing-campaigns";

export const marketingAiContentGoals = [
  "awareness",
  "launch",
  "education",
  "engagement",
  "retention",
] as const;
export type MarketingAiContentGoal = (typeof marketingAiContentGoals)[number];

export const marketingAiContentTones = ["warm", "clear", "energetic", "professional"] as const;
export type MarketingAiContentTone = (typeof marketingAiContentTones)[number];

export const marketingAiContentLanguages = ["fa", "en"] as const;
export type MarketingAiContentLanguage = (typeof marketingAiContentLanguages)[number];

export type MarketingAiContentPayload = {
  goal: MarketingAiContentGoal;
  tone: MarketingAiContentTone;
  language: MarketingAiContentLanguage;
  keyMessage: string | null;
  callToAction: string | null;
};

export type MarketingAiContentVariant = {
  id: string;
  headline: string;
  body: string;
  callToAction: string | null;
  hashtags: string[];
  rationale: string;
};

export type MarketingAiContentGeneration = {
  id: string;
  campaignId: string;
  requestedByAdminAccountId: string;
  goal: MarketingAiContentGoal;
  tone: MarketingAiContentTone;
  language: MarketingAiContentLanguage;
  keyMessage: string | null;
  callToAction: string | null;
  variants: MarketingAiContentVariant[];
  generationMode: "deterministic_fallback" | "model";
  modelStatus: "not_configured" | "available" | "unavailable";
  createdAtUtc: string;
};

export type MarketingAiContentBoundary = {
  publishAllowed: false;
  rawHealthAllowed: false;
  arbitraryPromptAllowed: false;
};

export type MarketingAiContentList = {
  items: MarketingAiContentGeneration[];
  model: {
    status: "not_configured";
    fallbackUsed: true;
  };
  boundary: MarketingAiContentBoundary;
};

export type MarketingAiContentGenerateResponse = {
  generation: MarketingAiContentGeneration;
  replayed: boolean;
  model: {
    status: "not_configured";
    fallbackUsed: true;
    note: string;
  };
  boundary: MarketingAiContentBoundary;
};

type Problem = {
  code?: unknown;
  title?: unknown;
  correlationId?: unknown;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const GENERATION_MODES = new Set(["deterministic_fallback", "model"]);
const MODEL_STATUSES = new Set(["not_configured", "available", "unavailable"]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nullableText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function instant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function goal(value: unknown): value is MarketingAiContentGoal {
  return (
    typeof value === "string" && marketingAiContentGoals.includes(value as MarketingAiContentGoal)
  );
}

function tone(value: unknown): value is MarketingAiContentTone {
  return (
    typeof value === "string" && marketingAiContentTones.includes(value as MarketingAiContentTone)
  );
}

function language(value: unknown): value is MarketingAiContentLanguage {
  return (
    typeof value === "string" &&
    marketingAiContentLanguages.includes(value as MarketingAiContentLanguage)
  );
}

function parseVariant(value: unknown): MarketingAiContentVariant | null {
  const item = record(value);
  if (!item || !Array.isArray(item.hashtags)) return null;
  if (
    typeof item.id !== "string" ||
    typeof item.headline !== "string" ||
    typeof item.body !== "string" ||
    !nullableText(item.callToAction) ||
    item.hashtags.some((tag) => typeof tag !== "string") ||
    typeof item.rationale !== "string"
  ) {
    return null;
  }
  return {
    id: item.id,
    headline: item.headline,
    body: item.body,
    callToAction: item.callToAction,
    hashtags: item.hashtags as string[],
    rationale: item.rationale,
  };
}

function parseGeneration(value: unknown): MarketingAiContentGeneration | null {
  const item = record(value);
  if (!item || !Array.isArray(item.variants)) return null;
  const variants = item.variants.map(parseVariant);
  if (
    typeof item.id !== "string" ||
    !UUID_PATTERN.test(item.id) ||
    typeof item.campaignId !== "string" ||
    !UUID_PATTERN.test(item.campaignId) ||
    typeof item.requestedByAdminAccountId !== "string" ||
    !UUID_PATTERN.test(item.requestedByAdminAccountId) ||
    !goal(item.goal) ||
    !tone(item.tone) ||
    !language(item.language) ||
    !nullableText(item.keyMessage) ||
    !nullableText(item.callToAction) ||
    variants.length < 1 ||
    variants.length > 5 ||
    variants.some((variant) => !variant) ||
    !GENERATION_MODES.has(String(item.generationMode)) ||
    !MODEL_STATUSES.has(String(item.modelStatus)) ||
    !instant(item.createdAtUtc)
  ) {
    return null;
  }
  return {
    id: item.id,
    campaignId: item.campaignId,
    requestedByAdminAccountId: item.requestedByAdminAccountId,
    goal: item.goal,
    tone: item.tone,
    language: item.language,
    keyMessage: item.keyMessage,
    callToAction: item.callToAction,
    variants: variants as MarketingAiContentVariant[],
    generationMode: item.generationMode as MarketingAiContentGeneration["generationMode"],
    modelStatus: item.modelStatus as MarketingAiContentGeneration["modelStatus"],
    createdAtUtc: item.createdAtUtc,
  };
}

function parseBoundary(value: unknown): MarketingAiContentBoundary | null {
  const item = record(value);
  if (
    !item ||
    item.publishAllowed !== false ||
    item.rawHealthAllowed !== false ||
    item.arbitraryPromptAllowed !== false
  ) {
    return null;
  }
  return {
    publishAllowed: false,
    rawHealthAllowed: false,
    arbitraryPromptAllowed: false,
  };
}

function parseList(value: unknown): MarketingAiContentList | null {
  const body = record(value);
  const model = record(body?.model);
  const boundary = parseBoundary(body?.boundary);
  if (!body || !model || !boundary || !Array.isArray(body.items)) return null;
  const items = body.items.map(parseGeneration);
  if (
    items.some((item) => !item) ||
    model.status !== "not_configured" ||
    model.fallbackUsed !== true
  ) {
    return null;
  }
  return {
    items: items as MarketingAiContentGeneration[],
    model: { status: "not_configured", fallbackUsed: true },
    boundary,
  };
}

function parseGenerate(value: unknown): MarketingAiContentGenerateResponse | null {
  const body = record(value);
  const generation = parseGeneration(body?.generation);
  const model = record(body?.model);
  const boundary = parseBoundary(body?.boundary);
  if (
    !body ||
    !generation ||
    !model ||
    !boundary ||
    typeof body.replayed !== "boolean" ||
    model.status !== "not_configured" ||
    model.fallbackUsed !== true ||
    typeof model.note !== "string"
  ) {
    return null;
  }
  return {
    generation,
    replayed: body.replayed,
    model: {
      status: "not_configured",
      fallbackUsed: true,
      note: model.note,
    },
    boundary,
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

async function request(
  path: string,
  init?: RequestInit,
): Promise<{ response: Response; body: unknown } | null> {
  const token = await bearer();
  if (!token) return null;
  const config = getPublicRuntimeConfig();
  try {
    const response = await fetch(`${config.adminApiUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return { response, body };
  } catch {
    return { response: new Response(null, { status: 503 }), body: null };
  }
}

function failed<T>(response: Response, body: Problem): MarketingCampaignResult<T> {
  const message = typeof body.title === "string" ? body.title : undefined;
  const code = typeof body.code === "string" ? body.code : undefined;
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden", message };
  if (response.status === 404) return { kind: "not_found", message };
  if (response.status === 409) return { kind: "conflict", code, message };
  if (response.status === 400) return { kind: "invalid", code, message };
  return {
    kind: "unavailable",
    correlationId: typeof body.correlationId === "string" ? body.correlationId : undefined,
  };
}

function validPayload(payload: MarketingAiContentPayload): boolean {
  return (
    goal(payload.goal) &&
    tone(payload.tone) &&
    language(payload.language) &&
    (payload.keyMessage === null || payload.keyMessage.length <= 500) &&
    (payload.callToAction === null || payload.callToAction.length <= 240)
  );
}

export async function getMarketingAiContentGenerations(
  campaignId: string,
): Promise<MarketingCampaignResult<MarketingAiContentList>> {
  if (!UUID_PATTERN.test(campaignId)) return { kind: "invalid" };
  const result = await request(`/api/v1/marketing/campaigns/${campaignId}/ai-content/generations`);
  if (!result) return { kind: "unauthenticated" };
  if (result.response.ok) {
    const parsed = parseList(result.body);
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  return failed(result.response, record(result.body) ?? {});
}

export async function generateMarketingAiContent(
  campaignId: string,
  payload: MarketingAiContentPayload,
  idempotencyKey: string,
): Promise<MarketingCampaignResult<MarketingAiContentGenerateResponse>> {
  if (
    !UUID_PATTERN.test(campaignId) ||
    !IDEMPOTENCY_PATTERN.test(idempotencyKey) ||
    !validPayload(payload)
  ) {
    return { kind: "invalid" };
  }
  const result = await request(`/api/v1/marketing/campaigns/${campaignId}/ai-content/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  if (!result) return { kind: "unauthenticated" };
  if (result.response.ok) {
    const parsed = parseGenerate(result.body);
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  return failed(result.response, record(result.body) ?? {});
}
