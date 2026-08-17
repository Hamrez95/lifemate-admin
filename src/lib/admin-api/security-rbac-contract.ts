export type SecurityRbacRole = {
  code: string;
  displayName: string;
  rank: number;
  status: "Active" | "Disabled";
  isSystem: boolean;
};

export type SecurityRbacPermission = {
  code: string;
  domain: string;
  riskLevel: "STANDARD" | "SENSITIVE" | "HIGH_RISK" | "ELEVATED";
  roleAssignable: boolean;
  description: string;
};

export type SecurityRbacPermissionGroup = {
  domain: string;
  permissions: SecurityRbacPermission[];
};

export type SecurityRbacAssignment = {
  roleCode: string;
  permissionCode: string;
  source: "direct";
  effective: boolean;
  blockedReason: "role_disabled" | "permission_not_role_assignable" | null;
};

export type SecurityRbacResponse = {
  state: "ready" | "empty";
  roles: SecurityRbacRole[];
  permissionGroups: SecurityRbacPermissionGroup[];
  assignments: SecurityRbacAssignment[];
  inheritance: { supported: false; reason: string };
  elevatedBoundary: { enforcement: string };
  source: { kind: "canonical"; label: string; definitionVersion: number };
  freshness: { status: "fresh"; asOfUtc: string };
};

const ROLE_CODE = /^[a-z0-9][a-z0-9._:-]{0,63}$/;
const PERMISSION_CODE = /^[a-z0-9][a-z0-9._:-]{0,127}$/;
const DOMAIN = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const RISK_LEVELS = new Set(["STANDARD", "SENSITIVE", "HIGH_RISK", "ELEVATED"]);

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

function parseRole(value: unknown): SecurityRbacRole | null {
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
  return row as unknown as SecurityRbacRole;
}

function parsePermission(value: unknown): SecurityRbacPermission | null {
  const row = object(value);
  if (
    !row ||
    typeof row.code !== "string" ||
    !PERMISSION_CODE.test(row.code) ||
    typeof row.domain !== "string" ||
    !DOMAIN.test(row.domain) ||
    !RISK_LEVELS.has(String(row.riskLevel)) ||
    typeof row.roleAssignable !== "boolean" ||
    !nonEmptyString(row.description)
  ) {
    return null;
  }
  return row as unknown as SecurityRbacPermission;
}

function expectedBlockedReason(
  role: SecurityRbacRole,
  permission: SecurityRbacPermission,
): SecurityRbacAssignment["blockedReason"] {
  if (role.status !== "Active") return "role_disabled";
  if (!permission.roleAssignable) return "permission_not_role_assignable";
  return null;
}

export function parseSecurityRbacResponse(value: unknown): SecurityRbacResponse | null {
  const body = object(value);
  if (
    !body ||
    (body.state !== "ready" && body.state !== "empty") ||
    !Array.isArray(body.roles) ||
    !Array.isArray(body.permissionGroups) ||
    !Array.isArray(body.assignments)
  ) {
    return null;
  }

  const roles: SecurityRbacRole[] = [];
  const roleByCode = new Map<string, SecurityRbacRole>();
  for (const item of body.roles) {
    const role = parseRole(item);
    if (!role || roleByCode.has(role.code)) return null;
    roles.push(role);
    roleByCode.set(role.code, role);
  }

  const permissionGroups: SecurityRbacPermissionGroup[] = [];
  const permissionByCode = new Map<string, SecurityRbacPermission>();
  const groupDomains = new Set<string>();
  for (const item of body.permissionGroups) {
    const group = object(item);
    if (
      !group ||
      typeof group.domain !== "string" ||
      !DOMAIN.test(group.domain) ||
      groupDomains.has(group.domain) ||
      !Array.isArray(group.permissions)
    ) {
      return null;
    }
    groupDomains.add(group.domain);
    const permissions: SecurityRbacPermission[] = [];
    for (const permissionValue of group.permissions) {
      const permission = parsePermission(permissionValue);
      if (
        !permission ||
        permission.domain !== group.domain ||
        permissionByCode.has(permission.code)
      ) {
        return null;
      }
      permissions.push(permission);
      permissionByCode.set(permission.code, permission);
    }
    permissionGroups.push({ domain: group.domain, permissions });
  }

  const assignments: SecurityRbacAssignment[] = [];
  const assignmentKeys = new Set<string>();
  for (const item of body.assignments) {
    const assignment = object(item);
    if (
      !assignment ||
      typeof assignment.roleCode !== "string" ||
      typeof assignment.permissionCode !== "string" ||
      assignment.source !== "direct" ||
      typeof assignment.effective !== "boolean" ||
      (assignment.blockedReason !== null &&
        assignment.blockedReason !== "role_disabled" &&
        assignment.blockedReason !== "permission_not_role_assignable")
    ) {
      return null;
    }
    const role = roleByCode.get(assignment.roleCode);
    const permission = permissionByCode.get(assignment.permissionCode);
    if (!role || !permission) return null;
    const key = `${role.code}\u0000${permission.code}`;
    if (assignmentKeys.has(key)) return null;
    assignmentKeys.add(key);
    const blockedReason = expectedBlockedReason(role, permission);
    if (
      assignment.blockedReason !== blockedReason ||
      assignment.effective !== (blockedReason === null)
    ) {
      return null;
    }
    assignments.push(assignment as unknown as SecurityRbacAssignment);
  }

  const inheritance = object(body.inheritance);
  const elevatedBoundary = object(body.elevatedBoundary);
  const source = object(body.source);
  const freshness = object(body.freshness);
  if (
    !inheritance ||
    inheritance.supported !== false ||
    !nonEmptyString(inheritance.reason) ||
    !elevatedBoundary ||
    !nonEmptyString(elevatedBoundary.enforcement) ||
    !source ||
    source.kind !== "canonical" ||
    !nonEmptyString(source.label) ||
    !Number.isInteger(source.definitionVersion) ||
    Number(source.definitionVersion) < 1 ||
    !freshness ||
    freshness.status !== "fresh" ||
    !timestamp(freshness.asOfUtc)
  ) {
    return null;
  }

  const permissionCount = [...permissionByCode.values()].length;
  if (
    (body.state === "ready" && (roles.length === 0 || permissionCount === 0)) ||
    (body.state === "empty" && roles.length > 0 && permissionCount > 0)
  ) {
    return null;
  }

  return {
    state: body.state,
    roles,
    permissionGroups,
    assignments,
    inheritance: inheritance as SecurityRbacResponse["inheritance"],
    elevatedBoundary: elevatedBoundary as SecurityRbacResponse["elevatedBoundary"],
    source: source as SecurityRbacResponse["source"],
    freshness: freshness as SecurityRbacResponse["freshness"],
  };
}
