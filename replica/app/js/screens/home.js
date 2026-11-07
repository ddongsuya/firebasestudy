// S01 홈 지도: 마커·카테고리 칩·바로가기·FAB
import { D } from '../data.js';
import * as store from '../store.js';
import * as mapx from '../map.js';
import { $, $$, html, raw, icon, toast, closeSheet } from '../ui.js';
import { locate } from '../geo.js';

const state = { cat: 'all', tracking: false };
export function init() {
  $('#btnZoomIn').innerHTML = icon('plus').__raw; $('#btnZoomOut').innerHTML = icon('minus').__raw;
  $('#btnLocate').innerHTML = icon('locate').__raw; $('#btnRoute').innerHTML = icon('route').__raw;
  $('#btnZoomIn').onclick = () => mapx.map.zoomIn(); $('#btnZoomOut').onclick = () => mapx.map.zoomOut();
  $('#btnRoute').onclick = () => app.go('#/route');
  $('#btnLang').onclick = () => { const next = store.settings().tile_lang === 'zh_cn' ? 'en' : 'zh_cn'; store.setSetting('tile_lang', next); mapx.setTiles(next); renderLang(); toast(next === 'en' ? '지도 글자를 영어로 바꿨어요' : '지도 글자를 중국어로 바꿨어요'); };
  $('#btnLocate').onclick = locateMe;
  $('#chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; state.cat = b.dataset.cat; renderChips(); refreshMarkers(); });
  mapx.map.on('click', () => { if (location.hash.startsWith('#/place') || location.hash.startsWith('#/station')) history.back(); else closeSheet(); });
  mapx.map.on('contextmenu', e => { app.go(`#/pick?for=view&lat=${e.latlng.lat.toFixed(6)}&lon=${e.latlng.lng.toFixed(6)}`); });
  renderChips(); renderLang(); renderShortcuts(); refreshMarkers();
}
function renderLang() { const en = store.settings().tile_lang === 'en'; $('#btnLang').textContent = en ? 'EN' : '中'; $('#btnLang').setAttribute('aria-pressed', String(en)); }
function renderChips() {
  const cats = [{ id: 'all', label_ko: '전체', icon: '🗺️' }, ...D.categories.filter(c => D.places.some(p => p.cat === c.id)), { id: 'station', label_ko: '지하철역', icon: '🚇' }];
  $('#chips').innerHTML = cats.map(c => html`<button type="button" class="chip on-map ${state.cat === c.id ? 'on' : ''}" data-cat="${c.id}" aria-pressed="${state.cat === c.id}">${c.icon} ${c.label_ko}</button>`).join('');
}
export function renderShortcuts() {
  const hotel = store.frequent('hotel'), airport = store.frequent('airport');
  const favRef = f => f.place_id ? `place:${f.place_id}` : f.station_id ? `station:${f.station_id}` : `pt:${f.lat},${f.lon},${encodeURIComponent(f.custom_name || '')}`;
  $('#homeShortcuts').innerHTML = [
    hotel ? html`<a class="chip" href="#/route?to=${favRef(hotel)}">${icon('hotel', 'sm')} 호텔로</a>` : html`<a class="chip" href="#/fav?set=hotel">${icon('hotel', 'sm')} 호텔 설정</a>`,
    airport ? html`<a class="chip" href="#/route?to=${favRef(airport)}">${icon('plane', 'sm')} 공항으로</a>` : '',
  ].join('');
}
export function refreshMarkers(selectedId = null) {
  if (!mapx.map) return;
  const favIds = new Set(store.favorites().map(f => f.place_id).filter(Boolean));
  const items = [];
  const z = mapx.map.getZoom();
  if (state.cat !== 'station') for (const p of D.places) if (state.cat === 'all' || p.cat === state.cat) { if (state.cat === 'all' && z < 12 && !(p.tags || []).includes('필수') && !['wall', 'transit'].includes(p.cat)) continue; items.push({ kind: 'place', ref: p }); }
  if (state.cat === 'station' || mapx.map.getZoom() >= 15) for (const s of D.stations) items.push({ kind: 'station', ref: s });
  mapx.renderPlaces(items, { favIds, selectedId, labelMode: store.settings().label_mode, onClick: (kind, ref) => app.go(kind === 'place' ? `#/place/${ref.id}` : `#/station/${ref.id}`) });
  renderShortcuts();
}
let zoomBound = false;
export function show({ keepSheet = false } = {}) {
  if (!keepSheet) { closeSheet(); refreshMarkers(); }
  if (!zoomBound) { zoomBound = true; const band = () => { const z = mapx.map.getZoom(); return z >= 15 ? 2 : z >= 12 ? 1 : 0; }; let last = band(); mapx.map.on('zoomend', () => { const now = band(); if (now !== last) { last = now; refreshMarkers(); } }); }
  setTimeout(() => mapx.map.invalidateSize(), 50);
}
export async function locateMe() {
  const b = $('#btnLocate'); b.setAttribute('aria-pressed', 'true');
  try { const pos = await locate(); app.me = pos; mapx.showMe(pos, { follow: true }); if (pos.acc > 300) toast('위치 정확도가 낮아요 (±' + Math.round(pos.acc) + 'm)'); }
  catch (e) { toast({ denied: '위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해 주세요.', timeout: '위치를 찾지 못했어요. 하늘이 보이는 곳에서 다시 시도해요.', unsupported: '이 브라우저는 위치를 지원하지 않아요.' }[e.code] || '위치를 가져오지 못했어요.'); }
  b.setAttribute('aria-pressed', 'false');
}
