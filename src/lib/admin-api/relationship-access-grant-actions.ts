import "server-only";

import { parseAccessGrantMutationSuccess } from "@/src/lib/admin-api/access-grant-mutation-contract";
import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type AccessGrantAction = "extend" | "replace-scopes" | "revoke";

export type AccessGrantActionInput = {
  grantId: string;
  action: AccessGrantAction;
  expectedVersion: number;
  expiresAtUtc?: string;
  scopes?: string[];
  reason: string;
  idempotencyKey: string;
};

export type AccessGrantActionResult =
  | {
      kind: "ok";
      version: number;
      status: string;
      expiresAtUtc: string | null;
      scopeCount: number;
      noop: boolean;
      replayed: boolean;
    }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message?: string }
  | { kind: "invalid"; message?: string; correlationId?: string }
  | { kind: "conflict"; message?: string; correlationId?: string }
  | { kind: "unavailable"; correlationId?: string };

function uuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function problem(response: Response): Promise<{ message?: string; correlationId?: string }> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    return {
      message:
        typeof body.detail === "string"
          ? body.detail
          : typeof body.title === "string"
            ? body.title
            : typeof body.message === "string"
              ? body.message
              : undefined,
      correlationId: typeof body.correlationId === "string" ? body.correlationId : undefined,
    };
  } catch {
    return {};
  }
}

export async function mutateAccessGrant(
  input: AccessGrantActionInput,
): Promise<AccessGrantActionResult> {
  const token = await getServerAdminAccessToken();
  if (!token) return { kind: "unauthenticated" };
  if (
    !uuid(input.grantId) ||
    !Number.isInteger(input.expectedVersion) ||
    input.expectedVersion < 1
  ) {
    return { kind: "invalid", message: "شناسه یا نسخه Access Grant معتبر نیست." };
  }

  const payload: Record<string, unknown> = {
    expectedVersion: input.expectedVersion,
    reason: input.reason,
    confirmation: "confirm-access-grant-change",
  };
  if (input.action === "extend") payload.expiresAtUtc = input.expiresAtUtc;
  if (input.action === "replace-scopes") payload.scopes = input.scopes;

  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(
      `${config.adminApiUrl}/api/v1/relationships/access-grants/${input.grantId}/actions/${input.action}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    const raw = await response.json().catch(() => null);
    const parsed = parseAccessGrantMutationSuccess(raw, response.status, {
      grantId: input.grantId,
      action: input.action,
      expectedVersion: input.expectedVersion,
      expiresAtUtc: input.expiresAtUtc,
      scopes: input.scopes,
    });
    if (!parsed) return { kind: "unavailable" };
    return { kind: "ok", ...parsed };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  const details = await problem(response);
  if (response.status === 403) return { kind: "forbidden", message: details.message };
  if (response.status === 409) return { kind: "conflict", ...details };
  if (response.status === 400 || response.status === 404 || response.status === 422) {
    return { kind: "invalid", ...details };
  }
  return { kind: "unavailable", correlationId: details.correlationId };
}
