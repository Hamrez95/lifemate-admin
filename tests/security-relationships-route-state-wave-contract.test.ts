import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Security/Relationships route states", () => {
  it("keeps security and relationships state boundaries explicit", () => {
    const security = read("app/security/page.tsx");
    const securityLoading = read("app/security/loading.tsx");
    const securityError = read("app/security/error.tsx");
    const relationships = read("app/relationships/page.tsx");
    const relationshipsLoading = read("app/relationships/loading.tsx");
    const relationshipsError = read("app/relationships/error.tsx");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(security).toContain("getSecurityRbacMatrix");
    expect(securityLoading).toContain("aria-busy");
    expect(securityLoading).toContain("Admin API canonical");
    expect(securityError).toContain("ErrorState");
    expect(securityError).toContain("onClick={reset}");
    expect(relationships).toContain("getRelationshipOverview");
    expect(relationshipsLoading).toContain("LoadingState");
    expect(relationshipsError).toContain("ErrorState");
    expect(relationshipsError).toContain("onClick={reset}");
    expect(research).toContain("Security/Relationships route-state wave");
  });
});
