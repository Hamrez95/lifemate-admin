import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Users/User360 route states", () => {
  it("keeps directory and User360 route states explicit", () => {
    const directory = read("app/users/page.tsx");
    const detail = read("app/users/[accountId]/page.tsx");
    const directoryLoading = read("app/users/loading.tsx");
    const directoryError = read("app/users/error.tsx");
    const detailLoading = read("app/users/[accountId]/loading.tsx");
    const detailError = read("app/users/[accountId]/error.tsx");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(directory).toContain("getUserDirectory");
    expect(detail).toContain("getUserDetail");
    expect(directoryLoading).toContain("LoadingState");
    expect(directoryError).toContain("ErrorState");
    expect(detailLoading).toContain("LoadingState");
    expect(detailError).toContain("ErrorState");
    expect(directoryError).toContain("onClick={reset}");
    expect(detailError).toContain("onClick={reset}");
    expect(research).toContain("Users/User360 route-state wave");
  });
});
