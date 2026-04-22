/**
 * OWASEEL Service Worker
 * - Offline caching (cache-first for assets, network-first for API)
 * - Push notifications (extended from original)
 * - Background sync ready
 *
 * v3: Never cache Vite dev-server bundles (URLs with ?v= query params or
 *     @fs/ paths) to prevent stale React chunks causing hook call crashes.
 */

const CACHE_NAME = "owaseel-v3";
const OFFLINE_URL = "/";

// Assets to precache on install
const PRECACHE_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[SW] Precache failed for some assets:", err);
      });
    })
  );
  self.skipWaiting();
});

// ─── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            // Delete ALL old owaseel-* caches (v1, v2, etc.) and any other stale caches
            .filter((key) => key !== CACHE_NAME)
            .map((key) => {
              console.log("[SW] Deleting old cache:", key);
              return caches.delete(key);
            })
        )
      )
      .then(() => {
        // Take control of all open clients immediately
        return self.clients.claim();
      })
      .then(() => {
        // Tell all clients to reload so they pick up fresh bundles
        return self.clients.matchAll({ type: "window" }).then((clients) => {
          clients.forEach((client) => client.navigate(client.url));
        });
      })
  );
});
// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true for URLs that must NEVER be cached by the service worker.
 * This includes:
 *  - Vite dev-server bundles (contain ?v= query param — versioned by Vite)
 *  - @fs/ paths (Vite file-system proxy for node_modules)
 *  - /__manus__/ internal debug paths
 *  - HMR / websocket upgrade requests
 */
function shouldBypassCache(url) {
  // Vite dev-server versioned bundles — always fresh
  if (url.search.includes("v=")) return true;
  // Vite @fs/ file-system proxy
  if (url.pathname.startsWith("/@fs/")) return true;
  // Vite HMR and internal paths
  if (url.pathname.startsWith("/@vite/")) return true;
  if (url.pathname.startsWith("/__manus__/")) return true;
  // node_modules served directly
  if (url.pathname.includes("/node_modules/")) return true;
  return false;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Never cache Vite dev bundles — pass through directly
  if (shouldBypassCache(url)) return;

  // API calls: network-first, no cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: "offline", message: "لا يوجد اتصال بالإنترنت" }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      })
    );
    return;
  }

  // Static assets: cache-first (only for clean paths without query strings)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Only cache clean static assets (no query strings)
          if (
            response.ok &&
            !url.search &&
            (url.pathname.match(/\.(css|png|jpg|svg|woff2?|ico)$/) ||
              url.pathname === "/" ||
              url.pathname.startsWith("/assets/") ||
              url.pathname.startsWith("/icons/") ||
              url.pathname.startsWith("/manus-storage/"))
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback for navigation requests
          if (request.mode === "navigate") {
            return caches.match(OFFLINE_URL) || new Response("Offline", { status: 503 });
          }
          return new Response("Offline", { status: 503 });
        });
    })
  );
});

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "OWASEEL | أو وصل", body: event.data.text() };
  }

  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: payload.tag || "owaseel-notification",
    dir: "rtl",
    lang: "ar",
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: { url: payload.url || "/" },
    actions: [
      { action: "open", title: "فتح التطبيق" },
      { action: "dismiss", title: "إغلاق" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(
      payload.title || "OWASEEL | أو وصل",
      options
    )
  );
});

// ─── Notification Click ───────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(url) && "focus" in c);
        if (existing) return existing.focus();
        return self.clients.openWindow(url);
      })
  );
});
