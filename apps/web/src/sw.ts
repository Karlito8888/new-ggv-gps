/// <reference lib="webworker" />
// MyGGV GPS — Workbox Service Worker
// Multi-tier caching strategy for offline-first PWA

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { RangeRequestsPlugin } from "workbox-range-requests";
import { clientsClaim } from "workbox-core";
import { TILESET_PATH } from "./lib/tileset";

// Take over as soon as a new version is available, and claim the open pages.
//
// `skipWaiting` is NOT optional here: with `strategies: "injectManifest"` we own this file, and
// vite-plugin-pwa only forces `workbox.skipWaiting` on the *generateSW* path — its own
// injectManifest guide spells out that an autoUpdate service worker must call it itself.
// Without it the new worker sits in "waiting" forever, the app keeps serving the previous
// precached bundle, and a fix that is live on the web never reaches the installed PWA.
// Measured: two relaunches still served the old bundle and the old version number.
self.skipWaiting();
clientsClaim();

// --- Tier 1: Precache Vite build assets (JS, CSS, HTML, sprites, icons) ---
precacheAndRoute(self.__WB_MANIFEST);

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

// --- Tier 5: NetworkFirst (3s) for the OSRM routing hosts ---
registerRoute(
  ({ url }) =>
    url.hostname.includes("router.project-osrm.org") ||
    url.hostname.includes("routing.openstreetmap.de"),
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

// --- SW Install: warm-cache PMTiles file ---
// The file name is versioned, so an entry already present is the right one: every SW update
// used to re-download the whole tileset here and hold activation until it finished.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open("pmtiles-cache")
      .then(async (cache) => {
        if (!(await cache.match(TILESET_PATH))) await cache.add(TILESET_PATH);
      })
      .catch(() => {
        // PMTiles warm-cache failed (slow network, timeout): the SW still activates and the
        // map works online. Nothing retries until the next SW version installs.
      })
  );
  // No `skipWaiting()` needed here — it runs at the top of this file, so a new worker activates
  // as soon as it installs rather than waiting for a user gesture.
});

// --- SW Activate: drop superseded tilesets ---
// Not at install: the previous worker still serves open pages from this shared cache until this
// one activates, and those pages reload right after (vite-plugin-pwa `autoUpdate` reloads on
// `activated`). Kept when the new file is missing, so an offline install keeps a working map.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.open("pmtiles-cache").then(async (cache) => {
      if (!(await cache.match(TILESET_PATH))) return;
      for (const request of await cache.keys()) {
        if (new URL(request.url).pathname !== TILESET_PATH) await cache.delete(request);
      }
    })
  );
});
