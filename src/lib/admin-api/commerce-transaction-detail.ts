import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type CommerceTransactionStatus =
  "Pending" | "Succeeded" | "Failed" | "Cancelled" | "Refunded" | "Chargeback";

export type CommerceProviderEvent = {
  eventId: string;
  providerStatus: string;
  normalizedStatus: CommerceTransactionStatus;
  observationState: "InOrder" | "Duplicate" | "OutOfOrder";
  occurredAtUtc: string;
  receivedAtUtc: string;
  recordedAtUtc: string;
};

export type CommerceRefundRequest = {
  refundRequestId: string;
  status: string;
  amountMinor: string;
  currency: string;
  reason: string;
  requestedAtUtc: string;
  reviewedAtUtc: string | null;
  resolutionReason: string | null;
  updatedAtUtc: string;
};

export type CommerceAuditEvent = {
  auditEventId: string;
  action: string;
  result: string;
  reason: string | null;
  correlationId: string;
  actorLinked: boolean;
  occurredAtUtc: string;
};

export type CommerceTransactionDetail = {
  transaction: {
    transactionId: string;
    orderId: string | null;
    subscriptionId: string | null;
    accountLinked: boolean;
    product: { code: string; name: string };
    provider: string;
    providerStatus: string;
    normalizedStatus: CommerceTransactionStatus;
    amountMinor: string;
    currency: string;
    occurredAtUtc: string;
    receivedAtUtc: string;
    createdAtUtc: string;
    updatedAtUtc: string;
    order: null | {
      orderId: string;
      status: string;
      amountMinor: string;
      currency: string;
      occurredAtUtc: string;
      createdAtUtc: string;
      updatedAtUtc: string;
    };
    subscription: null | {
      subscriptionId: string;
      status: string;
      startsAtUtc: string;
      currentPeriodEndUtc: string | null;
      cancelledAtUtc: string | null;
      plan: null | { planId: string; code: string; name: string };
    };
  };
  providerEvents: CommerceProviderEvent[];
  refundRequests: CommerceRefundRequest[];
  auditEvidence: { state: "forbidden" } | { state: "ready"; items: CommerceAuditEvent[] };
  refundCapability: {
    available: boolean;
    permissionRequired: "commerce.refund";
    reason: "Available" | "MissingPermission" | "TransactionNotEligible" | "WorkflowAlreadyActive";
  };
  source: { kind: "canonical"; label: string };
  freshness: { status: "fresh" | "stale"; asOfUtc: string };
};

export type CommerceTransactionReadResult =
  | { kind: "ok"; data: CommerceTransactionDetail }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "invalid" }
  | { kind: "unavailable"; correlationId?: string };

type CommerceRefundActionSuccessData = {
  transactionId: string;
  refundRequestId: string;
  status: string;
  amountMinor: string;
  currency: string;
  transactionStatus: string;
  replayed: boolean;
  workflow: "HumanReview";
  providerActionExecuted: false;
};

