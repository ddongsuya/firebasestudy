// S14 지도에서 지점 고르기: 핀은 "보이는 지도 영역"의 중앙에 고정되고 지도를 움직여 맞춘다.
// 시트는 한 번만 열고, 지도가 멈출 때마다 글자·링크만 바꾼다(시트가 들썩이지 않게).
import { describePoint } from '../data.js';
import * as store from '../store.js';
import * as mapx from '../map.js';
import { $, html, icon, toast, openSheet } from '../ui.js';

let pin = null, active = false, params = {}, cur = null;
const onMoveStart = () => pin?.classList.add('lift');
const onMoveEnd = () => { pin?.classList.remove('lift'); update(); };

export function show(p) {
  stop();
  params = p; active = true;
  document.body.classList.add('picking');
  if (!pin) { pin = document.createElement('div'); pin.className = 'pick-pin'; pin.setAttribute('aria-hidden', 'true'); pin.innerHTML = `${icon('pin').__raw}<span class="pick-dot"></span>`; $('#app').appendChild(pin); }
  pin.classList.remove('hidden');
  const forWhat = p.for || 'view';
  openSheet(html`
    <div class="ps-head" data-peek>
      <div class="ps-title-row">
        <div class="ps-titles"><h2 class="ps-title" id="pkTitle">이 지점</h2><div class="ps-sub" id="pkSub">지도를 움직여 핀을 맞추세요</div></div>
        <button type="button" class="btn icon ghost-round" id="btnCloseSheet" aria-label="닫기">${icon('x')}</button>
      </div>
      <div class="action-bar" role="group" aria-label="지점 동작">
        ${forWhat === 'from' ? html`<a class="ab primary wide2" id="pkMain" href="#">${icon('nav')}<span>출발지로 쓰기</span></a>`
        : forWhat === 'to' ? html`<a class="ab primary wide2" id="pkMain" href="#">${icon('route')}<span>도착지로 쓰기</span></a>`
        : html`<a class="ab primary" id="pkMain" href="#">${icon('route')}<span>여기로</span></a><a class="ab" id="pkFrom" href="#">${icon('nav')}<span>여기서 출발</span></a><button type="button" class="ab" id="pkSave">${icon('star')}<span>저장</span></button><button type="button" class="ab" id="pkZh">${icon('car')}<span>기사 카드</span></button>`}
      </div>
    </div>`, { initial: 'peek', dismissible: true, onClose: hideUi });
  $('#btnCloseSheet').onclick = () => app.go('#/');
  $('#pkSave') && ($('#pkSave').onclick = () => { if (!cur) return; store.toggleFavorite({ custom_name: cur.d.label_ko, custom_zh: cur.d.label_zh, lat: cur.c.lat, lon: cur.c.lon }); toast('저장했어요'); app.go('#/fav'); });
  $('#pkZh') && ($('#pkZh').onclick = async () => { if (!cur) return; const { show: showDriver } = await import('./driver.js'); showDriver({ zh: cur.d.label_zh, addr: `GPS ${cur.c.lat.toFixed(5)}, ${cur.c.lon.toFixed(5)}`, ko: cur.d.label_ko }); });
  mapx.map.on('movestart', onMoveStart); mapx.map.on('moveend', onMoveEnd);
  requestAnimationFrame(() => {
    placePin();
    if (p.lat && p.lon) mapx.focus({ lat: +p.lat, lon: +p.lon }, Math.max(mapx.map.getZoom(), 16), { animate: false });
    update();
  });
}
function placePin() { if (!pin) return; const l = mapx.getInsets().left || 0; pin.style.top = mapx.visibleCenterY() + 'px'; pin.style.left = (l + (mapx.map.getSize().x - l) / 2) + 'px'; }
function update() {
  if (!active) return; placePin();
  const c = mapx.pointAtVisibleCenter(); const d = describePoint(c); cur = { c, d };
  $('#pkTitle') && ($('#pkTitle').textContent = d.label_ko);
  $('#pkSub') && ($('#pkSub').textContent = `${d.label_zh} · ${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}`);
  const pt = `pt:${c.lat.toFixed(6)},${c.lon.toFixed(6)},${encodeURIComponent(d.label_ko)}`;
  const f = params.for || 'view';
  const main = $('#pkMain'); if (main) main.href = f === 'from' ? `#/route?from=${pt}${params.to ? '&to=' + params.to : ''}` : f === 'to' ? `#/route?to=${pt}${params.from ? '&from=' + params.from : ''}` : `#/route?to=${pt}`;
  const from = $('#pkFrom'); if (from) from.href = `#/route?from=${pt}`;
}
function hideUi() { active = false; document.body.classList.remove('picking'); pin?.classList.add('hidden'); mapx.map.off('movestart', onMoveStart); mapx.map.off('moveend', onMoveEnd); }
/** 라우터가 다른 화면으로 갈 때 호출 */
export function stop() { if (active) hideUi(); }
