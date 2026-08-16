import { describe, expect, it } from "vitest";

import { findWorkspace } from "../src/config/workspaces";
import { canAccessWorkspace } from "../src/lib/admin-api/policy";

function workspace(slug: string) {
  const value = findWorkspace(slug);
  if (!value) throw new Error(`Missing test workspace ${slug}`);
  return value;
}

describe("workspace visibility policy", () => {
  it("does not expose Finance to Support navigation", () => {
    expect(
      canAccessWorkspace(workspace("finance"), [
        "users.read.basic",
        "support.read",
        "support.write",
      ]),
    ).toBe(false);
  });

  it("allows Finance users into Finance", () => {
    expect(canAccessWorkspace(workspace("finance"), ["finance.read"])).toBe(true);
  });

  it("allows approved AI permissions into the AI workspace", () => {
    expect(canAccessWorkspace(workspace("ai"), ["ai.advisor.read"])).toBe(true);
    expect(canAccessWorkspace(workspace("ai"), ["ai.marketing.use"])).toBe(true);
  });
});
