import "server-only";

import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type StaffRole = { code: string; displayName: string };
export type StaffActivity = { action: string; result: string; occurredAtUtc: string };
export type StaffDirectoryItem = {
  accountId: string;
  username: string | null;
  displayName: string | null;
  membershipStatus: string;
  roles: StaffRole[];
  effectivePermissionCount: number;
  createdAtUtc: string;
  lastAccessChangeAtUtc: string | null;
  lastAdminActivity: StaffActivity | null;
  mfaPosture: "unknown";
};
export type StaffDetail = StaffDirectoryItem & {
  roleHistory: Array<{
    roleCode: string;
    roleDisplayName: string;
    startsAtUtc: string;
    expiresAtUtc: string | null;
    revokedAtUtc: string | null;
  }>;
  effectivePermissions: Array<{ code: string; domain: string; riskLevel: string }>;
  activity: Array<{
    id: string;
    action: string;
    result: string;
    resourceType: string;
    occurredAtUtc: string;
  }>;
};

export type StaffDirectoryResult =
  | {
      kind: "ok";
      items: StaffDirectoryItem[];
      nextCursor: string | null;
      pageSize: number;
      mfaPostureSource: "unavailable";
      asOfUtc: string;
    }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid" }
  | { kind: "unavailable"; correlationId?: string };

export type StaffDetailResult =
  | { kind: "ok"; staff: StaffDetail; mfaPostureSource: "unavailable"; asOfUtc: string }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "unavailable"; correlationId?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CURSOR = /^[A-Za-z0-9_-]{1,600}$/;

async function accessToken(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData.session?.access_token ?? null;
}

async function issue(response: Response): Promise<{ correlationId?: string }> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    return { correlationId: typeof body.correlationId === "string" ? body.correlationId : undefined };
  } catch {
    return {};
  }
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
function iso(value: unknown): string | null {
  if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) return null;
  return value;
}
function roles(value: unknown): StaffRole[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.map((entry) => {
    if (!entry || typeof entry !== "object") return null;
    const item = entry as Record<string, unknown>;
    return typeof item.code === "string" && typeof item.displayName === "string"
      ? { code: item.code, displayName: item.displayName }
      : null;
  });
  return parsed.every((entry): entry is StaffRole => entry !== null) ? parsed : null;
}
function directoryItem(value: unknown): StaffDirectoryItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const parsedRoles = roles(item.roles);
  const createdAtUtc = iso(item.createdAtUtc);
  const lastAccessChangeAtUtc = item.lastAccessChangeAtUtc === null ? null : iso(item.lastAccessChangeAtUtc);
  let lastAdminActivity: StaffActivity | null = null;
  if (item.lastAdminActivity !== null) {
    if (!item.lastAdminActivity || typeof item.lastAdminActivity !== "object") return null;
    const activity = item.lastAdminActivity as Record<string, unknown>;
    const occurredAtUtc = iso(activity.occurredAtUtc);
    if (typeof activity.action !== "string" || typeof activity.result !== "string" || !occurredAtUtc) return null;
    lastAdminActivity = { action: activity.action, result: activity.result, occurredAtUtc };
  }
  if (
    typeof item.accountId !== "string" ||
    !UUID.test(item.accountId) ||
    (item.username !== null && typeof item.username !== "string") ||
    (item.displayName !== null && typeof item.displayName !== "string") ||
    typeof item.membershipStatus !== "string" ||
    !parsedRoles ||
    !Number.isInteger(item.effectivePermissionCount) ||
    !createdAtUtc ||
    (item.lastAccessChangeAtUtc !== null && !lastAccessChangeAtUtc) ||
    item.mfaPosture !== "unknown"
  ) return null;
  return {
    accountId: item.accountId,
    username: text(item.username),
    displayName: text(item.displayName),
    membershipStatus: item.membershipStatus,
    roles: parsedRoles,
    effectivePermissionCount: item.effectivePermissionCount as number,
    createdAtUtc,
    lastAccessChangeAtUtc,
    lastAdminActivity,
    mfaPosture: "unknown",
  };
}

