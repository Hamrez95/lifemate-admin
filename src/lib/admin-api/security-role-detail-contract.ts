export type SecurityRoleDetailRole = {
  code: string;
  displayName: string;
  rank: number;
  status: "Active" | "Disabled";
  isSystem: boolean;
};

export type SecurityRoleDetailPermission = {
  code: string;
  domain: string;
  riskLevel: "STANDARD" | "SENSITIVE" | "HIGH_RISK" | "ELEVATED";
  roleAssignable: boolean;
  description: string;
  source: "direct";
  effectiveForActiveMember: boolean;
  blockedReason: "role_disabled" | "permission_not_role_assignable" | null;
};

export type SecurityRoleEffectivePermission = {
  code: string;
  sourceRoleCodes: string[];
};

export type SecurityRoleMembership = {
  membershipId: string;
  accountId: string;
  memberStatus: "Active" | "Disabled" | "Revoked";
  startsAtUtc: string;
  expiresAtUtc: string | null;
  revokedAtUtc: string | null;
  createdAtUtc: string;
  state: "active" | "scheduled" | "expired" | "revoked" | "member_inactive" | "role_disabled";
  effective: boolean;
  currentRoleCodes: string[];
  effectivePermissions: SecurityRoleEffectivePermission[];
};

export type SecurityRoleDetailResponse = {
  role: SecurityRoleDetailRole;
  permissions: SecurityRoleDetailPermission[];
  memberships: SecurityRoleMembership[];
  evaluationAtUtc: string;
  source: { kind: "canonical"; label: string; definitionVersion: number };
  freshness: { status: "fresh"; asOfUtc: string };
};

const ROLE_CODE = /^[a-z0-9][a-z0-9._:-]{0,63}$/;
const PERMISSION_CODE = /^[a-z0-9][a-z0-9._:-]{0,127}$/;
const DOMAIN = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RISK_LEVELS = new Set(["STANDARD", "SENSITIVE", "HIGH_RISK", "ELEVATED"]);
const MEMBER_STATES = new Set([
  "active",
  "scheduled",
  "expired",
  "revoked",
  "member_inactive",
  "role_disabled",
]);

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function timestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function nullableTimestamp(value: unknown): value is string | null {
  return value === null || timestamp(value);
}

function parseRole(value: unknown): SecurityRoleDetailRole | null {
  const row = object(value);
  if (
    !row ||
    typeof row.code !== "string" ||
    !ROLE_CODE.test(row.code) ||
    !nonEmptyString(row.displayName) ||
    !Number.isInteger(row.rank) ||
    Number(row.rank) < 1 ||
    Number(row.rank) > 1000 ||
    (row.status !== "Active" && row.status !== "Disabled") ||
    typeof row.isSystem !== "boolean"
  ) {
    return null;
  }
  return row as unknown as SecurityRoleDetailRole;
}

function expectedPermissionBlock(
  role: SecurityRoleDetailRole,
  roleAssignable: boolean,
): SecurityRoleDetailPermission["blockedReason"] {
  if (role.status !== "Active") return "role_disabled";
  if (!roleAssignable) return "permission_not_role_assignable";
  return null;
}

function parsePermission(
  value: unknown,
  role: SecurityRoleDetailRole,
): SecurityRoleDetailPermission | null {
  const row = object(value);
  if (
    !row ||
    typeof row.code !== "string" ||
    !PERMISSION_CODE.test(row.code) ||
    typeof row.domain !== "string" ||
    !DOMAIN.test(row.domain) ||
    !RISK_LEVELS.has(String(row.riskLevel)) ||
    typeof row.roleAssignable !== "boolean" ||
    !nonEmptyString(row.description) ||
    row.source !== "direct" ||
    typeof row.effectiveForActiveMember !== "boolean" ||
    (row.blockedReason !== null &&
      row.blockedReason !== "role_disabled" &&
      row.blockedReason !== "permission_not_role_assignable")
  ) {
    return null;
  }
  const blockedReason = expectedPermissionBlock(role, row.roleAssignable);
  if (
    row.blockedReason !== blockedReason ||
    row.effectiveForActiveMember !== (blockedReason === null)
  ) {
    return null;
  }
  return row as unknown as SecurityRoleDetailPermission;
}

function parseEffectivePermission(value: unknown): SecurityRoleEffectivePermission | null {
  const row = object(value);
  if (
    !row ||
    typeof row.code !== "string" ||
    !PERMISSION_CODE.test(row.code) ||
    !Array.isArray(row.sourceRoleCodes) ||
    row.sourceRoleCodes.length === 0
  ) {
    return null;
  }
  const sources: string[] = [];
  const seen = new Set<string>();
  for (const source of row.sourceRoleCodes) {
    if (typeof source !== "string" || !ROLE_CODE.test(source) || seen.has(source)) return null;
    seen.add(source);
    sources.push(source);
  }
  return { code: row.code, sourceRoleCodes: sources };
}

