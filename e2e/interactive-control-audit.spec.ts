import { expect, test, type Page } from "@playwright/test";

import { signInWithMfa } from "./helpers/sign-in";

const primaryRoutes = [
  "/",
  "/users",
  "/analytics",
  "/analytics/funnel",
  "/analytics/cohorts",
  "/relationships",
  "/relationships/ledger",
  "/support",
  "/commerce",
  "/commerce/plans",
  "/commerce/entitlements",
  "/commerce/promotions",
  "/commerce/subscriptions",
  "/commerce/transactions",
  "/commerce/revenue",
  "/marketing",
  "/marketing/campaigns",
  "/marketing/channels",
  "/marketing/content-calendar",
  "/marketing/content-studio",
  "/finance",
  "/finance/budget",
  "/finance/cash",
  "/finance/scenario",
  "/operations",
  "/security",
  "/security/audit",
  "/ai",
  "/ai/daily-brief",
  "/settings",
  "/profile",
] as const;

type ControlFinding = {
  kind: string;
  text: string;
  detail: string;
};

async function interactiveControlFindings(page: Page): Promise<ControlFinding[]> {
  return page.evaluate(() => {
    const findings: ControlFinding[] = [];
    const visible = (element: Element) => {
      const html = element as HTMLElement;
      const style = window.getComputedStyle(html);
      const rect = html.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const label = (element: Element) =>
      (element.getAttribute("aria-label") ?? element.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim();

    for (const anchor of document.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      if (!visible(anchor)) continue;
      const raw = anchor.getAttribute("href")?.trim() ?? "";
      if (
        raw === "" ||
        raw === "#" ||
        raw.toLowerCase().startsWith("javascript:") ||
        raw.includes("/undefined") ||
        raw.includes("/null")
      ) {
        findings.push({ kind: "link", text: label(anchor), detail: `invalid href: ${raw}` });
      }
      if (!label(anchor)) {
        findings.push({
          kind: "link",
          text: "",
          detail: `missing accessible label for ${raw}`,
        });
      }
    }

    for (const button of document.querySelectorAll<HTMLButtonElement>("button")) {
      if (!visible(button)) continue;
      const text = label(button);
      if (!text) {
        findings.push({ kind: "button", text, detail: "missing accessible label" });
      }
      if (!button.disabled) continue;

      const describedBy = button.getAttribute("aria-describedby");
      const describedText = describedBy
        ? describedBy
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent ?? "")
            .join(" ")
            .trim()
        : "";
      const nearby =
        button.parentElement?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      const reason = [button.title, describedText, nearby].filter(Boolean).join(" ");
      if (
        !/(غیرفعال|در دسترس نیست|موجود نیست|endpoint|contract|Core|مجوز|permission|unavailable|disabled)/i.test(
          reason,
        )
      ) {
        findings.push({
          kind: "disabled-button",
          text,
          detail: "disabled control has no truthful dependency/reason text",
        });
      }
    }

    for (const control of document.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input:not([type='hidden']), select, textarea")) {
      if (!visible(control) || control.disabled) continue;
      const id = control.id;
      const hasLabel =
        Boolean(control.getAttribute("aria-label")) ||
        Boolean(control.getAttribute("aria-labelledby")) ||
        Boolean(
          id && document.querySelector(`label[for=${JSON.stringify(id)}]`),
        ) ||
        Boolean(control.closest("label"));
      if (!hasLabel) {
        findings.push({
          kind: "form-control",
          text: control.getAttribute("name") ?? id,
          detail: "enabled form control has no accessible label",
        });
      }
    }

    return findings;
  });
}

async function expectInternalLinksResolve(page: Page) {
  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
      .map((anchor) => anchor.href)
      .filter((href) => href.startsWith(window.location.origin))
      .filter((href, index, all) => all.indexOf(href) === index)
      .slice(0, 24),
  );

  for (const href of links) {
    const response = await page.context().request.get(href, { failOnStatusCode: false });
    expect(response.status(), href).not.toBe(404);
    expect(response.status(), href).toBeLessThan(500);
  }
}

test("primary Command Center routes have no malformed or unexplained interactive controls", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signInWithMfa(page);

  for (const route of primaryRoutes) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status() ?? 500, route).toBeLessThan(500);
    await expect(page.locator("body"), route).toBeVisible();

    const findings = await interactiveControlFindings(page);
    expect(findings, `${route}: interactive control audit`).toEqual([]);
    await expectInternalLinksResolve(page);
  }
});
