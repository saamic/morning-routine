// Morning Routine service worker — offline support.
// Bump CACHE when the app shell changes to force an update.
const CACHE = "routine-v11";

// Same-origin app shell — precached on install so the app opens offline.
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./favicon-32.png",
];

// Cross-origin runtime deps (React, ReactDOM, Babel, Google Fonts) are cached
// on first successful online load via the fetch handler below.
const RUNTIME_HOSTS = ["unpkg.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const cacheableRuntime = RUNTIME_HOSTS.includes(url.hostname);
  if (!sameOrigin && !cacheableRuntime) return; // let the network handle anything else

  // Cache-first: serve instantly when present, populate the cache on miss.
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === "opaque")) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // Offline miss: fall back to the app shell for navigations.
          if (req.mode === "navigate") return caches.match("./index.html");
          return Response.error();
        });
    })
  );
});
