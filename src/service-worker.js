// src/service-worker.js

// Define cache name and assets to cache (app shell)
const CACHE_NAME = 'agri-equipment-cache-v1';
const APP_SHELL_ASSETS = [
  '/', // Cache the root HTML file
  '/index.html',
  '/src/main.tsx', // Your main entry point
  '/src/App.tsx', // Your main App component
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  // Add paths to your core CSS, JS bundles, and essential assets here
  // Note: In a build process, these paths would typically be generated
  // For development, you might need to adjust these or use a tool
  // This is a simplified example. You'd cache your bundled assets.
  // Example: '/dist/index.html', '/dist/assets/index.js', '/dist/assets/style.css'
];

// Service worker installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(APP_SHELL_ASSETS);
      })
  );
});

// Service worker activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  event.waitUntil(clients.claim());
});

// Fetch event handling for caching and serving assets
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Cache-first strategy for app shell assets
      if (cachedResponse) {
        console.log('Service Worker: Serving from cache', event.request.url);
        return cachedResponse;
      }

      // Stale-while-revalidate strategy for other resources
      return fetch(event.request).then((networkResponse) => {
        // Check if the response is valid
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Clone the response as it can only be consumed once
        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });

        return networkResponse;
      })
      .catch(() => {
        // Handle offline scenarios for resources not in cache
        // You might return an offline page or a placeholder
        console.log('Service Worker: Fetch failed for', event.request.url);
        // Example: return caches.match('/offline.html'); // If you have an offline page
      });
    })
  );
});

// Push event handling for notifications
self.addEventListener('push', (event) => {
 console.log('Service Worker: Push received');

 const options = {
 body: 'You have a new message or update!', // Default body
 icon: '/path/to/your/icon.png', // Path to your app icon
 badge: '/path/to/your/badge.png', // Path to your app badge icon (optional)
 data: { // Optional data to be included with the notification
 url: '/', // URL to open when notification is clicked
 },
 };

 if (event.data) {
    options.body = event.data.text(); // Use data from the push message if available
 }

 event.waitUntil(self.registration.showNotification('Agri Massrides Update', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});