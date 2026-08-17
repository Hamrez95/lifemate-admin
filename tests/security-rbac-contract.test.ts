import { describe, expect, it } from "vitest";

import { parseSecurityRbacResponse } from "../src/lib/admin-api/security-rbac-contract";

const readyResponse = {
  state: "ready",
  roles: [
    { code: "founder", displayName: "Founder", rank: 10, status: "Active", isSystem: true },
    { code: "security", displayName: "Security", rank: 150, status: "Active", isSystem: true },
    { code: "legacy", displayName: "Legacy", rank: 500, status: "Disabled", isSystem: false },
  ],
  permissionGroups: [
    {
      domain: "health",
      permissions: [
        {
          code: "health.read.elevated",
          domain: "health",
          riskLevel: "ELEVATED",
          roleAssignable: false,
          description: "Break-glass health access",
        },
      ],
    },
    {
      domain: "security",
      permissions: [
        {
          code: "security.audit.read",
          domain: "security",
          riskLevel: "SENSITIVE",
          roleAssignable: true,
          description: "Read security evidence",
        },
      ],
    },
  ],
  assignments: [
    {
      roleCode: "security",
      permissionCode: "security.audit.read",
      source: "direct",
      effective: true,
      blockedReason: null,
    },
    {
      roleCode: "founder",
      permissionCode: "health.read.elevated",
      source: "direct",
      effective: false,
      blockedReason: "permission_not_role_assignable",
    },
    {
      roleCode: "legacy",
      permissionCode: "security.audit.read",
      source: "direct",
      effective: false,
      blockedReason: "role_disabled",
    },
  ],
  inheritance: {
    supported: false,
    reason: "The current Command Center RBAC model has direct role-to-permission assignments.",
  },
  elevatedBoundary: {
    enforcement:
      "Permissions with roleAssignable=false are never effective through ordinary roles.",
  },
  source: {
    kind: "canonical",
    label: "LifeMate admin RBAC control plane",
    definitionVersion: 1,
  },
  freshness: { status: "fresh", asOfUtc: "2026-08-17T11:30:00.000Z" },
};

describe("ADM-SEC-001 RBAC response contract", () => {
  it("accepts canonical direct assignments and blocked elevated boundaries", () => {
    const parsed = parseSecurityRbacResponse(readyResponse);
    expect(parsed?.state).toBe("ready");
    expect(
      parsed?.assignments.find((item) => item.permissionCode === "health.read.elevated")?.effective,
    ).toBe(false);
  });

  it("rejects an elevated permission falsely reported as effective", () => {
    const invalid = structuredClone(readyResponse);
    const assignment = invalid.assignments.find(
      (item) => item.permissionCode === "health.read.elevated",
    )!;
    assignment.effective = true;
    assignment.blockedReason = null;
    expect(parseSecurityRbacResponse(invalid)).toBeNull();
  });

  it("rejects an assignment referencing an unknown role", () => {
    const invalid = structuredClone(readyResponse);
    invalid.assignments[0]!.roleCode = "unknown";
    expect(parseSecurityRbacResponse(invalid)).toBeNull();
  });

  it("rejects duplicate permission codes across groups", () => {
    const invalid = structuredClone(readyResponse);
    invalid.permissionGroups.push({
      domain: "operations",
      permissions: [
        {
          ...invalid.permissionGroups[1]!.permissions[0]!,
          domain: "operations",
        },
      ],
    });
    expect(parseSecurityRbacResponse(invalid)).toBeNull();
  });

  it("rejects disabled-role assignments falsely reported as effective", () => {
    const invalid = structuredClone(readyResponse);
    const assignment = invalid.assignments.find((item) => item.roleCode === "legacy")!;
    assignment.effective = true;
    assignment.blockedReason = null;
    expect(parseSecurityRbacResponse(invalid)).toBeNull();
  });

  it("accepts a truthful canonical empty state", () => {
    const empty = {
      ...structuredClone(readyResponse),
      state: "empty",
      roles: [],
      permissionGroups: [],
      assignments: [],
    };
    expect(parseSecurityRbacResponse(empty)?.state).toBe("empty");
  });
});
