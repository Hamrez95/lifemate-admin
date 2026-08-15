import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { findWorkspace, workspaces } from "../src/config/workspaces";
import { canAccessWorkspace } from "../src/lib/admin-api/policy";

const ELEVATED = ["health.read.elevated", "women_health.read.elevated"] as const;

const ordinaryRoleFixtures = {
  product: [
    "users.read.basic",
    "relationships.read",
    "commerce.read",
    "analytics.read",
    "operations.read",
    "ai.business.read",
    "settings.read",
  ],
  support: [
    "users.read.basic",
    "relationships.read",
    "support.read",
    "support.write",
    "settings.read",
  ],
  marketing: [
    "marketing.read",
    "marketing.campaign.write",
    "marketing.social.publish",
    "commerce.read",
    "commerce.promo.write",
    "analytics.read",
    "ai.marketing.use",
    "settings.read",
  ],
  finance: [
    "finance.read",
    "finance.write",
    "commerce.read",
    "commerce.refund",
    "analytics.read",
    "settings.read",
  ],
  technical: [
    "users.read.basic",
    "analytics.read",
    "operations.read",
    "ai.business.read",
    "settings.read",
  ],
  security: [
    "users.read.basic",
    "operations.read",
    "security.audit.read",
    "security.roles.write",
    "security.break_glass.request",
    "security.break_glass.approve",
    "settings.read",
  ],
} as const;

function workspace(slug: string) {
  const value = findWorkspace(slug);
  if (!value) throw new Error(`Missing workspace ${slug}`);
  return value;
}

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-QA-001 security denial matrix", () => {
  it("denies every restricted workspace when no domain permission is present", () => {
    for (const item of workspaces) {
      if (item.requiredPermissions.length === 0) continue;
      expect(canAccessWorkspace(item, []), item.slug).toBe(false);
    }
  });

  it("keeps representative ordinary roles inside their approved workspace boundaries", () => {
    const support = ordinaryRoleFixtures.support;
    expect(canAccessWorkspace(workspace("support"), support)).toBe(true);
    expect(canAccessWorkspace(workspace("users"), support)).toBe(true);
    expect(canAccessWorkspace(workspace("relationships"), support)).toBe(true);
    expect(canAccessWorkspace(workspace("finance"), support)).toBe(false);
    expect(canAccessWorkspace(workspace("commerce"), support)).toBe(false);
    expect(canAccessWorkspace(workspace("security"), support)).toBe(false);
    expect(canAccessWorkspace(workspace("operations"), support)).toBe(false);

    const finance = ordinaryRoleFixtures.finance;
    expect(canAccessWorkspace(workspace("finance"), finance)).toBe(true);
    expect(canAccessWorkspace(workspace("commerce"), finance)).toBe(true);
    expect(canAccessWorkspace(workspace("support"), finance)).toBe(false);
    expect(canAccessWorkspace(workspace("security"), finance)).toBe(false);

    const security = ordinaryRoleFixtures.security;
    expect(canAccessWorkspace(workspace("security"), security)).toBe(true);
    expect(canAccessWorkspace(workspace("operations"), security)).toBe(true);
    expect(canAccessWorkspace(workspace("finance"), security)).toBe(false);
    expect(canAccessWorkspace(workspace("support"), security)).toBe(false);
  });

  it("never places raw Health or Women Health elevated capabilities into ordinary role fixtures", () => {
    for (const [role, permissions] of Object.entries(ordinaryRoleFixtures)) {
      for (const elevated of ELEVATED) {
        expect(permissions, `${role} unexpectedly contains ${elevated}`).not.toContain(elevated);
      }
    }
  });

  it("keeps generic workspace authorization server-side instead of trusting navigation visibility", () => {
    const page = source("app/[workspace]/page.tsx");
    expect(page).toContain("await requireAdminAccess()");
    expect(page).toContain("canAccessWorkspace(workspace, admin.permissions)");
    expect(page).toContain('redirect("/forbidden")');
    expect(page).toContain("نمایش منو صرفاً UX است");
  });

  it("maps unauthenticated MFA-required and forbidden server access to separate safe routes", () => {
    const server = source("src/lib/admin-api/server.ts");
    expect(server).toContain('result.kind === "unauthenticated"');
    expect(server).toContain('redirect("/login")');
    expect(server).toContain('result.kind === "mfa_required"');
    expect(server).toContain('redirect("/login?step=mfa")');
    expect(server).toContain('result.kind === "forbidden"');
    expect(server).toContain('redirect("/forbidden")');
    expect(server).not.toContain("service_role");
  });
});
