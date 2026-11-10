/* 고덕 KO v2 — 오프라인 캐시: 앱 셸 + 데이터(캐시 우선, 백그라운드 갱신), 타일(네트워크 우선, 실패 시 캐시) */
const VERSION = 'goduk-v3.1';
const TILE_CACHE = 'goduk-tiles-v2';
const TILE_LIMIT = 5000; // 약 60~80MB. "이 지역 미리 저장"과 함께 씀
const SHELL = [
  './', './index.html', './manifest.json',
  './css/tokens.css', './css/ui.css', './css/app.css', './css/v3.css', './js/sheet.js',
  './js/main.js', './js/ui.js', './js/map.js', './js/data.js', './js/geo.js', './js/gcj02.js', './js/store.js', './js/deeplink.js',
  './js/routing/transit.js', './js/routing/walk.js', './js/routing/taxi.js', './js/routing/fare.js', './js/routing/schedule.js',
  './js/screens/home.js', './js/screens/search.js', './js/screens/place.js', './js/screens/route.js', './js/screens/walknav.js', './js/screens/trip.js',
  './js/offline.js', './js/screens/nearby.js', './js/screens/favorites.js', './js/screens/station.js', './js/screens/pick.js', './js/screens/driver.js', './js/screens/more.js',
  './data/categories.json', './data/places.json', './data/stations.json', './data/lines.json', './data/transfers.json', './data/fares.json', './data/phrases.json', './data/tips.json', './data/exits.json', './data/trip.json',
  './vendor/leaflet/leaflet.js', './vendor/leaflet/leaflet.css', './vendor/leaflet/images/marker-icon.png', './vendor/leaflet/images/marker-shadow.png',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== TILE_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.endsWith('autonavi.com') || url.hostname.endsWith('amap.com')) {
    e.respondWith(fetch(e.request).then(res => { if (res.ok || res.type === 'opaque') { const clone = res.clone(); caches.open(TILE_CACHE).then(c => c.put(e.request, clone).then(trimTiles)); } return res; }).catch(() => caches.match(e.request)));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(res => { if (res.ok) caches.open(VERSION).then(c => c.put(e.request, res.clone())); return res; }).catch(() => cached);
      return cached || net;
    }));
  }
});
async function trimTiles() { const c = await caches.open(TILE_CACHE); const keys = await c.keys(); if (keys.length > TILE_LIMIT) await Promise.all(keys.slice(0, keys.length - TILE_LIMIT).map(k => c.delete(k))); }
