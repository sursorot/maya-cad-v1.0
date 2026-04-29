/**
 * Service Worker for Maya CAD Editor
 * 
 * Caching strategies:
 * - App shell (HTML, CSS, JS): Cache-first with network fallback
 * - Assets (SVG, images): Cache-first, long-term storage
 * - API calls: Network-first with cache fallback
 */

const CACHE_NAME = 'maya-cache-v1';
const STATIC_CACHE_NAME = 'maya-static-v1';

// Critical resources to pre-cache on install
const PRECACHE_RESOURCES = [
  '/',
  '/index.html',
];

// Assets that can be cached long-term
const STATIC_ASSET_PATTERNS = [
  /\.svg$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.webp$/,
  /\.woff2?$/,
  /\.ttf$/,
];

// JS/CSS assets (hashed, cache forever)
const IMMUTABLE_PATTERNS = [
  /\/assets\/.*-[a-f0-9]{8}\.(js|css)$/,
];

/**
 * Install event - pre-cache critical resources
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_RESOURCES))
      .then(() => self.skipWaiting())
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip non-HTTP(S) requests
  if (!url.protocol.startsWith('http')) return;

  // Skip external requests (CDNs will handle their own caching)
  if (url.origin !== self.location.origin) return;

  // Determine caching strategy based on request type
  if (isImmutableAsset(url.pathname)) {
    // Immutable assets (hashed JS/CSS) - cache forever
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
  } else if (isStaticAsset(url.pathname)) {
    // Static assets (images, SVGs) - cache first with background revalidation
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE_NAME));
  } else if (isNavigationRequest(request)) {
    // HTML pages - network first with cache fallback
    event.respondWith(networkFirstWithFallback(request, CACHE_NAME));
  } else {
    // Other requests - network first
    event.respondWith(networkFirst(request, CACHE_NAME));
  }
});

/**
 * Check if URL matches immutable asset patterns (hashed filenames)
 */
function isImmutableAsset(pathname) {
  return IMMUTABLE_PATTERNS.some((pattern) => pattern.test(pathname));
}

/**
 * Check if URL matches static asset patterns
 */
function isStaticAsset(pathname) {
  return STATIC_ASSET_PATTERNS.some((pattern) => pattern.test(pathname));
}

/**
 * Check if request is for HTML navigation
 */
function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         request.headers.get('accept')?.includes('text/html');
}

/**
 * Cache-first strategy
 * Best for immutable assets with hashed filenames
 */
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

/**
 * Network-first strategy
 * Best for dynamic content
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Network-first with offline fallback
 * Best for navigation requests
 */
async function networkFirstWithFallback(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return the cached index.html for SPA navigation
    const fallback = await caches.match('/index.html');
    if (fallback) {
      return fallback;
    }
    throw error;
  }
}

/**
 * Stale-while-revalidate strategy
 * Best for assets that update occasionally
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  return cachedResponse || fetchPromise;
}

/**
 * Handle messages from the main thread
 */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
});

