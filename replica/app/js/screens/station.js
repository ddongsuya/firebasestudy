// S13 지하철역 상세 시트: 접힘(역명·행동) · 절반(노선·첫막차) · 전체(출구 목록·근처)
import { D, exitsOf } from '../data.js';
import * as store from '../store.js';
import * as mapx from '../map.js';
import { $, html, raw, icon, toast, openSheet, lineChip } from '../ui.js';
import { fmt } from '../routing/schedule.js';
import * as driver from './driver.js';
import * as home from './home.js';
import { row } from './search.js';
import { distance, fmtDist } from '../geo.js';

export function show(id) {
  const s = D.stationById[id]; if (!s) { toast('역을 찾을 수 없어요'); app.go('#/'); return; }
  home.refreshMarkers(s.id);
  render(s, false);
  requestAnimationFrame(() => mapx.focus(s, Math.max(mapx.map.getZoom(), 15)));
}
function render(s, keep = true) {
  const fav = store.findFavorite({ station_id: s.id });
  const near = D.places.map(p => ({ kind: 'place', ref: p, d: distance(p, s) })).filter(x => x.d < 1200).sort((a, b) => a.d - b.d).slice(0, 6);
  const exits = exitsOf(s.id);
  const d = app.me ? distance(app.me, s) : null;
  openSheet(html`
    <div class="ps-head" data-peek>
      <div class="ps-title-row">
        <div class="ps-titles">
          <h2 class="ps-title">${s.ko}역 <span class="zh ps-title-zh">${s.zh}站</span></h2>
          <div class="ps-sub">${raw(s.lines.map(l => lineChip(l, { badge: true }).__raw).join(' '))}${s.transfer ? ' · 환승역' : ''}${d != null ? html` · <span class="tnum">${fmtDist(d)}</span>` : ''}</div>
        </div>
        <button type="button" class="btn icon ghost-round" id="btnCloseSheet" aria-label="닫기">${icon('x')}</button>
      </div>
      <div class="action-bar" role="group" aria-label="역 동작">
        <a class="ab primary" href="#/route?to=station:${s.id}">${icon('route')}<span>여기로</span></a>
        <a class="ab" href="#/route?from=station:${s.id}">${icon('nav')}<span>여기서 출발</span></a>
        <button type="button" class="ab" id="btnDriver">${icon('car')}<span>기사 카드</span></button>
        <button type="button" class="ab ${fav ? 'on' : ''}" id="btnFav" aria-pressed="${!!fav}">${icon(fav ? 'starFill' : 'star')}<span>${fav ? '저장됨' : '저장'}</span></button>
      </div>
    </div>
    <ul class="info">
      ${s.lines.map(l => { const line = D.lineById[l]; return html`<li>${lineChip(l, { badge: true })}<div><div class="info-main">첫차 <span class="tnum">${fmt(line.first_dep)}</span> · 막차 <span class="tnum">${fmt(line.last_dep)}</span></div></div></li>`; })}
    </ul>
    <p class="note">첫차·막차는 노선 종점 기준이라 이 역에서는 몇 분 다를 수 있어요.</p>
    ${exits.length ? html`<h3 class="sec-title">출구 <span class="tnum">${exits.length}</span>개</h3><ul class="exit-list">${exits.map(e => html`<li><span class="exit-code">${e.code}</span><div><div class="info-main">${e.dir_ko || '방향 정보 없음'}${e.accessible ? html` <span class="tag">엘리베이터</span>` : ''}</div>${e.street_zh || e.landmarks_zh ? html`<div class="info-sub zh">${e.street_zh || ''}${e.street_zh && e.landmarks_zh ? ' · ' : ''}${e.landmarks_zh || ''}</div>` : ''}</div></li>`)}</ul><p class="note">출구 정보는 중국어 위키백과 기준이에요. 공사로 닫힌 출구가 있을 수 있어요.</p>` : html`<p class="note">이 역의 출구 정보는 아직 없어요.</p>`}
    ${near.length ? html`<h3 class="sec-title">이 역 근처</h3><div class="list flat">${raw(near.map(n => row(n, { dist: n.d })).join(''))}</div>` : ''}
  `, { keep, initial: 'half', onClose: () => home.refreshMarkers() });
  $('#btnCloseSheet').onclick = () => app.go('#/');
  $('#btnFav').onclick = () => { const r = store.toggleFavorite({ station_id: s.id }); toast(r.on ? '저장했어요' : '저장을 해제했어요'); render(s); };
  $('#btnDriver').onclick = () => driver.show({ zh: `${s.zh}站`, addr: `地铁${s.lines.map(l => D.lineById[l].zh).join('/')} ${s.zh}站`, ko: `${s.ko}역` });
  $('#sheetBody').querySelector('.list')?.addEventListener('click', e => { const go = e.target.closest('[data-go]'); if (go) app.go(go.dataset.go); });
}
