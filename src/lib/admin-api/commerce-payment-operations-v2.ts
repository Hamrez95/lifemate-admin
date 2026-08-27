import "server-only";

import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type CommerceRefundOperation = {
  refundRequestId: string;
  transactionId: string;
  requestStatus: string;
  amountMinor: string;
  currency: string;
  reason: string;
  version: number;
  requestedAtUtc: string;
  refundOperationId: string | null;
  providerStatus: string | null;
  provider: string | null;
  submittedAtUtc: string | null;
  settledAtUtc: string | null;
  providerErrorCode: string | null;
};

export type CommerceReconciliationCase = {
  caseId: string;
  transactionId: string | null;
  caseType: string;
  status: string;
  source: string;
  reason: string;
  assignedToAccountId: string | null;
  openedAtUtc: string;
  resolvedAtUtc: string | null;
  providerNormalizedStatus: string | null;
  effectiveNormalizedStatus: string | null;
  classificationSource: string | null;
  correctionId: string | null;
};

export type CommerceChurnRecord = {
  subscriptionId: string;
  ownerAccountId: string;
  planId: string;
  status: string;
  currentPeriodEndUtc: string | null;
  cancelAtPeriodEnd: boolean;
  nonRenewalRequestedAtUtc: string | null;
  cancellationReasonCode: string | null;
  cancellationReasonText: string | null;
  cancellationVersion: number;
  latestEventType: string | null;
  latestEventAtUtc: string | null;
};

export type CommercePaymentOperationsSnapshot = {
  refunds: CommerceRefundOperation[] | null;
  reconciliationCases: CommerceReconciliationCase[] | null;
  churn: CommerceChurnRecord[] | null;
  access: {
    refunds: "ready" | "forbidden" | "unavailable";
    reconciliation: "ready" | "forbidden" | "unavailable";
    churn: "ready" | "forbidden" | "unavailable";
  };
  asOfUtc: string;
};

