import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const pageSource = readFileSync(resolve(process.cwd(), "app/finance/page.tsx"), "utf8");

describe("ADM-FIN-001 finance workspace contract", () => {
  it("requires finance.read at the route boundary", () => {
    expect(pageSource).toContain('admin.permissions.includes("finance.read")');
    expect(pageSource).toContain('redirect("/forbidden")');
  });

  it("keeps ACTUAL and FORECAST explicitly separate", () => {
    expect(pageSource).toContain("ACTUAL");
    expect(pageSource).toContain("FORECAST");
    expect(pageSource).toContain("Actual revenue");
    expect(pageSource).toContain("Forecast");
  });

  it("does not manufacture finance values while the canonical read model is unavailable", () => {
    expect(pageSource).toContain("—");
    expect(pageSource).toContain(
      "مقادیر\n                Actual، Forecast، هزینه و سود خالص عمداً «—» نمایش داده می‌شوند",
    );
    expect(pageSource).toContain("UI آن‌ها را حدس نمی‌زند");
  });
});
