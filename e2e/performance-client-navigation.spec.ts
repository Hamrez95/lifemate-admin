import { mkdir, writeFile } from "node:fs/promises";
import { performance as nodePerformance } from "node:perf_hooks";
import path from "node:path";

import { expect, test, type Page, type Request, type Response } from "@playwright/test";

import { signInWithMfa } from "./helpers/sign-in";

const PERFORMANCE_PROXY_ORIGIN = "http://127.0.0.1:54323";
const SETTLE_MS = 250;
const runs = ["warm-1", "warm-2", "warm-3"] as const;

const transitions = [
  { name: "users", path: "/users" },
  { name: "analytics", path: "/analytics" },
  { name: "finance", path: "/finance" },
  { name: "operations", path: "/operations" },
  { name: "security", path: "/security" },
  { name: "ai", path: "/ai" },
  { name: "settings", path: "/settings" },
] as const;

type ServerRequestSample = {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  responseBytes: number;
};

type TransitionRequest = {
  method: string;
  path: string;
  resourceType: string;
  isRsc: boolean;
  status: number | null;
  durationMs: number | null;
};

type LongTaskSample = {
  startTime: number;
  duration: number;
};

type TransitionSample = {
  route: string;
  path: string;
  run: (typeof runs)[number];
  clickToUrlMs: number;
  clickToActiveNavMs: number;
  rscRequestCount: number;
  routeRequestCount: number;
  failedRouteResponses: TransitionRequest[];
  routeRequests: TransitionRequest[];
  serverRequests: ServerRequestSample[];
  serverRequestCount: number;
  serverDurationMs: number;
  longTasks: LongTaskSample[];
  longTaskCount: number;
  longTaskDurationMs: number;
  finalUrl: string;
};

async function resetServerTrace() {
  const response = await fetch(`${PERFORMANCE_PROXY_ORIGIN}/__qa/performance/reset`, {
    method: "POST",
  });
  if (!response.ok) throw new Error(`Performance proxy reset failed: ${response.status}`);
}

async function readServerTrace() {
  const response = await fetch(`${PERFORMANCE_PROXY_ORIGIN}/__qa/performance/requests`);
  if (!response.ok) throw new Error(`Performance proxy read failed: ${response.status}`);
  const payload = (await response.json()) as { samples?: ServerRequestSample[] };
  return payload.samples ?? [];
}

async function installLongTaskObserver(page: Page) {
  await page.evaluate(() => {
    const target = window as typeof window & {
      __lifematePerfLongTasks?: LongTaskSample[];
      __lifematePerfLongTaskObserver?: PerformanceObserver;
    };

    target.__lifematePerfLongTaskObserver?.disconnect();
    target.__lifematePerfLongTasks = [];

    if (!("PerformanceObserver" in window)) return;
    const supported = PerformanceObserver.supportedEntryTypes ?? [];
    if (!supported.includes("longtask")) return;

    const observer = new PerformanceObserver((list) => {
      const destination = target.__lifematePerfLongTasks ?? [];
      for (const entry of list.getEntries()) {
        destination.push({ startTime: entry.startTime, duration: entry.duration });
      }
      target.__lifematePerfLongTasks = destination;
    });
    observer.observe({ type: "longtask", buffered: true });
    target.__lifematePerfLongTaskObserver = observer;
  });
}

async function readLongTasks(page: Page) {
  return page.evaluate(() => {
    const target = window as typeof window & { __lifematePerfLongTasks?: LongTaskSample[] };
    return target.__lifematePerfLongTasks ?? [];
  });
}

async function navigateToDashboard(page: Page) {
  if (new URL(page.url()).pathname === "/") return;
  const dashboardLink = page.locator('aside.sidebar a.nav-item[href="/"]').first();
  await expect(dashboardLink).toBeVisible();
  await Promise.all([page.waitForURL(/\/$/, { waitUntil: "commit" }), dashboardLink.click()]);
  await expect(dashboardLink).toHaveAttribute("aria-current", "page");
  await page.waitForTimeout(SETTLE_MS);
}

