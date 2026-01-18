// Massrides PWA Service Worker - Enhanced Version
const CACHE_NAME = 'massrides-v2';
const STATIC_CACHE = 'massrides-static-v2';
const DYNAMIC_CACHE = 'massrides-dynamic-v2';

// Logging helper - only log in development
const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
const log = (...args) => isDev && console.log('[SW]', ...args);
const error = (...args) => console.error('[SW]', ...args);

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
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
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
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
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
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
        }

        throw err;
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

  const options = {
    body: 'You have a new notification!',
    icon: '/tractor-192x192.png',
    badge: '/tractor-192x192.png',
    tag: 'massrides-notification',
    data: {
      url: '/',
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

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.message || options.body;
      options.data.url = data.url || options.data.url;
    } catch (err) {
      error('Error parsing push data:', err);
    }
  }

  event.waitUntil(
    self.registration.showNotification('Massrides', options)
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
    const cartData = localStorage.getItem('guest_cart');
    if (cartData) {
      // Sync cart data when online
      log('Syncing cart data');
      // Implementation would depend on your cart sync API
    }
  } catch (err) {
    error('Cart sync failed', err);
  }
}

async function syncActivityLogs() {
  try {
    const pendingLogs = localStorage.getItem('pending_activity_logs');
    if (pendingLogs) {
      // Sync activity logs when online
      log('Syncing activity logs');
      // Implementation would depend on your activity logging API
    }
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