import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ADMIN_API_DIR = path.join(process.cwd(), "src", "lib", "admin-api");
const MAX_TIMEOUT_MS = 10_000;

function adminApiSourceFiles(): string[] {
  return readdirSync(ADMIN_API_DIR)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => path.join(ADMIN_API_DIR, name));
}

describe("ADM-PERF-001 Admin API client guardrails", () => {
  it("keeps every server Admin API fetch no-store and timeout bounded", () => {
    let fetchClientCount = 0;

    for (const file of adminApiSourceFiles()) {
      const source = readFileSync(file, "utf8");
      if (!source.includes("fetch(")) continue;
      fetchClientCount += 1;

      expect(source, `${path.basename(file)} must disable fetch caching`).toContain(
        'cache: "no-store"',
      );

      const timeoutMatches = [...source.matchAll(/AbortSignal\.timeout\(([\d_]+)\)/g)];
      expect(timeoutMatches.length, `${path.basename(file)} must set a timeout`).toBeGreaterThan(0);

      for (const match of timeoutMatches) {
        const timeoutMs = Number(match[1]!.replaceAll("_", ""));
        expect(timeoutMs, `${path.basename(file)} timeout must be positive`).toBeGreaterThan(0);
        expect(timeoutMs, `${path.basename(file)} timeout must stay bounded`).toBeLessThanOrEqual(
          MAX_TIMEOUT_MS,
        );
      }
    }

    expect(fetchClientCount).toBeGreaterThanOrEqual(10);
  });
});
