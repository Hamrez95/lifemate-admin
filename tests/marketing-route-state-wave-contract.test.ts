import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Marketing overview/channels route states", () => {
  it("keeps marketing overview and channels state boundaries explicit", () => {
    const overview = read("app/marketing/page.tsx");
    const channels = read("app/marketing/channels/page.tsx");
    const overviewLoading = read("app/marketing/loading.tsx");
    const overviewError = read("app/marketing/error.tsx");
    const channelsLoading = read("app/marketing/channels/loading.tsx");
    const channelsError = read("app/marketing/channels/error.tsx");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(overview).toContain("getMarketingOverview");
    expect(channels).toContain("getMarketingChannels");
    expect(overviewLoading).toContain("LoadingState");
    expect(overviewError).toContain("ErrorState");
    expect(channelsLoading).toContain("LoadingState");
    expect(channelsError).toContain("ErrorState");
    expect(overviewError).toContain("onClick={reset}");
    expect(channelsError).toContain("onClick={reset}");
    expect(research).toContain("Marketing overview/channels route-state wave");
  });
});
