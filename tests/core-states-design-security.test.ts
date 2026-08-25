import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("Command Center core state design/security contract", () => {
  it("uses a compact accessible skeleton without fabricated data", () => {
    const loading = source("app/loading.tsx");
    const sharedLoading = source("src/components/ui/LoadingState.tsx");
    const styles = source("app/standalone-state.module.css");

    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain('aria-live="polite"');
    expect(loading).toContain("styles.loadingPage");
    expect(sharedLoading).toContain("loadingSkeleton");
    expect(sharedLoading).not.toContain("stateDescription");
    expect(styles).toContain(".loadingPage");
    expect(loading).not.toMatch(/service_role|DATABASE_URL|SUPABASE_SERVICE|\.from\(/i);
  });

  it("keeps forbidden access short and server-authorization oriented", () => {
    const forbidden = source("app/forbidden/page.tsx");
    const sharedForbidden = source("src/components/ui/ForbiddenState.tsx");
    expect(forbidden).toContain("ForbiddenState");
    expect(forbidden).toContain('href="/profile"');
    expect(sharedForbidden).toContain("سمت سرور");
    expect(sharedForbidden).not.toMatch(/bypass|service_role|DATABASE_URL|\.from\(/i);
  });

  it("keeps fatal errors fail-closed, concise and recoverable", () => {
    const error = source("app/error.tsx");
    expect(error).toContain('role="alert"');
    expect(error).toContain("onClick={reset}");
    expect(error).toContain("fallback مستقیم به دیتابیس انجام نمی‌شود");
    expect(error).not.toMatch(/service_role|DATABASE_URL|SUPABASE_SERVICE|\.from\(/i);
  });

  it("reserves the sprout artwork for empty and success states without priority preload", () => {
    const adminState = source("src/components/admin-data-table/admin-page-state.tsx");
    const emptyState = source("src/components/ui/EmptyState.tsx");
    const successState = source("src/components/ui/SuccessState.tsx");
    const combined = `${adminState}\n${emptyState}\n${successState}`;

    expect(adminState).toContain('state === "empty" || state === "success"');
    expect(adminState).toContain("/design-assets/empty-success-sprout-v1.png");
    expect(emptyState).toContain("/design-assets/empty-success-sprout-v1.png");
    expect(successState).toContain("/design-assets/empty-success-sprout-v1.png");
    expect(combined).not.toMatch(/\bpriority\b/);
  });

  it("keeps primary data routes on the shared loading/forbidden/error state contract", () => {
    for (const route of ["app/users/page.tsx", "app/relationships/page.tsx", "app/commerce/page.tsx"]) {
      const content = source(route);
      expect(content).toContain("AdminPageState");
      expect(content).toContain('state="loading"');
      expect(content).toContain('state="forbidden"');
    }
  });

  it("keeps not-found truthful instead of fabricating a destination", () => {
    const notFound = source("app/not-found.tsx");
    expect(notFound).toContain("404");
    expect(notFound).toContain("هیچ داده‌ای");
    expect(notFound).toContain('href="/"');
    expect(notFound).not.toMatch(/service_role|DATABASE_URL|SUPABASE_SERVICE|\.from\(/i);
  });

  it("respects reduced motion and keyboard focus", () => {
    const standalone = source("app/standalone-state.module.css");
    const tableStyles = source("src/components/admin-data-table/admin-data-table.module.css");
    expect(standalone).toContain("@media (prefers-reduced-motion: reduce)");
    expect(standalone).toContain(":focus-visible");
    expect(tableStyles).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
