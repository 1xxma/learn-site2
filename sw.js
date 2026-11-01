/* LEARN PWA service worker */
const CACHE_NAME = 'learn-pwa-v2';
const OFFLINE_URL = 'offline.html';

const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './auth.js',
  './subjects.html',
  './reviews.html',
  './about.html',
  './contacts.html',
  './login.html',
  './register.html',
  './profile.html',
  './schedule.html',
  './privacy.html',
  './offline.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png',
  './tutor.html',
  './tutor10.html',
  './tutor11.html',
  './tutor12.html',
  './tutor13.html',
  './tutor14.html',
  './tutor15.html',
  './tutor16.html',
  './tutor2.html',
  './tutor3.html',
  './tutor5.html',
  './tutor6.html',
  './tutor7.html',
  './tutor8.html',
  './tutor9.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          return cached;
        });

      return cached || networkFetch;
    })
  );
});
