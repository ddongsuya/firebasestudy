// S04 장소 상세 시트: 접힘(제목·행동 4개) · 절반(중국어 카드·교통) · 전체(팁·외부 앱)
import { D, nearestStations, bestExit, exitLabel, exitsOf, openStatus } from '../data.js';
import * as store from '../store.js';
import * as mapx from '../map.js';
import { $, html, raw, icon, catIcon, toast, openSheet, lineChip, fmtDist } from '../ui.js';
import { amapRoute, amapMarker, appleMaps } from '../deeplink.js';
import * as driver from './driver.js';
import * as home from './home.js';
import { distance } from '../geo.js';

export function show(id) {
  const p = D.placeById[id];
  if (!p) { toast('장소를 찾을 수 없어요'); app.go('#/'); return; }
  home.refreshMarkers(p.id);
  render(p, false);
  requestAnimationFrame(() => mapx.focus(p, Math.max(mapx.map.getZoom(), 15)));
}
function render(p, keep = true) {
  const fav = store.findFavorite({ place_id: p.id });
  const cat = D.catById[p.cat];
  const st = p.station_id ? D.stationById[p.station_id] : nearestStations(p, 1)[0]?.station;
  const stDist = st ? distance(p, st) : null;
  const ex = st ? bestExit(p, st.id) : null; const exCount = st ? exitsOf(st.id).length : 0;
  const d = app.me ? distance(app.me, p) : null;
  const os = openStatus(p.opentime);
  const links = amapRoute(p, 'bus');
  openSheet(html`
    <div class="ps-head" data-peek>
      <div class="ps-title-row">
        <div class="ps-titles">
          <h2 class="ps-title">${p.name_ko}</h2>
          <div class="ps-sub">${catIcon(p.cat, 'xs')} ${cat?.label_ko || ''}${d != null ? html` · <span class="tnum">${fmtDist(d)}</span>` : ''}${os ? html` · <span class="os os-${os.state}">${os.label}</span>` : ''}</div>
        </div>
        <button type="button" class="btn icon ghost-round" id="btnCloseSheet" aria-label="닫기">${icon('x')}</button>
      </div>
      <div class="action-bar" role="group" aria-label="장소 동작">
        <a class="ab primary" href="#/route?to=place:${p.id}">${icon('route')}<span>길찾기</span></a>
        <button type="button" class="ab" id="btnDriver">${icon('car')}<span>기사 카드</span></button>
        <button type="button" class="ab ${fav ? 'on' : ''}" id="btnFav" aria-pressed="${!!fav}">${icon(fav ? 'starFill' : 'star')}<span>${fav ? '저장됨' : '저장'}</span></button>
        <button type="button" class="ab" id="btnCopy">${icon('copy')}<span>중국어 복사</span></button>
      </div>
    </div>
    <button type="button" class="zh-card" id="btnZhCard">
      <span class="zh-name zh">${p.name_zh}</span>
      <span class="zh-addr zh">${p.address_zh}</span>
      <span class="zh-py">${p.pinyin}<span class="zh-hint">${icon('external', 'xs')} 크게 보기</span></span>
    </button>
    <ul class="info">
      ${st ? html`<li>${icon('metro')}<div><div class="info-main">${raw(st.lines.map(l => lineChip(l, { badge: true }).__raw).join(' '))} <a href="#/station/${st.id}">${st.ko}역</a> <span class="muted">${st.zh}站</span></div>
        <div class="info-sub">${ex ? html`<span class="exit-chip">${exitLabel(ex)}</span> ` : p.exit_code ? html`<span class="exit-chip">${p.exit_code}번 출구</span> ` : ''}도보 약 <span class="tnum">${Math.max(1, Math.round(stDist * 1.3 / 75))}</span>분${!ex && exCount ? html` · <a href="#/station/${st.id}">출구 ${exCount}개 보기</a>` : ''}</div>
        ${ex?.landmarks_zh ? html`<div class="info-sub zh">${ex.code} ${ex.street_zh || ''}${ex.street_zh && ex.landmarks_zh ? ' · ' : ''}${ex.landmarks_zh}</div>` : ''}
        ${p.metro_note ? html`<div class="info-sub">${p.metro_note}</div>` : ''}</div></li>` : p.metro_note ? html`<li>${icon('metro')}<div class="info-main">${p.metro_note}</div></li>` : ''}
      ${p.opentime ? html`<li>${icon('clock')}<div><div class="info-main">${os ? html`<span class="os os-${os.state}">${os.label}</span>` : ''}</div><div class="info-sub">${p.opentime}</div></div></li>` : ''}
      ${p.price_yuan ? html`<li>${icon('ticket')}<div class="info-main">약 <span class="tnum">¥${p.price_yuan}</span>${p.cat === 'food' ? ' / 1인' : ''}</div></li>` : ''}
      ${p.tel ? html`<li>${icon('phone')}<div class="info-main"><a href="tel:${p.tel}">${p.tel}</a></div></li>` : ''}
    </ul>
    ${p.tip_ko ? html`<div class="tip-box">${icon('bulb')}<p>${p.tip_ko}</p></div>` : ''}
    <div class="ext-links">
      <a class="btn sm ghost" href="${links.web}" target="_blank" rel="noopener">${icon('external', 'xs')} 고덕지도에서 길찾기</a>
      <a class="btn sm ghost" href="${amapMarker(p)}" target="_blank" rel="noopener">${icon('external', 'xs')} 고덕에서 위치</a>
      <a class="btn sm ghost" href="${appleMaps(p)}" target="_blank" rel="noopener">${icon('external', 'xs')} 애플 지도</a>
    </div>
    <p class="note">주소·시간은 참고용이에요. 휴관일·예약은 방문 전에 다시 확인하세요.</p>
  `, { keep, initial: 'half', onClose: () => { home.refreshMarkers(); } });
  $('#btnCloseSheet').onclick = () => app.go('#/');
  $('#btnFav').onclick = () => { const r = store.toggleFavorite({ place_id: p.id }); toast(r.on ? '저장했어요' : '저장을 해제했어요', r.on ? {} : { action: '실행 취소', onAction: () => { store.toggleFavorite({ place_id: p.id }); render(p); } }); render(p); };
  const showZh = () => driver.show({ zh: p.name_zh, addr: p.address_zh, ko: p.name_ko });
  $('#btnDriver').onclick = showZh; $('#btnZhCard').onclick = showZh;
  $('#btnCopy').onclick = () => copyText(`${p.name_zh}\n${p.address_zh}`);
}
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('복사했어요. 디디·택시 앱에 붙여넣으세요.'); }
  catch { driver.show({ zh: text.split('\n')[0], addr: text.split('\n').slice(1).join('\n'), ko: '복사가 안 되면 이 화면을 보여주세요' }); }
}
