import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type StaffAction = "activate" | "disable" | "reenable" | "assign" | "revoke";

export type StaffActionResult =
  | {
      kind: "ok";
      data: {
        accountId: string;
        action: StaffAction;
        roleCode: string | null;
        status: string | null;
        previousStatus: string | null;
        noop: boolean;
        replayed: boolean;
      };
    }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; code?: string; message?: string }
  | { kind: "not_found"; code?: string; message?: string }
  | { kind: "conflict"; code?: string; message?: string }
  | { kind: "invalid"; code?: string; message?: string }
  | { kind: "unavailable"; correlationId?: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLE_CODE_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;

async function accessToken(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData.session?.access_token ?? null;
}

async function problem(response: Response) {
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

export async function performStaffAction(input: {
  accountId: string;
  action: StaffAction;
  roleCode?: string;
  reason: string;
  idempotencyKey: string;
}): Promise<StaffActionResult> {
  if (!UUID_PATTERN.test(input.accountId)) return { kind: "not_found" };
  const reason = input.reason.trim();
  if (reason.length < 10 || reason.length > 1000)
    return { kind: "invalid", message: "دلیل عملیات باید بین ۱۰ تا ۱۰۰۰ کاراکتر باشد." };
  if (!IDEMPOTENCY_PATTERN.test(input.idempotencyKey))
    return { kind: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  const isRoleAction = input.action === "assign" || input.action === "revoke";
  const roleCode = input.roleCode?.trim().toLowerCase();
  if (isRoleAction && (!roleCode || !ROLE_CODE_PATTERN.test(roleCode)))
    return { kind: "invalid", message: "کد نقش معتبر نیست." };
  if (roleCode === "founder" || roleCode === "super_admin")
    return {
      kind: "forbidden",
      code: "privileged_role_immutable",
      message: "نقش‌های Founder و Super Admin از این مسیر تغییر نمی‌کنند.",
    };
  if (!isRoleAction && input.roleCode !== undefined)
    return { kind: "invalid", message: "عملیات وضعیت عضو نقش نمی‌پذیرد." };

  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  const endpoint = isRoleAction
    ? `/api/v1/staff/${input.accountId}/roles/${input.action}`
    : `/api/v1/staff/${input.accountId}/actions/${input.action}`;
  let response: Response;
  try {
    response = await fetch(`${getPublicRuntimeConfig().adminApiUrl}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify(isRoleAction ? { reason, roleCode } : { reason }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (response.ok) {
    const body = (await response.json()) as Record<string, unknown>;
    if (
      typeof body.accountId !== "string" ||
      typeof body.action !== "string" ||
      typeof body.noop !== "boolean" ||
      typeof body.replayed !== "boolean"
    )
      return { kind: "unavailable" };
    return {
      kind: "ok",
      data: {
        accountId: body.accountId,
        action: body.action as StaffAction,
        roleCode: typeof body.roleCode === "string" ? body.roleCode : null,
        status: typeof body.status === "string" ? body.status : null,
        previousStatus: typeof body.previousStatus === "string" ? body.previousStatus : null,
        noop: body.noop,
        replayed: body.replayed,
      },
    };
  }
  const detail = await problem(response);
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden", ...detail };
  if (response.status === 404) return { kind: "not_found", ...detail };
  if (response.status === 409) return { kind: "conflict", ...detail };
  if (response.status === 400) return { kind: "invalid", ...detail };
  return { kind: "unavailable", correlationId: detail.correlationId };
}
