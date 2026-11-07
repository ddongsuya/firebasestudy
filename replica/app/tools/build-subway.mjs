// Wikidata 스냅샷(data/src/wikidata-*.csv) → data/lines.json, data/stations.json, data/transfers.json
// 실행: node replica/app/tools/build-subway.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wgs2gcj } from '../js/gcj02.js';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '..', 'data', 'src');
const OUT = join(here, '..', 'data');
const Q = u => u.split('/').pop();

function csv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [h, ...body] = rows;
  return body.filter(r => r.length === h.length).map(r => Object.fromEntries(h.map((k, i) => [k, r[i]])));
}
const read = f => csv(readFileSync(join(SRC, f), 'utf8'));

// ───── 노선 정책 ─────
// 직통 운행 노선은 하나로 합친다(바퉁선→1호선, 다싱선→4호선). 트램·차량기지는 제외.
const MERGE = { Q1039452: 'Q748987', Q5242742: 'Q304264' };
const EXCLUDE_LINES = new Set(['Q96359551']); // 이좡 T1 트램
const LOOP = new Set(['Q680973', 'Q847886']);  // 2호선, 10호선
// 첫차·막차(종점 기준 근사, 베이징 지하철 공식 시각표 요약). 정확한 값은 역마다 다르므로 보수적으로 경고한다.
const HOURS = {
  Q748987: ['0500', '2300'], Q680973: ['0500', '2300'], Q6553113: ['0530', '2230'], Q304264: ['0500', '2300'],
  Q647340: ['0510', '2300'], Q6553138: ['0500', '2300'], Q6553149: ['0520', '2300'], Q847771: ['0500', '2300'],
  Q5929508: ['0520', '2300'], Q847886: ['0500', '2300'], Q6553057: ['0600', '2200'], Q26262009: ['0530', '2230'],
  Q847744: ['0500', '2300'], Q6553070: ['0500', '2300'], Q734917: ['0530', '2250'], Q6553080: ['0520', '2250'],
  Q24834015: ['0530', '2230'], Q135581001: ['0530', '2230'], Q6553202: ['0520', '2300'], Q847767: ['0600', '2230'],
  Q19840478: ['0600', '2230'], Q5066697: ['0510', '2240'], Q5433860: ['0510', '2230'], Q8048350: ['0530', '2210'],
  Q5944471: ['0520', '2240'], Q3400451: ['0600', '2200'], Q4881158: ['0600', '2200'],
};
const HEADWAY = { Q748987: 2.5, Q680973: 3, Q304264: 3, Q647340: 3, Q6553138: 3, Q847886: 3, Q847744: 4, Q847767: 10, Q19840478: 10 };
// 환승 도보 시간(분). 기본 4. 길기로 알려진 환승역.
const TRANSFER_MIN = { '西直门': 7, '东直门': 6, '宋家庄': 5, '国贸': 6, '惠新西街南口': 5, '知春路': 6, '北京南站': 5, '军事博物馆': 6, '六里桥': 6, '公主坟': 5, '呼家楼': 5, '海淀黄庄': 5, '望京': 5, '金台路': 5, '平安里': 5, '菜市口': 4, '宣武门': 5, '雍和宫': 5, '芍药居': 5, '立水桥': 4, '朝阳门': 4 };

