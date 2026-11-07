// v1 루트 js/data.js(장소·회화·팁) → data/places.json, phrases.json, tips.json, categories.json
// 실행: node replica/app/tools/build-places.mjs
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

const categories = [
  { id: 'sight', label_ko: '관광', label_zh: '景点', icon: '🏯', typecodes: ['110000'], sort: 1 },
  { id: 'wall', label_ko: '만리장성', label_zh: '长城', icon: '🧱', typecodes: ['110000'], sort: 2 },
  { id: 'food', label_ko: '맛집', label_zh: '美食', icon: '🥟', typecodes: ['050000'], sort: 3 },
  { id: 'shop', label_ko: '쇼핑·거리', label_zh: '购物', icon: '🛍️', typecodes: ['060000'], sort: 4 },
  { id: 'park', label_ko: '공원·호수', label_zh: '公园', icon: '🌳', typecodes: ['110100'], sort: 5 },
  { id: 'transit', label_ko: '역·공항', label_zh: '交通', icon: '🚄', typecodes: ['150000'], sort: 6 },
  { id: 'hotel', label_ko: '호텔', label_zh: '酒店', icon: '🏨', typecodes: ['100000'], sort: 7 },
];

// 입구 기준 좌표 보정(WGS-84). 관광지는 중앙이 아니라 '들어가는 문' 좌표여야 역에서의 도보 시간이 맞는다.
const ENTRANCE = { gugong: [39.9134, 116.3912] /* 午门 */ };
const places = D.places.map(p => {
  const [lat, lon] = wgs2gcj(...(ENTRANCE[p.id] || [p.lat, p.lon]));
  // metro 문자열에서 첫 번째 역 이름(중국어)과 출구를 뽑는다. 예: "天坛东门(5호선) A출구 바로 앞"
  const m = (p.metro || '').match(/^([一-龥·]+?)(?:\(|（|\s)/);
  let station_id = null, exit_code = null;
  if (m) { const zh = m[1].split('·')[0].replace(/站$/, ''); station_id = byZh[zh]?.id || null; }
  const ex = (p.metro || '').match(/([A-H]\d?)출구|(\d+)号口|([东西南北]+)口/);
  if (ex) exit_code = ex[1] || ex[2] || ex[3];
  return {
    id: p.id, cat: p.cat, name_ko: p.ko, name_zh: p.zh, name_en: null, pinyin: p.py,
    lat: +lat.toFixed(6), lon: +lon.toFixed(6), coord: 'gcj02',
    address_zh: p.addr, district_zh: (p.addr.match(/北京市(.+?区)/) || [])[1] || null,
    tel: null, opentime: (p.tip.match(/(\d{1,2}:\d{2}[~–-]\d{1,2}:\d{2})/) || [])[1] || null,
    price_yuan: null, rating: null, tags: [],
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
console.log(`places ${places.length} (역 매칭 ${places.filter(p => p.station_id).length}), phrases ${phrases.length}, tips ${tips.length}`);
console.log('역 미매칭:', places.filter(p => !p.station_id).map(p => `${p.name_ko}←${p.metro_note}`).join(' | '));
