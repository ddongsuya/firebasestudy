// S13 지하철역 상세 시트
import { D, exitsOf } from '../data.js';
import * as store from '../store.js';
import * as mapx from '../map.js';
import { $, html, raw, icon, toast, openSheet, lineChip } from '../ui.js';
import { fmt } from '../routing/schedule.js';
import * as driver from './driver.js';
import * as home from './home.js';
import { row } from './search.js';
import { distance } from '../geo.js';

export function show(id) {
  const s = D.stationById[id]; if (!s) { toast('역을 찾을 수 없어요'); app.go('#/'); return; }
  home.refreshMarkers(s.id); mapx.panToWithOffset(s, Math.max(mapx.map.getZoom(), 15));
  const fav = store.findFavorite({ station_id: s.id });
  const near = D.places.map(p => ({ kind: 'place', ref: p, d: distance(p, s) })).filter(x => x.d < 1200).sort((a, b) => a.d - b.d).slice(0, 5);
  const exits = exitsOf(s.id);
  openSheet(html`
    <div class="sheet-head">
      <h2>${s.ko}역<br><span class="big-zh zh">${s.zh}站</span><br><span class="muted t-sm">${s.py}${s.transfer ? ' · 환승역' : ''}</span></h2>
      <button type="button" class="btn icon" id="btnFav" aria-pressed="${!!fav}" aria-label="저장" style="${fav ? 'color:var(--c-fav)' : ''}">${icon(fav ? 'starFill' : 'star')}</button>
      <button type="button" class="btn icon" id="btnCloseSheet" aria-label="닫기">${icon('x')}</button>
    </div>
    <div class="inline" style="margin-top:4px">${raw(s.lines.map(l => lineChip(l).__raw).join(' '))}</div>
    <div class="actions">
      <a class="btn primary wide lg" href="#/route?to=station:${s.id}">${icon('route')} 이 역으로 길찾기</a>
      <a class="btn" href="#/route?from=station:${s.id}">${icon('nav')} 여기서 출발</a>
      <button type="button" class="btn ghost" id="btnDriver">${icon('car')} 기사에게 보여주기</button>
    </div>
    ${s.lines.map(l => { const line = D.lineById[l]; return html`<div class="kv"><span class="k">${line.ko}</span><span class="v">첫차 약 ${fmt(line.first_dep)} · 막차 약 ${fmt(line.last_dep)} <span class="muted t-sm">(종점 기준, 중간역은 다를 수 있어요)</span></span></div>`; })}
    ${exits.length ? html`<div class="section">출구 ${exits.length}개 <span class="muted" style="font-weight:400">(출구 번호·방향·주변, 중국어 위키백과 기준)</span></div><div class="list">${exits.map(e => html`<div class="row-place" style="align-items:flex-start"><span class="exit-chip" style="min-width:44px;justify-content:center">${e.code}</span><span class="main"><span class="name">${e.dir_ko || ''} ${e.accessible ? html`<span class="tag">엘리베이터</span>` : ''}</span><span class="sub zh" style="white-space:normal">${e.street_zh || ''}${e.landmarks_zh ? ' · ' + e.landmarks_zh : ''}</span></span></div>`)}</div>` : html`<p class="note">이 역의 출구 정보는 아직 없어요.</p>`}
    ${near.length ? html`<div class="section">이 역 근처</div><div class="list">${raw(near.map(n => row(n, { dist: n.d })).join(''))}</div>` : ''}
  `, { onClose: () => home.refreshMarkers() });
  $('#btnCloseSheet').onclick = () => history.length > 1 ? history.back() : app.go('#/');
  $('#btnFav').onclick = () => { const r = store.toggleFavorite({ station_id: s.id }); toast(r.on ? '저장했어요' : '저장을 해제했어요'); show(id); };
  $('#btnDriver').onclick = () => driver.show({ zh: `${s.zh}站`, addr: `地铁${s.lines.map(l => D.lineById[l].zh).join('/')} ${s.zh}站`, ko: `${s.ko}역` });
}
