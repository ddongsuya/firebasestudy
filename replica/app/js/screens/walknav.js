// S08 도보 안내: 현재 위치 추적 + 남은 거리·방향·도착 예정
import { D } from '../data.js';
import * as mapx from '../map.js';
import { $, html, icon, toast } from '../ui.js';
import { watch, distance, bearing, dirName, fmtDist, fmtMin } from '../geo.js';
import { resolve } from './route.js';

let stopWatch = null, dest = null, el = null, bottom = null, startedAt = 0, lastPos = null;
export async function show(params) {
  document.body.classList.add('navigating');
  try { dest = params.via ? { ...D.stationById[params.via], name: D.stationById[params.via].ko + '역', name_zh: D.stationById[params.via].zh + '站' } : await resolve(params.to); } catch { toast('목적지를 찾지 못했어요'); app.go('#/'); return; }
  if (!dest) { toast('목적지를 찾지 못했어요'); app.go('#/'); return; }
  el = document.createElement('div'); el.className = 'walk-nav'; bottom = document.createElement('div'); bottom.className = 'walk-bottom';
  $('#app').append(el, bottom); startedAt = Date.now();
  mapx.tempMarker(dest, 'end');
  render(null, '위치 찾는 중…');
  stopWatch = watch(pos => { app.me = pos; lastPos = pos; mapx.showMe(pos, { follow: true }); render(pos); }, err => render(null, { denied: '위치 권한이 꺼져 있어요', timeout: '위치를 찾는 중이에요…' }[err.code] || '위치를 가져오지 못했어요'));
}
function render(pos, msg) {
  if (!el) return;
  const d = pos ? distance(pos, dest) * 1.3 : null; const b = pos ? bearing(pos, dest) : null;
  const eta = d != null ? new Intl.DateTimeFormat('ko', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(Date.now() + d / 1.25 * 1000)) : '--:--';
  el.innerHTML = html`<div class="card"><div class="grow"><div class="big">${d != null ? fmtDist(d) : '…'}</div><div class="muted">${d != null ? `${dirName(b)}으로 · ${dest.name}` : msg}</div></div>${icon('nav', 'lg')}</div>
    ${d != null && d < 40 ? html`<div class="banner" style="margin-top:8px" role="status">도착했어요. ${dest.name_zh || ''}</div>` : ''}`;
  bottom.innerHTML = html`<button type="button" class="btn icon ghost" id="btnStopNav" aria-label="안내 종료">${icon('x')}</button><div class="grow"><div class="t-md">${d != null ? `약 ${fmtMin(d / 1.25)} · ${fmtDist(d)}` : '위치 대기 중'}</div><div class="muted t-sm">${eta} 도착 예정 (베이징 시각) · 직선 기준</div></div><button type="button" class="btn icon" id="btnRecenter" aria-label="내 위치로">${icon('locate')}</button>`;
  $('#btnStopNav').onclick = () => history.back();
  $('#btnRecenter').onclick = () => lastPos && mapx.showMe(lastPos, { follow: true });
}
export function stop() {
  if (stopWatch) { stopWatch(); stopWatch = null; }
  el?.remove(); bottom?.remove(); el = bottom = null; mapx.tempMarker(null);
  document.body.classList.remove('navigating');
}
