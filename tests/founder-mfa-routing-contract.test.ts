import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Founder access routing contract", () => {
  it("routes an explicit MFA requirement to the MFA flow instead of the forbidden page", () => {
    const server = source("src/lib/admin-api/server.ts");

    expect(server).toContain('problem?.code === "mfa_required"');
    expect(server).toContain('return { kind: "mfa_required" }');
    expect(server).toContain('result.kind === "mfa_required"');
    expect(server).toContain('redirect("/login?step=mfa")');
  });

  it("keeps genuine authorization denial on the forbidden route", () => {
    const server = source("src/lib/admin-api/server.ts");

    expect(server).toContain('response.status === 403');
    expect(server).toContain('return { kind: "forbidden"');
    expect(server).toContain('redirect("/forbidden")');
  });

  it("contains no Founder-specific authorization bypass", () => {
    const server = source("src/lib/admin-api/server.ts");

    expect(server).not.toContain("Founder");
    expect(server).not.toContain("founder");
    expect(server).not.toContain("isFounder");
  });
});
