const CACHE_NAME = 'loadcheck-v2026070102'; // 오늘 날짜로 변경

const STATIC_ASSETS = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        return cache.addAll(['./', './index.html']);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('supabase.co')) {
    return;
  }
  // HTML 파일은 항상 네트워크 우선 (캐시 무시)
  if (event.request.mode === 'navigate' || 
      event.request.url.endsWith('.html') || 
      event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  // 나머지는 Network First 전략 유지
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
