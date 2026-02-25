/// <reference lib="webworker" />
// MyGGV GPS — Workbox Service Worker
// 5-tier caching strategy for offline-first PWA

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { RangeRequestsPlugin } from "workbox-range-requests";
import { clientsClaim } from "workbox-core";

// Immediate activation on update
clientsClaim();

// --- Tier 1: Precache Vite build assets (JS, CSS, HTML, sprites, icons) ---
precacheAndRoute(self.__WB_MANIFEST);

// --- Tier 2: CacheFirst (24h) for map fonts ---
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.match(/^\/map-fonts\/.*\.pbf$/),
  new CacheFirst({
    cacheName: "map-assets",
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 86400,
      }),
    ],
  })
);

// --- Tier 3: CacheFirst + RangeRequestsPlugin for PMTiles ---
// Full file is warm-cached during SW install (see below).
// Runtime route slices range requests from the cached full response.
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin &&
    url.pathname.startsWith("/tiles/") &&
    url.pathname.endsWith(".pmtiles"),
  new CacheFirst({
    cacheName: "pmtiles-cache",
    plugins: [new RangeRequestsPlugin()],
  })
);

// --- Tier 4: StaleWhileRevalidate (1h) for Supabase RPC ---
registerRoute(
  ({ url }) => url.hostname === "wlrrruemchacgyypexsu.supabase.co",
  new StaleWhileRevalidate({
    cacheName: "supabase-data",
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 3600,
      }),
    ],
  })
);

// --- Tier 5: NetworkFirst (3s) for routing APIs ---
registerRoute(
  ({ url }) =>
    url.hostname.includes("router.project-osrm.org") ||
    url.hostname.includes("api.openrouteservice.org"),
  new NetworkFirst({
    cacheName: "routing-api",
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 3600,
      }),
    ],
  })
);

// --- Navigation requests: NetworkFirst for HTML documents ---
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "html-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 5,
        maxAgeSeconds: 86400,
      }),
    ],
  })
);

// --- SW Install: warm-cache PMTiles file + skipWaiting ---
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open("pmtiles-cache")
      .then((cache) => cache.add("/tiles/ggv.pmtiles"))
      .catch(() => {
        // PMTiles warm-cache failed (slow network, timeout) —
        // SW still activates; map tiles work online, offline after retry
      })
  );
  self.skipWaiting();
});
