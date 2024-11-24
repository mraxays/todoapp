const CACHE_NAME = 'pwa-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  'assets/css/style.css', 
  'assets/js/script.js',
  'assets/img/favicon/icon-192x192.png',
  'assets/img/favicon/icon-512x512.png',
  'assets/sounds/add.mp3',
  'assets/sounds/complete.mp3',
  'assets/sounds/alert.mp3',
  'assets/img/screenshots/desktop.png',
  'assets/img/screenshots/mobile.png',
  'assets/manifest.json',
  'index.html'
];

// Install event: Cache app shell and assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  // Activate new service worker immediately
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  // Take control of all pages immediately
  event.waitUntil(clients.claim());
});

// Fetch event: Network first, fallback to cache strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful network responses
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If no cache found, return offline page
            if (event.request.mode === 'navigate') {
              return caches.match('offline.html');
            }
            // For other resources, return a basic offline response
            return new Response(
              'Offline content not available.',
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'text/plain'
                })
              }
            );
          });
      })
  );
});