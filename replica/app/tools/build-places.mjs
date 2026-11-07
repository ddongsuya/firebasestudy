// 장소·회화·팁 빌드: v1 루트 js/data.js + data/src/places-extra.json(직접 큐레이션) + data/src/wikidata-poi.json(좌표)
// → data/places.json, phrases.json, tips.json, categories.json. 실행: node replica/app/tools/build-places.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wgs2gcj } from '../js/gcj02.js';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'data');
const src = readFileSync(join(here, '..', '..', '..', 'js', 'data.js'), 'utf8');
const win = {}; new Function('window', src)(win);
const D = win.GODUK_DATA;
const stations = JSON.parse(readFileSync(join(OUT, 'stations.json'), 'utf8'));
const byZh = Object.fromEntries(stations.map(s => [s.zh, s]));
const extra = JSON.parse(readFileSync(join(OUT, 'src', 'places-extra.json'), 'utf8')).places;
const wdPoi = JSON.parse(readFileSync(join(OUT, 'src', 'wikidata-poi.json'), 'utf8'));

// 입구 기준 좌표 보정(WGS-84). 관광지는 중앙이 아니라 '들어가는 문' 좌표여야 역에서의 도보 시간이 맞는다.
const ENTRANCE = { gugong: [39.9134, 116.3912] /* 午门 */ };
const KEEP_OWN_COORD = new Set(['gugong', 'tiantan', 'yiheyuan', 'yuanmingyuan']); // 입구 기준으로 손본 곳은 Wikidata(중앙)로 덮지 않음

const categories = [
  { id: 'sight', label_ko: '관광', label_zh: '景点', icon: '🏯', typecodes: ['110000'], sort: 1 },
  { id: 'wall', label_ko: '만리장성', label_zh: '长城', icon: '🧱', typecodes: ['110000'], sort: 2 },
  { id: 'museum', label_ko: '박물관', label_zh: '博物馆', icon: '🏛️', typecodes: ['140000'], sort: 3 },
  { id: 'food', label_ko: '맛집', label_zh: '美食', icon: '🥟', typecodes: ['050000'], sort: 4 },
  { id: 'shop', label_ko: '쇼핑·거리', label_zh: '购物', icon: '🛍️', typecodes: ['060000'], sort: 5 },
  { id: 'park', label_ko: '공원·호수', label_zh: '公园', icon: '🌳', typecodes: ['110100'], sort: 6 },
  { id: 'transit', label_ko: '역·공항', label_zh: '交通', icon: '🚄', typecodes: ['150000'], sort: 7 },
  { id: 'hotel', label_ko: '숙소 지구', label_zh: '酒店', icon: '🏨', typecodes: ['100000'], sort: 8 },
  { id: 'help', label_ko: '대사관·병원', label_zh: '求助', icon: '🆘', typecodes: ['090000'], sort: 9 },
];

const simp = s => (s || '').replace(/[國際機場門廣場樓宮園]/g, c => ({ 國: '国', 際: '际', 機: '机', 場: '场', 門: '门', 廣: '广', 樓: '楼', 宮: '宫', 園: '园' })[c] || c);
const core = s => simp(s).replace(/\(.*?\)|（.*?）/g, '').replace(/·.*$/, '').replace(/(公园|景区|博物馆|博物院|大街|胡同|长城)$/, '').trim();
const similar = (a, b) => { const x = core(a), y = core(b); return x && y && x.length >= 2 && y.length >= 2 && (x === y || x.includes(y) || y.includes(x)); };

