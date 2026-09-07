import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { test, type Page, type Request, type Response } from "@playwright/test";

import { signInWithMfa } from "./helpers/sign-in";

const SYNTHETIC_ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const RESOURCE_SETTLE_MS = 250;
const PREFETCH_OBSERVATION_MS = 600;
const PERFORMANCE_PROXY_ORIGIN = "http://127.0.0.1:54323";
const runs = ["cold", "warm-1", "warm-2"] as const;

const routes = [
  { name: "dashboard", path: "/" },
  { name: "users", path: "/users" },
  { name: "user-360", path: `/users/${SYNTHETIC_ACCOUNT_ID}` },
  { name: "analytics", path: "/analytics" },
  { name: "support", path: "/support" },
  { name: "commerce", path: "/commerce" },
  { name: "marketing", path: "/marketing" },
  { name: "finance", path: "/finance" },
  { name: "operations", path: "/operations" },
  { name: "security-audit", path: "/security" },
  { name: "profile", path: "/profile" },
  { name: "settings", path: "/settings" },
] as const;

type RequestSample = {
  method: string;
  url: string;
  resourceType: string;
};

type ResponseSample = {
  method: string;
  url: string;
  status: number;
  serverTiming: string | null;
  contentLength: string | null;
};

type ServerRequestSample = {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  responseBytes: number;
};

type RunSample = {
  route: string;
  path: string;
  run: (typeof runs)[number];
  finalUrl: string;
  wallMs: number;
  navigation: unknown;
  resources: unknown;
  requests: RequestSample[];
  responses: ResponseSample[];
  browserAdminApiRequestCount: number;
  authRequestCount: number;
  browserDuplicateRequestKeys: string[];
  failedResponses: ResponseSample[];
  serverAdminApiRequests: ServerRequestSample[];
  serverAdminApiRequestCount: number;
  serverAdminApiDurationMs: number;
  serverDuplicateRequestKeys: string[];
  serverFailedResponses: ServerRequestSample[];
};

function safeUrl(raw: string) {
  const parsed = new URL(raw);
  return `${parsed.origin}${parsed.pathname}`;
}

function duplicateBrowserKeys(requests: RequestSample[]) {
  const counts = new Map<string, number>();
  for (const request of requests) {
    const key = `${request.method} ${safeUrl(request.url)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => `${key} x${count}`)
    .sort();
}

function duplicateServerKeys(requests: ServerRequestSample[]) {
  const counts = new Map<string, number>();
  for (const request of requests) {
    const key = `${request.method} ${request.path}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => `${key} x${count}`)
    .sort();
}

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

async function measureRoute(
  page: Page,
  route: (typeof routes)[number],
  run: (typeof runs)[number],
) {
  const requests: RequestSample[] = [];
  const responses: ResponseSample[] = [];

  await resetServerTrace();

  const onRequest = (request: Request) => {
    requests.push({
      method: request.method(),
      url: request.url(),
      resourceType: request.resourceType(),
    });
  };
  const onResponse = (response: Response) => {
    const request = response.request();
    responses.push({
      method: request.method(),
      url: response.url(),
      status: response.status(),
      serverTiming: response.headers()["server-timing"] ?? null,
      contentLength: response.headers()["content-length"] ?? null,
    });
  };

  page.on("request", onRequest);
  page.on("response", onResponse);
  const startedAt = performance.now();
  await page.goto(route.path, { waitUntil: "domcontentloaded" });
  const wallMs = performance.now() - startedAt;
  await page.waitForTimeout(RESOURCE_SETTLE_MS);
  page.off("request", onRequest);
  page.off("response", onResponse);

  const serverRequests = await readServerTrace();
  const browserMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as
      PerformanceNavigationTiming | undefined;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const js = resources.filter((entry) => entry.initiatorType === "script");
    const nextData = resources.filter(
      (entry) => entry.name.includes("/_next/") || entry.name.includes("?_rsc="),
    );
    return {
      navigation: navigation
        ? {
            ttfbMs: navigation.responseStart,
            domContentLoadedMs: navigation.domContentLoadedEventEnd,
            loadMs: navigation.loadEventEnd,
            transferSize: navigation.transferSize,
            encodedBodySize: navigation.encodedBodySize,
          }
        : null,
      resources: {
        count: resources.length,
        transferBytes: resources.reduce((total, entry) => total + entry.transferSize, 0),
        jsCount: js.length,
        jsTransferBytes: js.reduce((total, entry) => total + entry.transferSize, 0),
        nextDataCount: nextData.length,
        nextDataTransferBytes: nextData.reduce((total, entry) => total + entry.transferSize, 0),
      },
    };
  });

  const browserAdminApi = requests.filter((request) => {
    const pathname = new URL(request.url).pathname;
    return pathname.startsWith("/api/v1/") || pathname.startsWith("/api/admin/");
  });
  const auth = requests.filter((request) => {
    const pathname = new URL(request.url).pathname;
    return pathname.startsWith("/auth/v1/") || pathname.includes("lifemate-admin-auth");
  });

  return {
    route: route.name,
    path: route.path,
    run,
    finalUrl: page.url(),
    wallMs,
    navigation: browserMetrics.navigation,
    resources: browserMetrics.resources,
    requests,
    responses,
    browserAdminApiRequestCount: browserAdminApi.length,
    authRequestCount: auth.length,
    browserDuplicateRequestKeys: duplicateBrowserKeys([...browserAdminApi, ...auth]),
    failedResponses: responses.filter((response) => response.status >= 400),
    serverAdminApiRequests: serverRequests,
    serverAdminApiRequestCount: serverRequests.length,
    serverAdminApiDurationMs: Number(
      serverRequests.reduce((total, request) => total + request.durationMs, 0).toFixed(2),
    ),
    serverDuplicateRequestKeys: duplicateServerKeys(serverRequests),
    serverFailedResponses: serverRequests.filter((response) => response.status >= 400),
  } satisfies RunSample;
}

