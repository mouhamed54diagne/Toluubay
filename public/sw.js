// Basic Service Worker for PWA installation
// Version: 1.1.0 (Standalone Mode Update)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through strategy - just enough to satisfy PWA requirements
  event.respondWith(fetch(event.request));
});