export type CommerceRefundActionResult =
  | { kind: "ok"; data: CommerceRefundActionSuccessData }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message?: string }
  | { kind: "not_found"; message?: string }
  | { kind: "conflict"; code?: string; message?: string }
  | { kind: "invalid"; code?: string; message?: string }
  | { kind: "unavailable"; correlationId?: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const AMOUNT_MINOR_PATTERN = /^\d+$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const TRANSACTION_STATUSES = new Set<CommerceTransactionStatus>([
  "Pending",
  "Succeeded",
  "Failed",
  "Cancelled",
  "Refunded",
  "Chargeback",
]);
const OBSERVATION_STATES = new Set<CommerceProviderEvent["observationState"]>([
  "InOrder",
  "Duplicate",
  "OutOfOrder",
]);
const REFUND_CAPABILITY_REASONS = new Set<CommerceTransactionDetail["refundCapability"]["reason"]>([
  "Available",
  "MissingPermission",
  "TransactionNotEligible",
  "WorkflowAlreadyActive",
]);

async function accessToken(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function problem(response: Response): Promise<{
  code?: string;
  message?: string;
  correlationId?: string;
}> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    return {
      code: typeof body.code === "string" ? body.code : undefined,
      message:
        typeof body.detail === "string"
          ? body.detail
          : typeof body.message === "string"
            ? body.message
            : undefined,
      correlationId: typeof body.correlationId === "string" ? body.correlationId : undefined,
    };
  } catch {
    return {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isSafeText(value: unknown, maxLength = 1000): value is string {
  return isString(value) && value.length > 0 && value.length <= maxLength;
}

function isNullableText(value: unknown, maxLength = 1000): value is string | null {
  return value === null || (isString(value) && value.length <= maxLength);
}

function isUuid(value: unknown): value is string {
  return isString(value) && UUID_PATTERN.test(value);
}

function isNullableUuid(value: unknown): value is string | null {
  return value === null || isUuid(value);
}

function isDateTime(value: unknown): value is string {
  return isString(value) && value.length <= 64 && !Number.isNaN(Date.parse(value));
}

function isNullableDateTime(value: unknown): value is string | null {
  return value === null || isDateTime(value);
}

function isAmountMinor(value: unknown): value is string {
  return isString(value) && AMOUNT_MINOR_PATTERN.test(value);
}

function isCurrency(value: unknown): value is string {
  return isString(value) && CURRENCY_PATTERN.test(value);
}

function isTransactionStatus(value: unknown): value is CommerceTransactionStatus {
  return isString(value) && TRANSACTION_STATUSES.has(value as CommerceTransactionStatus);
}

function parseProduct(value: unknown): CommerceTransactionDetail["transaction"]["product"] | null {
  if (!isRecord(value) || !isSafeText(value.code, 64) || !isSafeText(value.name, 200)) {
    return null;
  }
  return { code: value.code, name: value.name };
}

function parseOrder(value: unknown): CommerceTransactionDetail["transaction"]["order"] | undefined {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    !isUuid(value.orderId) ||
    !isSafeText(value.status, 64) ||
    !isAmountMinor(value.amountMinor) ||
    !isCurrency(value.currency) ||
    !isDateTime(value.occurredAtUtc) ||
    !isDateTime(value.createdAtUtc) ||
    !isDateTime(value.updatedAtUtc)
  ) {
    return undefined;
  }
  return {
    orderId: value.orderId,
    status: value.status,
    amountMinor: value.amountMinor,
    currency: value.currency,
    occurredAtUtc: value.occurredAtUtc,
    createdAtUtc: value.createdAtUtc,
    updatedAtUtc: value.updatedAtUtc,
  };
}

function parsePlan(
  value: unknown,
):
  | NonNullable<NonNullable<CommerceTransactionDetail["transaction"]["subscription"]>["plan"]>
  | null
  | undefined {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    !isUuid(value.planId) ||
    !isSafeText(value.code, 64) ||
    !isSafeText(value.name, 200)
  ) {
    return undefined;
  }
  return { planId: value.planId, code: value.code, name: value.name };
}

function parseSubscription(
  value: unknown,
): CommerceTransactionDetail["transaction"]["subscription"] | undefined {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    !isUuid(value.subscriptionId) ||
    !isSafeText(value.status, 64) ||
    !isDateTime(value.startsAtUtc) ||
    !isNullableDateTime(value.currentPeriodEndUtc) ||
    !isNullableDateTime(value.cancelledAtUtc)
  ) {
    return undefined;
  }
  const plan = parsePlan(value.plan);
  if (plan === undefined) return undefined;
  return {
    subscriptionId: value.subscriptionId,
    status: value.status,
    startsAtUtc: value.startsAtUtc,
    currentPeriodEndUtc: value.currentPeriodEndUtc,
    cancelledAtUtc: value.cancelledAtUtc,
    plan,
  };
}

function parseTransaction(value: unknown): CommerceTransactionDetail["transaction"] | null {
  if (!isRecord(value)) return null;
  const product = parseProduct(value.product);
  const order = parseOrder(value.order);
  const subscription = parseSubscription(value.subscription);
  if (
    !product ||
    order === undefined ||
    subscription === undefined ||
    !isUuid(value.transactionId) ||
    !isNullableUuid(value.orderId) ||
    !isNullableUuid(value.subscriptionId) ||
    typeof value.accountLinked !== "boolean" ||
    !isSafeText(value.provider, 128) ||
    !isSafeText(value.providerStatus, 256) ||
    !isTransactionStatus(value.normalizedStatus) ||
    !isAmountMinor(value.amountMinor) ||
    !isCurrency(value.currency) ||
    !isDateTime(value.occurredAtUtc) ||
    !isDateTime(value.receivedAtUtc) ||
    !isDateTime(value.createdAtUtc) ||
    !isDateTime(value.updatedAtUtc)
  ) {
    return null;
  }
  return {
    transactionId: value.transactionId,
    orderId: value.orderId,
    subscriptionId: value.subscriptionId,
    accountLinked: value.accountLinked,
    product,
    provider: value.provider,
    providerStatus: value.providerStatus,
    normalizedStatus: value.normalizedStatus,
    amountMinor: value.amountMinor,
    currency: value.currency,
    occurredAtUtc: value.occurredAtUtc,
    receivedAtUtc: value.receivedAtUtc,
    createdAtUtc: value.createdAtUtc,
    updatedAtUtc: value.updatedAtUtc,
    order,
    subscription,
  };
}