async function observeSidebarPrefetch(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(RESOURCE_SETTLE_MS);

  const observedRequests: RequestSample[] = [];
  const onRequest = (request: Request) => {
    const url = new URL(request.url());
    if (url.pathname !== "/users") return;
    observedRequests.push({
      method: request.method(),
      url: request.url(),
      resourceType: request.resourceType(),
    });
  };

  page.on("request", onRequest);
  const usersLink = page.locator('a[href="/users"]').first();
  await usersLink.hover();
  await usersLink.focus();
  await page.waitForTimeout(PREFETCH_OBSERVATION_MS);
  page.off("request", onRequest);

  return {
    target: "/users",
    interaction: "hover+focus",
    observationMs: PREFETCH_OBSERVATION_MS,
    requests: observedRequests,
    rscRequestCount: observedRequests.filter((request) =>
      new URL(request.url).searchParams.has("_rsc"),
    ).length,
  };
}

test.describe("PERF-01 authenticated production-build baseline", () => {
  test("captures repeated route timing and safe server fanout without real-user data", async ({
    page,
  }, testInfo) => {
    await signInWithMfa(page);

    const samples: RunSample[] = [];
    for (const route of routes) {
      for (const run of runs) samples.push(await measureRoute(page, route, run));
    }

    const prefetchObservation =
      testInfo.project.name === "desktop-chromium" ? await observeSidebarPrefetch(page) : null;

    const report = {
      schemaVersion: 2,
      generatedAtUtc: new Date().toISOString(),
      environment: "synthetic-authenticated-production-build",
      project: testInfo.project.name,
      fixture: {
        containsRealUserData: false,
        accountId: SYNTHETIC_ACCOUNT_ID,
        auth: "synthetic AAL2 QA fixture",
      },
      privacy: {
        serverTraceFields: ["method", "path", "status", "durationMs", "responseBytes"],
        queryStringsCaptured: false,
        requestBodiesCaptured: false,
        responseBodiesCaptured: false,
      },
      limitations: [
        "This harness measures a local production build against synthetic QA services; it is not production traffic latency.",
        "Browser PerformanceResourceTiming may report zero transfer sizes for resources whose timing data is unavailable.",
        "Hydration/React commit cost and INP require a separate controlled trace; this report does not infer them from navigation timing.",
        `Request fanout is observed for ${RESOURCE_SETTLE_MS}ms after DOMContentLoaded rather than waiting for network-idle, because persistent shell polling is intentionally allowed.`,
        "The first visit to each route within one authenticated browser session is classified as cold for that route; it is not a fresh browser-process cold start.",
      ],
      repeatability: {
        samplesPerRoute: runs.length,
        runLabels: runs,
      },
      prefetchObservation,
      samples,
    };

    const directory = path.resolve("artifacts/performance");
    await mkdir(directory, { recursive: true });
    const safeProject = testInfo.project.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
    await writeFile(
      path.join(directory, `performance-baseline-${safeProject}.json`),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
  });
});