// 1) v1 기준으로 큐레이션 항목 병합(같은 장소면 v1 id 유지, 큐레이션 필드 우선)
const ALIAS = { tiananmen_sq: 'tiananmen', kongmiao: 'guozijian', beijing_zoo: 'zoo', cctv_hq: 'cctv', quanjude_qm: 'quanjude', siji_minfu: 'siji', niaochao: 'niaochao', wangfujing: 'wangfujing', pkx: 'pkx' };
const merged = D.places.map(p => ({ ...p, src: 'v1' }));
const mergeLog = [];
for (const e of extra) {
  const hit = merged.find(p => p.id === e.id || p.id === ALIAS[e.id] || simp(p.zh) === simp(e.zh) || core(p.zh) === core(e.zh));
  if (hit) { mergeLog.push(`${hit.id}←${e.id}`); Object.assign(hit, { cat: e.cat, ko: e.ko, zh: e.zh, py: e.py, lat: e.lat, lon: e.lon, addr: e.addr, metro: e.metro, tip: e.tip, open: e.open, price: e.price, tags: e.tags, src: 'manual' }); }
  else merged.push({ ...e, src: 'manual' });
}
// 2) Wikidata 좌표로 덮어쓰기(이름이 같고 1.5km 이내일 때)
const wdLog = [];
for (const p of merged) {
  if (KEEP_OWN_COORD.has(p.id)) continue;
  let hit = wdPoi.find(w => simp(w.zh) === simp(p.zh));
  if (!hit) { const c = wdPoi.filter(w => similar(w.zh, p.zh)); hit = c.length === 1 ? c[0] : null; }
  if (!hit) continue;
  const m = hit.coord.match(/Point\(([-\d.]+) ([-\d.]+)\)/); if (!m) continue;
  const wlon = +m[1], wlat = +m[2];
  const far = Math.hypot((wlat - p.lat) * 111000, (wlon - p.lon) * 85000);
  if (far > 1500) { wdLog.push(`${p.id}: Wikidata '${hit.zh}'와 ${Math.round(far)}m 차이 → 무시`); continue; }
  p.lat = wlat; p.lon = wlon; p.src = 'wikidata'; p.wd = hit.wd;
  if (!p.addr && hit.addr) p.addr = hit.addr;
}

const places = merged.map(p => {
  const [lat, lon] = wgs2gcj(...(ENTRANCE[p.id] || [p.lat, p.lon]));
  const m = (p.metro || '').match(/^([一-龥·0-9A-Za-z]+?)(?:\(|（|\s)/);
  let station_id = null, exit_code = null;
  if (m) { const zh = m[1].split('·')[0].replace(/站$/, ''); station_id = byZh[zh]?.id || null; }
  const ex = (p.metro || '').match(/([A-H]\d?)출구|(\d+)号口|([东西南北]+)口/);
  if (ex && station_id) exit_code = ex[1] || ex[2] || ex[3];
  return {
    id: p.id, cat: p.cat, name_ko: p.ko, name_zh: p.zh, name_en: null, pinyin: p.py,
    lat: +lat.toFixed(6), lon: +lon.toFixed(6), coord: 'gcj02', coord_src: p.src, wd: p.wd || null,
    address_zh: p.addr, district_zh: (p.addr.match(/北京市(.+?区)/) || [])[1] || null,
    tel: null, opentime: p.open || (p.tip.match(/(\d{1,2}:\d{2}[~–-]\d{1,2}:\d{2})/) || [])[1] || null,
    price_yuan: p.price ?? null, rating: null, tags: p.tags || [],
    tip_ko: p.tip, metro_note: p.metro || null, station_id, exit_code, parent_id: null,
    updated_at: '2026-11-07',
  };
});
const phrases = D.phrases.map((x, i) => ({ id: `ph${i + 1}`, cat: x.cat, ko: x.ko, zh: x.zh, py: x.py }));
const tips = D.tips.map((x, i) => ({ id: `tip${i + 1}`, title: x.t, body: x.d }));
writeFileSync(join(OUT, 'categories.json'), JSON.stringify(categories, null, 1));
writeFileSync(join(OUT, 'places.json'), JSON.stringify(places, null, 1));
writeFileSync(join(OUT, 'phrases.json'), JSON.stringify(phrases, null, 1));
writeFileSync(join(OUT, 'tips.json'), JSON.stringify(tips, null, 1));
console.log(`places ${places.length} (역 매칭 ${places.filter(p => p.station_id).length}, 출구 ${places.filter(p => p.exit_code).length}), phrases ${phrases.length}, tips ${tips.length}`);
console.log('병합(v1←큐레이션):', mergeLog.join(', '));
console.log('좌표 출처:', JSON.stringify(Object.fromEntries(['v1', 'manual', 'wikidata'].map(k => [k, places.filter(p => p.coord_src === k).length]))));
wdLog.forEach(l => console.log('  ⚠ ' + l));
console.log('역 미매칭:', places.filter(p => !p.station_id).map(p => `${p.name_ko}`).join(' | '));
