import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Support route states", () => {
  it("keeps queue and ticket detail state boundaries explicit", () => {
    const queue = read("app/support/page.tsx");
    const detail = read("app/support/[ticketId]/page.tsx");
    const queueLoading = read("app/support/loading.tsx");
    const queueError = read("app/support/error.tsx");
    const detailLoading = read("app/support/[ticketId]/loading.tsx");
    const detailError = read("app/support/[ticketId]/error.tsx");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(queue).toContain("getSupportQueue");
    expect(detail).toContain("getSupportTicket");
    expect(queueLoading).toContain("LoadingState");
    expect(queueError).toContain("ErrorState");
    expect(detailLoading).toContain("LoadingState");
    expect(detailError).toContain("ErrorState");
    expect(queueError).toContain("onClick={reset}");
    expect(detailError).toContain("onClick={reset}");
    expect(research).toContain("Support queue/detail route-state wave");
  });
});