export type CommercePaymentMutationResult =
  | { kind: "ok"; replayed?: boolean; message?: string }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid"; code?: string; message?: string }
  | { kind: "conflict"; code?: string; message?: string }
  | { kind: "unavailable"; correlationId?: string; message?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AMOUNT = /^\d{1,19}$/;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function string(value: unknown, max = 1000): string | null {
  return typeof value === "string" && value.length <= max ? value : null;
}

function requiredString(value: unknown, max = 1000): string | null {
  const parsed = string(value, max);
  return parsed && parsed.trim() ? parsed : null;
}

function uuid(value: unknown): string | null {
  return typeof value === "string" && UUID.test(value) ? value : null;
}

function nullableUuid(value: unknown): string | null | undefined {
  if (value === null) return null;
  const parsed = uuid(value);
  return parsed ?? undefined;
}

function date(value: unknown): string | null {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

function nullableDate(value: unknown): string | null | undefined {
  if (value === null) return null;
  const parsed = date(value);
  return parsed ?? undefined;
}

function integer(value: unknown, min = 0): number | null {
  return Number.isInteger(value) && Number(value) >= min ? Number(value) : null;
}

function amount(value: unknown): string | null {
  return typeof value === "string" && AMOUNT.test(value) ? value : null;
}

function nullableText(value: unknown, max = 1000): string | null | undefined {
  if (value === null) return null;
  const parsed = string(value, max);
  return parsed ?? undefined;
}

function parseRefund(value: unknown): CommerceRefundOperation | null {
  const row = record(value);
  if (!row) return null;
  const refundRequestId = uuid(row.refund_request_id);
  const transactionId = uuid(row.transaction_id);
  const requestStatus = requiredString(row.request_status, 64);
  const amountMinor = amount(row.amount_minor);
  const currency = requiredString(row.currency, 3);
  const reason = requiredString(row.reason, 1000);
  const version = integer(row.version, 1);
  const requestedAtUtc = date(row.requested_at_utc);
  const refundOperationId = nullableUuid(row.refund_operation_id);
  const providerStatus = nullableText(row.provider_status, 64);
  const provider = nullableText(row.provider, 128);
  const submittedAtUtc = nullableDate(row.submitted_at_utc);
  const settledAtUtc = nullableDate(row.settled_at_utc);
  const providerErrorCode = nullableText(row.provider_error_code, 128);
  if (
    !refundRequestId ||
    !transactionId ||
    !requestStatus ||
    !amountMinor ||
    !currency ||
    currency.length !== 3 ||
    !reason ||
    version === null ||
    !requestedAtUtc ||
    refundOperationId === undefined ||
    providerStatus === undefined ||
    provider === undefined ||
    submittedAtUtc === undefined ||
    settledAtUtc === undefined ||
    providerErrorCode === undefined
  ) {
    return null;
  }
  return {
    refundRequestId,
    transactionId,
    requestStatus,
    amountMinor,
    currency,
    reason,
    version,
    requestedAtUtc,
    refundOperationId,
    providerStatus,
    provider,
    submittedAtUtc,
    settledAtUtc,
    providerErrorCode,
  };
}

function parseReconciliation(value: unknown): CommerceReconciliationCase | null {
  const row = record(value);
  if (!row) return null;
  const caseId = uuid(row.id);
  const transactionId = nullableUuid(row.transaction_id);
  const caseType = requiredString(row.case_type, 64);
  const status = requiredString(row.status, 64);
  const source = requiredString(row.source, 64);
  const reason = requiredString(row.reason, 1000);
  const assignedToAccountId = nullableUuid(row.assigned_to_account_id);
  const openedAtUtc = date(row.opened_at_utc);
  const resolvedAtUtc = nullableDate(row.resolved_at_utc);
  const providerNormalizedStatus = nullableText(row.provider_normalized_status, 64);
  const effectiveNormalizedStatus = nullableText(row.effective_normalized_status, 64);
  const classificationSource = nullableText(row.classification_source, 64);
  const correctionId = nullableUuid(row.correction_id);
  if (
    !caseId ||
    transactionId === undefined ||
    !caseType ||
    !status ||
    !source ||
    !reason ||
    assignedToAccountId === undefined ||
    !openedAtUtc ||
    resolvedAtUtc === undefined ||
    providerNormalizedStatus === undefined ||
    effectiveNormalizedStatus === undefined ||
    classificationSource === undefined ||
    correctionId === undefined
  ) {
    return null;
  }
  return {
    caseId,
    transactionId,
    caseType,
    status,
    source,
    reason,
    assignedToAccountId,
    openedAtUtc,
    resolvedAtUtc,
    providerNormalizedStatus,
    effectiveNormalizedStatus,
    classificationSource,
    correctionId,
  };
}

function parseChurn(value: unknown): CommerceChurnRecord | null {
  const row = record(value);
  if (!row) return null;
  const subscriptionId = uuid(row.subscription_id);
  const ownerAccountId = uuid(row.owner_account_id);
  const planId = uuid(row.plan_id);
  const status = requiredString(row.status, 64);
  const currentPeriodEndUtc = nullableDate(row.current_period_end_utc);
  const nonRenewalRequestedAtUtc = nullableDate(row.non_renewal_requested_at_utc);
  const cancellationReasonCode = nullableText(row.cancellation_reason_code, 64);
  const cancellationReasonText = nullableText(row.cancellation_reason_text, 1000);
  const cancellationVersion = integer(row.cancellation_version, 1);
  const latestEventType = nullableText(row.latest_event_type, 64);
  const latestEventAtUtc = nullableDate(row.latest_event_at_utc);
  if (
    !subscriptionId ||
    !ownerAccountId ||
    !planId ||
    !status ||
    currentPeriodEndUtc === undefined ||
    typeof row.cancel_at_period_end !== "boolean" ||
    nonRenewalRequestedAtUtc === undefined ||
    cancellationReasonCode === undefined ||
    cancellationReasonText === undefined ||
    cancellationVersion === null ||
    latestEventType === undefined ||
    latestEventAtUtc === undefined
  ) {
    return null;
  }
  return {
    subscriptionId,
    ownerAccountId,
    planId,
    status,
    currentPeriodEndUtc,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    nonRenewalRequestedAtUtc,
    cancellationReasonCode,
    cancellationReasonText,
    cancellationVersion,
    latestEventType,
    latestEventAtUtc,
  };
}

async function token(): Promise<string | null> {
  return await getServerAdminAccessToken();
}

async function api(path: string, init: RequestInit = {}): Promise<Response | null> {
  const accessToken = await token();
  if (!accessToken) return null;
  const config = getPublicRuntimeConfig();
  try {
    return await fetch(`${config.adminApiUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return null;
  }
}

async function list<T>(
  path: string,
  parser: (value: unknown) => T | null,
): Promise<{ state: "ready"; items: T[] } | { state: "forbidden" | "unavailable" }> {
  const response = await api(path);
  if (!response) return { state: "unavailable" };
  if (response.status === 401 || response.status === 403) return { state: "forbidden" };
  if (!response.ok) return { state: "unavailable" };
  const body = record(await response.json().catch(() => null));
  if (!body || !Array.isArray(body.items)) return { state: "unavailable" };
  const items = body.items.map(parser);
  if (items.some((item) => item === null)) return { state: "unavailable" };
  return { state: "ready", items: items as T[] };
}

export async function getCommercePaymentOperationsSnapshot(): Promise<CommercePaymentOperationsSnapshot> {
  const [refunds, reconciliation, churn] = await Promise.all([
    list("/api/v1/commerce/refunds?limit=100", parseRefund),
    list("/api/v1/commerce/reconciliation/cases?limit=100", parseReconciliation),
    list("/api/v1/commerce/churn?limit=100", parseChurn),
  ]);
  return {
    refunds: refunds.state === "ready" ? refunds.items : null,
    reconciliationCases: reconciliation.state === "ready" ? reconciliation.items : null,
    churn: churn.state === "ready" ? churn.items : null,
    access: {
      refunds: refunds.state,
      reconciliation: reconciliation.state,
      churn: churn.state,
    },
    asOfUtc: new Date().toISOString(),
  };
}

async function mutation(path: string, body: Record<string, unknown>, idempotencyKey: string) {
  const response = await api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body),
  });
  if (!response) return { kind: "unauthenticated" } as CommercePaymentMutationResult;
  const payload = record(await response.json().catch(() => null));
  const message = payload
    ? typeof payload.detail === "string"
      ? payload.detail
      : typeof payload.message === "string"
        ? payload.message
        : undefined
    : undefined;
  const code = payload && typeof payload.code === "string" ? payload.code : undefined;
  const correlationId =
    payload && typeof payload.correlationId === "string" ? payload.correlationId : undefined;
  if (response.ok) {
    return {
      kind: "ok",
      replayed: payload && typeof payload.replayed === "boolean" ? payload.replayed : undefined,
      message,
    } as CommercePaymentMutationResult;
  }
  if (response.status === 401) return { kind: "unauthenticated" } as CommercePaymentMutationResult;
  if (response.status === 403) return { kind: "forbidden" } as CommercePaymentMutationResult;
  if (response.status === 400 || response.status === 422) {
    return { kind: "invalid", code, message } as CommercePaymentMutationResult;
  }
  if (response.status === 409) {
    return { kind: "conflict", code, message } as CommercePaymentMutationResult;
  }
  return { kind: "unavailable", correlationId, message } as CommercePaymentMutationResult;
}

export function requestCommerceRefund(input: {
  transactionId: string;
  amountMinor: string;
  reason: string;
  idempotencyKey: string;
}) {
  return mutation(
    "/api/v1/commerce/refunds/requests",
    { transactionId: input.transactionId, amountMinor: input.amountMinor, reason: input.reason },
    input.idempotencyKey,
  );
}

export function openCommerceReconciliationCase(input: {
  transactionId: string | null;
  caseType: string;
  reason: string;
  idempotencyKey: string;
}) {
  return mutation(
    "/api/v1/commerce/reconciliation/cases",
    { transactionId: input.transactionId, caseType: input.caseType, reason: input.reason },
    input.idempotencyKey,
  );
}

export function setCommerceRenewalIntent(input: {
  subscriptionId: string;
  expectedVersion: number;
  cancelAtPeriodEnd: boolean;
  reasonCode: string;
  reasonText: string | null;
  idempotencyKey: string;
}) {
  return mutation(
    "/api/v1/commerce/subscriptions/renewal-intent",
    {
      subscriptionId: input.subscriptionId,
      expectedVersion: input.expectedVersion,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      reasonCode: input.reasonCode,
      reasonText: input.reasonText,
    },
    input.idempotencyKey,
  );
}