const lineRows = read('wikidata-lines.csv').filter(r => !EXCLUDE_LINES.has(Q(r.line)) && !MERGE[Q(r.line)]);
const lines = {};
for (const r of lineRows) {
  const id = Q(r.line);
  const num = (r.en.match(/Line (\d+|S\d)/) || [])[1];
  const ko = num ? `${num}호선` : r.ko.replace(/^베이징 지하철 /, '').replace(/^틀:/, '');
  const zh = r.zh.replace(/^北京地[铁鐵]/, '');
  lines[id] = {
    id, zh, ko, en: r.en, color: '#' + r.color.toUpperCase(),
    kind: /机场|Airport/.test(r.zh + r.en) ? 'airport' : 'metro',
    loop: LOOP.has(id), first_dep: (HOURS[id] || ['0530', '2230'])[0], last_dep: (HOURS[id] || ['0530', '2230'])[1],
    headway_min: HEADWAY[id] || 5, avg_kmh: /Airport/.test(r.en) ? 60 : 35,
    fare_rule: /Capital Airport/.test(r.en) ? 'airport' : /Daxing Airport/.test(r.en) ? 'daxing' : 'distance',
    stations: [], wd: id,
  };
}
const lineOf = q => MERGE[q] || q;

// ───── 역 ─────
const stRows = read('wikidata-stations.csv').filter(r => !/车辆段|停车场/.test(r.zh));
const byQ = {};
for (const r of stRows) {
  const m = r.coord.match(/Point\(([-\d.]+) ([-\d.]+)\)/); if (!m) continue;
  const [lat, lon] = wgs2gcj(+m[2], +m[1]);
  const zh = r.zh.replace(/站$/, '');
  const ko = (r.ko || '').replace(/\s*\(지하철\)\s*/, '').replace(/\s?역$/, '').replace(/ 역$/, '').trim();
  const en = (r.en || '').replace(/\s*[Ss]tation$/, '').trim();
  byQ[Q(r.s)] = { wd: Q(r.s), zh, ko: ko || zh, en, py: en, lat: +lat.toFixed(6), lon: +lon.toFixed(6), lineset: new Set(r.lines.split('|').map(Q).map(lineOf).filter(l => lines[l])) };
}
// 같은 이름(zh) 600m 이내 중복 항목 병합
const dist = (a, b) => { const R = 6371000, d2r = Math.PI / 180; const dLat = (b.lat - a.lat) * d2r, dLon = (b.lon - a.lon) * d2r; const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * d2r) * Math.cos(b.lat * d2r) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const alias = {}; // Qid → 대표 Qid
const byZh = {};
for (const [q, s] of Object.entries(byQ)) {
  const same = (byZh[s.zh] || []).find(o => dist(o, s) < 600);
  if (same) { alias[q] = same.wd; s.lineset.forEach(l => same.lineset.add(l)); if (!same.ko && s.ko) same.ko = s.ko; }
  else (byZh[s.zh] ||= []).push(s);
}
const rep = q => alias[q] || q;
const stations = {};
for (const [q, s] of Object.entries(byQ)) if (!alias[q]) stations[q] = s;

