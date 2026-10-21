/*
 * After Hours service worker.
 *
 * At build time the Vite plugin in vite.config.ts replaces BUILD_ID and the
 * PRECACHE list with the real build output, so every deploy gets a fresh,
 * complete cache and the old one is dropped on activation.
 *
 * Strategies:
 *   navigations        network-first (with navigation preload), offline → cached shell
 *   /assets/*          cache-first (file names are content-hashed and immutable)
 *   icons, manifest    stale-while-revalidate
 *   Google Fonts       stale-while-revalidate in a small, separate cache
 * Convex traffic (WebSocket + API) is never intercepted.
 *
 * All paths are relative to the worker's scope, so the same file works at the
 * domain root (Vercel) and under a subpath (GitHub Pages: /<repo>/).
 */
const BUILD_ID = "dev";
const PRECACHE = [/* __PRECACHE__ */];

const SHELL = `after-hours-shell-${BUILD_ID}`;
const RUNTIME = "after-hours-runtime-v1";
const FONTS = "after-hours-fonts-v1";
const KEEP = new Set([SHELL, RUNTIME, FONTS]);
const NAV_TIMEOUT_MS = 3500;
/** "/" on Vercel, "/<repo>/" on GitHub Pages. */
const BASE = new URL(self.registration.scope).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    const urls = PRECACHE.length ? PRECACHE : [BASE, `${BASE}manifest.webmanifest`, `${BASE}favicon.svg`];
    await cache.addAll(urls.map((url) => new Request(url, { cache: "reload" })));
    // First install activates immediately; updates wait for the user to apply them.
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("after-hours-") && !KEEP.has(key)).map((key) => caches.delete(key)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") event.waitUntil(self.skipWaiting());
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((key) => cache.delete(key)));
}

async function shellFallback() {
  return (await caches.match(BASE)) ?? Response.error();
}

async function networkFirstNavigation(event) {
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NAV_TIMEOUT_MS));
  const network = (async () => {
    const preloaded = await event.preloadResponse;
    return preloaded ?? fetch(event.request);
  })();
  try {
    const response = await Promise.race([network, timeout]);
    if (response?.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(SHELL).then((cache) => cache.put(BASE, copy)));
      return response;
    }
    if (response) return response;
    // Slow network: answer from cache now, let the fetch finish in the background.
    event.waitUntil(network.catch(() => undefined));
    return shellFallback();
  } catch {
    return shellFallback();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(RUNTIME)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(event, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  const refresh = fetch(event.request).then(async (response) => {
    if (response.ok || response.type === "opaque") {
      await cache.put(event.request, response.clone());
      if (maxEntries) await trim(cacheName, maxEntries);
    }
    return response;
  });
  if (cached) {
    event.waitUntil(refresh.catch(() => undefined));
    return cached;
  }
  return refresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(staleWhileRevalidate(event, FONTS, 30));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(event));
    return;
  }
  if (url.pathname.startsWith(`${BASE}assets/`)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (/\.(?:png|svg|webp|ico|webmanifest)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, RUNTIME, 60));
  }
});
