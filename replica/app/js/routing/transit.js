// 지하철 경로 탐색: (역, 노선) 상태 노드 위 다익스트라.
// 비용(초) = 승차 시간 + 정차 + 환승(도보 + 대기) + 출발·도착 도보. 전략별 가중치.
import { distance } from '../geo.js';
import { nearestStations } from '../data.js';
import { metroFare } from './fare.js';

export const STRATEGIES = {
  recommend: { label: '추천', transfer_penalty: 1, walk_w: 1 },
  fewer_transfers: { label: '환승 적게', transfer_penalty: 4, walk_w: 1 },
  less_walking: { label: '걷기 적게', transfer_penalty: 1, walk_w: 3 },
};
const WALK_MPS = 1.25, DETOUR = 1.3, DWELL_S = 35, WAIT_S = 180;

/** 그래프 구축(한 번). */
export function buildGraph(D) {
  const adj = {}; // "station|line" → [{to:"station|line", s, kind:'ride'|'transfer', from, toStation, line, hops, dist}]
  const add = (k, e) => (adj[k] ||= []).push(e);
  for (const line of D.lines) {
    const st = line.stations;
    const edge = (a, b, dist) => {
      const s = dist / (line.avg_kmh / 3.6) + DWELL_S;
      add(`${a.station}|${line.id}`, { to: `${b.station}|${line.id}`, s, kind: 'ride', line: line.id, toStation: b.station, dist });
      add(`${b.station}|${line.id}`, { to: `${a.station}|${line.id}`, s, kind: 'ride', line: line.id, toStation: a.station, dist });
    };
    for (let i = 1; i < st.length; i++) edge(st[i - 1], st[i], st[i].dist_prev_m || 800);
    if (line.loop && st.length > 2) edge(st[st.length - 1], st[0], line.loop_dist_m || 1200);
  }
  for (const s of D.stations) if (s.lines.length > 1) {
    const walk = (D.transferMin[s.id] || 4) * 60;
    for (const a of s.lines) for (const b of s.lines) if (a !== b) add(`${s.id}|${a}`, { to: `${s.id}|${b}`, s: walk + WAIT_S + D.lineById[b].headway_min * 30, kind: 'transfer', line: b, toStation: s.id, walk_s: walk });
  }
  return adj;
}

/**
 * @param {{origin:{lat,lon,name?}, destination:{lat,lon,name?}, strategy?:string}} req
 * @returns RoutePlan[] (중복 제거, 시간순 최대 4개)
 */
export function plan(req, D, graph = D._graph || (D._graph = buildGraph(D))) {
  const strat = STRATEGIES[req.strategy || 'recommend'];
  const o = req.origin, d = req.destination;
  const direct = distance(o, d);
  const from = nearestStations(o, 3, 2500), to = nearestStations(d, 3, 2500);
  if (!from.length || !to.length) return [];
  const plans = [];
  // 출발역 후보 × 도착역 후보 → 각각 다익스트라(그래프가 작아 충분히 빠름)
  for (const f of from) for (const t of to) {
    if (f.station.id === t.station.id) continue;
    const r = dijkstra(graph, D, f.station.id, t.station.id, strat);
    if (!r) continue;
    const walkIn = f.distance_m * DETOUR, walkOut = t.distance_m * DETOUR;
    const p = assemble(r, D, o, d, f.station, t.station, walkIn, walkOut);
    if (p && p.duration_s < direct / WALK_MPS * DETOUR + 60) plans.push(p);
  }
  // 중복(같은 노선 체인) 제거, 시간순
  const seen = new Set(); const out = [];
  for (const p of plans.sort((a, b) => a.duration_s - b.duration_s)) {
    const key = p.segments.filter(s => s.kind === 'ride').map(s => `${s.line}:${s.from_station}:${s.to_station}`).join('>');
    if (seen.has(key)) continue; seen.add(key); out.push(p);
  }
  return out.slice(0, 4);
}

