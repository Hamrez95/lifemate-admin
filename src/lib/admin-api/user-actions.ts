import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type UserAccountAction = "suspend" | "restore";

type UserAccountActionSuccess = {
  accountId: string;
  action: UserAccountAction;
  previousStatus: string;
  status: string;
  replayed: boolean;
};

export type UserAccountActionResult =
  | { kind: "ok"; data: UserAccountActionSuccess }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message?: string }
  | { kind: "not_found"; message?: string }
  | { kind: "conflict"; code?: string; message?: string }
  | { kind: "invalid"; message?: string }
  | { kind: "unavailable"; correlationId?: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;

export function parseUserAccountActionSuccess(
  value: unknown,
  httpStatus: number,
  expected: { accountId: string; action: UserAccountAction },
): UserAccountActionSuccess | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const exactAccount =
    typeof body.accountId === "string" &&
    UUID_PATTERN.test(body.accountId) &&
    body.accountId.toLowerCase() === expected.accountId.toLowerCase();
  const expectedPreviousStatus = expected.action === "suspend" ? "Active" : "Disabled";
  const expectedStatus = expected.action === "suspend" ? "Disabled" : "Active";
  if (
    httpStatus !== 200 ||
    body.httpStatus !== 200 ||
    body.code !== "ok" ||
    !exactAccount ||
    body.action !== expected.action ||
    body.previousStatus !== expectedPreviousStatus ||
    body.status !== expectedStatus ||
    typeof body.replayed !== "boolean"
  ) {
    return null;
  }
  return {
    accountId: body.accountId as string,
    action: expected.action,
    previousStatus: expectedPreviousStatus,
    status: expectedStatus,
    replayed: body.replayed,
  };
}

async function adminAccessToken(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function readProblem(response: Response): Promise<{
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

export async function performUserAccountAction(input: {
  accountId: string;
  action: UserAccountAction;
  reason: string;
  idempotencyKey: string;
}): Promise<UserAccountActionResult> {
  if (!UUID_PATTERN.test(input.accountId)) return { kind: "not_found" };
  if (input.action !== "suspend" && input.action !== "restore") {
    return { kind: "invalid", message: "عملیات حساب معتبر نیست." };
  }

  const reason = input.reason.trim();
  if (reason.length < 10 || reason.length > 1000) {
    return {
      kind: "invalid",
      message: "دلیل عملیات باید بین ۱۰ تا ۱۰۰۰ کاراکتر باشد.",
    };
  }
  if (!IDEMPOTENCY_PATTERN.test(input.idempotencyKey)) {
    return { kind: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }

  const token = await adminAccessToken();
  if (!token) return { kind: "unauthenticated" };

  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(
      `${config.adminApiUrl}/api/v1/users/${input.accountId}/actions/${input.action}`,
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
    const parsed = parseUserAccountActionSuccess(
      await response.json().catch(() => null),
      response.status,
      input,
    );
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }

  const problem = await readProblem(response);
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden", message: problem.message };
  if (response.status === 404) return { kind: "not_found", message: problem.message };
  if (response.status === 409) {
    return { kind: "conflict", code: problem.code, message: problem.message };
  }
  if (response.status === 400) return { kind: "invalid", message: problem.message };
  return { kind: "unavailable", correlationId: problem.correlationId };
}
