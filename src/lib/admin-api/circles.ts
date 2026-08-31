import "server-only";

import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type CircleKind =
  | "women_health_planning"
  | "family"
  | "care"
  | "pregnancy_support";
export type CircleStatus = "active" | "closed";
export type CircleMembershipStatus = "active" | "left" | "removed";
export type CircleMembershipRole = "owner" | "member";
export type CircleSharingMode = "none" | "planning_only" | "limited_context";
export type CircleInvitationStatus = "pending" | "accepted" | "declined" | "revoked" | "expired";

export type CircleDirectoryItem = {
  circleId: string;
  ownerPersonId: string;
  ownerDisplayName: string | null;
  kind: CircleKind;
  name: string;
  iconKey: string | null;
  status: CircleStatus;
  version: number;
  activeMemberCount: number;
  pendingInvitationCount: number;
  createdAtUtc: string;
  updatedAtUtc: string;
  closedAtUtc: string | null;
};

export type CircleDirectoryResponse = {
  items: CircleDirectoryItem[];
  total: number;
  page: number;
  pageSize: number;
  filters: {
    status: CircleStatus | null;
    kind: CircleKind | null;
    ownerPersonId: string | null;
    memberPersonId: string | null;
    q: string | null;
  };
  source: { kind: "canonical"; label: string };
  freshness: { status: "fresh" | "stale"; asOfUtc: string };
};

export type CircleDetailResponse = {
  circle: {
    circleId: string;
    ownerPersonId: string;
    ownerDisplayName: string | null;
    kind: CircleKind;
    name: string;
    iconKey: string | null;
    status: CircleStatus;
    version: number;
    createdAtUtc: string;
    updatedAtUtc: string;
    closedAtUtc: string | null;
  };
  members: Array<{
    membershipId: string;
    personId: string;
    displayName: string | null;
    role: CircleMembershipRole;
    status: CircleMembershipStatus;
    sharingMode: CircleSharingMode;
    sharingVersion: number | null;
    joinedAtUtc: string;
    leftAtUtc: string | null;
    removedAtUtc: string | null;
    sharingRevokedAtUtc: string | null;
    updatedAtUtc: string;
  }>;
  invitations: Array<{
    invitationId: string;
    inviterPersonId: string;
    inviterDisplayName: string | null;
    inviteePersonId: string | null;
    inviteeDisplayName: string | null;
    targetKind: "person" | "contact";
    status: CircleInvitationStatus;
    expiresAtUtc: string;
    acceptedAtUtc: string | null;
    declinedAtUtc: string | null;
    revokedAtUtc: string | null;
    createdAtUtc: string;
    updatedAtUtc: string;
  }>;
  source: { kind: "canonical"; label: string };
  privacy: { scope: "structure_only"; protectedHealthContentIncluded: false };
  freshness: { status: "fresh" | "stale"; asOfUtc: string };
};

type AdminApiProblem = { code?: string; correlationId?: string };

export type CircleDirectoryResult =
  | { kind: "ok"; data: CircleDirectoryResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid"; correlationId?: string }
  | { kind: "unavailable"; correlationId?: string };

export type CircleDetailResult =
  | { kind: "ok"; data: CircleDetailResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "unavailable"; correlationId?: string };

const kinds = new Set<CircleKind>([
  "women_health_planning",
  "family",
  "care",
  "pregnancy_support",
]);
const statuses = new Set<CircleStatus>(["active", "closed"]);
const memberRoles = new Set<CircleMembershipRole>(["owner", "member"]);
const memberStatuses = new Set<CircleMembershipStatus>(["active", "left", "removed"]);
const sharingModes = new Set<CircleSharingMode>(["none", "planning_only", "limited_context"]);
const invitationStatuses = new Set<CircleInvitationStatus>([
  "pending",
  "accepted",
  "declined",
  "revoked",
  "expired",
]);

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function positiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1;
}

function isFreshness(value: unknown): boolean {
  const item = record(value);
  return Boolean(
    item &&
      (item.status === "fresh" || item.status === "stale") &&
      typeof item.asOfUtc === "string",
  );
}

function isCanonicalSource(value: unknown): boolean {
  const item = record(value);
  return Boolean(item && item.kind === "canonical" && typeof item.label === "string");
}

function isCircleKind(value: unknown): value is CircleKind {
  return typeof value === "string" && kinds.has(value as CircleKind);
}

function isCircleStatus(value: unknown): value is CircleStatus {
  return typeof value === "string" && statuses.has(value as CircleStatus);
}

function isDirectoryItem(value: unknown): value is CircleDirectoryItem {
  const item = record(value);
  return Boolean(
    item &&
      typeof item.circleId === "string" &&
      typeof item.ownerPersonId === "string" &&
      nullableString(item.ownerDisplayName) &&
      isCircleKind(item.kind) &&
      typeof item.name === "string" &&
      nullableString(item.iconKey) &&
      isCircleStatus(item.status) &&
      positiveInteger(item.version) &&
      nonNegativeInteger(item.activeMemberCount) &&
      nonNegativeInteger(item.pendingInvitationCount) &&
      typeof item.createdAtUtc === "string" &&
      typeof item.updatedAtUtc === "string" &&
      nullableString(item.closedAtUtc),
  );
}

