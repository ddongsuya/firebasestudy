// 첫차·막차 검사. 시각은 "HHMM" 베이징 기준.
// 노선 데이터의 first_dep/last_dep는 종점 출발 시각이다. 중간역에는 그보다 늦게 도착하므로
// 탈 역까지 걸리는 시간(역간 거리 ÷ 평균 속도 + 정차)을 더해 "이 역 통과 추정 시각"으로 비교한다.
import { beijingHHMM } from './fare.js';

const DWELL_S = 35;
const toMin = s => +s.slice(0, 2) * 60 + +s.slice(2);
const toHHMM = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + String(m % 60).padStart(2, '0'); };

/** 진행 방향 출발 종점에서 seg.from_station까지 걸리는 분. 모르면 0(종점 시각 그대로 = 보수적). */
export function minutesFromTerminal(line, seg) {
  const st = line.stations || []; if (line.loop || st.length < 2) return 0;
  const idx = st.findIndex(x => x.station === seg.from_station);
  const next = st.findIndex(x => x.station === (seg.via?.[0] || seg.to_station));
  if (idx < 0 || next < 0 || idx === next) return 0;
  const mps = (line.avg_kmh || 35) / 3.6;
  let s = 0;
  if (next > idx) for (let i = 1; i <= idx; i++) s += (st[i].dist_prev_m || 800) / mps + DWELL_S;       // 0번 종점에서 출발한 열차
  else for (let i = st.length - 1; i > idx; i--) s += (st[i].dist_prev_m || 800) / mps + DWELL_S;     // 마지막 종점에서 출발한 열차
  return s / 60;
}

export function check(plan, at, D) {
  const now = toMin(beijingHHMM(at));
  const warnings = []; let ok = true;
  for (const seg of plan.segments) {
    if (seg.kind !== 'ride') continue;
    const line = D.lineById[seg.line]; if (!line) continue;
    const off = minutesFromTerminal(line, seg);
    const first = toMin(line.first_dep) + off, last = toMin(line.last_dep) + off;
    const station = D.stationById?.[seg.from_station]?.ko;
    const where = station ? `${station}역 ` : '';
    // 자정 넘긴 막차(예: 23:40 + 30분 = 00:10)도 비교되도록, 새벽 4시 전은 전날 연장으로 본다
    let dep = (now + Math.round(seg.start_offset_s / 60)) % 1440;
    if (dep < 240 && last >= 1440) dep += 1440;
    const lastTxt = fmt(toHHMM(last)), firstTxt = fmt(toHHMM(first));
    if (dep < first) { warnings.push({ level: 'danger', text: `${line.ko} 첫차 전이에요. ${where}첫차는 약 ${firstTxt}.` }); ok = false; }
    else if (dep > last) { warnings.push({ level: 'danger', text: `${line.ko} 막차(${where}약 ${lastTxt})가 지났어요. 택시를 권해요.` }); ok = false; }
    else if (last - dep <= 30) warnings.push({ level: 'warning', text: `${line.ko} 막차 임박 · ${where}약 ${lastTxt} (여유 약 ${Math.round(last - dep)}분). 추정치라 서두르세요.` });
  }
  return { ok, warnings };
}
export const fmt = s => `${s.slice(0, 2)}:${s.slice(2)}`;
