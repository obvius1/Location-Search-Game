const CACHE_NAME = 'jet-lag-game-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './cards.js',
  './geoUtils.js',
  './storage.js',
  './manifest.json',
  './data/zones.json',
  './icons/android-chrome-192x192.png',
  './icons/android-chrome-512x512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32x32.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Install service worker en cache bestanden
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activeer service worker en verwijder oude caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch strategy: Network first, fallback to cache
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('unpkg.com') &&
      !event.request.url.includes('tile.openstreetmap.org') &&
      !event.request.url.includes('githubusercontent.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone response omdat het slechts één keer gelezen kan worden
        const responseClone = response.clone();
        
        // Update cache met nieuwe versie
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        
        return response;
      })
      .catch(() => {
        // Network fail, gebruik cache
        return caches.match(event.request).then(response => {
          if (response) {
            return response;
          }
          
          // Als het een navigatie request is, return index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          
          return new Response('Offline - geen cache beschikbaar', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});
