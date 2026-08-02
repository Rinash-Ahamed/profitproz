const CACHE_VERSION = 'profitpro-pwa-v1'
const OFFLINE_URL = '/offline.html'
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/icons/pwa-192.png',
  '/icons/pwa-512.png',
  '/icons/pwa-maskable-512.png',
  '/icons/apple-touch-icon.png',
]

const SENSITIVE_PREFIXES = ['/api/', '/admin', '/staff']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('profitpro-pwa-') && key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.headers.has('range')) return
  if (SENSITIVE_PREFIXES.some((prefix) => url.pathname === prefix || url.pathname.startsWith(prefix))) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  const isImmutableBuildAsset = url.pathname.startsWith('/_next/static/')
  const isPwaAsset = url.pathname.startsWith('/icons/')
  if (!isImmutableBuildAsset && !isPwaAsset) return

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (!response.ok || response.type !== 'basic') return response
        const copy = response.clone()
        void caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
        return response
      })
    }),
  )
})
