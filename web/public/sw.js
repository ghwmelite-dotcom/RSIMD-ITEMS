const CACHE_NAME = "rsimd-items-v5";
const PRECACHE = ["/", "/index.html", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];
const STANDALONE_PAGES = ["/field-form", "/guide", "/field-form.html", "/guide.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip API calls, non-GET, and chrome-extension requests
  if (
    url.pathname.startsWith("/api") ||
    event.request.method !== "GET" ||
    !url.protocol.startsWith("http")
  ) {
    return;
  }

  // Standalone HTML pages — pass through to network
  if (event.request.mode === "navigate" && STANDALONE_PAGES.some((p) => url.pathname.startsWith(p))) {
    return;
  }

  // SPA navigation: NETWORK-FIRST (try network, fall back to cache)
  // This prevents stale cache from breaking the app after deployments
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the fresh index.html for offline use
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", clone));
          return response;
        })
        .catch(() => {
          // Offline: serve cached index.html
          return caches.match("/index.html").then((cached) => {
            return cached || new Response("Offline — please check your connection", {
              status: 503,
              headers: { "Content-Type": "text/html" },
            });
          });
        })
    );
    return;
  }

  // Static assets (JS, CSS, images): STALE-WHILE-REVALIDATE
  // Serve cached immediately, update cache in background
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Network failed — return cached version if we have it
          return cached || new Response("", { status: 408 });
        });

      // If we have a cached version, return it immediately
      // The fetch still runs in background to update the cache
      return cached || fetchPromise;
    })
  );
});
