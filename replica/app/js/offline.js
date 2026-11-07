// 오프라인: 현재 지도 범위의 타일을 미리 내려받아 서비스워커 캐시에 넣는다.
import { settings } from './store.js';
const DEFAULT_TILE = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang={lang}&size=1&scale=1&style=8&x={x}&y={y}&z={z}';
const d2r = Math.PI / 180;
function tileXY(lat, lon, z) { const n = 2 ** z; return [Math.floor((lon + 180) / 360 * n), Math.floor((1 - Math.log(Math.tan(lat * d2r) + 1 / Math.cos(lat * d2r)) / Math.PI) / 2 * n)]; }
export function tileUrls(bounds, zooms, lang) {
  const base = (settings().tile_url || DEFAULT_TILE).replace('{lang}', lang);
  const urls = [];
  for (const z of zooms) {
    const [x0, y0] = tileXY(bounds.north, bounds.west, z), [x1, y1] = tileXY(bounds.south, bounds.east, z);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) urls.push(base.replace('{s}', String(1 + ((x + y) % 4))).replace('{x}', x).replace('{y}', y).replace('{z}', z));
  }
  return urls;
}
/** bounds {north,south,east,west}(GCJ-02). onProgress(done,total). 반환 {done, failed, total} */
export async function prefetch(bounds, { zooms = [13, 14, 15, 16], lang = settings().tile_lang, limit = 3000, concurrency = 6, onProgress, signal } = {}) {
  const urls = tileUrls(bounds, zooms, lang).slice(0, limit);
  let done = 0, failed = 0, i = 0;
  const worker = async () => {
    while (i < urls.length && !signal?.aborted) {
      const u = urls[i++];
      try { const r = await fetch(u, { mode: 'no-cors', cache: 'force-cache', signal }); if (r.type === 'error') failed++; } catch { failed++; }
      done++; onProgress?.(done, urls.length);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { done, failed, total: urls.length };
}
export async function cacheStats() {
  if (!('caches' in window)) return null;
  try { const c = await caches.open('goduk-tiles-v2'); const keys = await c.keys(); return { tiles: keys.length }; } catch { return null; }
}