export async function getStaffDirectory(params: URLSearchParams): Promise<StaffDirectoryResult> {
  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  const query = new URLSearchParams();
  for (const key of ["status", "role", "q", "pageSize"] as const) {
    const value = params.get(key)?.trim();
    if (value) query.set(key, value);
  }
  const cursor = params.get("cursor")?.trim();
  if (cursor) {
    if (!CURSOR.test(cursor)) return { kind: "invalid" };
    query.set("cursor", cursor);
  }
  let response: Response;
  try {
    response = await fetch(`${getPublicRuntimeConfig().adminApiUrl}/api/v1/staff?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (response.ok) {
    const body = (await response.json()) as Record<string, unknown>;
    if (!Array.isArray(body.items) || typeof body.pageSize !== "number" || body.mfaPostureSource !== "unavailable") {
      return { kind: "unavailable" };
    }
    const items = body.items.map(directoryItem);
    const freshness = body.freshness as Record<string, unknown> | undefined;
    const asOfUtc = iso(freshness?.asOfUtc);
    if (!items.every((entry): entry is StaffDirectoryItem => entry !== null) || !asOfUtc) return { kind: "unavailable" };
    if (body.nextCursor !== null && typeof body.nextCursor !== "string") return { kind: "unavailable" };
    return {
      kind: "ok",
      items,
      nextCursor: body.nextCursor as string | null,
      pageSize: body.pageSize,
      mfaPostureSource: "unavailable",
      asOfUtc,
    };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 400) return { kind: "invalid" };
  return { kind: "unavailable", ...(await issue(response)) };
}

export async function getStaffDetail(accountId: string): Promise<StaffDetailResult> {
  if (!UUID.test(accountId)) return { kind: "not_found" };
  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  let response: Response;
  try {
    response = await fetch(`${getPublicRuntimeConfig().adminApiUrl}/api/v1/staff/${accountId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (response.ok) {
    const body = (await response.json()) as Record<string, unknown>;
    const base = directoryItem(body.staff);
    if (!base || !body.staff || typeof body.staff !== "object" || body.mfaPostureSource !== "unavailable") return { kind: "unavailable" };
    const raw = body.staff as Record<string, unknown>;
    if (!Array.isArray(raw.roleHistory) || !Array.isArray(raw.effectivePermissions) || !Array.isArray(raw.activity)) return { kind: "unavailable" };
    const roleHistory = raw.roleHistory.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const row = entry as Record<string, unknown>;
      const startsAtUtc = iso(row.startsAtUtc);
      const expiresAtUtc = row.expiresAtUtc === null ? null : iso(row.expiresAtUtc);
      const revokedAtUtc = row.revokedAtUtc === null ? null : iso(row.revokedAtUtc);
      return typeof row.roleCode === "string" && typeof row.roleDisplayName === "string" && startsAtUtc && (row.expiresAtUtc === null || expiresAtUtc) && (row.revokedAtUtc === null || revokedAtUtc)
        ? [{ roleCode: row.roleCode, roleDisplayName: row.roleDisplayName, startsAtUtc, expiresAtUtc, revokedAtUtc }]
        : [];
    });
    const effectivePermissions = raw.effectivePermissions.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const row = entry as Record<string, unknown>;
      return typeof row.code === "string" && typeof row.domain === "string" && typeof row.riskLevel === "string"
        ? [{ code: row.code, domain: row.domain, riskLevel: row.riskLevel }]
        : [];
    });
    const activity = raw.activity.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const row = entry as Record<string, unknown>;
      const occurredAtUtc = iso(row.occurredAtUtc);
      return typeof row.id === "string" && typeof row.action === "string" && typeof row.result === "string" && typeof row.resourceType === "string" && occurredAtUtc
        ? [{ id: row.id, action: row.action, result: row.result, resourceType: row.resourceType, occurredAtUtc }]
        : [];
    });
    const freshness = body.freshness as Record<string, unknown> | undefined;
    const asOfUtc = iso(freshness?.asOfUtc);
    if (!asOfUtc) return { kind: "unavailable" };
    return { kind: "ok", staff: { ...base, roleHistory, effectivePermissions, activity }, mfaPostureSource: "unavailable", asOfUtc };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 404) return { kind: "not_found" };
  return { kind: "unavailable", ...(await issue(response)) };
}
