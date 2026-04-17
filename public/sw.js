// Basic Service Worker for PWA installation
// Version: 1.0.2 (Force audio fix refresh)
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
