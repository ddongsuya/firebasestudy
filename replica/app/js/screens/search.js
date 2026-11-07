// S02 검색 입력·자동완성, S03 결과
import { D, search } from '../data.js';
import * as store from '../store.js';
import { $, html, raw, icon, lineChip, fmtDist } from '../ui.js';
import { distance } from '../geo.js';

let inp, results;
export function init() {
  inp = $('#q'); results = $('#results');
  $('#btnSearchBack').innerHTML = icon('back').__raw; $('#btnClear').innerHTML = icon('x').__raw;
  inp.addEventListener('focus', open); inp.addEventListener('input', render);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const first = $('.row-place', results); if (first) first.click(); }
    if (e.key === 'ArrowDown') { $('.row-place', results)?.focus(); e.preventDefault(); }
    if (e.key === 'Escape') close();
  });
  $('#btnSearchBack').onclick = close;
  $('#btnClear').onclick = () => { inp.value = ''; render(); inp.focus(); };
  results.addEventListener('click', e => {
    const row = e.target.closest('[data-go]'); if (!row) return;
    const q = inp.value.trim();
    if (row.dataset.q) { inp.value = row.dataset.q; render(); return; }
    if (q) store.pushHistory(q, { place_id: row.dataset.place || null, station_id: row.dataset.station || null });
    close(); app.go(row.dataset.go);
  });
  results.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { const rows = [...results.querySelectorAll('.row-place')]; const i = rows.indexOf(document.activeElement); const n = rows[i + (e.key === 'ArrowDown' ? 1 : -1)]; if (n) n.focus(); else if (e.key === 'ArrowUp') inp.focus(); e.preventDefault(); } });
}
function open() { document.body.classList.add('searching'); $('#btnSearchBack').classList.remove('hidden'); results.classList.remove('hidden'); inp.setAttribute('aria-expanded', 'true'); render(); }
export function close() { document.body.classList.remove('searching'); $('#btnSearchBack').classList.add('hidden'); results.classList.add('hidden'); inp.setAttribute('aria-expanded', 'false'); inp.blur(); }
function render() {
  const q = inp.value.trim(); $('#btnClear').classList.toggle('hidden', !q);
  if (!q) {
    const hist = store.get().history;
    results.innerHTML = html`
      <div class="section">바로가기</div>
      <button type="button" class="row-place" data-go="#/nearby"><span class="ico">${icon('pin')}</span><span class="main"><span class="name">내 주변에서 찾기</span><span class="sub">맛집·관광지·지하철역</span></span></button>
      <button type="button" class="row-place" data-go="#/pick?for=view"><span class="ico">${icon('map')}</span><span class="main"><span class="name">지도에서 지점 고르기</span><span class="sub">핀을 옮겨 주소 없는 곳도 선택</span></span></button>
      ${hist.length ? html`<div class="section">최근 검색</div>${hist.map(h => html`<button type="button" class="row-place" data-go="#/" data-q="${h.query}"><span class="ico">${icon('clock')}</span><span class="main"><span class="name">${h.query}</span></span></button>`)}` : ''}`;
    return;
  }
  const rs = search(q, { limit: 25 });
  if (!rs.length) { results.innerHTML = html`<div class="empty">${icon('search')}<h2>'${q}'을(를) 못 찾았어요</h2><p>한글·중국어·병음으로 다시 검색해 보세요</p><button type="button" class="btn sm" data-go="#/nearby">주변에서 찾기</button></div>`; return; }
  results.innerHTML = rs.map(r => row(r)).join('');
}
export function row({ kind, ref }, { dist = null } = {}) {
  const d = dist ?? (app.me ? distance(app.me, ref) : null);
  if (kind === 'place') {
    const cat = D.catById[ref.cat];
    return html`<button type="button" class="row-place" data-go="#/place/${ref.id}" data-place="${ref.id}"><span class="ico" aria-hidden="true">${cat?.icon || '📍'}</span><span class="main"><span class="name">${ref.name_ko} <span class="muted t-sm zh">${ref.name_zh}</span></span><span class="sub">${cat?.label_ko || ''} · ${ref.metro_note || ref.address_zh}</span></span>${d != null ? html`<span class="meta">${fmtDist(d)}</span>` : ''}</button>`;
  }
  return html`<button type="button" class="row-place" data-go="#/station/${ref.id}" data-station="${ref.id}"><span class="ico" aria-hidden="true">${icon('metro')}</span><span class="main"><span class="name">${ref.ko}역 <span class="muted t-sm zh">${ref.zh}站</span></span><span class="sub">${raw(ref.lines.map(l => lineChip(l, { badge: true }).__raw).join(' '))}</span></span>${d != null ? html`<span class="meta">${fmtDist(d)}</span>` : ''}</button>`;
}
