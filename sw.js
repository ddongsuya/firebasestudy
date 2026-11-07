/* 고덕지도 한국어판 — 오프라인 캐시 (앱 셸 + 최근 본 지도 타일) */
const VERSION = 'goduk-v1';
const SHELL = [
  './', './index.html', './manifest.json',
  './css/style.css', './js/app.js', './js/data.js', './js/gcj02.js',
  './vendor/leaflet/leaflet.js', './vendor/leaflet/leaflet.css',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
];
const TILE_CACHE = 'goduk-tiles-v1';
const TILE_LIMIT = 1500; // 타일 캐시 최대 개수(대략 20~30MB)

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== VERSION && k !== TILE_CACHE).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // 지도 타일: 네트워크 우선, 실패 시 캐시 (오프라인에서도 최근 본 지역은 보임)
  if (url.hostname.endsWith('autonavi.com')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) { const clone = res.clone(); caches.open(TILE_CACHE).then(c => c.put(e.request, clone).then(trimTiles)); }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // 앱 셸: 캐시 우선, 백그라운드 갱신
  if (e.request.method === 'GET' && url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const net = fetch(e.request).then(res => { if (res.ok) caches.open(VERSION).then(c => c.put(e.request, res.clone())); return res; }).catch(() => cached);
        return cached || net;
      })
    );
  }
});

async function trimTiles() {
  const c = await caches.open(TILE_CACHE);
  const keys = await c.keys();
  if (keys.length > TILE_LIMIT) await Promise.all(keys.slice(0, keys.length - TILE_LIMIT).map(k => c.delete(k)));
}
