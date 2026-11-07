// 고덕 앱·웹, 애플 지도 딥링크. 좌표는 GCJ-02. 문서: lbs.amap.com URI API / amap-mobile.
const SRC = 'goduk-ko';
const enc = s => encodeURIComponent(s || '');
export function amapRoute(dest, mode = 'bus', origin = null) {
  const to = `${dest.lon.toFixed(6)},${dest.lat.toFixed(6)},${enc(dest.name_zh || dest.zh || dest.name || '')}`;
  const from = origin ? `&from=${origin.lon.toFixed(6)},${origin.lat.toFixed(6)},${enc(origin.name || '我的位置')}` : '';
  const policy = mode === 'bus' ? 0 : 1;
  return {
    web: `https://uri.amap.com/navigation?to=${to}${from}&mode=${mode}&policy=${policy}&src=${SRC}&coordinate=gaode&callnative=1`,
    ios: `iosamap://path?sourceApplication=${SRC}&dlat=${dest.lat.toFixed(6)}&dlon=${dest.lon.toFixed(6)}&dname=${enc(dest.name_zh || dest.zh || '')}&dev=0&t=${{ car: 0, bus: 1, walk: 2, ride: 3 }[mode] ?? 1}`,
    android: `amapuri://route/plan/?dlat=${dest.lat.toFixed(6)}&dlon=${dest.lon.toFixed(6)}&dname=${enc(dest.name_zh || dest.zh || '')}&dev=0&t=${{ car: 0, bus: 1, walk: 2, ride: 3 }[mode] ?? 1}&sourceApplication=${SRC}`,
  };
}
export function amapMarker(p) {
  return `https://uri.amap.com/marker?position=${p.lon.toFixed(6)},${p.lat.toFixed(6)}&name=${enc(p.name_zh || p.zh || '')}&src=${SRC}&coordinate=gaode&callnative=1`;
}
export function appleMaps(p) {
  return `https://maps.apple.com/?q=${enc(p.name_zh || p.zh || '')}&ll=${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
}
export function didi(p) { return `https://uri.amap.com/marker?position=${p.lon.toFixed(6)},${p.lat.toFixed(6)}&name=${enc(p.name_zh || '')}&src=${SRC}&coordinate=gaode&callnative=1`; }