function expectedMembershipState(
  memberStatus: SecurityRoleMembership["memberStatus"],
  roleStatus: SecurityRoleDetailRole["status"],
  startsAtUtc: string,
  expiresAtUtc: string | null,
  revokedAtUtc: string | null,
  atUtc: string,
): SecurityRoleMembership["state"] {
  if (revokedAtUtc !== null) return "revoked";
  const at = Date.parse(atUtc);
  if (Date.parse(startsAtUtc) > at) return "scheduled";
  if (expiresAtUtc !== null && Date.parse(expiresAtUtc) <= at) return "expired";
  if (memberStatus !== "Active") return "member_inactive";
  if (roleStatus !== "Active") return "role_disabled";
  return "active";
}

function parseMembership(
  value: unknown,
  role: SecurityRoleDetailRole,
  evaluationAtUtc: string,
): SecurityRoleMembership | null {
  const row = object(value);
  if (
    !row ||
    typeof row.membershipId !== "string" ||
    !UUID.test(row.membershipId) ||
    typeof row.accountId !== "string" ||
    !UUID.test(row.accountId) ||
    (row.memberStatus !== "Active" &&
      row.memberStatus !== "Disabled" &&
      row.memberStatus !== "Revoked") ||
    !timestamp(row.startsAtUtc) ||
    !nullableTimestamp(row.expiresAtUtc) ||
    !nullableTimestamp(row.revokedAtUtc) ||
    !timestamp(row.createdAtUtc) ||
    typeof row.state !== "string" ||
    !MEMBER_STATES.has(row.state) ||
    typeof row.effective !== "boolean" ||
    !Array.isArray(row.currentRoleCodes) ||
    !Array.isArray(row.effectivePermissions)
  ) {
    return null;
  }

  const currentRoleCodes: string[] = [];
  const roleCodesSeen = new Set<string>();
  for (const code of row.currentRoleCodes) {
    if (typeof code !== "string" || !ROLE_CODE.test(code) || roleCodesSeen.has(code)) return null;
    roleCodesSeen.add(code);
    currentRoleCodes.push(code);
  }

  const effectivePermissions: SecurityRoleEffectivePermission[] = [];
  const permissionCodesSeen = new Set<string>();
  for (const value of row.effectivePermissions) {
    const permission = parseEffectivePermission(value);
    if (!permission || permissionCodesSeen.has(permission.code)) return null;
    permissionCodesSeen.add(permission.code);
    if (permission.sourceRoleCodes.some((code) => !roleCodesSeen.has(code))) return null;
    effectivePermissions.push(permission);
  }

  const expectedState = expectedMembershipState(
    row.memberStatus,
    role.status,
    row.startsAtUtc,
    row.expiresAtUtc,
    row.revokedAtUtc,
    evaluationAtUtc,
  );
  if (row.state !== expectedState || row.effective !== (expectedState === "active")) return null;
  if (row.effective && !roleCodesSeen.has(role.code)) return null;

  return {
    membershipId: row.membershipId,
    accountId: row.accountId,
    memberStatus: row.memberStatus,
    startsAtUtc: row.startsAtUtc,
    expiresAtUtc: row.expiresAtUtc,
    revokedAtUtc: row.revokedAtUtc,
    createdAtUtc: row.createdAtUtc,
    state: row.state as SecurityRoleMembership["state"],
    effective: row.effective,
    currentRoleCodes,
    effectivePermissions,
  };
}

export function isSecurityRoleCode(value: string): boolean {
  return ROLE_CODE.test(value);
}

export function parseSecurityRoleDetailResponse(value: unknown): SecurityRoleDetailResponse | null {
  const body = object(value);
  if (
    !body ||
    !timestamp(body.evaluationAtUtc) ||
    !Array.isArray(body.permissions) ||
    !Array.isArray(body.memberships)
  ) {
    return null;
  }
  const role = parseRole(body.role);
  if (!role) return null;

  const permissionCodes = new Set<string>();
  const permissions: SecurityRoleDetailPermission[] = [];
  for (const value of body.permissions) {
    const permission = parsePermission(value, role);
    if (!permission || permissionCodes.has(permission.code)) return null;
    permissionCodes.add(permission.code);
    permissions.push(permission);
  }

  const membershipIds = new Set<string>();
  const memberships: SecurityRoleMembership[] = [];
  for (const value of body.memberships) {
    const membership = parseMembership(value, role, body.evaluationAtUtc);
    if (!membership || membershipIds.has(membership.membershipId)) return null;
    membershipIds.add(membership.membershipId);
    memberships.push(membership);
  }

  const source = object(body.source);
  const freshness = object(body.freshness);
  if (
    !source ||
    source.kind !== "canonical" ||
    !nonEmptyString(source.label) ||
    !Number.isInteger(source.definitionVersion) ||
    Number(source.definitionVersion) < 1 ||
    !freshness ||
    freshness.status !== "fresh" ||
    !timestamp(freshness.asOfUtc) ||
    freshness.asOfUtc !== body.evaluationAtUtc
  ) {
    return null;
  }

  return {
    role,
    permissions,
    memberships,
    evaluationAtUtc: body.evaluationAtUtc,
    source: source as SecurityRoleDetailResponse["source"],
    freshness: freshness as SecurityRoleDetailResponse["freshness"],
  };
}
