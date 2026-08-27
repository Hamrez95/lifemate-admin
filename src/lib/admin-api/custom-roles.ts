import "server-only";

import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type CustomRoleSummary = {
  code: string;
  displayName: string;
  rank: number;
  status: string;
  version: number;
  permissions: string[];
  activeMemberCount: number;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type CustomRolePermissionCatalogItem = {
  code: string;
  domain: string;
  riskLevel: string;
  description: string;
  delegable: boolean;
};

export type CustomRolesResponse = {
  roles: CustomRoleSummary[];
  permissionCatalog: CustomRolePermissionCatalogItem[];
  freshness: { status: "fresh" | "stale"; asOfUtc: string };
};

export type CustomRolesResult =
  | { kind: "ok"; data: CustomRolesResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid"; message?: string }
  | { kind: "conflict"; message?: string }
  | { kind: "unavailable"; correlationId?: string; message?: string };

type RoleMutationInput = {
  code: string;
  displayName?: string;
  rank?: number;
  expectedVersion?: number;
  reason: string;
  idempotencyKey: string;
};

type PermissionMutationInput = {
  roleCode: string;
  permissionCode: string;
  expectedVersion: number;
  reason: string;
  idempotencyKey: string;
};

const ROLE_CODE = /^[a-z][a-z0-9_]{1,63}$/;
const PERMISSION_CODE = /^[a-z][a-z0-9_.]{1,119}$/;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function positiveInteger(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 1 ? Number(value) : null;
}

function parseRole(value: unknown): CustomRoleSummary | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const code = text(row.code);
  const displayName = text(row.displayName);
  const rank = positiveInteger(row.rank);
  const version = positiveInteger(row.version);
  const activeMemberCount = Number.isInteger(row.activeMemberCount)
    ? Number(row.activeMemberCount)
    : null;
  const status = text(row.status);
  const createdAtUtc = text(row.createdAtUtc);
  const updatedAtUtc = text(row.updatedAtUtc);
  if (
    !code ||
    !ROLE_CODE.test(code) ||
    !displayName ||
    rank === null ||
    version === null ||
    activeMemberCount === null ||
    activeMemberCount < 0 ||
    !status ||
    !createdAtUtc ||
    !updatedAtUtc ||
    !Array.isArray(row.permissions) ||
    !row.permissions.every((item) => typeof item === "string" && PERMISSION_CODE.test(item))
  ) {
    return null;
  }
  return {
    code,
    displayName,
    rank,
    status,
    version,
    activeMemberCount,
    permissions: row.permissions as string[],
    createdAtUtc,
    updatedAtUtc,
  };
}

function parsePermission(value: unknown): CustomRolePermissionCatalogItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const code = text(row.code);
  const domain = text(row.domain);
  const riskLevel = text(row.riskLevel);
  const description = text(row.description);
  if (
    !code ||
    !PERMISSION_CODE.test(code) ||
    !domain ||
    !riskLevel ||
    !description ||
    typeof row.delegable !== "boolean"
  ) {
    return null;
  }
  return { code, domain, riskLevel, description, delegable: row.delegable };
}

function parseList(value: unknown): CustomRolesResponse | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (!Array.isArray(row.roles) || !Array.isArray(row.permissionCatalog)) return null;
  if (!row.freshness || typeof row.freshness !== "object" || Array.isArray(row.freshness)) return null;
  const freshness = row.freshness as Record<string, unknown>;
  const status = freshness.status;
  const asOfUtc = text(freshness.asOfUtc);
  if ((status !== "fresh" && status !== "stale") || !asOfUtc) return null;
  const roles = row.roles.map(parseRole);
  const permissionCatalog = row.permissionCatalog.map(parsePermission);
  if (roles.some((item) => item === null) || permissionCatalog.some((item) => item === null)) return null;
  return {
    roles: roles as CustomRoleSummary[],
    permissionCatalog: permissionCatalog as CustomRolePermissionCatalogItem[],
    freshness: { status, asOfUtc },
  };
}

async function request(path: string, init?: RequestInit): Promise<CustomRolesResult> {
  const token = await getServerAdminAccessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  try {
    const response = await fetch(`${config.adminApiUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401) return { kind: "unauthenticated" };
    if (response.status === 403) return { kind: "forbidden" };
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    const message = payload && typeof payload.message === "string" ? payload.message : undefined;
    if (response.status === 400) return { kind: "invalid", message };
    if (response.status === 409) return { kind: "conflict", message };
    if (!response.ok) {
      return {
        kind: "unavailable",
        correlationId: response.headers.get("x-correlation-id") ?? undefined,
        message,
      };
    }
    if (init?.method && init.method !== "GET") {
      return {
        kind: "ok",
        data: { roles: [], permissionCatalog: [], freshness: { status: "fresh", asOfUtc: new Date().toISOString() } },
      };
    }
    const parsed = parseList(payload);
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}

export function getCustomRoles(): Promise<CustomRolesResult> {
  return request("/api/v1/security/custom-roles", { method: "GET" });
}

export function createCustomRole(input: RoleMutationInput): Promise<CustomRolesResult> {
  return request("/api/v1/security/custom-roles", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify({
      code: input.code,
      displayName: input.displayName,
      rank: input.rank,
      reason: input.reason,
    }),
  });
}

export function updateCustomRole(input: RoleMutationInput): Promise<CustomRolesResult> {
  return request(`/api/v1/security/custom-roles/${encodeURIComponent(input.code)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify({
      displayName: input.displayName,
      rank: input.rank,
      expectedVersion: input.expectedVersion,
      reason: input.reason,
    }),
  });
}

export function retireCustomRole(input: RoleMutationInput): Promise<CustomRolesResult> {
  return request(`/api/v1/security/custom-roles/${encodeURIComponent(input.code)}/actions/retire`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify({ expectedVersion: input.expectedVersion, reason: input.reason }),
  });
}

export function mutateCustomRolePermission(
  action: "assign" | "revoke",
  input: PermissionMutationInput,
): Promise<CustomRolesResult> {
  return request(
    `/api/v1/security/custom-roles/${encodeURIComponent(input.roleCode)}/permissions/${action}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey },
      body: JSON.stringify({
        permissionCode: input.permissionCode,
        expectedVersion: input.expectedVersion,
        reason: input.reason,
      }),
    },
  );
}
