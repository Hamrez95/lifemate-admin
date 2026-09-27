import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Operations/CocoonMate route states", () => {
  it("keeps operations and CocoonMate state boundaries explicit", () => {
    const routes = [
      "operations",
      "operations/cocoon",
      "operations/cocoon/content",
      "operations/cocoon/readiness",
      "operations/releases",
    ];

    expect(read("app/operations/page.tsx")).toContain("getOperationsSnapshot");
    expect(read("app/operations/releases/page.tsx")).toContain("getProductUpdatePolicies");

    for (const route of routes) {
      const loading = read(`app/${route}/loading.tsx`);
      const error = read(`app/${route}/error.tsx`);
      expect(loading).toContain("LoadingState");
      expect(error).toContain("ErrorState");
      expect(error).toContain("onClick={reset}");
    }

    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");
    expect(research).toContain("Operations/CocoonMate route-state wave");
  });
});