// ───── 인접 → 노선 순서 ─────
const edges = {}; // line → Set("a|b")
for (const r of read('wikidata-adjacency.csv')) {
  const l = lineOf(Q(r.line)); if (!lines[l]) continue;
  const a = rep(Q(r.s)), b = rep(Q(r.adj));
  if (!stations[a] || !stations[b] || a === b) continue;
  (edges[l] ||= new Set()).add([a, b].sort().join('|'));
  stations[a].lineset.add(l); stations[b].lineset.add(l);
}
const warnings = [];
for (const [l, set] of Object.entries(edges)) {
  const nb = {};
  for (const e of set) { const [a, b] = e.split('|'); (nb[a] ||= new Set()).add(b); (nb[b] ||= new Set()).add(a); }
  // 가장 큰 연결 성분
  const seen = new Set(); let best = [];
  for (const n of Object.keys(nb)) {
    if (seen.has(n)) continue; const comp = []; const st = [n]; seen.add(n);
    while (st.length) { const x = st.pop(); comp.push(x); for (const y of nb[x]) if (!seen.has(y)) { seen.add(y); st.push(y); } }
    if (comp.length > best.length) best = comp;
  }
  if (best.length < Object.keys(nb).length) warnings.push(`${lines[l].ko}: 연결 안 된 역 ${Object.keys(nb).length - best.length}개 제외`);
  const deg = n => [...nb[n]].filter(x => best.includes(x)).length;
  const branch = best.filter(n => deg(n) > 2);
  if (branch.length) warnings.push(`${lines[l].ko}: 분기 ${branch.map(q => stations[q].zh).join(',')} (첫 경로만 사용)`);
  // 가장 긴 단순 경로(분기·잉여 간선이 있어도 본선을 고른다). 순환선은 아무 역에서 출발.
  const nbr = n => [...nb[n]].filter(x => best.includes(x));
  let order = [];
  const starts = lines[l].loop ? [best[0]] : (best.filter(n => deg(n) === 1).length ? best.filter(n => deg(n) === 1) : best);
  for (const s0 of starts) {
    const stack = [[s0, [s0]]];
    while (stack.length) {
      const [cur, path] = stack.pop();
      if (path.length > order.length) order = path;
      for (const x of nbr(cur)) if (!path.includes(x)) stack.push([x, [...path, x]]);
      if (stack.length > 20000) break; // 안전장치
    }
  }
  if (order.length < best.length) warnings.push(`${lines[l].ko}: 순서 복원 ${order.length}/${best.length}`);
  lines[l].stations = order.map((q, i) => ({ station: q, seq: i, dist_prev_m: i ? Math.round(dist(stations[order[i - 1]], stations[q]) * 1.15) : 0 }));
  if (lines[l].loop) lines[l].loop_dist_m = Math.round(dist(stations[order[order.length - 1]], stations[order[0]]) * 1.15);
}
for (const l of Object.values(lines)) if (!l.stations.length) { warnings.push(`${l.ko}: 역 데이터 없음 → 제외`); delete lines[l.id]; }

// ───── 역 id, 출력 ─────
const slug = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const usedIds = new Set(); const idOf = {};
for (const [q, s] of Object.entries(stations)) {
  let id = slug(s.en) || q; if (usedIds.has(id)) id = `${id}-${q.toLowerCase()}`; usedIds.add(id); idOf[q] = id;
}
const outStations = Object.entries(stations)
  .filter(([q, s]) => [...s.lineset].some(l => lines[l]?.stations.some(x => x.station === q)))
  .map(([q, s]) => ({
    id: idOf[q], zh: s.zh, ko: s.ko, en: s.en, py: s.py, lat: s.lat, lon: s.lon,
    lines: Object.values(lines).filter(l => l.stations.some(x => x.station === q)).map(l => l.id),
    transfer: Object.values(lines).filter(l => l.stations.some(x => x.station === q)).length > 1, wd: q,
  })).sort((a, b) => a.id.localeCompare(b.id));
const outLines = Object.values(lines).map(l => ({ ...l, stations: l.stations.map(x => ({ ...x, station: idOf[x.station] })) }))
  .sort((a, b) => (parseInt(a.ko) || 99) - (parseInt(b.ko) || 99) || a.ko.localeCompare(b.ko));
const transfers = outStations.filter(s => s.transfer).map(s => ({ station: s.id, walk_min: TRANSFER_MIN[s.zh] || 4 }));

writeFileSync(join(OUT, 'lines.json'), JSON.stringify(outLines, null, 1));
writeFileSync(join(OUT, 'stations.json'), JSON.stringify(outStations, null, 1));
writeFileSync(join(OUT, 'transfers.json'), JSON.stringify(transfers, null, 1));
console.log(`lines ${outLines.length}, stations ${outStations.length}, transfers ${transfers.length}`);
for (const l of outLines) console.log(`  ${l.ko.padEnd(8)} ${l.stations.length}역  ${stations[Object.keys(idOf).find(q => idOf[q] === l.stations[0].station)].zh} … ${stations[Object.keys(idOf).find(q => idOf[q] === l.stations.at(-1).station)].zh}${l.loop ? ' (순환)' : ''}`);
warnings.forEach(w => console.log('  ⚠ ' + w));
