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

// No route for the OSRM hosts: the request URL carries the exact GPS origin, so a cached
// answer could never be reused, and caching it would only write positions to Cache Storage.

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
// A failed download fails the install on purpose: the browser then retries the whole install
// on the next launch, which is the only retry there is. Swallowing it left the worker active
// with no tileset, and the runtime route cannot repair that (the browser sends range
// requests, Workbox never caches a 206), so the map stayed online-only until the next version.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("pmtiles-cache").then(async (cache) => {
      if (!(await cache.match(TILESET_PATH))) await cache.add(TILESET_PATH);
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