function dijkstra(adj, D, fromSt, toSt, strat) {
  const fromS = D.stationById[fromSt], toS = D.stationById[toSt];
  const starts = fromS.lines.map(l => `${fromSt}|${l}`); const goals = new Set(toS.lines.map(l => `${toSt}|${l}`));
  const dist = {}, prev = {}; const pq = [];
  for (const s of starts) { dist[s] = D.lineById[s.split('|')[1]].headway_min * 30; pq.push([dist[s], s]); }
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]); const [dcur, cur] = pq.shift();
    if (dcur > dist[cur]) continue;
    if (goals.has(cur)) return unwind(prev, cur, dist[cur]);
    for (const e of adj[cur] || []) {
      const w = e.kind === 'transfer' ? e.s * strat.transfer_penalty : e.s;
      const nd = dcur + w;
      if (nd < (dist[e.to] ?? Infinity)) { dist[e.to] = nd; prev[e.to] = { from: cur, e }; pq.push([nd, e.to]); }
    }
  }
  return null;
}
function unwind(prev, end, cost) { const steps = []; let cur = end; while (prev[cur]) { steps.unshift({ from: prev[cur].from, ...prev[cur].e }); cur = prev[cur].from; } return { steps, cost }; }

function assemble(r, D, o, d, fromSt, toSt, walkIn, walkOut) {
  const segments = []; let t = 0, rideDist = 0; const lines = new Set();
  segments.push({ kind: 'walk', from_name: o.name || '출발지', to_station: fromSt.id, distance_m: Math.round(walkIn), duration_s: Math.round(walkIn / WALK_MPS), start_offset_s: 0 });
  t += walkIn / WALK_MPS;
  let cur = null;
  for (const st of r.steps) {
    if (st.kind === 'ride') {
      if (!cur || cur.line !== st.line) { cur = { kind: 'ride', line: st.line, from_station: st.from.split('|')[0], to_station: st.toStation, stops: 0, distance_m: 0, duration_s: 0, start_offset_s: Math.round(t), via: [] }; segments.push(cur); lines.add(st.line); t += D.lineById[st.line].headway_min * 30; }
      cur.stops++; cur.distance_m += st.dist; cur.duration_s += st.s; cur.to_station = st.toStation; cur.via.push(st.toStation); t += st.s; rideDist += st.dist;
    } else if (st.kind === 'transfer') {
      segments.push({ kind: 'transfer', station: st.toStation, to_line: st.line, walk_s: st.walk_s, duration_s: Math.round(st.s), start_offset_s: Math.round(t) });
      t += st.s; cur = null;
    }
  }
  if (!lines.size) return null;
  for (const s of segments) if (s.kind === 'ride') { s.via.pop(); s.direction = directionOf(D, s); }
  segments.push({ kind: 'walk', from_station: toSt.id, to_name: d.name || '도착지', distance_m: Math.round(walkOut), duration_s: Math.round(walkOut / WALK_MPS), start_offset_s: Math.round(t) });
  t += walkOut / WALK_MPS;
  const transfers = segments.filter(s => s.kind === 'transfer').length;
  return {
    mode: 'transit', duration_s: Math.round(t), distance_m: Math.round(rideDist + walkIn + walkOut), ride_distance_m: Math.round(rideDist),
    walking_distance_m: Math.round(walkIn + walkOut), transfers, stops: segments.filter(s => s.kind === 'ride').reduce((a, s) => a + s.stops, 0),
    fare_yuan: metroFare(rideDist, [...lines], D), lines: [...lines], segments,
    from_station: fromSt.id, to_station: toSt.id,
  };
}
/** 노선의 진행 방향 = 다음 역 쪽 종점 이름("○○ 방면") */
function directionOf(D, seg) {
  const line = D.lineById[seg.line]; const idx = Object.fromEntries(line.stations.map((x, i) => [x.station, i]));
  const a = idx[seg.from_station], b = idx[seg.via[0] || seg.to_station];
  if (a == null || b == null) return null;
  const n = line.stations.length;
  if (line.loop) { const fwd = (b - a + n) % n === 1; return fwd ? '외선(시계 방향)' : '내선(반시계 방향)'; }
  const term = line.stations[b > a ? n - 1 : 0].station;
  return `${D.stationById[term]?.ko || ''} 방면`;
}
