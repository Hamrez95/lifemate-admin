import { describe, expect, it } from "vitest";

import { canAccessWorkspace } from "../src/lib/admin-api/policy";
import { findWorkspace } from "../src/config/workspaces";

function workspace(slug: string) {
  const value = findWorkspace(slug);
  if (!value) throw new Error(`Missing test workspace ${slug}`);
  return value;
}

describe("workspace visibility policy", () => {
  it("does not expose Finance to Support navigation", () => {
    expect(
      canAccessWorkspace(workspace("finance"), ["users.read.basic", "support.read", "support.write"]),
    ).toBe(false);
  });

  it("allows Finance users into Finance", () => {
    expect(canAccessWorkspace(workspace("finance"), ["finance.read"])).toBe(true);
  });

  it("allows either approved AI permission into the AI workspace", () => {
    expect(canAccessWorkspace(workspace("ai"), ["ai.marketing.use"])).toBe(true);
  });
});