function isCircleHeader(value: unknown): boolean {
  const item = record(value);
  return Boolean(
    item &&
      typeof item.circleId === "string" &&
      typeof item.ownerPersonId === "string" &&
      nullableString(item.ownerDisplayName) &&
      isCircleKind(item.kind) &&
      typeof item.name === "string" &&
      nullableString(item.iconKey) &&
      isCircleStatus(item.status) &&
      positiveInteger(item.version) &&
      typeof item.createdAtUtc === "string" &&
      typeof item.updatedAtUtc === "string" &&
      nullableString(item.closedAtUtc),
  );
}

function isMember(value: unknown): boolean {
  const item = record(value);
  return Boolean(
    item &&
      typeof item.membershipId === "string" &&
      typeof item.personId === "string" &&
      nullableString(item.displayName) &&
      typeof item.role === "string" &&
      memberRoles.has(item.role as CircleMembershipRole) &&
      typeof item.status === "string" &&
      memberStatuses.has(item.status as CircleMembershipStatus) &&
      typeof item.sharingMode === "string" &&
      sharingModes.has(item.sharingMode as CircleSharingMode) &&
      (item.sharingVersion === null || positiveInteger(item.sharingVersion)) &&
      typeof item.joinedAtUtc === "string" &&
      nullableString(item.leftAtUtc) &&
      nullableString(item.removedAtUtc) &&
      nullableString(item.sharingRevokedAtUtc) &&
      typeof item.updatedAtUtc === "string",
  );
}

function isInvitation(value: unknown): boolean {
  const item = record(value);
  return Boolean(
    item &&
      typeof item.invitationId === "string" &&
      typeof item.inviterPersonId === "string" &&
      nullableString(item.inviterDisplayName) &&
      nullableString(item.inviteePersonId) &&
      nullableString(item.inviteeDisplayName) &&
      (item.targetKind === "person" || item.targetKind === "contact") &&
      typeof item.status === "string" &&
      invitationStatuses.has(item.status as CircleInvitationStatus) &&
      typeof item.expiresAtUtc === "string" &&
      nullableString(item.acceptedAtUtc) &&
      nullableString(item.declinedAtUtc) &&
      nullableString(item.revokedAtUtc) &&
      typeof item.createdAtUtc === "string" &&
      typeof item.updatedAtUtc === "string",
  );
}

export function parseCircleDirectoryResponse(value: unknown): CircleDirectoryResponse | null {
  const body = record(value);
  if (!body || !Array.isArray(body.items)) return null;
  if (
    !nonNegativeInteger(body.total) ||
    !positiveInteger(body.page) ||
    !positiveInteger(body.pageSize) ||
    !body.items.every(isDirectoryItem) ||
    !isCanonicalSource(body.source) ||
    !isFreshness(body.freshness)
  ) {
    return null;
  }
  const filters = record(body.filters);
  if (!filters) return null;
  if (filters.status !== null && !isCircleStatus(filters.status)) return null;
  if (filters.kind !== null && !isCircleKind(filters.kind)) return null;
  if (!nullableString(filters.ownerPersonId)) return null;
  if (!nullableString(filters.memberPersonId)) return null;
  if (!nullableString(filters.q)) return null;
  return body as unknown as CircleDirectoryResponse;
}

export function parseCircleDetailResponse(value: unknown): CircleDetailResponse | null {
  const body = record(value);
  if (!body || !isCircleHeader(body.circle)) return null;
  if (!Array.isArray(body.members) || !body.members.every(isMember)) return null;
  if (!Array.isArray(body.invitations) || !body.invitations.every(isInvitation)) return null;
  if (!isCanonicalSource(body.source) || !isFreshness(body.freshness)) return null;
  const privacy = record(body.privacy);
  if (
    !privacy ||
    privacy.scope !== "structure_only" ||
    privacy.protectedHealthContentIncluded !== false
  ) {
    return null;
  }
  return body as unknown as CircleDetailResponse;
}

async function parseProblem(response: Response): Promise<AdminApiProblem> {
  try {
    const body = record(await response.json());
    return {
      code: typeof body?.code === "string" ? body.code : undefined,
      correlationId:
        typeof body?.correlationId === "string" ? body.correlationId : undefined,
    };
  } catch {
    return {};
  }
}

async function adminFetch(path: string): Promise<Response | null> {
  const token = await getServerAdminAccessToken();
  if (!token) return null;
  const config = getPublicRuntimeConfig();
  try {
    return await fetch(`${config.adminApiUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}

export async function getCircleDirectory(
  params: URLSearchParams,
): Promise<CircleDirectoryResult> {
  const token = await getServerAdminAccessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  const query = params.toString();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}/api/v1/circles${query ? `?${query}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    const parsed = parseCircleDirectoryResponse(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  const problem = await parseProblem(response);
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 400) return { kind: "invalid", correlationId: problem.correlationId };
  return { kind: "unavailable", correlationId: problem.correlationId };
}

export async function getCircleDetail(circleId: string): Promise<CircleDetailResult> {
  const response = await adminFetch(`/api/v1/circles/${encodeURIComponent(circleId)}`);
  if (!response) return { kind: "unauthenticated" };
  if (response.ok) {
    const parsed = parseCircleDetailResponse(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  const problem = await parseProblem(response);
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 404 && problem.code === "circle_not_found") return { kind: "not_found" };
  return { kind: "unavailable", correlationId: problem.correlationId };
}
