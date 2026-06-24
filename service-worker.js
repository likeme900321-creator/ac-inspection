const CACHE_NAME = 'loadcheck-v1';
const CACHE_NAME = 'loadcheck-v2026062401'; // 업데이트할 때마다 이 숫자만 바꾸면 됨

// 오프라인에서도 쓸 수 있도록 캐시할 파일들
const STATIC_ASSETS = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// 설치 시 정적 파일 캐시
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // CDN 파일 캐시 실패해도 설치는 계속
        return cache.addAll(['./', './index.html']);
      });
    })
  );
  self.skipWaiting();
});

// 오래된 캐시 삭제
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 네트워크 요청 처리: Network First 전략
// → 인터넷 되면 최신 데이터, 안 되면 캐시 사용
self.addEventListener('fetch', event => {
  // Supabase API 요청은 캐시하지 않음 (항상 실시간 데이터)
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 성공하면 캐시에도 저장
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // index.html fallback
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
