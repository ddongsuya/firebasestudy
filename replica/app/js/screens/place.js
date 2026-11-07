// S04 장소 상세 시트
import { D, nearestStations } from '../data.js';
import * as store from '../store.js';
import * as mapx from '../map.js';
import { $, html, raw, icon, toast, openSheet, lineChip, fmtDist } from '../ui.js';
import { amapRoute, amapMarker, appleMaps } from '../deeplink.js';
import * as driver from './driver.js';
import * as home from './home.js';
import { distance } from '../geo.js';

let orig = false;
export function show(id, params = {}) {
  const p = D.placeById[id];
  if (!p) { toast('장소를 찾을 수 없어요'); app.go('#/'); return; }
  home.refreshMarkers(p.id); mapx.panToWithOffset(p, Math.max(mapx.map.getZoom(), 15));
  render(p);
}
function render(p) {
  const fav = store.findFavorite({ place_id: p.id });
  const cat = D.catById[p.cat];
  const st = p.station_id ? D.stationById[p.station_id] : nearestStations(p, 1)[0]?.station;
  const stDist = st ? distance(p, st) : null;
  const d = app.me ? distance(app.me, p) : null;
  const links = amapRoute(p, 'bus');
  const title = orig ? html`<span class="big-zh zh">${p.name_zh}</span><br><span class="t-md">${p.name_ko}</span>` : html`${p.name_ko}<br><span class="big-zh zh">${p.name_zh}</span>`;
  openSheet(html`
    <div class="sheet-head">
      <h2>${title}<br><span class="muted t-sm">${p.pinyin} · ${cat?.icon || ''} ${cat?.label_ko || ''}${d != null ? ` · ${fmtDist(d)}` : ''}</span></h2>
      <button type="button" class="btn icon" id="btnOrig" aria-pressed="${orig}" aria-label="원문 보기" title="원문/한국어 순서 바꾸기">${icon('lang')}</button>
      <button type="button" class="btn icon" id="btnFav" aria-pressed="${!!fav}" aria-label="저장" style="${fav ? 'color:var(--c-fav)' : ''}">${icon(fav ? 'starFill' : 'star')}</button>
      <button type="button" class="btn icon" id="btnCloseSheet" aria-label="닫기">${icon('x')}</button>
    </div>
    <div class="actions">
      <a class="btn primary wide lg" href="#/route?to=place:${p.id}">${icon('route')} 여기로 길찾기</a>
      <button type="button" class="btn" id="btnDriver">${icon('car')} 기사에게 보여주기</button>
      <button type="button" class="btn ghost" id="btnCopy">${icon('copy')} 중국어 복사</button>
    </div>
    <div class="kv"><span class="k">주소</span><span class="v zh">${p.address_zh}</span></div>
    ${st ? html`<div class="kv"><span class="k">지하철</span><span class="v">${raw(st.lines.map(l => lineChip(l, { badge: true }).__raw).join(' '))} <a href="#/station/${st.id}">${st.ko}역</a>${p.exit_code ? html` <span class="exit-chip">${p.exit_code}번 출구</span>` : ''} · 도보 약 ${Math.round(stDist * 1.3 / 75)}분${p.metro_note ? html`<br><span class="muted t-sm">${p.metro_note}</span>` : ''}</span></div>` : p.metro_note ? html`<div class="kv"><span class="k">교통</span><span class="v">${p.metro_note}</span></div>` : ''}
    ${p.opentime ? html`<div class="kv"><span class="k">시간</span><span class="v">${p.opentime}</span></div>` : ''}
    ${p.price_yuan ? html`<div class="kv"><span class="k">가격</span><span class="v">약 ¥${p.price_yuan} / 1인</span></div>` : ''}
    ${p.tel ? html`<div class="kv"><span class="k">전화</span><span class="v"><a href="tel:${p.tel}">${p.tel}</a></span></div>` : ''}
    ${p.tip_ko ? html`<div class="kv"><span class="k">팁</span><span class="v">${p.tip_ko}</span></div>` : ''}
    <div class="kv"><span class="k">앱으로</span><span class="v inline"><a class="btn sm" href="${links.web}" target="_blank" rel="noopener">고덕지도 길찾기</a><a class="btn sm ghost" href="${amapMarker(p)}" target="_blank" rel="noopener">고덕에서 위치</a><a class="btn sm ghost" href="${appleMaps(p)}" target="_blank" rel="noopener">애플 지도</a></span></div>
    <p class="note">주소·시간은 참고용이에요. 휴관일·예약은 방문 전에 다시 확인하세요.</p>
  `, { onClose: () => { home.refreshMarkers(); } });
  $('#btnCloseSheet').onclick = () => history.length > 1 ? history.back() : app.go('#/');
  $('#btnOrig').onclick = () => { orig = !orig; render(p); };
  $('#btnFav').onclick = () => { const r = store.toggleFavorite({ place_id: p.id }); toast(r.on ? '저장했어요' : '저장을 해제했어요', r.on ? {} : { action: '실행 취소', onAction: () => { store.toggleFavorite({ place_id: p.id }); render(p); } }); render(p); };
  $('#btnDriver').onclick = () => driver.show({ zh: p.name_zh, addr: p.address_zh, ko: p.name_ko });
  $('#btnCopy').onclick = () => copyText(`${p.name_zh}\n${p.address_zh}`);
}
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('복사했어요. 택시 앱에 붙여넣으세요.'); }
  catch { driver.show({ zh: text.split('\n')[0], addr: text.split('\n').slice(1).join('\n'), ko: '복사가 안 되면 이 화면을 보여주세요' }); }
}
