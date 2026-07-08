// Bump CACHE_NAME on every deploy so installed clients pick up the new shell.
const CACHE_NAME = "fitrack-shell-v2";
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./fonts/archivo.woff2",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isNavigation = req =>
  req.mode === "navigate" || req.destination === "document" ||
  (req.headers.get("accept") || "").includes("text/html");

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  // HTML: network-first so deployed updates reach installed users; cache is the offline fallback.
  if (isNavigation(req)) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then(cached => cached || caches.match("./index.html"))
            .then(cached => cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } }))
        )
    );
    return;
  }

  // Static assets: cache-first, populate cache from network on miss.
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req)
        .then(res => {
          if (res.ok && req.url.startsWith(self.location.origin)) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => new Response("", { status: 503 }));
    })
  );
});
