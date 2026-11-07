// 도보: 직선×1.3 + 방위 안내(기본). OSRM 공개 서버는 설정에서 켜면 시도(실패 시 직선).
import { distance, bearing, dirName } from '../geo.js';
import { gcj2wgs, wgs2gcj } from '../gcj02.js';

const WALK_MPS = 1.25, DETOUR = 1.3;
export async function plan(origin, destination, { router = 'straight', signal } = {}) {
  if (router === 'osrm') { try { return await osrm(origin, destination, signal); } catch { /* 폴백 */ } }
  return straight(origin, destination);
}
export function straight(o, d) {
  const dist = Math.round(distance(o, d) * DETOUR);
  const b = bearing(o, d);
  return {
    mode: 'walk', router: 'straight', distance_m: dist, duration_s: Math.round(dist / WALK_MPS), kcal: Math.round(dist * 0.05),
    polyline: [[o.lat, o.lon], [d.lat, d.lon]],
    steps: [{ instruction: `${dirName(b)}으로 약 ${dist}m 걷기`, bearing: b, distance_m: dist, duration_s: Math.round(dist / WALK_MPS) }],
    note: '직선 거리 기준 추정이에요. 실제 길은 지도를 보며 따라가세요.',
  };
}
async function osrm(o, d, signal) {
  const [olat, olon] = gcj2wgs(o.lat, o.lon), [dlat, dlon] = gcj2wgs(d.lat, d.lon);
  const url = `https://router.project-osrm.org/route/v1/foot/${olon},${olat};${dlon},${dlat}?overview=full&geometries=geojson&steps=true`;
  const r = await fetch(url, { signal }); if (!r.ok) throw new Error('osrm ' + r.status);
  const j = await r.json(); const route = j.routes?.[0]; if (!route) throw new Error('no route');
  const poly = route.geometry.coordinates.map(([lon, lat]) => wgs2gcj(lat, lon));
  const steps = route.legs[0].steps.map(s => ({ instruction: `${s.name ? s.name + ' 방향 ' : ''}${Math.round(s.distance)}m`, distance_m: Math.round(s.distance), duration_s: Math.round(s.duration * 1.1), bearing: s.maneuver?.bearing_after }));
  return { mode: 'walk', router: 'osrm', distance_m: Math.round(route.distance), duration_s: Math.round(route.duration * 1.1), kcal: Math.round(route.distance * 0.05), polyline: poly, steps, note: null };
}
