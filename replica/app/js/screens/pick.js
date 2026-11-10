// S14 지도에서 지점 고르기
import { describePoint } from '../data.js';
import * as store from '../store.js';
import * as mapx from '../map.js';
import { $, html, icon, toast, openSheet, closeSheet } from '../ui.js';

let pin = null, onMove = null;
export function show(params) {
  document.body.classList.add('picking');
  if (params.lat && params.lon) mapx.map.setView([+params.lat, +params.lon], Math.max(mapx.map.getZoom(), 16));
  if (!pin) { pin = document.createElement('div'); pin.className = 'pick-pin'; pin.innerHTML = icon('pin').__raw; $('#app').appendChild(pin); }
  pin.classList.remove('hidden');
  const render = () => {
    const c = mapx.center(); const d = describePoint(c);
    const name = encodeURIComponent(d.label_ko);
    const forWhat = params.for || 'view';
    openSheet(html`
      <div class="sheet-head"><h2>${d.label_ko}<br><span class="muted t-sm zh">${d.label_zh} · ${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}</span></h2><button type="button" class="btn icon" id="btnCloseSheet" aria-label="닫기">${icon('x')}</button></div>
      <p class="note">지도를 움직여 핀을 원하는 곳에 맞추세요.</p>
      <div class="actions">
        ${forWhat === 'from' ? html`<a class="btn primary wide lg" href="#/route?from=pt:${c.lat.toFixed(6)},${c.lon.toFixed(6)},${name}${params.to ? '&to=' + params.to : ''}">출발지로 쓰기</a>`
        : forWhat === 'to' ? html`<a class="btn primary wide lg" href="#/route?to=pt:${c.lat.toFixed(6)},${c.lon.toFixed(6)},${name}${params.from ? '&from=' + params.from : ''}">도착지로 쓰기</a>`
        : html`<a class="btn lg" href="#/route?from=pt:${c.lat.toFixed(6)},${c.lon.toFixed(6)},${name}">여기서 출발</a><a class="btn primary lg" href="#/route?to=pt:${c.lat.toFixed(6)},${c.lon.toFixed(6)},${name}">여기로 도착</a><button type="button" class="btn ghost" id="btnSaveHere">${icon('star')} 이 지점 저장</button>`}
      </div>`, { onClose: hide }); // 지도를 움직여 다시 그려도 닫힐 때 핀 정리가 유지되게
    $('#btnCloseSheet').onclick = () => history.back();
    $('#btnSaveHere') && ($('#btnSaveHere').onclick = () => { store.toggleFavorite({ custom_name: d.label_ko, custom_zh: d.label_zh, lat: c.lat, lon: c.lon }); toast('저장했어요'); app.go('#/fav'); });
  };
  if (onMove) mapx.map.off('moveend', onMove);
  onMove = render; mapx.map.on('moveend', onMove); render();
}
export function stop() { hide(); }
function hide() { document.body.classList.remove('picking'); pin?.classList.add('hidden'); if (onMove) { mapx.map.off('moveend', onMove); onMove = null; } }