function parseProviderEvent(value: unknown): CommerceProviderEvent | null {
  if (
    !isRecord(value) ||
    !isUuid(value.eventId) ||
    !isSafeText(value.providerStatus, 256) ||
    !isTransactionStatus(value.normalizedStatus) ||
    !isString(value.observationState) ||
    !OBSERVATION_STATES.has(value.observationState as CommerceProviderEvent["observationState"]) ||
    !isDateTime(value.occurredAtUtc) ||
    !isDateTime(value.receivedAtUtc) ||
    !isDateTime(value.recordedAtUtc)
  ) {
    return null;
  }
  return {
    eventId: value.eventId,
    providerStatus: value.providerStatus,
    normalizedStatus: value.normalizedStatus,
    observationState: value.observationState as CommerceProviderEvent["observationState"],
    occurredAtUtc: value.occurredAtUtc,
    receivedAtUtc: value.receivedAtUtc,
    recordedAtUtc: value.recordedAtUtc,
  };
}

function parseRefundRequest(value: unknown): CommerceRefundRequest | null {
  if (
    !isRecord(value) ||
    !isUuid(value.refundRequestId) ||
    !isSafeText(value.status, 64) ||
    !isAmountMinor(value.amountMinor) ||
    !isCurrency(value.currency) ||
    !isSafeText(value.reason, 1000) ||
    !isDateTime(value.requestedAtUtc) ||
    !isNullableDateTime(value.reviewedAtUtc) ||
    !isNullableText(value.resolutionReason, 1000) ||
    !isDateTime(value.updatedAtUtc)
  ) {
    return null;
  }
  return {
    refundRequestId: value.refundRequestId,
    status: value.status,
    amountMinor: value.amountMinor,
    currency: value.currency,
    reason: value.reason,
    requestedAtUtc: value.requestedAtUtc,
    reviewedAtUtc: value.reviewedAtUtc,
    resolutionReason: value.resolutionReason,
    updatedAtUtc: value.updatedAtUtc,
  };
}

function parseAuditEvent(value: unknown): CommerceAuditEvent | null {
  if (
    !isRecord(value) ||
    !isUuid(value.auditEventId) ||
    !isSafeText(value.action, 200) ||
    !isSafeText(value.result, 64) ||
    !isNullableText(value.reason, 1000) ||
    !isUuid(value.correlationId) ||
    typeof value.actorLinked !== "boolean" ||
    !isDateTime(value.occurredAtUtc)
  ) {
    return null;
  }
  return {
    auditEventId: value.auditEventId,
    action: value.action,
    result: value.result,
    reason: value.reason,
    correlationId: value.correlationId,
    actorLinked: value.actorLinked,
    occurredAtUtc: value.occurredAtUtc,
  };
}

