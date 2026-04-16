// Massrides PWA Service Worker - Enhanced Version
const CACHE_NAME = 'massrides-v3';
const STATIC_CACHE = 'massrides-static-v3';
const DYNAMIC_CACHE = 'massrides-dynamic-v3';

// Logging helper - only log in development
const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
const log = (...args) => isDev && console.log('[SW]', ...args);
const error = (...args) => console.error('[SW]', ...args);

// Assets to cache immediately
const STATIC_ASSETS = [
  '/index.html',
  '/manifest.json',
  '/tractor.ico',
  '/tractor-192x192.png',
  '/tractor-512x512.png'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/products/,
  /\/api\/categories/,
  /\/functions\/v1\/get-/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  log('Installing...');

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  log('Activating...');

  event.waitUntil(
    Promise.all([
      self.registration.navigationPreload?.enable(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              log('Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip Supabase API requests - let the browser handle them directly
  if (url.hostname.includes('supabase.co') ||
      url.pathname.includes('/rest/') ||
      url.pathname.includes('/functions/') ||
      url.pathname.includes('/auth/')) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Strategy 0: HTML navigation - always prefer network so deploys pick up fresh chunk hashes
        if (request.mode === 'navigate') {
          try {
            const preloadResponse = await event.preloadResponse;
            if (preloadResponse) {
              return preloadResponse;
            }

            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
              const cache = await caches.open(STATIC_CACHE);
              cache.put('/index.html', networkResponse.clone());
            }
            return networkResponse;
          } catch (error) {
            const cachedResponse = await caches.match('/index.html');
            if (cachedResponse) {
              return cachedResponse;
            }
            throw error;
          }
        }

        // Strategy 1: Static assets - Cache First
        if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }

        // Strategy 2: API calls - Network First with fallback
        if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
          try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
              const cache = await caches.open(DYNAMIC_CACHE);
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          } catch (error) {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
              return cachedResponse;
            }
            throw error;
          }
        }

        // Strategy 3: Images and assets - Cache First
        if (request.destination === 'image' || url.pathname.includes('/assets/')) {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }

        // Strategy 4: Everything else - Network First
        return await fetch(request);

      } catch (err) {
        error('Fetch failed', err);

        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          const offlineResponse = await caches.match('/');
          if (offlineResponse) {
            return offlineResponse;
          }
          return new Response(
            '<!doctype html><html><head><title>Massrides</title></head><body><p>Offline. Please reconnect and retry.</p></body></html>',
            {
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            }
          );
        }

        return new Response(
          '',
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          }
        );
      }
    })()
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  log('Background sync', event.tag);

  if (event.tag === 'cart-sync') {
    event.waitUntil(syncCart());
  } else if (event.tag === 'activity-log-sync') {
    event.waitUntil(syncActivityLogs());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  log('Push received');

  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (err) {
      error('Error parsing push data:', err);
    }
  }

  const title = payload.title || 'Massrides';
  const options = {
    body: payload.message || payload.body || 'You have a new notification!',
    icon: '/tractor-192x192.png',
    badge: '/tractor-192x192.png',
    tag: payload.tag || 'massrides-notification',
    data: {
      url: payload.url || '/',
      type: payload.type || 'info',
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/tractor-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  log('Notification clicked');

  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Helper functions for background sync
async function syncCart() {
  try {
    // Service workers don't have access to localStorage
    // Use IndexedDB or Cache API instead
    if ('indexedDB' in self) {
      const dbRequest = indexedDB.open('CartSyncDB', 1);

      dbRequest.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction(['cart'], 'readonly');
        const store = transaction.objectStore('cart');
        const getRequest = store.get('guest_cart');

        getRequest.onsuccess = function() {
          const cartData = getRequest.result;
          if (cartData) {
            log('Syncing cart data from IndexedDB');
            // Implementation would depend on your cart sync API
          }
        };
      };

      dbRequest.onupgradeneeded = function(event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('cart')) {
          db.createObjectStore('cart');
        }
      };
    } else {
      log('IndexedDB not available for cart sync');
    }
  } catch (err) {
    error('Cart sync failed', err);
  }
}

async function syncActivityLogs() {
  try {
    // Background sync for activity logs is intentionally a no-op until we
    // persist queued events in IndexedDB. Avoid touching window-only storage.
    log('Activity log sync requested');
  } catch (err) {
    error('Activity log sync failed', err);
  }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  log('Message received', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
