// S10 주변 탐색
import { D, nearby } from '../data.js';
import * as mapx from '../map.js';
import { $, html, icon, toast } from '../ui.js';
import { locate } from '../geo.js';
import { row } from './search.js';

const state = { cat: 'all', radius: 1500, sort: 'distance', centerMode: 'me' };
let panel;
export async function show(params) {
  panel = $('#panel'); panel.classList.remove('hidden');
  if (params.cat) state.cat = params.cat;
  if (!app.me && state.centerMode === 'me') { render('locating'); try { app.me = await locate(); mapx.showMe(app.me); } catch { state.centerMode = 'map'; toast('위치를 못 찾아 지도 중심 기준으로 보여드려요'); } }
  render();
}
function render(status) {
  const center = state.centerMode === 'me' && app.me ? app.me : mapx.center();
  const cats = [{ id: 'all', label_ko: '전체', icon: '🗺️' }, ...D.categories.filter(c => D.places.some(p => p.cat === c.id)), { id: 'station', label_ko: '지하철역', icon: '🚇' }];
  const items = status ? [] : nearby(center, { radius: state.radius, cats: state.cat === 'all' ? null : [state.cat], kinds: state.cat === 'station' ? ['station'] : state.cat === 'all' ? ['place', 'station'] : ['place'], sort: state.sort, limit: 60 });
  panel.innerHTML = html`
    <div class="panel-head">
      <h1>주변</h1>
      <button type="button" class="chip" id="btnCenter" aria-pressed="${state.centerMode === 'me'}">${icon('locate', 'sm')} ${state.centerMode === 'me' ? '내 위치 기준' : '지도 중심 기준'}</button>
    </div>
    <div class="panel-body">
      <div class="chips">${cats.map(c => html`<button type="button" class="chip" data-cat="${c.id}" aria-pressed="${state.cat === c.id}">${c.icon} ${c.label_ko}</button>`)}</div>
      <div class="chips" style="margin-top:var(--s-2)">${[500, 1000, 1500, 3000].map(r => html`<button type="button" class="chip" data-radius="${r}" aria-pressed="${state.radius === r}">${r >= 1000 ? r / 1000 + 'km' : r + 'm'}</button>`)}<button type="button" class="chip" data-sort="distance" aria-pressed="${state.sort === 'distance'}">가까운 순</button><button type="button" class="chip" data-sort="rating" aria-pressed="${state.sort === 'rating'}">평점 순</button></div>
      ${status === 'locating' ? html`<div class="skeleton" style="margin-top:var(--s-3)" aria-busy="true"></div><p class="note" style="text-align:center">위치 찾는 중…</p>`
        : items.length ? html`<div class="list" style="margin-top:var(--s-3)">${items.map(it => row(it, { dist: it.distance_m }))}</div>`
        : html`<div class="empty">${icon('pin')}<h2>${state.radius >= 1000 ? state.radius / 1000 + 'km' : state.radius + 'm'} 안에 ${state.cat === 'all' ? '등록된 곳' : cats.find(c => c.id === state.cat)?.label_ko}이 없어요</h2><p>반경을 넓히거나 지도를 옮겨 보세요</p><button type="button" class="btn sm" data-radius="3000">3km로 넓히기</button></div>`}
      <p class="note">이 앱에 등록된 장소와 지하철역만 보여요. 화장실·편의점은 가까운 지하철역이나 쇼핑몰 안을 이용하세요.</p>
    </div>`;
  panel.querySelector('.panel-body').addEventListener('click', e => {
    const c = e.target.closest('[data-cat]'); if (c) { state.cat = c.dataset.cat; render(); return; }
    const r = e.target.closest('[data-radius]'); if (r) { state.radius = +r.dataset.radius; render(); return; }
    const s = e.target.closest('[data-sort]'); if (s) { state.sort = s.dataset.sort; render(); return; }
    const go = e.target.closest('[data-go]'); if (go) app.go(go.dataset.go);
  });
  $('#btnCenter').onclick = async () => { if (state.centerMode === 'me') { state.centerMode = 'map'; render(); } else { try { app.me = await locate(); mapx.showMe(app.me); state.centerMode = 'me'; render(); } catch { toast('위치를 가져오지 못했어요'); } } };
}
