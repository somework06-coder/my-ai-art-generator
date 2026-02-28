const CACHE_NAME = 'motion-studio-app-shell-v2';
const DYNAMIC_CACHE = 'motion-studio-dynamic-v2';
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
    '/',
    OFFLINE_URL,
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    const isApiRequest = url.pathname.includes('/api/') || url.hostname.includes('supabase');

    // Ignore Chrome extensions
    if (url.protocol === 'chrome-extension:') return;

    if (isApiRequest) {
        // Network-only for API and Auth to ensure fresh data
        event.respondWith(fetch(event.request).catch((err) => {
            console.log('API call failed while offline', err);
            // We'll let the client handle standard API offline behaviors
            return new Response(JSON.stringify({ error: 'Offline' }), {
                status: 503, headers: { 'Content-Type': 'application/json' }
            });
        }));
        return;
    }

    // Is it a page navigation?
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Cache the latest version of the page
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, responseClone));
                    return response;
                })
                .catch(() => {
                    // Try to serve cached page first, otherwise serve offline fallback
                    return caches.match(event.request).then((response) => {
                        return response || caches.match(OFFLINE_URL);
                    });
                })
        );
        return;
    }

    // Static assets (CSS, JS, Fonts, Images)
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseClone = networkResponse.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, responseClone));
                }
                return networkResponse;
            }).catch(() => {
                // Ignore network errors for background asset fetching 
            });

            // Return cached response immediately if available, otherwise wait for network
            return cachedResponse || fetchPromise;
        })
    );
});

// --- BACKGROUND SYNC (Phase 3) ---
self.addEventListener('sync', (event) => {
    if (event.tag === 'export-video-sync') {
        console.log('[SW] Background sync triggered for export-video');
        // Because Next.js client state handles the actual video encoding queue,
        // the SW just needs to claim clients and tell them to process the queue.
        // We use postMessage to trigger the fallback logic in DownloadQueueProvider.
        event.waitUntil(
            self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({ type: 'SYNC_EXPORT_QUEUE' });
                });
            })
        );
    }
});
