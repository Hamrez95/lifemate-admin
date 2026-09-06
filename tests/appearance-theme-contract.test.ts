import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("appearance theme contract", () => {
  it("keeps one semantic token source with a dark override", () => {
    const tokens = read("app/design-system.css");
    expect(tokens).toContain(':root[data-theme="dark"]');
    for (const token of [
      "--lm-canvas",
      "--lm-surface",
      "--lm-text-primary",
      "--lm-border-default",
      "--lm-focus-ring",
    ])
      expect(tokens).toContain(token);
    expect(read("app/globals.css")).not.toContain("color-scheme: light;");
  });

  it("bootstraps and persists only presentational appearance preference", () => {
    const provider = read("src/components/ui/AppearanceProvider.tsx");
    expect(provider).toContain("lifemate-command-center-appearance");
    expect(provider).toContain("prefers-color-scheme: dark");
    expect(provider).toContain("document.documentElement.dataset.theme");
    expect(provider).not.toContain("supabase");
  });
});
