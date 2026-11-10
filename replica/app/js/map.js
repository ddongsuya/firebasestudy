// Leaflet 지도 래퍼: 타일, 마커, 경로선, 현재 위치. 좌표는 GCJ-02 (타일과 동일).
import { D, lineColor } from './data.js';
import { settings } from './store.js';
import { toast, esc, iconSvg, CAT_ICON } from './ui.js';
import { BEIJING_CENTER } from './geo.js';

export let map = null;
let insets = { top: 72, bottom: 120, left: 0 };
let tileLayer = null, placeLayer = null, routeLayer = null, meMarker = null, meCircle = null, tempLayer = null;
const DEFAULT_TILE = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang={lang}&size=1&scale=1&style=8&x={x}&y={y}&z={z}';

export function init(el = 'map') {
  map = L.map(el, { zoomControl: false, attributionControl: true, maxZoom: 18, minZoom: 9, keyboard: true }).setView([BEIJING_CENTER.lat, BEIJING_CENTER.lon], 13);
  map.attributionControl.setPrefix('').addAttribution('지도 타일 © AutoNavi · 역 데이터 Wikidata(CC0) · 고덕 KO');
  placeLayer = L.layerGroup().addTo(map); routeLayer = L.layerGroup().addTo(map); tempLayer = L.layerGroup().addTo(map);
  setTiles(settings().tile_lang);
  map.on('zoomend', updateLabelVisibility);
  map.attributionControl.setPosition('bottomleft');
  return map;
}
export function setTiles(lang) {
  if (tileLayer) map.removeLayer(tileLayer);
  const url = (settings().tile_url || DEFAULT_TILE).replace('{lang}', lang);
  tileLayer = L.tileLayer(url, { subdomains: ['1', '2', '3', '4'], maxZoom: 18 }).addTo(map);
  let failed = 0; tileLayer.on('tileerror', () => { if (++failed === 6) toast('지도 타일을 불러오지 못했어요. 네트워크를 확인하세요.'); });
}
// ── 핀: 원형 배지 + 꼬리. 아이콘 박스와 실제 좌표(꼬리 끝)를 정확히 맞춘다(iconAnchor = 꼬리 끝).
const PIN_W = 32, PIN_H = 40;   // 원 32 + 꼬리 8
export function placeIcon(p, { selected = false, fav = false, count = 0 } = {}) {
  const s = selected ? 1.2 : 1, w = Math.round(PIN_W * s), h = Math.round(PIN_H * s);
  const cls = ['pin2', `cat-${p.cat}`, selected ? 'selected' : '', fav ? 'fav' : ''].join(' ');
  return L.divIcon({ className: 'pin2-wrap', html: `<div class="${cls}" style="width:${w}px;height:${h}px">${iconSvg(CAT_ICON[p.cat] || 'pin')}${count ? `<b class="pin2-count">+${count}</b>` : ''}</div>`, iconSize: [w, h], iconAnchor: [w / 2, h], tooltipAnchor: [0, -h + 2] });
}
export function stationIcon(s, { selected = false, small = false } = {}) {
  const color = lineColor(s.lines[0]); const d = selected ? 26 : small ? 14 : 18;
  return L.divIcon({ className: 'pin2-wrap', html: `<div class="stn${selected ? ' selected' : ''}" style="--line:${color};width:${d}px;height:${d}px"></div>`, iconSize: [d, d], iconAnchor: [d / 2, d / 2], tooltipAnchor: [0, -d / 2 - 2] });
}
const prio = (kind, ref, favIds, selectedId) => ref.id === selectedId ? 100 : kind === 'station' ? 1 : (favIds.has(ref.id) ? 40 : 0) + ((ref.tags || []).includes('필수') ? 30 : 0) + ({ wall: 12, transit: 10, hotel: 9, help: 8, sight: 6, museum: 5, park: 4, food: 3, shop: 2 }[ref.cat] || 0);
let last = { items: [], opts: {} };
/** 장소·역 마커 렌더(겹침 정리). items: {kind, ref}[] */
export function renderPlaces(items, opts = {}) { last = { items, opts }; drawPlaces(); }
function drawPlaces() {
  const { items } = last; const { favIds = new Set(), selectedId = null, onClick, labelMode = 'both' } = last.opts;
  placeLayer.clearLayers();
  const z = map.getZoom();
  const R = z >= 16 ? 26 : z >= 14 ? 34 : 42;                                // 이 반경 안의 핀은 하나로 묶는다(px)
  const sorted = items.map(it => ({ ...it, pr: prio(it.kind, it.ref, favIds, selectedId), pt: map.project([it.ref.lat, it.ref.lon], z) })).sort((a, b) => b.pr - a.pr);
  const leaders = [];
  for (const it of sorted) {
    const near = it.kind === 'place' && it.ref.id !== selectedId ? leaders.find(l => l.kind === 'place' && l.pt.distanceTo(it.pt) < R) : null;
    if (near) { near.members.push(it); continue; }
    if (it.kind === 'station' && leaders.some(l => l.pt.distanceTo(it.pt) < 18)) continue; // 역은 장소 핀과 겹치면 숨김
    leaders.push({ ...it, members: [] });
  }
  // 라벨 충돌: 우선순위 순으로 사각형을 배치하고 겹치면 숨김
  const boxes = [];
  const fits = (x, y, w, h) => { for (const b of boxes) if (x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y) return false; boxes.push({ x, y, w, h }); return true; };
  for (const l of leaders) { if (l.kind === 'place') fits(l.pt.x - 16, l.pt.y - 40, 32, 40); }
  for (const l of leaders) {
    const { kind, ref } = l; const isSel = ref.id === selectedId;
    const m = kind === 'place'
      ? L.marker([ref.lat, ref.lon], { icon: placeIcon(ref, { selected: isSel, fav: favIds.has(ref.id), count: z < 16 ? l.members.length : 0 }), title: ref.name_ko, keyboard: true, zIndexOffset: isSel ? 1000 : l.pr })
      : L.marker([ref.lat, ref.lon], { icon: stationIcon(ref, { selected: isSel, small: z < 15 }), title: ref.ko + '역', keyboard: true, zIndexOffset: isSel ? 1000 : -100 });
    const text = kind === 'place' ? (labelMode === 'zh' ? ref.name_zh : ref.name_ko.replace(/\s*\(.*?\)\s*/g, ' ').trim()) : (labelMode === 'zh' ? ref.zh : ref.ko);
    const showMin = kind === 'station' ? 15 : (l.pr >= 30 ? 12 : 14);
    if (z >= showMin || isSel) {
      const w = Math.min(160, text.length * 12 + 14), h = 20, y = kind === 'place' ? l.pt.y - (isSel ? 50 : 42) - h : l.pt.y - 12 - h;
      if (isSel || fits(l.pt.x - w / 2, y, w, h)) m.bindTooltip(esc(text), { permanent: true, direction: 'top', className: 'ko-label' + (kind === 'station' ? ' stn-label' : ''), opacity: 1 });
    }
    m.on('click', () => {
      if (kind === 'place' && l.members.length && z < 15) { const b = L.latLngBounds([[ref.lat, ref.lon], ...l.members.map(x => [x.ref.lat, x.ref.lon])]); map.fitBounds(b, { padding: [60, 60], maxZoom: 16 }); return; }
      onClick?.(kind, ref);
    });
    m.on('keypress', e => { if (e.originalEvent.key === 'Enter') onClick?.(kind, ref); });
    placeLayer.addLayer(m);
  }
}
export function updateLabelVisibility() { if (last.items.length) drawPlaces(); }
export function clearRoute() { routeLayer.clearLayers(); }
/** 경로 그리기: segments에 polyline 좌표를 넣는다. */
export function drawPlan(plan, { fit = true } = {}) {
  routeLayer.clearLayers(); const all = [];
  for (const s of plan.segments) {
    const pts = segmentPoints(s, plan); if (pts.length < 2) continue; all.push(...pts);
    const color = s.kind === 'ride' ? lineColor(s.line) : s.kind === 'taxi' ? '#1d5bd1' : null;
    if (s.kind === 'ride' || s.kind === 'taxi') routeLayer.addLayer(L.polyline(pts, { color, weight: 6, opacity: .9, lineCap: 'round' }));
    else routeLayer.addLayer(L.polyline(pts, { color: '#5b6474', weight: 4, dashArray: '2 8', lineCap: 'round' }));
  }
  if (plan.origin) routeLayer.addLayer(L.marker([plan.origin.lat, plan.origin.lon], { icon: L.divIcon({ className: '', html: '<div class="pt start"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }), interactive: false }));
  if (plan.destination) routeLayer.addLayer(L.marker([plan.destination.lat, plan.destination.lon], { icon: L.divIcon({ className: '', html: '<div class="pt end"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }), interactive: false }));
  for (const s of plan.segments) if (s.kind === 'ride') for (const id of [s.from_station, s.to_station]) { const st = D.stationById[id]; if (st) routeLayer.addLayer(L.marker([st.lat, st.lon], { icon: stationIcon(st), interactive: false })); }
  if (fit && all.length) fitVisible(all);
}
export function segmentPoints(s, plan) {
  if (s.kind === 'ride') {
    const line = D.lineById[s.line]; const ids = line.stations.map(x => x.station);
    let a = ids.indexOf(s.from_station), b = ids.indexOf(s.to_station); if (a < 0 || b < 0) return [];
    let seq;
    if (line.loop) { const n = ids.length; const fwd = []; for (let i = a; ; i = (i + 1) % n) { fwd.push(ids[i]); if (i === b) break; if (fwd.length > n) break; } const bwd = []; for (let i = a; ; i = (i - 1 + n) % n) { bwd.push(ids[i]); if (i === b) break; if (bwd.length > n) break; } seq = (s.stops + 1 === fwd.length) ? fwd : (s.stops + 1 === bwd.length ? bwd : (fwd.length <= bwd.length ? fwd : bwd)); }
    else seq = a < b ? ids.slice(a, b + 1) : ids.slice(b, a + 1).reverse();
    return seq.map(id => [D.stationById[id].lat, D.stationById[id].lon]);
  }
  if (s.polyline) return s.polyline;
  if (s.kind === 'walk') {
    const from = s.to_station ? plan.origin : D.stationById[s.from_station]; const to = s.to_station ? D.stationById[s.to_station] : plan.destination;
    return from && to ? [[from.lat, from.lon], [to.lat, to.lon]] : [];
  }
  if (s.kind === 'transfer') return [];
  return [];
}
export function showMe(pos, { follow = false } = {}) {
  const ll = [pos.lat, pos.lon];
  if (!meMarker) {
    meMarker = L.marker(ll, { icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false, zIndexOffset: 1000 }).addTo(map);
    meCircle = L.circle(ll, { radius: pos.acc || 30, color: '#1d5bd1', weight: 1, fillOpacity: .08, interactive: false }).addTo(map);
  } else { meMarker.setLatLng(ll); meCircle.setLatLng(ll).setRadius(pos.acc || 30); }
  if (follow) focus(pos, Math.max(map.getZoom(), 16));
}
/** 지도 위를 가리는 UI(상단 검색·하단 시트)의 높이. 핀 맞춤·경로 맞춤이 이 영역을 피한다. */
/** 길찾기 중에는 장소 핀을 숨겨 경로만 보이게 한다 */
export function setPlacesVisible(v) { if (!placeLayer) return; if (v && !map.hasLayer(placeLayer)) placeLayer.addTo(map); if (!v && map.hasLayer(placeLayer)) map.removeLayer(placeLayer); }
export function setInsets(next) { insets = { ...insets, ...next }; }
export const getInsets = () => insets;
/** 화면에서 실제로 보이는 지도 영역의 중심에 pt를 둔다 */
export function focus(pt, zoom = map.getZoom(), { animate = true } = {}) {
  const size = map.getSize(); const cy = insets.top + (size.y - insets.top - insets.bottom) / 2; const cx = insets.left + (size.x - insets.left) / 2;
  const p = map.project([pt.lat, pt.lon], zoom); const c = p.add([size.x / 2 - cx, size.y / 2 - cy]);
  map.setView(map.unproject(c, zoom), zoom, { animate });
}
export function flyTo(pt, zoom = 16) { focus(pt, zoom); }
export function panToWithOffset(pt, zoom = 16) { focus(pt, zoom); }
export function fitVisible(latlngs, { maxZoom = 17 } = {}) {
  if (!latlngs.length) return;
  map.fitBounds(L.latLngBounds(latlngs), { paddingTopLeft: [28 + insets.left, insets.top + 16], paddingBottomRight: [28, insets.bottom + 16], maxZoom });
}
export function tempMarker(pt, cls = 'end') { tempLayer.clearLayers(); if (pt) tempLayer.addLayer(L.marker([pt.lat, pt.lon], { icon: L.divIcon({ className: '', html: `<div class="pt ${cls}"></div>`, iconSize: [22, 22], iconAnchor: [11, 11] }), interactive: false })); }
export function center() { const c = map.getCenter(); return { lat: c.lat, lon: c.lng }; }
/** 화면의 y 위치(컨테이너 좌표)에 해당하는 지점 — 지도 선택 핀이 보이는 영역 중앙에 있을 때 사용 */
export function visibleCenterY() { const size = map.getSize(); return Math.round(insets.top + (size.y - insets.top - insets.bottom) / 2); }
export function pointAtVisibleCenter() { const size = map.getSize(); const ll = map.containerPointToLatLng([insets.left + (size.x - insets.left) / 2, visibleCenterY()]); return { lat: ll.lat, lon: ll.lng }; }
/** 길게 누르기(iOS 사파리는 contextmenu를 보내지 않는다): 550ms 동안 10px 이내로 머무르면 콜백 */
export function onLongPress(cb) {
  const el = map.getContainer(); let t = null, x0 = 0, y0 = 0;
  const cancel = () => { clearTimeout(t); t = null; };
  el.addEventListener('touchstart', e => { if (e.touches.length !== 1) return cancel(); const tt = e.touches[0]; x0 = tt.clientX; y0 = tt.clientY; cancel(); t = setTimeout(() => { t = null; const r = el.getBoundingClientRect(); const ll = map.containerPointToLatLng([x0 - r.left, y0 - r.top]); navigator.vibrate?.(15); cb({ lat: ll.lat, lon: ll.lng }); }, 550); }, { passive: true });
  el.addEventListener('touchmove', e => { const tt = e.touches[0]; if (Math.hypot(tt.clientX - x0, tt.clientY - y0) > 10) cancel(); }, { passive: true });
  el.addEventListener('touchend', cancel); el.addEventListener('touchcancel', cancel);
  map.on('movestart zoomstart', cancel);
  map.on('contextmenu', e => { if (e.originalEvent?.pointerType === 'touch' || e.originalEvent?.sourceCapabilities?.firesTouchEvents) return; cb({ lat: e.latlng.lat, lon: e.latlng.lng }); });
}
