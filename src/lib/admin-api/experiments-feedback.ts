import "server-only";

import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type ExperimentVariant = { key: string; weightBasisPoints: number; controlValue: unknown; version: number };
export type ExperimentDefinition = { key: string; name: string; controlKey: string; surface: string; productCode: string | null; segmentKey: string | null; primaryMetricCode: string; guardrailMetricCodes: string[]; status: string; startsAtUtc: string | null; endsAtUtc: string | null; version: number; variants: ExperimentVariant[] };
export type FeedbackItem = { itemId: string; kind: string; status: string; productCode: string; appVersion: string | null; buildNumber: string | null; npsScore: number | null; message: string | null; advocacyOptIn: boolean; linkedSupportTicketId: string | null; linkedProductIssueRef: string | null; createdAtUtc: string; acknowledgedAtUtc: string | null; triagedAtUtc: string | null; resolvedAtUtc: string | null };
export type FeedbackTrend = { day: string; product_code: string; kind: string; status: string; item_count: number | string; nps_response_count: number | string; average_nps: number | string | null };
export type ProductSignalResult<T> = { kind: "ok"; data: T } | { kind: "unauthenticated" } | { kind: "forbidden" } | { kind: "invalid"; message?: string } | { kind: "unavailable"; correlationId?: string };

async function adminFetch(path: string, init?: RequestInit): Promise<Response | null> {
  const token = await getServerAdminAccessToken();
  if (!token) return null;
  const { adminApiUrl } = getPublicRuntimeConfig();
  try {
    return await fetch(`${adminApiUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  } catch {
    return new Response(null, { status: 503 });
  }
}

async function mapped<T>(response: Response | null): Promise<ProductSignalResult<T>> {
  if (response === null) return { kind: "unauthenticated" };
  if (response.ok) {
    try { return { kind: "ok", data: (await response.json()) as T }; } catch { return { kind: "unavailable" }; }
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  let body: Record<string, unknown> = {};
  try { body = (await response.json()) as Record<string, unknown>; } catch {}
  if ([400,404,409].includes(response.status)) return { kind: "invalid", message: typeof body.message === "string" ? body.message : undefined };
  return { kind: "unavailable", correlationId: typeof body.correlationId === "string" ? body.correlationId : undefined };
}

export async function listExperiments() { return mapped<{ items: ExperimentDefinition[]; total: number; outcomesComputed: boolean }>(await adminFetch("/api/v1/experiments")); }
export async function createExperiment(input: { payload: Record<string, unknown>; idempotencyKey: string }) { return mapped<Record<string, unknown>>(await adminFetch("/api/v1/experiments", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey }, body: JSON.stringify(input.payload) })); }
export async function setExperimentStatus(input: { experimentKey: string; status: string; expectedVersion: number; reason: string; idempotencyKey: string }) { return mapped<Record<string, unknown>>(await adminFetch(`/api/v1/experiments/${encodeURIComponent(input.experimentKey)}/status`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey }, body: JSON.stringify({ status: input.status, expectedVersion: input.expectedVersion, reason: input.reason }) })); }
export async function listFeedback(query: { status?: string; kind?: string; product?: string; appVersion?: string; limit?: number; offset?: number } = {}) { const p=new URLSearchParams(); if(query.status)p.set("status",query.status); if(query.kind)p.set("kind",query.kind); if(query.product)p.set("product",query.product); if(query.appVersion)p.set("appVersion",query.appVersion); if(query.limit)p.set("limit",String(query.limit)); if(query.offset)p.set("offset",String(query.offset)); return mapped<{ items: FeedbackItem[]; total: number; limit: number; offset: number }>(await adminFetch(`/api/v1/feedback${p.size?`?${p}`:""}`)); }
export async function listFeedbackTrends(input: { product?: string; days?: number } = {}) { const p=new URLSearchParams(); if(input.product)p.set("product",input.product); if(input.days)p.set("days",String(input.days)); return mapped<{ items: FeedbackTrend[]; days: number }>(await adminFetch(`/api/v1/feedback/trends${p.size?`?${p}`:""}`)); }
export async function mutateFeedback(input: { itemId: string; expectedStatus: string; action: string; reason: string; supportTicketId?: string | null; productIssueRef?: string | null; idempotencyKey: string }) { return mapped<Record<string, unknown>>(await adminFetch(`/api/v1/feedback/${encodeURIComponent(input.itemId)}/actions`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey }, body: JSON.stringify({ expectedStatus: input.expectedStatus, action: input.action, reason: input.reason, ...(input.supportTicketId?{supportTicketId:input.supportTicketId}:{}), ...(input.productIssueRef?{productIssueRef:input.productIssueRef}:{}) }) })); }
