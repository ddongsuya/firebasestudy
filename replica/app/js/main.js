// 앱 부팅·라우팅(해시)·탭·전역 상태
import { load, D } from './data.js';
import * as store from './store.js';
import * as mapx from './map.js';
import { $, $$, icon, toast, closeSheet, sheetOpen } from './ui.js';
import * as home from './screens/home.js';
import * as search from './screens/search.js';
import * as place from './screens/place.js';
import * as route from './screens/route.js';
import * as nearby from './screens/nearby.js';
import * as favorites from './screens/favorites.js';
import * as station from './screens/station.js';
import * as pick from './screens/pick.js';
import * as driver from './screens/driver.js';
import * as more from './screens/more.js';
import * as walknav from './screens/walknav.js';
import * as trip from './screens/trip.js';

export const app = {
  me: null,            // 현재 위치 {lat, lon, acc, at}
  tab: 'map',
  screens: { home, search, place, route, nearby, favorites, station, pick, driver, more, walknav, trip },
  go(hash) { location.hash = hash; },
  tabOf(hash) { const k = hash.replace(/^#\/?/, '').split('/')[0]; return ({ '': 'map', place: 'map', station: 'map', pick: 'map', nearby: 'nearby', route: 'route', walk: 'route', fav: 'fav', more: 'more' })[k] || 'map'; },
};
window.app = app;

function applyTheme() { const t = store.settings().theme; document.documentElement.dataset.theme = t === 'auto' ? '' : t; }

function renderTabs() {
  const icons = { map: 'map', nearby: 'pin', route: 'route', fav: 'star', more: 'menu' };
  $$('.tab').forEach(t => { $('.i', t).innerHTML = icon(icons[t.dataset.tab]).__raw; t.setAttribute('aria-selected', String(t.dataset.tab === app.tab)); });
  const n = store.favorites().length; const b = $('#favBadge'); b.textContent = n; b.classList.toggle('hidden', !n);
}
$('#tabbar').addEventListener('click', e => {
  const t = e.target.closest('.tab'); if (!t) return;
  const tab = t.dataset.tab;
  app.go({ map: '#/', nearby: '#/nearby', route: '#/route', fav: '#/fav', more: '#/more' }[tab]);
});

/** 해시 라우터: #/ 홈, #/place/:id, #/station/:id, #/route?..., #/walk, #/nearby, #/fav, #/more, #/pick */
async function onRoute() {
  const hash = location.hash || '#/';
  const [path, qs] = hash.replace(/^#/, '').split('?');
  const seg = path.split('/').filter(Boolean);
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  app.tab = app.tabOf(hash); renderTabs();
  document.body.classList.remove('searching', 'picking', 'navigating', 'panel-open');
  $('#panel').classList.add('hidden'); $('#panel').classList.remove('with-map');
  walknav.stop();
  if (!seg.length) { closeSheet(); home.show(); return; }
  switch (seg[0]) {
    case 'search': home.show({ keepSheet: true }); search.showResults(params); break;
    case 'place': home.show({ keepSheet: true }); place.show(seg[1], params); break;
    case 'station': home.show({ keepSheet: true }); station.show(seg[1]); break;
    case 'pick': closeSheet(); home.show({ keepSheet: true }); pick.show(params); break;
    case 'route': closeSheet(); document.body.classList.add('panel-open'); route.show(params); break;
    case 'walk': closeSheet(); walknav.show(params); break;
    case 'nearby': closeSheet(); document.body.classList.add('panel-open'); nearby.show(params); break;
    case 'fav': closeSheet(); document.body.classList.add('panel-open'); favorites.show(params); break;
    case 'more': closeSheet(); document.body.classList.add('panel-open'); more.show(params); break;
    case 'trip': closeSheet(); document.body.classList.add('panel-open'); await trip.show(params); break;
    default: app.go('#/');
  }
}

async function boot() {
  applyTheme();
  try { await load('./data/'); }
  catch (e) { document.body.innerHTML = `<div class="empty" style="padding-top:40vh"><h2>데이터를 불러오지 못했어요</h2><p>${e.message}</p><button class="btn" onclick="location.reload()">다시 시도</button></div>`; return; }
  mapx.init('map');
  home.init(); search.init(); driver.init();
  store.onChange(() => { renderTabs(); home.refreshMarkers(); });
  window.addEventListener('hashchange', onRoute);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#driver').classList.contains('hidden')) driver.close(); else if (sheetOpen()) history.back(); } });
  await onRoute();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
  window.addEventListener('online', () => toast('다시 온라인이에요')); window.addEventListener('offline', () => toast('오프라인 · 저장된 데이터로 동작해요'));
}
boot();
