import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 profile/settings workspace wave", () => {
  it.each([
    ["profile", "پروفایل و امنیت"],
    ["settings", "تنظیمات"],
  ])("provides truthful loading and retryable error states for %s", (route, title) => {
    const loading = source(`app/${route}/loading.tsx`);
    const error = source(`app/${route}/error.tsx`);

    expect(loading).toContain("LoadingState");
    expect(loading).toContain(title);
    expect(error).toContain("ErrorState");
    expect(error).toContain("onClick={reset}");
    expect(error.includes("هیچ وضعیت حدسی") || error.includes("مقدار ساختگی")).toBe(true);
  });

  it("composes both routes with the canonical Page primitive", () => {
    expect(source("app/profile/page.tsx")).toContain('import { Page } from "@/src/components/ui"');
    expect(source("app/settings/page.tsx")).toContain('import { Page } from "@/src/components/ui"');
  });
});
