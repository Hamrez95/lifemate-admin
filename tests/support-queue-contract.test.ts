import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-SUP-001 Support Ticket Queue", () => {
  it("reads support queue through the Admin API only", () => {
    const client = source("src/lib/admin-api/support-queue.ts");

    expect(client).toContain("/api/v1/support/tickets?");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(10_000)");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("health_observations");
    expect(client).not.toContain("medications");
    expect(client).not.toContain("women_calendar");
  });

  it("requires support.read and uses shared server pagination", () => {
    const page = source("app/support/page.tsx");

    expect(page).toContain('admin.permissions.includes("support.read")');
    expect(page).toContain("AdminDataTable");
    expect(page).toContain("pageHref(query, data.page - 1)");
    expect(page).toContain("pageHref(query, data.page + 1)");
  });

  it("offers queue filters for operational triage", () => {
    const page = source("app/support/page.tsx");

    for (const field of ["status", "priority", "product", "sla", "assignee"]) {
      expect(page).toContain(`name="filter.${field}"`);
    }
    expect(page).toContain('name="q"');
    expect(page).toContain('value="unassigned"');
  });

  it("does not rely on color alone for priority or SLA", () => {
    const page = source("app/support/page.tsx");

    expect(page).toContain("slaLabels[row.slaState]");
    expect(page).toContain("priorityLabels[row.priority]");
    expect(page).toContain("support-queue__sla-dot");
    expect(page).toContain("سررسید:");
  });

  it("labels queue excerpts as redacted and links to ticket detail", () => {
    const page = source("app/support/page.tsx");

    expect(page).toContain("خلاصه بازبینی‌شده");
    expect(page).toContain("خلاصه‌ها فقط در صورت redacted بودن نمایش داده می‌شوند");
    expect(page).toContain("href={`/support/${row.ticketId}`}");
    expect(page).toContain("بدون نمایش متن خام گفتگو، اطلاعات تماس یا داده");
    expect(page).toContain("سلامت.");
  });

  it("keeps the visual layer responsive, keyboard visible and motion-aware", () => {
    const css = source("app/support/support.css");
    const feedbackCss = source("app/support/[ticketId]/operation-feedback.module.css");

    expect(css).toContain("var(--lm-green-deep)");
    expect(css).toContain("var(--lm-orange-soft)");
    expect(css).toContain("var(--lm-violet)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("max-width: 768px");
    expect(css).toContain("max-width: 390px");
    expect(feedbackCss).toContain("prefers-reduced-motion");
  });
});
