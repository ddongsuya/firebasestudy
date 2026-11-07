// 요금 계산. 금액은 정수 元.
export function metroFare(distance_m, lineIds, D) {
  const kinds = new Set(lineIds.map(id => D.lineById[id]?.fare_rule || 'distance'));
  let fare = 0;
  if (kinds.has('airport')) { fare += D.fares.airport.flat; kinds.delete('airport'); }
  if (kinds.has('daxing')) { fare += D.fares.daxing.flat; kinds.delete('daxing'); }
  if (kinds.size === 0 && fare) return fare;
  const f = D.fares.metro_distance;
  let base = null;
  for (const [maxM, yuan] of f.bands) if (distance_m <= maxM) { base = yuan; break; }
  if (base === null) { const last = f.bands[f.bands.length - 1]; base = last[1] + Math.ceil((distance_m - last[0]) / f.extra_per_m) * f.extra_yuan; }
  return fare + base;
}
/** 베이징 택시 추정. at: Date(베이징 시각으로 판단). 반환 {low, high, mid, duration_s, night} */
export function taxiFare(distance_m, at, D) {
  const t = D.fares.taxi;
  const hhmm = beijingHHMM(at);
  const night = hhmm >= t.night_start || hhmm < t.night_end;
  const km = Math.max(distance_m / 1000, 0);
  let fare = t.flag_yuan;
  if (km > t.flag_km) {
    const mid = Math.min(km, t.long_km) - t.flag_km; fare += mid * t.per_km;
    if (km > t.long_km) fare += (km - t.long_km) * t.per_km * t.long_mult;
  }
  if (night) fare *= t.night_mult;
  fare += t.fuel_yuan;
  const low = Math.round(fare), high = Math.round(fare * 1.25 + 2); // 정체·우회 여유
  const speed = night ? t.avg_kmh_night : t.avg_kmh_day;
  return { low, high, mid: Math.round((low + high) / 2), duration_s: Math.round(km / speed * 3600) + 120, night };
}
/** 베이징(UTC+8) 기준 "HHMM" */
export function beijingHHMM(at = new Date()) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(at);
  const h = p.find(x => x.type === 'hour').value, m = p.find(x => x.type === 'minute').value;
  return (h === '24' ? '00' : h) + m;
}
export function beijingDateParts(at = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(at).map(x => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute };
}
