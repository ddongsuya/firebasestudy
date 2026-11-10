// S04 장소 상세 시트
import { D, nearestStations, bestExit, exitLabel, exitsOf } from '../data.js';
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
  const ex = st ? bestExit(p, st.id) : null; const exCount = st ? exitsOf(st.id).length : 0;
  const d = app.me ? distance(app.me, p) : null;
  const links = amapRoute(p, 'bus');
  const walkMin = stDist != null ? Math.max(1, Math.round(stDist * 1.3 / 75)) : null;
  const names = orig ? html`<span class="zh-big zh" lang="zh-CN">${p.name_zh}</span><span class="name-ko">${p.name_ko}</span>` : html`<span class="name-ko">${p.name_ko}</span><span class="zh-big zh" lang="zh-CN">${p.name_zh}</span>`;
  const exitTxt = ex ? exitLabel(ex) : p.exit_code ? `${p.exit_code}번 출구` : '';
  openSheet(html`
    <div class="sheet-head place-head">
      <h2 class="place-title">${names}</h2>
      <button type="button" class="btn icon quiet" id="btnOrig" aria-pressed="${orig}" aria-label="원문 보기" title="원문/한국어 순서 바꾸기">${icon('lang')}</button>
      <button type="button" class="btn icon quiet" id="btnCloseSheet" aria-label="닫기">${icon('x')}</button>
    </div>
    <div class="place-meta"><span class="py">${p.pinyin}</span>${cat ? html`<span>${cat.icon || ''} ${cat.label_ko || ''}</span>` : ''}${d != null ? html`<span>여기서 ${fmtDist(d)}</span>` : ''}${p.price_yuan ? html`<span>1인 약 ¥${p.price_yuan}</span>` : ''}</div>
    <div class="place-actions">
      <div class="go2" role="group" aria-label="길찾기">
        <a class="btn lg" href="#/route?from=place:${p.id}"><span class="pt-dot start"></span>여기서 출발</a>
        <a class="btn primary lg" href="#/route?to=place:${p.id}"><span class="pt-dot end"></span>여기로 도착</a>
      </div>
      <div class="quick">
        <button type="button" class="qa" id="btnDriver">${icon('car')}<span>기사에게 보여주기</span></button>
        <button type="button" class="qa" id="btnCopy">${icon('copy')}<span>중국어 복사</span></button>
        <button type="button" class="qa ${fav ? 'on' : ''}" id="btnFav" aria-pressed="${!!fav}" aria-label="저장">${icon(fav ? 'starFill' : 'star')}<span>${fav ? '저장됨' : '저장'}</span></button>
      </div>
    </div>
    ${st ? html`<div class="info-row metro">${icon('metro', 'sm')}<div class="v">
        <div class="metro-line">${raw(st.lines.map(l => lineChip(l, { badge: true }).__raw).join(' '))} <a href="#/station/${st.id}">${st.ko}역</a>${exitTxt ? html` <span class="exit-chip">${exitTxt}</span>` : ''}</div>
        <div class="muted t-sm">${p.metro_note || (walkMin != null ? `${st.ko}역에서 도보 약 ${walkMin}분` : '')}</div>
        ${ex?.landmarks_zh ? html`<details class="more"><summary>출구 주변 중국어 표지</summary><div class="muted t-sm zh">${ex.code}: ${ex.street_zh || ''}${ex.street_zh && ex.landmarks_zh ? ' · ' : ''}${ex.landmarks_zh}</div></details>` : ''}
        ${!ex && exCount ? html`<a class="t-sm" href="#/station/${st.id}">출구 ${exCount}개 보기</a>` : ''}
      </div></div>` : p.metro_note ? html`<div class="info-row">${icon('metro', 'sm')}<div class="v">${p.metro_note}</div></div>` : ''}
    <div class="info-row">${icon('pin', 'sm')}<div class="v zh" lang="zh-CN">${p.address_zh}</div></div>
    ${p.opentime ? html`<div class="info-row">${icon('clock', 'sm')}<div class="v">${p.opentime}</div></div>` : ''}
    ${p.tel ? html`<div class="info-row">${icon('phone', 'sm')}<div class="v"><a href="tel:${p.tel}">${p.tel}</a></div></div>` : ''}
    ${p.tip_ko ? html`<div class="tip">${icon('bulb', 'sm')}<div>${p.tip_ko}</div></div>` : ''}
    <div class="ext"><span class="section">다른 앱에서 열기</span><div class="chips"><a class="chip" href="${links.web}" target="_blank" rel="noopener">고덕지도 길찾기</a><a class="chip" href="${amapMarker(p)}" target="_blank" rel="noopener">고덕에서 위치</a><a class="chip" href="${appleMaps(p)}" target="_blank" rel="noopener">애플 지도</a></div></div>
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
