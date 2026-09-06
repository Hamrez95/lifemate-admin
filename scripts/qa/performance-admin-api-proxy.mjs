import { createServer } from "node:http";
import { performance } from "node:perf_hooks";

const host = "127.0.0.1";
const port = 54323;
const origin = `http://${host}:${port}`;
const MAX_SAMPLES = 2_000;

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function copyRequestHeaders(request) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value == null || name === "host" || name === "content-length") continue;
    headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  return headers;
}

function copyResponseHeaders(response, upstreamHeaders, contentLength) {
  for (const [name, value] of upstreamHeaders.entries()) {
    if (name === "content-length" || name === "transfer-encoding" || name === "connection") continue;
    response.setHeader(name, value);
  }
  response.setHeader("content-length", String(contentLength));
}

export function startPerformanceAdminApiProxy(targetOrigin) {
  let samples = [];

  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", origin);

    if (requestUrl.pathname === "/__qa/performance/reset" && request.method === "POST") {
      samples = [];
      response.writeHead(204, { "cache-control": "no-store" });
      return response.end();
    }

    if (requestUrl.pathname === "/__qa/performance/requests" && request.method === "GET") {
      const body = Buffer.from(JSON.stringify({ samples }), "utf8");
      response.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "content-length": String(body.byteLength),
      });
      return response.end(body);
    }

    const startedAt = performance.now();
    try {
      const body = await readBody(request);
      const targetUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, targetOrigin);
      const upstream = await fetch(targetUrl, {
        method: request.method,
        headers: copyRequestHeaders(request),
        body: body.byteLength > 0 && request.method !== "GET" && request.method !== "HEAD" ? body : undefined,
        redirect: "manual",
      });
      const responseBody = Buffer.from(await upstream.arrayBuffer());
      const durationMs = performance.now() - startedAt;

      if (samples.length < MAX_SAMPLES) {
        samples.push({
          method: request.method ?? "GET",
          path: requestUrl.pathname,
          status: upstream.status,
          durationMs: Number(durationMs.toFixed(2)),
          responseBytes: responseBody.byteLength,
        });
      }

      copyResponseHeaders(response, upstream.headers, responseBody.byteLength);
      response.writeHead(upstream.status);
      response.end(responseBody);
    } catch (error) {
      const durationMs = performance.now() - startedAt;
      if (samples.length < MAX_SAMPLES) {
        samples.push({
          method: request.method ?? "GET",
          path: requestUrl.pathname,
          status: 502,
          durationMs: Number(durationMs.toFixed(2)),
          responseBytes: 0,
        });
      }
      const body = Buffer.from(
        JSON.stringify({
          status: 502,
          code: "qa_performance_proxy_upstream_failure",
          title: error instanceof Error ? error.name : "Upstream failure",
        }),
        "utf8",
      );
      response.writeHead(502, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "content-length": String(body.byteLength),
      });
      response.end(body);
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve({ server, origin }));
  });
}
