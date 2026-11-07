import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadData } from './helpers.mjs';
import { plan, STRATEGIES } from '../../js/routing/transit.js';
import { metroFare, taxiFare, beijingHHMM } from '../../js/routing/fare.js';
import { check } from '../../js/routing/schedule.js';
import { straight } from '../../js/routing/walk.js';
import { estimate } from '../../js/routing/taxi.js';
import { wgs2gcj, gcj2wgs } from '../../js/gcj02.js';
import { search, nearby, nearestStations } from '../../js/data.js';

const D = loadData();
const P = id => D.placeById[id];
const S = zh => D.stations.find(s => s.zh === zh);

test('좌표 변환 왕복 오차 < 1m', () => {
  const g = wgs2gcj(39.9163, 116.3908); const w = gcj2wgs(...g);
  assert.ok(Math.abs(w[0] - 39.9163) < 1e-5 && Math.abs(w[1] - 116.3908) < 1e-5);
  assert.ok(Math.abs(g[0] - 39.9163) > 0.0005, 'GCJ 오프셋이 있어야 함');
});

test('데이터: 2호선 순환 18역, 환승역 100개 이상, 모든 역에 노선', () => {
  const l2 = D.lines.find(l => l.ko === '2호선');
  assert.equal(l2.stations.length, 18); assert.ok(l2.loop);
  assert.ok(D.transfers.length > 100);
  for (const s of D.stations) assert.ok(s.lines.length >= 1, s.zh);
});

test('왕징 → 자금성(천안문동): 경로 있음, 환승 ≤ 2, 요금 3~6元', () => {
  const o = { ...S('望京'), name: '왕징' }; const d = { ...P('gugong'), name: '자금성' };
  const plans = plan({ origin: o, destination: d, strategy: 'recommend' }, D);
  assert.ok(plans.length >= 1, '경로 없음');
  const p = plans[0];
  assert.ok(p.transfers <= 2, `환승 ${p.transfers}`);
  assert.ok(p.fare_yuan >= 3 && p.fare_yuan <= 6, `요금 ${p.fare_yuan}`);
  assert.ok(p.duration_s > 20 * 60 && p.duration_s < 80 * 60, `시간 ${p.duration_s / 60}분`);
  assert.equal(p.segments[0].kind, 'walk'); assert.equal(p.segments.at(-1).kind, 'walk');
  const rides = p.segments.filter(s => s.kind === 'ride');
  assert.ok(rides.every(r => r.direction), '방면 정보');
  assert.ok(rides.every(r => r.stops >= 1));
});

test('전략: 환승 적게는 환승 수가 추천 이하', () => {
  const o = { ...S('北京南'), name: '남역' }, d = { ...S('首都机场2号航站楼') || S('2号航站楼') || D.stations.find(s => /2号航站楼/.test(s.zh)), name: '공항' };
  const a = plan({ origin: o, destination: d, strategy: 'recommend' }, D)[0];
  const b = plan({ origin: o, destination: d, strategy: 'fewer_transfers' }, D)[0];
  assert.ok(a && b); assert.ok(b.transfers <= a.transfers);
  assert.ok(a.fare_yuan >= 25, '공항선 정액 포함');
});

test('같은 역 근처 ↔ 같은 역 근처: 경로 없음 또는 도보가 더 빠름', () => {
  const o = { ...S('东直门') }; const d = { lat: o.lat + 0.001, lon: o.lon + 0.001 };
  const plans = plan({ origin: o, destination: d }, D);
  assert.equal(plans.length, 0);
});

test('지하철 요금 구간', () => {
  assert.equal(metroFare(5000, ['Q748987'], D), 3);
  assert.equal(metroFare(11000, ['Q748987'], D), 4);
  assert.equal(metroFare(21000, ['Q748987'], D), 5);
  assert.equal(metroFare(31000, ['Q748987'], D), 6);
  assert.equal(metroFare(45000, ['Q748987'], D), 7);
  assert.equal(metroFare(20000, ['Q847767'], D), 25);
  assert.equal(metroFare(20000, ['Q847767', 'Q680973'], D), 30);
});

test('택시 요금: 주간 10km ≈ 30元대, 야간 할증', () => {
  const day = new Date('2026-11-07T06:00:00Z'); // 베이징 14:00
  const night = new Date('2026-11-07T16:30:00Z'); // 베이징 00:30
  assert.equal(beijingHHMM(day), '1400'); assert.equal(beijingHHMM(night), '0030');
  const f = taxiFare(10000, day, D); assert.ok(f.low >= 28 && f.low <= 34, f.low); assert.ok(!f.night);
  const n = taxiFare(10000, night, D); assert.ok(n.night && n.low > f.low);
  const e = estimate(S('望京'), P('gugong'), day, D); assert.ok(e.fare_low > 20 && e.fare_high > e.fare_low);
});

test('막차 검사: 00:30에는 경고, 14:00에는 정상', () => {
  const o = { ...S('望京') }, d = { ...P('gugong') };
  const p = plan({ origin: o, destination: d }, D)[0];
  assert.ok(check(p, new Date('2026-11-07T06:00:00Z'), D).ok);
  const late = check(p, new Date('2026-11-07T16:30:00Z'), D);
  assert.ok(!late.ok && late.warnings.some(w => w.level === 'danger'));
});

test('도보 직선 추정과 방위', () => {
  const w = straight(S('天安门东'), P('gugong'));
  assert.ok(w.distance_m > 100 && w.distance_m < 3000); assert.ok(/쪽으로/.test(w.steps[0].instruction));
});

test('검색: 한글·중국어·병음, 역 포함', () => {
  assert.equal(search('자금성')[0].ref.id, 'gugong');
  assert.equal(search('故宫')[0].ref.id, 'gugong');
  assert.equal(search('gugong')[0].ref.id, 'gugong');
  assert.ok(search('왕징').some(r => r.kind === 'station'));
  assert.ok(search('wangjing').some(r => r.kind === 'station'));
  assert.equal(search('zzzz없음').length, 0);
});

test('주변: 자금성 1.5km 안에 장소와 역이 있다', () => {
  const n = nearby(P('gugong'), { radius: 1500 });
  assert.ok(n.some(x => x.kind === 'place') && n.some(x => x.kind === 'station'));
  assert.ok(nearestStations(P('gugong'), 3).length === 3);
});
