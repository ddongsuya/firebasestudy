// 정적 데이터 로드·인덱스·검색. 전부 GCJ-02.
import { distance } from './geo.js';

const FILES = ['categories', 'places', 'stations', 'lines', 'transfers', 'fares', 'phrases', 'tips', 'exits'];
export const D = { ready: false };

export async function load(base = './data/') {
  const got = await Promise.all(FILES.map(f => fetch(`${base}${f}.json`).then(r => { if (!r.ok) throw new Error(`${f}.json ${r.status}`); return r.json(); })));
  FILES.forEach((f, i) => { D[f] = got[i]; });
  index(); D.ready = true; return D;
}
/** 테스트·빌드 도구에서 fetch 없이 쓰기 위한 주입 */
export function inject(obj) { Object.assign(D, obj); index(); D.ready = true; return D; }

export function index() {
  D.placeById = Object.fromEntries(D.places.map(p => [p.id, p]));
  D.stationById = Object.fromEntries(D.stations.map(s => [s.id, s]));
  D.lineById = Object.fromEntries(D.lines.map(l => [l.id, l]));
  D.catById = Object.fromEntries(D.categories.map(c => [c.id, c]));
  D.transferMin = Object.fromEntries(D.transfers.map(t => [t.station, t.walk_min]));
  D.phrases = D.phrases || []; D.tips = D.tips || []; D.exits = D.exits || [];
  D.exitsByStation = {}; for (const e of D.exits) (D.exitsByStation[e.station] ||= []).push(e);
  // 검색 인덱스: 정규화 문자열
  D.searchIndex = [
    ...D.places.map(p => ({ kind: 'place', ref: p, keys: [p.name_ko, p.name_zh, p.pinyin, p.address_zh, p.name_en].filter(Boolean).map(norm) })),
    ...D.stations.map(s => ({ kind: 'station', ref: s, keys: [s.ko, s.zh, s.en, s.ko + '역', s.zh + '站'].filter(Boolean).map(norm) })),
  ];
}
/** 공백 제거·소문자·성조 제거·전각 괄호 통일 */
export function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s·・'’()（）\-]/g, '');
}

