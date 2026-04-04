const CACHE_NAME = "rsimd-items-v4";
const PRECACHE = ["/", "/index.html", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

// Standalone HTML pages — serve directly, don't redirect to SPA
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

  // Skip API calls and non-GET requests
  if (url.pathname.startsWith("/api") || event.request.method !== "GET") {
    return;
  }

  // Standalone HTML pages — let them through to the network, don't serve SPA
  if (event.request.mode === "navigate" && STANDALONE_PAGES.some((p) => url.pathname.startsWith(p))) {
    return;
  }

  // For SPA navigation requests, serve index.html from cache
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match("/index.html").then((cached) => {
        return cached || fetch(event.request);
      })
    );
    return;
  }

  // Static assets: stale-while-revalidate
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
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
