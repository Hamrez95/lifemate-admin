import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { test, type Page, type Request, type Response } from "@playwright/test";

import { signInWithMfa } from "./helpers/sign-in";

const SYNTHETIC_ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const RESOURCE_SETTLE_MS = 250;

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

type RunSample = {
  route: string;
  path: string;
  run: "cold" | "warm";
  finalUrl: string;
  wallMs: number;
  navigation: unknown;
  resources: unknown;
  requests: RequestSample[];
  responses: ResponseSample[];
  adminApiRequestCount: number;
  authRequestCount: number;
  duplicateRequestKeys: string[];
  failedResponses: ResponseSample[];
};

function safeUrl(raw: string) {
  const parsed = new URL(raw);
  return `${parsed.origin}${parsed.pathname}`;
}

function duplicateKeys(requests: RequestSample[]) {
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

async function measureRoute(page: Page, route: (typeof routes)[number], run: "cold" | "warm") {
  const requests: RequestSample[] = [];
  const responses: ResponseSample[] = [];

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

  const adminApi = requests.filter((request) => {
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
    adminApiRequestCount: adminApi.length,
    authRequestCount: auth.length,
    duplicateRequestKeys: duplicateKeys([...adminApi, ...auth]),
    failedResponses: responses.filter((response) => response.status >= 400),
  } satisfies RunSample;
}

test.describe("PERF-01 authenticated production-build baseline", () => {
  test("captures cold/warm route timing and request fanout without real-user data", async ({
    page,
  }, testInfo) => {
    await signInWithMfa(page);

    const samples: RunSample[] = [];
    for (const route of routes) {
      samples.push(await measureRoute(page, route, "cold"));
      samples.push(await measureRoute(page, route, "warm"));
    }

    const report = {
      schemaVersion: 1,
      generatedAtUtc: new Date().toISOString(),
      environment: "synthetic-authenticated-production-build",
      project: testInfo.project.name,
      fixture: {
        containsRealUserData: false,
        accountId: SYNTHETIC_ACCOUNT_ID,
        auth: "synthetic AAL2 QA fixture",
      },
      limitations: [
        "This harness measures a local production build against synthetic QA services; it is not production traffic latency.",
        "Browser PerformanceResourceTiming may report zero transfer sizes for resources whose timing data is unavailable.",
        "Hydration/React commit cost and INP require a separate controlled trace; this report does not infer them from navigation timing.",
        `Request fanout is observed for ${RESOURCE_SETTLE_MS}ms after DOMContentLoaded rather than waiting for network-idle, because persistent shell polling is intentionally allowed.`,
      ],
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
