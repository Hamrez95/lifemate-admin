import { describe, expect, it } from "vitest";

import { parseSecurityRoleDetailResponse } from "../src/lib/admin-api/security-role-detail-contract";

const response = {
  role: {
    code: "security",
    displayName: "Security",
    rank: 150,
    status: "Active",
    isSystem: true,
  },
  permissions: [
    {
      code: "security.audit.read",
      domain: "security",
      riskLevel: "SENSITIVE",
      roleAssignable: true,
      description: "Read security evidence",
      source: "direct",
      effectiveForActiveMember: true,
      blockedReason: null,
    },
    {
      code: "health.read.elevated",
      domain: "health",
      riskLevel: "ELEVATED",
      roleAssignable: false,
      description: "Break-glass health access",
      source: "direct",
      effectiveForActiveMember: false,
      blockedReason: "permission_not_role_assignable",
    },
  ],
  memberships: [
    {
      membershipId: "11111111-1111-4111-8111-111111111111",
      accountId: "22222222-2222-4222-8222-222222222222",
      memberStatus: "Active",
      startsAtUtc: "2026-08-01T00:00:00.000Z",
      expiresAtUtc: null,
      revokedAtUtc: null,
      createdAtUtc: "2026-08-01T00:00:00.000Z",
      state: "active",
      effective: true,
      currentRoleCodes: ["security"],
      effectivePermissions: [
        { code: "security.audit.read", sourceRoleCodes: ["security"] },
      ],
    },
    {
      membershipId: "33333333-3333-4333-8333-333333333333",
      accountId: "44444444-4444-4444-8444-444444444444",
      memberStatus: "Revoked",
      startsAtUtc: "2026-07-01T00:00:00.000Z",
      expiresAtUtc: null,
      revokedAtUtc: "2026-08-10T00:00:00.000Z",
      createdAtUtc: "2026-07-01T00:00:00.000Z",
      state: "revoked",
      effective: false,
      currentRoleCodes: [],
      effectivePermissions: [],
    },
  ],
  evaluationAtUtc: "2026-08-17T11:45:00.000Z",
  source: {
    kind: "canonical",
    label: "LifeMate admin RBAC control plane",
    definitionVersion: 1,
  },
  freshness: { status: "fresh", asOfUtc: "2026-08-17T11:45:00.000Z" },
};

describe("ADM-SEC-002 role detail response contract", () => {
  it("accepts canonical memberships with traceable effective permissions", () => {
    const parsed = parseSecurityRoleDetailResponse(response);
    expect(parsed?.role.code).toBe("security");
    expect(parsed?.memberships[0]?.state).toBe("active");
    expect(parsed?.memberships[0]?.effectivePermissions[0]?.sourceRoleCodes).toEqual(["security"]);
  });

  it("rejects elevated permission falsely reported as effective", () => {
    const invalid = structuredClone(response);
    invalid.permissions[1]!.effectiveForActiveMember = true;
    invalid.permissions[1]!.blockedReason = null;
    expect(parseSecurityRoleDetailResponse(invalid)).toBeNull();
  });

  it("rejects membership state that disagrees with the canonical evaluation instant", () => {
    const invalid = structuredClone(response);
    invalid.memberships[1]!.state = "active";
    invalid.memberships[1]!.effective = true;
    expect(parseSecurityRoleDetailResponse(invalid)).toBeNull();
  });

  it("rejects effective permission provenance from a role the member does not currently hold", () => {
    const invalid = structuredClone(response);
    invalid.memberships[0]!.effectivePermissions[0]!.sourceRoleCodes = ["founder"];
    expect(parseSecurityRoleDetailResponse(invalid)).toBeNull();
  });

  it("rejects an active membership when the requested role is absent from current roles", () => {
    const invalid = structuredClone(response);
    invalid.memberships[0]!.currentRoleCodes = ["support"];
    invalid.memberships[0]!.effectivePermissions = [];
    expect(parseSecurityRoleDetailResponse(invalid)).toBeNull();
  });

  it("rejects freshness drift from the evaluation instant", () => {
    const invalid = structuredClone(response);
    invalid.freshness.asOfUtc = "2026-08-17T11:46:00.000Z";
    expect(parseSecurityRoleDetailResponse(invalid)).toBeNull();
  });
});
