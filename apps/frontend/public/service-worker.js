const APP_CACHE = "promptforge-shell-v2";
const HISTORY_CACHE = "promptforge-history-v2";
const APP_SHELL = ["/", "/index.html", "/promptforge-icon.svg"];

const isHistoryRequest = (requestUrl, request) =>
  request.method === "GET" && requestUrl.pathname.startsWith("/api/prompts/history");

const isStaticAssetRequest = (requestUrl, request) => {
  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return false;
  }

  if (request.mode === "navigate") {
    return true;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    return false;
  }

  return /\/(assets\/.*|favicon\.ico|promptforge-icon\.svg|manifest\.webmanifest)$/u.test(
    requestUrl.pathname
  );
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![APP_CACHE, HISTORY_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (isHistoryRequest(requestUrl, event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          void caches.open(HISTORY_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return (
            cached ||
            new Response(JSON.stringify({ success: true, data: { items: [], total: 0 } }), {
              headers: { "Content-Type": "application/json" }
            })
          );
        })
    );
    return;
  }

  if (!isStaticAssetRequest(requestUrl, event.request)) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cachedShell = await caches.match("/index.html");
        return cachedShell || Response.error();
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          void caches.open(APP_CACHE).then((cache) => cache.put(event.request, clone));
        }

        return response;
      });
    })
  );
});
