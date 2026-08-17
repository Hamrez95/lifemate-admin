import { getPublicRuntimeConfig } from "../runtime-config";
import { createServerSupabaseClient } from "../supabase/server";
import {
  isSecurityRoleCode,
  parseSecurityRoleDetailResponse,
  type SecurityRoleDetailResponse,
} from "./security-role-detail-contract";

export type {
  SecurityRoleDetailPermission,
  SecurityRoleDetailResponse,
  SecurityRoleDetailRole,
  SecurityRoleEffectivePermission,
  SecurityRoleMembership,
} from "./security-role-detail-contract";

export type SecurityRoleDetailResult =
  | { kind: "ok"; data: SecurityRoleDetailResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "invalid_role_code" }
  | { kind: "unavailable"; correlationId?: string };

async function correlationId(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { correlationId?: unknown };
    return typeof body.correlationId === "string" ? body.correlationId : undefined;
  } catch {
    return undefined;
  }
}

export async function getSecurityRoleDetail(roleCode: string): Promise<SecurityRoleDetailResult> {
  if (!isSecurityRoleCode(roleCode)) return { kind: "invalid_role_code" };

  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return { kind: "unauthenticated" };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { kind: "unauthenticated" };

  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(
      `${config.adminApiUrl}/api/v1/security/roles/${encodeURIComponent(roleCode)}`,
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
    const parsed = parseSecurityRoleDetailResponse(await response.json());
    return parsed && parsed.role.code === roleCode
      ? { kind: "ok", data: parsed }
      : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 404) return { kind: "not_found" };
  return { kind: "unavailable", correlationId: await correlationId(response) };
}
