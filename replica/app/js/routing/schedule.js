// 첫차·막차 검사. 시각은 "HHMM" 베이징 기준. 역별 시각표가 없으므로 보수적으로(막차 60분 전부터 경고).
import { beijingHHMM } from './fare.js';

const toMin = s => +s.slice(0, 2) * 60 + +s.slice(2);
export function check(plan, at, D) {
  const now = toMin(beijingHHMM(at));
  const warnings = []; let ok = true;
  for (const seg of plan.segments) {
    if (seg.kind !== 'ride') continue;
    const line = D.lineById[seg.line]; if (!line) continue;
    const first = toMin(line.first_dep), last = toMin(line.last_dep);
    const dep = (now + Math.round(seg.start_offset_s / 60)) % 1440;
    if (dep < first) { warnings.push({ level: 'danger', text: `${line.ko} 첫차(${fmt(line.first_dep)}) 전이에요.` }); ok = false; }
    else if (dep > last) { warnings.push({ level: 'danger', text: `${line.ko} 막차(${fmt(line.last_dep)})가 지났어요. 택시를 권해요.` }); ok = false; }
    else if (last - dep <= 60) warnings.push({ level: 'warning', text: `${line.ko} 막차 ${fmt(line.last_dep)} 무렵 · 여유 약 ${last - dep}분. 중간역은 더 이를 수 있어요.` });
  }
  return { ok, warnings };
}
export const fmt = s => `${s.slice(0, 2)}:${s.slice(2)}`;
