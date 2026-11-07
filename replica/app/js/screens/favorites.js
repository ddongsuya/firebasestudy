// S11 즐겨찾기(저장)·폴더·자주 가는 곳
import { D } from '../data.js';
import * as store from '../store.js';
import { $, html, raw, icon, toast } from '../ui.js';
import * as driver from './driver.js';
import { distance, fmtDist } from '../geo.js';

const state = { folder: 'all', setting: null };
let panel;
export function show(params) {
  panel = $('#panel'); panel.classList.remove('hidden'); state.setting = params.set || null; render();
}
const nameOf = f => f.place_id ? D.placeById[f.place_id]?.name_ko : f.station_id ? D.stationById[f.station_id]?.ko + '역' : f.custom_name;
const zhOf = f => f.place_id ? D.placeById[f.place_id]?.name_zh : f.station_id ? D.stationById[f.station_id]?.zh + '站' : f.custom_zh || '';
const addrOf = f => f.place_id ? D.placeById[f.place_id]?.address_zh : '';
const ptOf = f => f.place_id ? D.placeById[f.place_id] : f.station_id ? D.stationById[f.station_id] : { lat: f.lat, lon: f.lon };
export const refOf = f => f.place_id ? `place:${f.place_id}` : f.station_id ? `station:${f.station_id}` : `pt:${f.lat},${f.lon},${encodeURIComponent(f.custom_name || '')}`;
const goOf = f => f.place_id ? `#/place/${f.place_id}` : f.station_id ? `#/station/${f.station_id}` : `#/pick?for=view&lat=${f.lat}&lon=${f.lon}`;

