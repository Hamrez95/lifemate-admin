const CACHE_PREFIX = "lifemate-admin-static-";
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const SHELL_ASSETS = [
  "/offline",
  "/manifest.webmanifest",
  "/pwa-icon/192",
  "/pwa-icon/512",
  "/pwa-icon/maskable-512",
];

const SAFE_STATIC_PREFIXES = ["/_next/static/"];
const SAFE_EXACT_PATHS = new Set(SHELL_ASSETS);
const SENSITIVE_PREFIXES = ["/api/", "/auth/", "/login", "/mfa", "/logout"];

function isSafeStaticRequest(url) {
  return (
    url.origin === self.location.origin &&
    (SAFE_EXACT_PATHS.has(url.pathname) ||
      SAFE_STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)))
  );
}

function isSensitiveRequest(url) {
  return (
    url.origin !== self.location.origin ||
    SENSITIVE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Authenticated navigations are deliberately network-only. The only offline
  // response is the public shell below, which never contains operator data.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }

  // Never intercept API, authentication, cross-origin or other potentially
  // sensitive traffic. This prevents privileged responses entering Cache Storage.
  if (isSensitiveRequest(url) || !isSafeStaticRequest(url)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        await cache.put(request, response.clone());
      }
      return response;
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
