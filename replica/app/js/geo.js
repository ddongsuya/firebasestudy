// 거리·방위·위치. 좌표는 전부 GCJ-02 {lat, lon}.
import { wgs2gcj } from './gcj02.js';

const R = 6371000, D2R = Math.PI / 180;
export function distance(a, b) {
  const dLat = (b.lat - a.lat) * D2R, dLon = (b.lon - a.lon) * D2R;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * D2R) * Math.cos(b.lat * D2R) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export function bearing(a, b) {
  const y = Math.sin((b.lon - a.lon) * D2R) * Math.cos(b.lat * D2R);
  const x = Math.cos(a.lat * D2R) * Math.sin(b.lat * D2R) - Math.sin(a.lat * D2R) * Math.cos(b.lat * D2R) * Math.cos((b.lon - a.lon) * D2R);
  return (Math.atan2(y, x) / D2R + 360) % 360;
}
const DIRS = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
export const dirName = deg => DIRS[Math.round(deg / 45) % 8] + '쪽';
export function fmtDist(m) { return m < 1000 ? `${Math.round(m / 10) * 10}m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)}km`; }
export function fmtMin(s) { const m = Math.round(s / 60); return m < 60 ? `${m}분` : `${Math.floor(m / 60)}시간 ${m % 60 ? m % 60 + '분' : ''}`.trim(); }

/** GPS → GCJ-02. 실패 사유: denied | timeout | unavailable | unsupported */
export function locate({ timeout = 12000, highAccuracy = true } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(Object.assign(new Error('unsupported'), { code: 'unsupported' }));
    navigator.geolocation.getCurrentPosition(pos => {
      const [lat, lon] = wgs2gcj(pos.coords.latitude, pos.coords.longitude);
      resolve({ lat, lon, acc: pos.coords.accuracy, heading: pos.coords.heading, at: Date.now() });
    }, err => {
      const code = err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable';
      reject(Object.assign(new Error(code), { code }));
    }, { enableHighAccuracy: highAccuracy, timeout, maximumAge: 15000 });
  });
}
/** 연속 추적. 반환: 중단 함수 */
export function watch(onPos, onErr) {
  if (!navigator.geolocation) { onErr?.({ code: 'unsupported' }); return () => {}; }
  const id = navigator.geolocation.watchPosition(pos => {
    const [lat, lon] = wgs2gcj(pos.coords.latitude, pos.coords.longitude);
    onPos({ lat, lon, acc: pos.coords.accuracy, heading: pos.coords.heading, at: Date.now() });
  }, err => onErr?.({ code: err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable' }), { enableHighAccuracy: true, maximumAge: 3000 });
  return () => navigator.geolocation.clearWatch(id);
}
export const BEIJING_CENTER = { lat: 39.9177, lon: 116.3970 }; // 자금성(GCJ-02)
