import { distance } from '../geo.js';
import { taxiFare } from './fare.js';
export function estimate(origin, destination, at, D) {
  const dist = Math.round(distance(origin, destination) * 1.35); // 도로 우회 계수
  const f = taxiFare(dist, at, D);
  return { mode: 'taxi', distance_m: dist, duration_s: f.duration_s, fare_low: f.low, fare_high: f.high, night: f.night, polyline: [[origin.lat, origin.lon], [destination.lat, destination.lon]] };
}
