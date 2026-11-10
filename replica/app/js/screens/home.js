// S01 홈 지도: 검색창 · 종류 칩(바로가기 포함) · 핀 · 오른쪽 버튼 · 다음 일정 카드
import { D } from '../data.js';
import * as store from '../store.js';
import * as mapx from '../map.js';
import { $, html, icon, catIcon, toast, closeSheet } from '../ui.js';
import { locate } from '../geo.js';
import { loadTrip, todayBj, nowHm } from './trip.js';
import * as driver from './driver.js';

const state = { cat: 'all', nextDismissed: sessionStorage.getItem('goduk.nextDismissed') === '1', trip: null };
const favRef = f => f.place_id ? `place:${f.place_id}` : f.station_id ? `station:${f.station_id}` : `pt:${f.lat},${f.lon},${encodeURIComponent(f.custom_name || '')}`;

export function init() {
  $('#brand').innerHTML = icon('search').__raw;
  $('#btnZoomIn').innerHTML = icon('plus').__raw; $('#btnZoomOut').innerHTML = icon('minus').__raw;
  $('#btnLocate').innerHTML = icon('locate').__raw;
  $('#btnZoomIn').onclick = () => mapx.map.zoomIn(); $('#btnZoomOut').onclick = () => mapx.map.zoomOut();
  $('#btnLang').onclick = () => { const next = store.settings().tile_lang === 'zh_cn' ? 'en' : 'zh_cn'; store.setSetting('tile_lang', next); mapx.setTiles(next); renderLang(); toast(next === 'en' ? '지도 글자를 영어로 바꿨어요' : '지도 글자를 중국어로 바꿨어요'); };
  $('#btnLocate').onclick = locateMe;
  $('#chips').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    state.cat = state.cat === b.dataset.cat && b.dataset.cat !== 'all' ? 'all' : b.dataset.cat;
    renderChips(); refreshMarkers();
    if (state.cat !== 'all') { const pts = currentItems().map(i => [i.ref.lat, i.ref.lon]); if (pts.length) mapx.fitVisible(pts, { maxZoom: 15 }); }
  });
  // 지도 탭: 장소·역 카드가 열려 있으면 닫기. 길찾기·선택 화면에서는 아무것도 안 함
  mapx.map.on('click', () => { if (/^#\/(place|station|search)/.test(location.hash)) app.go('#/'); });
  // 길게 눌러 핀 찍기(아이폰 포함)
  mapx.onLongPress(pt => { if (/^#\/(route|walk|pick|trip|fav|more|nearby)/.test(location.hash)) return; app.go(`#/pick?for=view&lat=${pt.lat.toFixed(6)}&lon=${pt.lon.toFixed(6)}`); });
  $('#nextCard').addEventListener('click', onNextClick);
  renderChips(); renderLang(); refreshMarkers();
  loadTrip().then(t => { state.trip = t; renderNext(); }).catch(() => {});
  setInterval(renderNext, 60000);
}
function renderLang() { const en = store.settings().tile_lang === 'en'; $('#btnLang').textContent = en ? 'EN' : '中'; $('#btnLang').setAttribute('aria-pressed', String(en)); }

function renderChips() {
  const hotel = store.frequent('hotel'), airport = store.frequent('airport');
  const cats = [...D.categories.filter(c => D.places.some(p => p.cat === c.id)), { id: 'station', label_ko: '지하철역' }];
  $('#chips').innerHTML = [
    hotel ? html`<a class="chip on-map accent" href="#/route?to=${favRef(hotel)}">${icon('hotel', 'sm')} 호텔로</a>` : html`<a class="chip on-map" href="#/fav?set=hotel">${icon('hotel', 'sm')} 호텔 설정</a>`,
    airport ? html`<a class="chip on-map" href="#/route?to=${favRef(airport)}">${icon('plane', 'sm')} 공항으로</a>` : '',
    html`<a class="chip on-map" href="#/nearby">${icon('pin', 'sm')} 주변</a>`,
    html`<span class="chip-sep" aria-hidden="true"></span>`,
    ...cats.map(c => html`<button type="button" class="chip on-map ${state.cat === c.id ? 'on' : ''}" data-cat="${c.id}" aria-pressed="${state.cat === c.id}">${catIcon(c.id, 'sm')} ${c.label_ko}</button>`),
  ].join('');
}
export const renderShortcuts = renderChips;

function currentItems() {
  const items = [];
  if (state.cat !== 'station') for (const p of D.places) if (state.cat === 'all' || p.cat === state.cat) items.push({ kind: 'place', ref: p });
  if (state.cat === 'station' || (state.cat === 'all' && mapx.map.getZoom() >= 15)) for (const s of D.stations) items.push({ kind: 'station', ref: s });
  return items;
}
export function refreshMarkers(selectedId = null) {
  if (!mapx.map) return;
  const favIds = new Set(store.favorites().map(f => f.place_id).filter(Boolean));
  mapx.renderPlaces(currentItems(), { favIds, selectedId, labelMode: store.settings().label_mode, onClick: (kind, ref) => app.go(kind === 'place' ? `#/place/${ref.id}` : `#/station/${ref.id}`) });
  renderChips();
}
let zoomBound = false;
export function show({ keepSheet = false } = {}) {
  if (!keepSheet) { closeSheet(); refreshMarkers(); }
  if (!zoomBound) { zoomBound = true; let was = mapx.map.getZoom() >= 15; mapx.map.on('zoomend', () => { const now = mapx.map.getZoom() >= 15; if (now !== was) { was = now; refreshMarkers(); } }); }
  setTimeout(() => mapx.map.invalidateSize(), 50);
}

// ── 다음 일정 카드(여행 모드) ──
let nextVisible = true, nextStop = null;
export function setNextVisible(v) { nextVisible = v; renderNext(); }
function findNext() {
  const t = state.trip; if (!t) return null;
  const today = todayBj(), hm = nowHm();
  for (const day of t.days) {
    if (day.date && day.date < today) continue;
    const stops = day.stops.filter(s => s.place || s.zhNote);
    const idx = day.date === today ? day.stops.findIndex(s => /^\d\d:\d\d$/.test(s.t) && s.t >= hm && (s.place || s.zhNote)) : day.stops.findIndex(s => s.place || s.zhNote);
    if (idx >= 0) return { day, stop: day.stops[idx], index: idx, today: day.date === today };
    void stops;
  }
  return null;
}
function renderNext() {
  const el = $('#nextCard'); if (!el) return;
  nextStop = findNext();
  if (!nextVisible || state.nextDismissed || !nextStop) { el.classList.add('hidden'); return; }
  const { day, stop } = nextStop; const p = stop.place ? D.placeById[stop.place] : null;
  el.innerHTML = html`
    <div class="nc-main">
      <div class="nc-meta">${icon('calendar', 'sm')} ${nextStop.today ? '오늘' : day.label} · <b class="tnum">${stop.t}</b></div>
      <a class="nc-title" href="#/trip?d=${day.id}">${stop.title}</a>
      ${p ? html`<div class="nc-zh zh">${p.name_zh}</div>` : ''}
    </div>
    <div class="nc-actions">
      ${p ? html`<a class="btn sm primary" href="#/route?to=place:${p.id}">${icon('route', 'sm')} 길찾기</a><button type="button" class="btn sm" data-nc="driver">${icon('car', 'sm')} 기사 카드</button>` : html`<a class="btn sm" href="#/trip?d=${day.id}">일정 보기</a>`}
    </div>
    <button type="button" class="btn icon sm nc-x" data-nc="close" aria-label="다음 일정 카드 닫기">${icon('x', 'sm')}</button>`;
  el.classList.remove('hidden');
}
function onNextClick(e) {
  const b = e.target.closest('[data-nc]'); if (!b) return;
  if (b.dataset.nc === 'close') { state.nextDismissed = true; try { sessionStorage.setItem('goduk.nextDismissed', '1'); } catch { /* 무시 */ } renderNext(); window.dispatchEvent(new Event('resize')); return; }
  if (b.dataset.nc === 'driver') { const p = D.placeById[nextStop.stop.place]; driver.show({ zh: p.name_zh, addr: p.address_zh, ko: p.name_ko }); }
}

export async function locateMe() {
  const b = $('#btnLocate'); b.setAttribute('aria-pressed', 'true'); b.classList.add('busy');
  try { const pos = await locate(); app.me = pos; mapx.showMe(pos, { follow: true }); if (pos.acc > 300) toast(`위치 정확도가 낮아요 (±${Math.round(pos.acc)}m)`); }
  catch (e) { toast({ denied: '위치 권한이 꺼져 있어요. 설정 → 사파리 → 위치에서 허용해 주세요.', timeout: '위치를 찾지 못했어요. 하늘이 보이는 곳에서 다시 눌러 주세요.', unsupported: '이 브라우저는 위치를 지원하지 않아요.' }[e.code] || '위치를 가져오지 못했어요.'); }
  b.setAttribute('aria-pressed', 'false'); b.classList.remove('busy');
}
