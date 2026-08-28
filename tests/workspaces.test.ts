import { describe, expect, it } from "vitest";

import { findWorkspace, workspaceHref, workspaces } from "../src/config/workspaces";

describe("workspace configuration", () => {
  it("contains the approved management workspaces without duplicate routes", () => {
    expect(workspaces).toHaveLength(13);
    expect(new Set(workspaces.map((workspace) => workspace.slug)).size).toBe(workspaces.length);
  });

  it("keeps the command center at the root route", () => {
    const commandCenter = workspaces[0];
    expect(commandCenter).toBeDefined();
    expect(workspaceHref(commandCenter!)).toBe("/");
  });

  it("resolves known workspaces and rejects unknown ones", () => {
    expect(findWorkspace("security")?.label).toBe("امنیت");
    expect(findWorkspace("privacy")?.requiredPermissions).toContain("privacy.consent.read");
    expect(findWorkspace("not-a-workspace")).toBeUndefined();
  });
});
