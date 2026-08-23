import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("Command Center core state design/security contract", () => {
  it("adds an accessible loading state without fabricated data", () => {
    const loading = source("app/loading.tsx");
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain('aria-live="polite"');
    expect(loading).toContain("هیچ داده");
    expect(loading).not.toMatch(/service_role|DATABASE_URL|SUPABASE_SERVICE|\.from\(/i);
  });

  it("keeps forbidden access explanatory and server-authorization oriented", () => {
    const forbidden = source("app/forbidden/page.tsx");
    expect(forbidden).toContain("عضویت فعال");
    expect(forbidden).toContain("سمت سرور");
    expect(forbidden).toContain('href="/profile"');
    expect(forbidden).not.toMatch(/bypass|service_role|DATABASE_URL|\.from\(/i);
  });

  it("keeps fatal errors fail-closed and recoverable", () => {
    const error = source("app/error.tsx");
    expect(error).toContain('role="alert"');
    expect(error).toContain("onClick={reset}");
    expect(error).toContain("به داده مستقیم دیتابیس fallback نمی‌کنیم");
    expect(error).not.toMatch(/service_role|DATABASE_URL|SUPABASE_SERVICE|\.from\(/i);
  });

  it("keeps not-found truthful instead of fabricating a destination", () => {
    const notFound = source("app/not-found.tsx");
    expect(notFound).toContain("404");
    expect(notFound).toContain("هیچ داده‌ای");
    expect(notFound).toContain('href="/"');
    expect(notFound).not.toMatch(/service_role|DATABASE_URL|SUPABASE_SERVICE|\.from\(/i);
  });

  it("respects reduced motion and keyboard focus", () => {
    const styles = source("app/standalone-state.module.css");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain(":focus-visible");
    expect(styles).toContain("100svh");
  });
});
