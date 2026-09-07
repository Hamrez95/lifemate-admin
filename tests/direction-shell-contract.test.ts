import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const source = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("direction-aware Command Center shell", () => {
  it("keeps one shell and persists only a presentation direction preference", () => {
    const provider = source("src/components/ui/DirectionProvider.tsx");
    const shell = source("src/components/ui/AppShell.tsx");

    expect(provider).toContain("lifemate-command-center-direction");
    expect(provider).toContain("document.documentElement.dir");
    expect(provider).not.toMatch(/\.from\(|service_role|SUPABASE_SERVICE_ROLE/i);
    expect(shell).toContain("data-direction={direction}");
  });

  it("places the same sidebar on the correct logical edge in both directions", () => {
    const css = source("app/globals.css");
    expect(css).toContain('.app-shell[data-direction="rtl"]');
    expect(css).toContain("border-inline-end");
    expect(css).toContain("@media (max-width: 680px)");
  });
});
