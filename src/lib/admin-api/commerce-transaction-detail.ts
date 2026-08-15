import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type CommerceTransactionStatus =
  | "Pending"
  | "Succeeded"
  | "Failed"
  | "Cancelled"
  | "Refunded"
  | "Chargeback";

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
  auditEvidence:
    | { state: "forbidden" }
    | { state: "ready"; items: CommerceAuditEvent[] };
  refundCapability: {
    available: boolean;
    permissionRequired: "commerce.refund";
    reason:
      | "Available"
      | "MissingPermission"
      | "TransactionNotEligible"
      | "WorkflowAlreadyActive";
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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const TRANSACTION_STATUSES = new Set([
  "Pending",
  "Succeeded",
  "Failed",
  "Cancelled",
  "Refunded",
  "Chargeback",
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
      correlationId:
        typeof body.correlationId === "string" ? body.correlationId : undefined,
    };
  } catch {
    return {};
  }
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function parseDetail(value: unknown): CommerceTransactionDetail | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (!body.transaction || typeof body.transaction !== "object") return null;
  const transaction = body.transaction as Record<string, unknown>;
  if (!isString(transaction.transactionId) || !UUID_PATTERN.test(transaction.transactionId)) {
    return null;
  }
  if (!isString(transaction.amountMinor) || !isString(transaction.currency)) return null;
  if (
    !isString(transaction.normalizedStatus) ||
    !TRANSACTION_STATUSES.has(transaction.normalizedStatus)
  ) {
    return null;
  }
  if (typeof transaction.accountLinked !== "boolean") return null;
  if (!Array.isArray(body.providerEvents) || !Array.isArray(body.refundRequests)) return null;
  if (!body.auditEvidence || typeof body.auditEvidence !== "object") return null;
  if (!body.refundCapability || typeof body.refundCapability !== "object") return null;
  if (!body.source || typeof body.source !== "object") return null;
  if (!body.freshness || typeof body.freshness !== "object") return null;
  const freshness = body.freshness as Record<string, unknown>;
  if (freshness.status !== "fresh" && freshness.status !== "stale") return null;
  if (!isString(freshness.asOfUtc)) return null;
  return body as unknown as CommerceTransactionDetail;
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
    response = await fetch(
      `${config.adminApiUrl}/api/v1/commerce/transactions/${transactionId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
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
      !isString(body.transactionId) ||
      !UUID_PATTERN.test(body.transactionId) ||
      !isString(body.refundRequestId) ||
      !UUID_PATTERN.test(body.refundRequestId) ||
      !isString(body.status) ||
      !isString(body.amountMinor) ||
      !isString(body.currency) ||
      !isString(body.transactionStatus) ||
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
  if (response.status === 403) return { kind: "forbidden", message: issue.message };
  if (response.status === 404) return { kind: "not_found", message: issue.message };
  if (response.status === 409) {
    return { kind: "conflict", code: issue.code, message: issue.message };
  }
  if (response.status === 400) {
    return { kind: "invalid", code: issue.code, message: issue.message };
  }
  return { kind: "unavailable", correlationId: issue.correlationId };
}
