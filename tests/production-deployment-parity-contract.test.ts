import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  classifyDeploymentParity,
  normalizeGitSha,
  shortGitSha,
} from "../src/lib/deployment-status-contract";

const A = "a".repeat(40);
const B = "b".repeat(40);

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("production deployment parity", () => {
  it("requires exact immutable SHAs before declaring current", () => {
    expect(classifyDeploymentParity({ deployedSha: A, expectedMainSha: A })).toBe("current");
    expect(classifyDeploymentParity({ deployedSha: null, expectedMainSha: A })).toBe(
      "unverifiable",
    );
    expect(classifyDeploymentParity({ deployedSha: "main", expectedMainSha: A })).toBe(
      "unverifiable",
    );
  });

  it("marks production behind only when GitHub ancestry proves current main is ahead", () => {
    expect(
      classifyDeploymentParity({ deployedSha: A, expectedMainSha: B, compareStatus: "ahead" }),
    ).toBe("behind");
    expect(
      classifyDeploymentParity({ deployedSha: A, expectedMainSha: B, compareStatus: "behind" }),
    ).toBe("ahead_or_unknown");
    expect(
      classifyDeploymentParity({ deployedSha: A, expectedMainSha: B, compareStatus: "diverged" }),
    ).toBe("ahead_or_unknown");
    expect(classifyDeploymentParity({ deployedSha: A, expectedMainSha: B })).toBe(
      "ahead_or_unknown",
    );
  });

  it("normalizes and shortens only full Git SHAs", () => {
    expect(normalizeGitSha(A.toUpperCase())).toBe(A);
    expect(normalizeGitSha("1234")).toBeNull();
    expect(shortGitSha(A)).toBe("aaaaaaaa");
    expect(shortGitSha(null)).toBe("نامشخص");
  });

  it("keeps deployment discovery server-only and fails closed without trusted facts", () => {
    const implementation = source("src/lib/deployment-status.ts");
    expect(implementation).toContain('import "server-only"');
    expect(implementation).toContain("VERCEL_GIT_COMMIT_SHA");
    expect(implementation).toContain("/commits/main");
    expect(implementation).toContain("/compare/");
    expect(implementation).not.toContain("NEXT_PUBLIC_VERCEL_TOKEN");
  });

  it("never presents a Preview deployment as Production", () => {
    const component = source("src/components/operations/DeploymentParityPanel.tsx");
    expect(component).toContain('status.environment === "production"');
    expect(component).toContain("Preview / non-production");
    expect(component).toContain("نباید به‌عنوان وضعیت Production تفسیر شود");
  });

  it("production release stamps, verifies and retains rollback evidence", () => {
    const workflow = source(".github/workflows/release-admin.yml");
    expect(workflow).toContain('--meta "releaseSourceSha=$SOURCE_SHA"');
    expect(workflow).toContain('--env "LIFEMATE_ADMIN_DEPLOYED_AT_UTC=$deployed_at"');
    expect(workflow).toContain("LIFEMATE_ADMIN_ROLLBACK_REFERENCE");
    expect(workflow).toContain('test "$actual_target" = "production"');
    expect(workflow).toContain('test "$actual_sha" = "$SOURCE_SHA"');
    expect(workflow).not.toMatch(/uses:\s+actions\/[^@]+@v\d+/u);
  });
});
