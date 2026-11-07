// data/*.json 무결성 검사 (schema.sql의 제약을 JSON에 적용). 실행: node replica/app/tools/validate-data.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const read = f => JSON.parse(readFileSync(join(here, '..', 'data', f + '.json'), 'utf8'));
const cats = read('categories'), places = read('places'), stations = read('stations'), lines = read('lines'), transfers = read('transfers'), fares = read('fares'), exits = read('exits');
const errs = [];
const inBj = (lat, lon) => lat >= 39.4 && lat <= 41.1 && lon >= 115.4 && lon <= 117.6;
const catIds = new Set(cats.map(c => c.id)), stIds = new Set(stations.map(s => s.id)), lineIds = new Set(lines.map(l => l.id));
if (stIds.size !== stations.length) errs.push('역 id 중복');
if (new Set(places.map(p => p.id)).size !== places.length) errs.push('장소 id 중복');
for (const p of places) {
  if (!catIds.has(p.cat)) errs.push(`장소 ${p.id}: 카테고리 ${p.cat} 없음`);
  if (!inBj(p.lat, p.lon)) errs.push(`장소 ${p.id}: 좌표 범위 밖`);
  if (p.coord !== 'gcj02') errs.push(`장소 ${p.id}: coord 표기 없음`);
  if (!p.name_ko || !p.name_zh || !p.address_zh) errs.push(`장소 ${p.id}: 이름/주소 누락`);
  if (p.station_id && !stIds.has(p.station_id)) errs.push(`장소 ${p.id}: 역 ${p.station_id} 없음`);
  if (p.exit_code && !p.station_id) errs.push(`장소 ${p.id}: 출구만 있고 역 없음`);
}
for (const s of stations) {
  if (!inBj(s.lat, s.lon)) errs.push(`역 ${s.id}: 좌표 범위 밖`);
  if (!s.zh || !s.ko) errs.push(`역 ${s.id}: 이름 누락`);
  for (const l of s.lines) if (!lineIds.has(l)) errs.push(`역 ${s.id}: 노선 ${l} 없음`);
  if (s.transfer !== (s.lines.length > 1)) errs.push(`역 ${s.id}: transfer 플래그 불일치`);
}
for (const l of lines) {
  if (!/^#[0-9A-F]{6}$/.test(l.color)) errs.push(`노선 ${l.ko}: 색 형식`);
  if (!/^\d{4}$/.test(l.first_dep) || !/^\d{4}$/.test(l.last_dep)) errs.push(`노선 ${l.ko}: 첫차/막차 형식`);
  const seqs = l.stations.map(x => x.seq); if (seqs.some((s, i) => s !== i)) errs.push(`노선 ${l.ko}: seq 순서`);
  const ids = l.stations.map(x => x.station); if (new Set(ids).size !== ids.length) errs.push(`노선 ${l.ko}: 역 중복`);
  for (const x of l.stations) { if (!stIds.has(x.station)) errs.push(`노선 ${l.ko}: 역 ${x.station} 없음`); if (x.seq && !(x.dist_prev_m > 0 && x.dist_prev_m < (l.kind === 'airport' ? 40000 : 15000))) errs.push(`노선 ${l.ko}: ${x.station} 역간 거리 이상 ${x.dist_prev_m}`); }
  if (l.stations.length < 2) errs.push(`노선 ${l.ko}: 역 2개 미만`);
}
for (const t of transfers) { if (!stIds.has(t.station)) errs.push(`환승 ${t.station}: 역 없음`); if (!(t.walk_min >= 0 && t.walk_min <= 20)) errs.push(`환승 ${t.station}: 도보 분 범위`); }
for (const e of exits) { if (!stIds.has(e.station)) errs.push(`출구 ${e.station}/${e.code}: 역 없음`); if (!/^[A-Z]\d?$/.test(e.code)) errs.push(`출구 ${e.station}/${e.code}: 코드 형식`); }
const exitKeys = new Set(exits.map(e => e.station + '/' + e.code)); if (exitKeys.size !== exits.length) errs.push('출구 중복');
if (!fares.metro_distance?.bands?.length || !fares.taxi?.flag_yuan) errs.push('요금표 누락');
if (errs.length) { console.error('데이터 검증 실패:'); errs.forEach(e => console.error('  - ' + e)); process.exit(1); }
console.log(`데이터 OK: 장소 ${places.length}, 역 ${stations.length}, 노선 ${lines.length}, 환승 ${transfers.length}, 출구 ${exits.length}`);
