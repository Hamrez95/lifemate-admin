export function securityRbacFixture() {
  return {
    state: "ready",
    roles: [
      {
        code: "founder",
        displayName: "Founder",
        rank: 10,
        status: "Active",
        isSystem: true,
      },
      {
        code: "technical",
        displayName: "Technical",
        rank: 140,
        status: "Active",
        isSystem: true,
      },
      {
        code: "security",
        displayName: "Security",
        rank: 150,
        status: "Active",
        isSystem: true,
      },
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
            description: "Break-glass raw health access outside ordinary role membership.",
          },
        ],
      },
      {
        domain: "operations",
        permissions: [
          {
            code: "operations.read",
            domain: "operations",
            riskLevel: "SENSITIVE",
            roleAssignable: true,
            description: "Read operational health and delivery evidence.",
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
            description: "Read security audit and RBAC evidence.",
          },
          {
            code: "security.roles.write",
            domain: "security",
            riskLevel: "HIGH_RISK",
            roleAssignable: true,
            description: "Manage Command Center role definitions and assignments.",
          },
        ],
      },
      {
        domain: "women_health",
        permissions: [
          {
            code: "women_health.read.elevated",
            domain: "women_health",
            riskLevel: "ELEVATED",
            roleAssignable: false,
            description: "Break-glass Women Health access outside ordinary role membership.",
          },
        ],
      },
    ],
    assignments: [
      {
        roleCode: "founder",
        permissionCode: "operations.read",
        source: "direct",
        effective: true,
        blockedReason: null,
      },
      {
        roleCode: "technical",
        permissionCode: "operations.read",
        source: "direct",
        effective: true,
        blockedReason: null,
      },
      {
        roleCode: "security",
        permissionCode: "security.audit.read",
        source: "direct",
        effective: true,
        blockedReason: null,
      },
      {
        roleCode: "security",
        permissionCode: "security.roles.write",
        source: "direct",
        effective: true,
        blockedReason: null,
      },
    ],
    inheritance: {
      supported: false,
      reason:
        "The current Command Center RBAC model has direct role-to-permission assignments and no role inheritance graph.",
    },
    elevatedBoundary: {
      enforcement:
        "Permissions with roleAssignable=false are never effective through ordinary role membership, even if a direct database assignment row exists.",
    },
    source: {
      kind: "canonical",
      label: "LifeMate admin RBAC control plane",
      definitionVersion: 1,
    },
    freshness: {
      status: "fresh",
      asOfUtc: "2026-08-17T11:30:00.000Z",
    },
  };
}