function render() {
  const d = store.get(); const favs = d.favorites.filter(f => state.folder === 'all' || (f.folder_id || 'none') === state.folder);
  const hotel = store.frequent('hotel'), airport = store.frequent('airport');
  const roleOf = f => f.id === d.frequent.hotel ? '호텔' : f.id === d.frequent.airport ? '공항' : f.id === d.frequent.meetup ? '집결지' : null;
  panel.innerHTML = html`
    <div class="panel-head"><h1>${state.setting ? ({ hotel: '호텔로 쓸 곳 고르기', airport: '공항 고르기', meetup: '집결지 고르기' })[state.setting] : '저장'}</h1>
      ${state.setting ? html`<button type="button" class="btn sm ghost" id="btnCancelSet">취소</button>` : html`<button type="button" class="btn sm" id="btnAllZh" ${d.favorites.length ? '' : 'disabled'}>${icon('car', 'sm')} 전부 중국어로</button>`}</div>
    <div class="panel-body">
      ${state.setting ? html`<div class="banner">목록에서 ${({ hotel: '호텔', airport: '공항', meetup: '집결지' })[state.setting]}로 쓸 곳을 고르세요. 없으면 검색해서 ★로 먼저 저장하세요.</div>` : html`
      <div class="section">자주 가는 곳</div>
      <div class="list">
        <div class="row-place" style="border-bottom:1px solid var(--c-border)"><span class="ico">${icon('hotel')}</span><span class="main"><span class="name">호텔</span><span class="sub">${hotel ? nameOf(hotel) : '설정하면 홈에서 "호텔로" 한 번에 길찾기'}</span></span>${hotel ? html`<a class="btn sm" href="#/route?to=${refOf(hotel)}">길찾기</a><button type="button" class="btn icon sm" data-unset="hotel" aria-label="호텔 해제">${icon('x', 'sm')}</button>` : html`<a class="btn sm ghost" href="#/fav?set=hotel">설정</a>`}</div>
        <div class="row-place"><span class="ico">${icon('plane')}</span><span class="main"><span class="name">공항</span><span class="sub">${airport ? nameOf(airport) : '출국 날 길찾기용'}</span></span>${airport ? html`<a class="btn sm" href="#/route?to=${refOf(airport)}">길찾기</a><button type="button" class="btn icon sm" data-unset="airport" aria-label="공항 해제">${icon('x', 'sm')}</button>` : html`<a class="btn sm ghost" href="#/fav?set=airport">설정</a>`}</div>
      </div>
      <div class="chips" style="margin-top:var(--s-4)"><button type="button" class="chip" data-folder="all" aria-pressed="${state.folder === 'all'}">전체 ${d.favorites.length}</button><button type="button" class="chip" data-folder="none" aria-pressed="${state.folder === 'none'}">기본</button>${d.folders.map(f => html`<button type="button" class="chip" data-folder="${f.id}" aria-pressed="${state.folder === f.id}">${f.name}</button>`)}<button type="button" class="chip" id="btnNewFolder">${icon('plus', 'sm')} 폴더</button>${state.folder !== 'all' && state.folder !== 'none' ? html`<button type="button" class="chip" id="btnDelFolder">${icon('trash', 'sm')} 폴더 삭제</button>` : ''}</div>`}
      ${d.favorites.length === 0 ? html`<div class="empty">${icon('star')}<h2>저장한 곳이 없어요</h2><p>장소 카드의 ★를 누르면 여기 모여요</p><button type="button" class="btn sm" data-go="#/">장소 찾으러 가기</button></div>`
        : favs.length === 0 ? html`<div class="empty"><h2>이 폴더는 비어 있어요</h2><p>항목의 폴더 버튼으로 옮길 수 있어요</p></div>`
        : html`<div class="list" style="margin-top:var(--s-3)">${favs.map(f => html`
          <div class="row-place">
            <span class="ico star">${icon('starFill')}</span>
            <button type="button" class="main" style="text-align:left;color:inherit" data-go="${state.setting ? '' : goOf(f)}" data-set-id="${f.id}"><span class="name">${nameOf(f)} ${roleOf(f) ? html`<span class="exit-chip">${roleOf(f)}</span>` : ''}</span><span class="sub zh">${zhOf(f)}${f.note_ko ? ' · ' + f.note_ko : ''}${app.me ? ' · ' + fmtDist(distance(app.me, ptOf(f))) : ''}</span></button>
            ${state.setting ? '' : html`<a class="btn icon sm" href="#/route?to=${refOf(f)}" aria-label="길찾기">${icon('route', 'sm')}</a><button type="button" class="btn icon sm" data-menu="${f.id}" aria-label="더보기">${icon('menu', 'sm')}</button>`}
          </div>`)}</div>`}
      ${!state.setting && d.favorites.length ? html`<p class="note">기사·호텔 직원에게는 "전부 중국어로"를 눌러 한 화면으로 보여주세요.</p>` : ''}
    </div>`;
  $('#btnAllZh') && ($('#btnAllZh').onclick = () => driver.showList(favs.map(f => ({ zh: zhOf(f), addr: addrOf(f) }))));
  $('#btnCancelSet') && ($('#btnCancelSet').onclick = () => app.go('#/fav'));
  $('#btnNewFolder') && ($('#btnNewFolder').onclick = () => { const n = prompt('폴더 이름 (예: 1일차, 쇼핑)'); if (n?.trim()) { const f = store.addFolder(n.trim()); state.folder = f.id; render(); } });
  $('#btnDelFolder') && ($('#btnDelFolder').onclick = () => { if (confirm('폴더만 지우고 항목은 기본으로 옮길까요?')) { store.removeFolder(state.folder); state.folder = 'all'; render(); } });
  panel.querySelector('.panel-body').addEventListener('click', e => {
    const fo = e.target.closest('[data-folder]'); if (fo) { state.folder = fo.dataset.folder; render(); return; }
    const un = e.target.closest('[data-unset]'); if (un) { store.setFrequent(un.dataset.unset, null); render(); return; }
    const setBtn = e.target.closest('[data-set-id]');
    if (setBtn && state.setting) { store.setFrequent(state.setting, setBtn.dataset.setId); toast('설정했어요'); app.go('#/fav'); return; }
    const go = e.target.closest('[data-go]'); if (go && go.dataset.go) { app.go(go.dataset.go); return; }
    const menu = e.target.closest('[data-menu]'); if (menu) { itemMenu(menu.dataset.menu); }
  });
}
function itemMenu(id) {
  const d = store.get(); const f = d.favorites.find(x => x.id === id); if (!f) return;
  const folders = ['기본', ...d.folders.map(x => x.name)];
  const choice = prompt(`${nameOf(f)}\n1) 호텔로 설정  2) 공항으로 설정  3) 메모 쓰기  4) 폴더 이동 (${folders.join('/')})  5) 삭제\n번호를 입력하세요`);
  if (!choice) return;
  switch (choice.trim()) {
    case '1': store.setFrequent('hotel', id); toast('호텔로 설정했어요'); break;
    case '2': store.setFrequent('airport', id); toast('공항으로 설정했어요'); break;
    case '3': { const n = prompt('메모', f.note_ko || ''); if (n !== null) store.updateFavorite(id, { note_ko: n.trim() }); break; }
    case '4': { const n = prompt(`폴더 이름 (${folders.join(', ')})`); if (n === null) break; const fo = d.folders.find(x => x.name === n.trim()); store.updateFavorite(id, { folder_id: fo ? fo.id : null }); break; }
    case '5': store.removeFavorite(id); toast('삭제했어요', { action: '실행 취소', onAction: () => { const dd = store.get(); dd.favorites.push(f); store.save(dd); render(); } }); break;
  }
  render();
}