async function measureClientTransition(
  page: Page,
  route: (typeof transitions)[number],
  run: (typeof runs)[number],
): Promise<TransitionSample> {
  await navigateToDashboard(page);
  await resetServerTrace();
  await installLongTaskObserver(page);
  await page.evaluate(() => performance.clearResourceTimings());

  const requests = new Map<Request, { startedAt: number; sample: TransitionRequest }>();
  const completed: TransitionRequest[] = [];
  const onRequest = (request: Request) => {
    const url = new URL(request.url());
    if (url.origin !== new URL(page.url()).origin) return;
    const isRsc = url.searchParams.has("_rsc");
    if (url.pathname !== route.path && !isRsc) return;

    requests.set(request, {
      startedAt: nodePerformance.now(),
      sample: {
        method: request.method(),
        path: url.pathname,
        resourceType: request.resourceType(),
        isRsc,
        status: null,
        durationMs: null,
      },
    });
  };
  const onResponse = (response: Response) => {
    const tracked = requests.get(response.request());
    if (!tracked) return;
    completed.push({
      ...tracked.sample,
      status: response.status(),
      durationMs: Number((nodePerformance.now() - tracked.startedAt).toFixed(2)),
    });
  };

  page.on("request", onRequest);
  page.on("response", onResponse);

  const link = page.locator(`aside.sidebar a.nav-item[href="${route.path}"]`).first();
  await expect(link).toBeVisible();
  const startedAt = nodePerformance.now();
  await Promise.all([
    page.waitForURL(new RegExp(`${route.path.replaceAll("/", "\\/")}$`), {
      waitUntil: "commit",
    }),
    link.click(),
  ]);
  const clickToUrlMs = nodePerformance.now() - startedAt;

  const activeLink = page.locator(
    `aside.sidebar a.nav-item[href="${route.path}"][aria-current="page"]`,
  );
  await expect(activeLink).toBeVisible();
  const clickToActiveNavMs = nodePerformance.now() - startedAt;
  await page.waitForTimeout(SETTLE_MS);

  page.off("request", onRequest);
  page.off("response", onResponse);

  const serverRequests = await readServerTrace();
  const longTasks = await readLongTasks(page);
  const routeRequests = completed.filter((request) => request.path === route.path || request.isRsc);

  return {
    route: route.name,
    path: route.path,
    run,
    clickToUrlMs: Number(clickToUrlMs.toFixed(2)),
    clickToActiveNavMs: Number(clickToActiveNavMs.toFixed(2)),
    rscRequestCount: routeRequests.filter((request) => request.isRsc).length,
    routeRequestCount: routeRequests.length,
    failedRouteResponses: routeRequests.filter(
      (request) => request.status !== null && request.status >= 400,
    ),
    routeRequests,
    serverRequests,
    serverRequestCount: serverRequests.length,
    serverDurationMs: Number(
      serverRequests.reduce((total, request) => total + request.durationMs, 0).toFixed(2),
    ),
    longTasks,
    longTaskCount: longTasks.length,
    longTaskDurationMs: Number(
      longTasks.reduce((total, task) => total + task.duration, 0).toFixed(2),
    ),
    finalUrl: page.url(),
  };
}

test.describe("PERF-01 authenticated client navigation evidence", () => {
  test("measures real Sidebar Link transitions without changing navigation behavior", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "Desktop Sidebar interaction is measured here; Android keeps the existing production-build route baseline.",
    );

    await signInWithMfa(page);
    await expect(page.locator("aside.sidebar")).toBeVisible();

    // Warm route code/data once so repeated samples isolate in-app transition behavior rather than first-load setup.
    for (const route of transitions) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(SETTLE_MS);
    }
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(SETTLE_MS);

    const samples: TransitionSample[] = [];
    for (const route of transitions) {
      for (const run of runs) samples.push(await measureClientTransition(page, route, run));
    }

    const failures = samples.flatMap((sample) =>
      sample.failedRouteResponses.map(
        (response) => `${sample.route}/${sample.run}: ${response.status} ${response.path}`,
      ),
    );
    expect(failures, `Client transition requests must not fail:\n${failures.join("\n")}`).toEqual(
      [],
    );

    const missingRsc = samples
      .filter((sample) => sample.rscRequestCount === 0)
      .map((sample) => `${sample.route}/${sample.run}`);
    expect(
      missingRsc,
      `Sidebar client transitions should produce observable Next RSC navigation requests:\n${missingRsc.join("\n")}`,
    ).toEqual([]);

    const report = {
      schemaVersion: 1,
      generatedAtUtc: new Date().toISOString(),
      environment: "synthetic-authenticated-production-build",
      project: testInfo.project.name,
      interaction: "real-sidebar-link-click",
      samplesPerRoute: runs.length,
      privacy: {
        containsRealUserData: false,
        queryStringsCaptured: false,
        requestBodiesCaptured: false,
        responseBodiesCaptured: false,
        requestFields: ["method", "path", "resourceType", "isRsc", "status", "durationMs"],
      },
      limitations: [
        "Synthetic local Admin API fixtures isolate client/Next transition behavior; this is not production upstream latency.",
        "Only Sidebar workspaces available to the synthetic technical role are measured.",
        "Long-task entries depend on Chromium PerformanceObserver support and do not replace a full DevTools trace.",
        "The test records actual Link clicks and target active-navigation commit without changing current prefetch behavior.",
      ],
      samples,
    };

    const directory = path.resolve("artifacts/performance");
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "performance-client-navigation-desktop-chromium.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
  });
});
