// Service Worker for MyGGV GPS PWA
// Provides offline support and caching for better performance

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `myggv-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `myggv-dynamic-${CACHE_VERSION}`;
const TILE_CACHE = `myggv-tiles-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Tile servers to cache
const TILE_HOSTS = [
  'a.tile.openstreetmap.org',
  'b.tile.openstreetmap.org',
  'c.tile.openstreetmap.org',
  'tiles.openfreemap.org',
  'server.arcgisonline.com',
];

// Max tiles to cache (prevent storage bloat)
const MAX_TILE_CACHE_SIZE = 500;

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => {
            return (
              key.startsWith('myggv-') &&
              key !== STATIC_CACHE &&
              key !== DYNAMIC_CACHE &&
              key !== TILE_CACHE
            );
          })
          .map((key) => caches.delete(key))
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Handle tile requests (cache-first, long TTL)
  if (TILE_HOSTS.some((host) => url.hostname.includes(host))) {
    event.respondWith(handleTileRequest(request));
    return;
  }

  // Handle API requests (network-first)
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('router.project-osrm.org') ||
    url.hostname.includes('openrouteservice.org')
  ) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets (cache-first)
  if (url.origin === self.location.origin) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle external resources (stale-while-revalidate)
  event.respondWith(handleExternalRequest(request));
});

// Cache-first for static assets
async function handleStaticRequest(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return offline fallback if available
    return caches.match('/') || new Response('Offline', { status: 503 });
  }
}

// Cache-first for map tiles with size limit
async function handleTileRequest(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(TILE_CACHE);

      // Check cache size and trim if needed
      const keys = await cache.keys();
      if (keys.length >= MAX_TILE_CACHE_SIZE) {
        // Remove oldest 100 tiles
        const toDelete = keys.slice(0, 100);
        await Promise.all(toDelete.map((key) => cache.delete(key)));
      }

      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return cached tile or transparent placeholder
    return cached || new Response('', { status: 404 });
  }
}

// Network-first for API requests
async function handleApiRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Stale-while-revalidate for external resources
async function handleExternalRequest(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        const cache = caches.open(DYNAMIC_CACHE);
        cache.then((c) => c.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}
