import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Commerce overview/catalog route states", () => {
  it("keeps commerce route states explicit and data truthfulness intact", () => {
    const overview = read("app/commerce/page.tsx");
    const catalog = read("app/commerce/catalog/page.tsx");
    const overviewLoading = read("app/commerce/loading.tsx");
    const overviewError = read("app/commerce/error.tsx");
    const catalogLoading = read("app/commerce/catalog/loading.tsx");
    const catalogError = read("app/commerce/catalog/error.tsx");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(overview).toContain("getCommerceOverview");
    expect(catalog).toContain("getCommerceCatalogV2");
    expect(overviewLoading).toContain("LoadingState");
    expect(overviewError).toContain("ErrorState");
    expect(catalogLoading).toContain("LoadingState");
    expect(catalogError).toContain("ErrorState");
    expect(overviewError).toContain("onClick={reset}");
    expect(catalogError).toContain("onClick={reset}");
    expect(research).toContain("Commerce overview/catalog route-state wave");
  });
});
