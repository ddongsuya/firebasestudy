// Leaflet 지도 래퍼: 타일, 마커, 경로선, 현재 위치. 좌표는 GCJ-02 (타일과 동일).
import { D, lineColor } from './data.js';
import { settings } from './store.js';
import { toast, esc } from './ui.js';
import { BEIJING_CENTER } from './geo.js';

export let map = null;
let tileLayer = null, placeLayer = null, routeLayer = null, meMarker = null, meCircle = null, tempLayer = null;
const CAT_ICON = () => Object.fromEntries(D.categories.map(c => [c.id, c.icon]));
const DEFAULT_TILE = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang={lang}&size=1&scale=1&style=8&x={x}&y={y}&z={z}';

export function init(el = 'map') {
  map = L.map(el, { zoomControl: false, attributionControl: true, maxZoom: 18, minZoom: 9, keyboard: true }).setView([BEIJING_CENTER.lat, BEIJING_CENTER.lon], 13);
  map.attributionControl.setPrefix('').addAttribution('지도 타일 © AutoNavi · 역 데이터 Wikidata(CC0) · 고덕 KO');
  placeLayer = L.layerGroup().addTo(map); routeLayer = L.layerGroup().addTo(map); tempLayer = L.layerGroup().addTo(map);
  setTiles(settings().tile_lang);
  map.on('zoomend', updateLabelVisibility);
  return map;
}
export function setTiles(lang) {
  if (tileLayer) map.removeLayer(tileLayer);
  const url = (settings().tile_url || DEFAULT_TILE).replace('{lang}', lang);
  tileLayer = L.tileLayer(url, { subdomains: ['1', '2', '3', '4'], maxZoom: 18 }).addTo(map);
  let failed = 0; tileLayer.on('tileerror', () => { if (++failed === 6) toast('지도 타일을 불러오지 못했어요. 네트워크를 확인하세요.'); });
}
export function placeIcon(p, { selected = false, fav = false } = {}) {
  const cls = ['pin', p.cat, selected ? 'selected' : '', fav ? 'fav' : ''].join(' ');
  return L.divIcon({ className: '', html: `<div class="${cls}"><span>${CAT_ICON()[p.cat] || '📍'}</span></div>`, iconSize: [30, 30], iconAnchor: [15, 30], tooltipAnchor: [0, -28] });
}
export function stationIcon(s, { selected = false } = {}) {
  const color = lineColor(s.lines[0]);
  return L.divIcon({ className: '', html: `<div class="pin station${selected ? ' selected' : ''}" style="--line:${color}"><span></span></div>`, iconSize: [22, 22], iconAnchor: [11, 11], tooltipAnchor: [0, -12] });
}
/** 장소·역 마커 렌더. items: {kind, ref}[] */
export function renderPlaces(items, { favIds = new Set(), selectedId = null, onClick, labelMode = 'both' } = {}) {
  placeLayer.clearLayers();
  for (const { kind, ref } of items) {
    const isSel = ref.id === selectedId;
    const m = kind === 'place'
      ? L.marker([ref.lat, ref.lon], { icon: placeIcon(ref, { selected: isSel, fav: favIds.has(ref.id) }), title: ref.name_ko, keyboard: true })
      : L.marker([ref.lat, ref.lon], { icon: stationIcon(ref, { selected: isSel }), title: ref.ko + '역', keyboard: true });
    const label = kind === 'place' ? (labelMode === 'zh' ? ref.name_zh : labelMode === 'ko' ? ref.name_ko : `${ref.name_ko}`) : (labelMode === 'zh' ? ref.zh : ref.ko);
    m.bindTooltip(esc(label), { permanent: true, direction: 'top', className: 'ko-label', opacity: 1 });
    m.on('click', () => onClick?.(kind, ref)); m.on('keypress', e => { if (e.originalEvent.key === 'Enter') onClick?.(kind, ref); });
    m._kind = kind; placeLayer.addLayer(m);
  }
  updateLabelVisibility();
}
export function updateLabelVisibility() {
  const z = map.getZoom();
  placeLayer.eachLayer(m => { const t = m.getTooltip(); if (!t) return; const el = t.getElement(); if (el) el.style.display = (m._kind === 'station' ? z < 15 : z < 13) ? 'none' : ''; });
}
export function clearRoute() { routeLayer.clearLayers(); }
/** 경로 그리기: segments에 polyline 좌표를 넣는다. */
export function drawPlan(plan, { fit = true, padBottom = 0.5 } = {}) {
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
  if (fit && all.length) map.fitBounds(L.latLngBounds(all), { paddingTopLeft: [30, 90], paddingBottomRight: [30, Math.round(map.getSize().y * padBottom)] });
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
    meCircle = L.circle(ll, { radius: pos.acc || 30, color: '#1d5bd1', weight: 1, fillOpacity: .08 }).addTo(map);
  } else { meMarker.setLatLng(ll); meCircle.setLatLng(ll).setRadius(pos.acc || 30); }
  if (follow) map.setView(ll, Math.max(map.getZoom(), 16), { animate: true });
}
export function flyTo(pt, zoom = 16) { map.flyTo([pt.lat, pt.lon], zoom, { duration: .6 }); }
export function panToWithOffset(pt, zoom = 16) { map.setView([pt.lat, pt.lon], zoom, { animate: true }); setTimeout(() => map.panBy([0, map.getSize().y * 0.18]), 50); }
export function tempMarker(pt, cls = 'end') { tempLayer.clearLayers(); if (pt) tempLayer.addLayer(L.marker([pt.lat, pt.lon], { icon: L.divIcon({ className: '', html: `<div class="pt ${cls}"></div>`, iconSize: [22, 22], iconAnchor: [11, 11] }), interactive: false })); }
export function center() { const c = map.getCenter(); return { lat: c.lat, lon: c.lng }; }