function parseDetail(value: unknown): CommerceTransactionDetail | null {
  if (!isRecord(value)) return null;
  const transaction = parseTransaction(value.transaction);
  if (
    !transaction ||
    !Array.isArray(value.providerEvents) ||
    !Array.isArray(value.refundRequests)
  ) {
    return null;
  }
  const providerEvents = value.providerEvents.map(parseProviderEvent);
  const refundRequests = value.refundRequests.map(parseRefundRequest);
  if (
    providerEvents.some((item) => item === null) ||
    refundRequests.some((item) => item === null)
  ) {
    return null;
  }

  if (!isRecord(value.auditEvidence)) return null;
  let auditEvidence: CommerceTransactionDetail["auditEvidence"];
  if (value.auditEvidence.state === "forbidden") {
    auditEvidence = { state: "forbidden" };
  } else if (value.auditEvidence.state === "ready" && Array.isArray(value.auditEvidence.items)) {
    const items = value.auditEvidence.items.map(parseAuditEvent);
    if (items.some((item) => item === null)) return null;
    auditEvidence = { state: "ready", items: items as CommerceAuditEvent[] };
  } else {
    return null;
  }

  if (
    !isRecord(value.refundCapability) ||
    typeof value.refundCapability.available !== "boolean" ||
    value.refundCapability.permissionRequired !== "commerce.refund" ||
    !isString(value.refundCapability.reason) ||
    !REFUND_CAPABILITY_REASONS.has(
      value.refundCapability.reason as CommerceTransactionDetail["refundCapability"]["reason"],
    )
  ) {
    return null;
  }

  if (
    !isRecord(value.source) ||
    value.source.kind !== "canonical" ||
    !isSafeText(value.source.label, 200)
  ) {
    return null;
  }
  if (
    !isRecord(value.freshness) ||
    (value.freshness.status !== "fresh" && value.freshness.status !== "stale") ||
    !isDateTime(value.freshness.asOfUtc)
  ) {
    return null;
  }

  return {
    transaction,
    providerEvents: providerEvents as CommerceProviderEvent[],
    refundRequests: refundRequests as CommerceRefundRequest[],
    auditEvidence,
    refundCapability: {
      available: value.refundCapability.available,
      permissionRequired: "commerce.refund",
      reason: value.refundCapability
        .reason as CommerceTransactionDetail["refundCapability"]["reason"],
    },
    source: { kind: "canonical", label: value.source.label },
    freshness: {
      status: value.freshness.status,
      asOfUtc: value.freshness.asOfUtc,
    },
  };
}

export async function getCommerceTransactionDetail(
  transactionId: string,
): Promise<CommerceTransactionReadResult> {
  if (!UUID_PATTERN.test(transactionId)) return { kind: "not_found" };
  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}/api/v1/commerce/transactions/${transactionId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (response.ok) {
    const parsed = parseDetail(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  const issue = await problem(response);
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 404) return { kind: "not_found" };
  if (response.status === 400) return { kind: "invalid" };
  return { kind: "unavailable", correlationId: issue.correlationId };
}

export async function requestCommerceRefundWorkflow(input: {
  transactionId: string;
  reason: string;
  idempotencyKey: string;
}): Promise<CommerceRefundActionResult> {
  if (!UUID_PATTERN.test(input.transactionId)) return { kind: "not_found" };
  if (!IDEMPOTENCY_PATTERN.test(input.idempotencyKey)) {
    return { kind: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }
  const reason = input.reason.trim();
  if (reason.length < 10 || reason.length > 1000) {
    return {
      kind: "invalid",
      message: "دلیل درخواست بازپرداخت باید بین ۱۰ تا ۱۰۰۰ نویسه باشد.",
    };
  }
  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(
      `${config.adminApiUrl}/api/v1/commerce/transactions/${input.transactionId}/actions/refund-request`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({ reason }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    const body = (await response.json()) as Record<string, unknown>;
    if (
      !isUuid(body.transactionId) ||
      !isUuid(body.refundRequestId) ||
      !isSafeText(body.status, 64) ||
      !isAmountMinor(body.amountMinor) ||
      !isCurrency(body.currency) ||
      !isTransactionStatus(body.transactionStatus) ||
      typeof body.replayed !== "boolean" ||
      body.workflow !== "HumanReview" ||
      body.providerActionExecuted !== false
    ) {
      return { kind: "unavailable" };
    }
    return {
      kind: "ok",
      data: {
        transactionId: body.transactionId,
        refundRequestId: body.refundRequestId,
        status: body.status,
        amountMinor: body.amountMinor,
        currency: body.currency,
        transactionStatus: body.transactionStatus,
        replayed: body.replayed,
        workflow: "HumanReview",
        providerActionExecuted: false,
      },
    };
  }

  const issue = await problem(response);
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) {
    return { kind: "forbidden", message: issue.message };
  }
  if (response.status === 404) {
    return { kind: "not_found", message: issue.message };
  }
  if (response.status === 409) {
    return { kind: "conflict", code: issue.code, message: issue.message };
  }
  if (response.status === 400) {
    return { kind: "invalid", code: issue.code, message: issue.message };
  }
  return { kind: "unavailable", correlationId: issue.correlationId };
}