/** 한글·중국어·병음 통합 검색. 점수: 접두 일치 > 포함. 장소를 역보다 조금 우선. */
export function search(q, { limit = 20, kinds = ['place', 'station'] } = {}) {
  const n = norm(q); if (!n) return [];
  const out = [];
  for (const e of D.searchIndex) {
    if (!kinds.includes(e.kind)) continue;
    let best = 0;
    for (const k of e.keys) {
      if (k === n) best = Math.max(best, 100);
      else if (k.startsWith(n)) best = Math.max(best, 80);
      else if (k.includes(n)) best = Math.max(best, 50);
    }
    if (best) out.push({ kind: e.kind, ref: e.ref, score: best + (e.kind === 'place' ? 5 : 0) + Math.max(0, 10 - e.keys[0].length / 4) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** 반경 내 장소·역. sort: distance | rating */
export function nearby(center, { radius = 1500, cats = null, kinds = ['place', 'station'], sort = 'distance', limit = 50 } = {}) {
  const out = [];
  if (kinds.includes('place')) for (const p of D.places) {
    if (cats && !cats.includes(p.cat)) continue;
    const d = distance(center, p); if (d <= radius) out.push({ kind: 'place', ref: p, distance_m: d });
  }
  if (kinds.includes('station') && (!cats || cats.includes('station'))) for (const s of D.stations) {
    const d = distance(center, s); if (d <= radius) out.push({ kind: 'station', ref: s, distance_m: d });
  }
  out.sort((a, b) => sort === 'rating' ? ((b.ref.rating || 0) - (a.ref.rating || 0)) || a.distance_m - b.distance_m : a.distance_m - b.distance_m);
  return out.slice(0, limit);
}
export function nearestStations(pt, n = 3, maxDist = 2500) {
  return D.stations.map(s => ({ station: s, distance_m: distance(pt, s) })).filter(x => x.distance_m <= maxDist)
    .sort((a, b) => a.distance_m - b.distance_m).slice(0, n);
}
/** 역지오코딩 대체: 가장 가까운 장소/역으로 "○○ 근처" 라벨 */
export function describePoint(pt) {
  const cands = [...D.places.map(p => ({ p, d: distance(pt, p), zh: p.name_zh, ko: p.name_ko })), ...D.stations.map(s => ({ p: s, d: distance(pt, s), zh: s.zh + '站', ko: s.ko + '역' }))].sort((a, b) => a.d - b.d);
  const c = cands[0];
  if (!c) return { label_ko: '지도에서 고른 지점', label_zh: '地图选点' };
  if (c.d < 80) return { label_ko: c.ko, label_zh: c.zh };
  return { label_ko: `${c.ko} 근처 (${Math.round(c.d / 10) * 10}m)`, label_zh: `${c.zh}附近` };
}
export const lineColor = id => D.lineById[id]?.color || '#888';
/** 역의 출구 목록 */
export const exitsOf = stationId => D.exitsByStation[stationId] || [];
/** 장소에 맞는 출구: 데이터에 적힌 출구 → 출구 안내문에 장소 이름이 나오는 출구 → null */
export function bestExit(place, stationId = place.station_id) {
  if (!stationId) return null;
  const list = exitsOf(stationId); if (!list.length) return null;
  if (place.exit_code) { const hit = list.find(e => e.code === place.exit_code || e.code.startsWith(place.exit_code)); if (hit) return { ...hit, why: 'data' }; }
  const key = (place.name_zh || '').replace(/\(.*?\)|（.*?）/g, '').replace(/·.*$/, '').replace(/(公园|景区|博物馆|博物院|大街|胡同|长城|店)$/, '').trim();
  if (key.length >= 2) { const hit = list.find(e => (e.landmarks_zh || '').includes(key) || (e.street_zh || '').includes(key)); if (hit) return { ...hit, why: 'landmark' }; }
  return null;
}
export const exitLabel = e => e ? `${e.code}번 출구${e.dir_ko ? ` (${e.dir_ko})` : ''}` : '';
/** 노선색 밝기에 따라 글자색을 정한다(디자인 스펙) */
export function isLightColor(hex) {
  const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; return lum > 0.6;
}

/** 영업 상태(베이징 시각). opentime 문자열에서 첫 구간("·" 앞)의 HH:MM-HH:MM 들과 "월 휴관", "24시간"을 읽는다. 확신이 없으면 null. */
export function openStatus(opentime, at = new Date()) {
  if (!opentime) return null;
  const seg = opentime.split(' · ')[0];
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(at).map(x => [x.type, x.value]));
  const now = (+p.hour % 24) * 60 + +p.minute; const mon = p.weekday === 'Mon';
  if (/월\s*휴관/.test(seg) && !/다수/.test(seg) && mon) return { state: 'closed', label: '오늘 휴관(월)' };
  if (/24시간/.test(seg)) return { state: 'open', label: '24시간' };
  const ranges = [...seg.matchAll(/(\d{1,2}):(\d{2})\s*[-–~]\s*(\d{1,2}):(\d{2})/g)].map(m => [+m[1] * 60 + +m[2], +m[3] * 60 + +m[4]]);
  if (!ranges.length) return null;
  const fmt = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  for (const [a, b0] of ranges) {
    const b = b0 <= a ? b0 + 1440 : b0;                       // 자정 넘김(10:30-04:00)
    for (const n of [now, now + 1440]) {
      if (n >= a && n < b) return b - n <= 60 ? { state: 'closing', label: `곧 마감 · ${fmt(b)}` } : { state: 'open', label: `영업 중 · ${fmt(b)}까지` };
    }
  }
  const next = ranges.map(r => r[0]).find(a => a > now);
  return { state: 'closed', label: next != null ? `영업 전 · ${fmt(next)} 시작` : `영업 종료 · 내일 ${fmt(ranges[0][0])}` };
}
