const CACHE_NAME = "scoresquad-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/favicon.ico",
  "/manifest.json",
  "/icons/icon.svg",
];

// Install Service Worker and cache essential static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching app shell");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate SW and clean up stale cache versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercept fetch requests to provide offline fallback
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests and skip NextJS webpack-hmr or API route queries that are dynamic
  if (req.method !== "GET" || req.url.includes("/_next/webpack-hmr") || req.url.includes("/api/")) {
    return;
  }

  // Network-First for pages and dynamic assets (ensuring updates when online)
  // Cache-First for static stylesheets, icons, fonts
  const isStaticAsset = 
    req.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|otf)$/) ||
    req.url.includes("/_next/static/");

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(req).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
          return networkResponse;
        });
      })
    );
  } else {
    // Network first strategy
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          // Put page in cache if successful
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(req).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback to home page if cache miss
            return caches.match("/");
          });
        })
    );
  }
});
