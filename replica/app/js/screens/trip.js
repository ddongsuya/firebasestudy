// S18 여행: 일정(타임라인) · 준비물 체크 · 예약·티켓 보관함(이 폰에만 저장)
import { D } from '../data.js';
import * as store from '../store.js';
import { $, html, icon, toast, actionSheet, promptSheet, openSheet, closeSheet } from '../ui.js';
import * as driver from './driver.js';
import { copyText } from './place.js';

let panel; let trip = null;
const state = { view: 'plan', day: null, person: 0 };

async function loadTrip() {
  if (trip) return trip;
  const r = await fetch('./data/trip.json'); if (!r.ok) throw new Error('trip.json ' + r.status);
  trip = await r.json(); return trip;
}
/** 베이징 시각 기준 오늘 날짜(YYYY-MM-DD) */
const todayBj = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
const nowHm = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());

export async function show(params) {
  panel = $('#panel'); panel.classList.remove('hidden');
  state.view = params.v || 'plan';
  try { await loadTrip(); } catch (e) { panel.innerHTML = html`<div class="panel-head"><h1>일정</h1></div><div class="panel-body"><div class="empty"><h2>일정을 불러오지 못했어요</h2><p>${e.message}</p></div></div>`; return; }
  if (!state.day) { const t = todayBj(); state.day = (trip.days.find(d => d.date === t) || (t > trip.dates.end ? trip.days[trip.days.length - 1] : trip.days[0])).id; }
  if (params.d) state.day = params.d;
  render();
}

function render() {
  const tabs = html`<div class="chips seg" role="tablist">${[['plan', '📅 일정'], ['pack', '🧳 준비물'], ['vault', '🔐 예약·티켓']].map(([v, l]) => html`<button type="button" class="chip" role="tab" data-view="${v}" aria-pressed="${state.view === v}">${l}</button>`)}</div>`;
  let body;
  if (state.view === 'pack') body = renderPack();
  else if (state.view === 'vault') body = renderVault();
  else body = renderPlan();
  panel.innerHTML = html`<div class="panel-head"><a class="btn icon" href="#/" aria-label="지도로">${icon('back')}</a><h1>${trip.title}</h1><button type="button" class="btn icon" id="btnTripSetup" aria-label="호텔·공항 설정" title="호텔·공항을 바로가기로">${icon('hotel')}</button></div>
    <div class="panel-body flush"><div style="padding:var(--s-2) var(--s-3) 0">${tabs}</div>${body}</div>`;
  bind();
}

// ── 일정 ──
function renderPlan() {
  const day = trip.days.find(d => d.id === state.day) || trip.days[0];
  const isToday = day.date === todayBj(); const hm = nowHm();
  let nextIdx = -1;
  if (isToday) nextIdx = day.stops.findIndex(s => /^\d\d:\d\d$/.test(s.t) && s.t >= hm);
  return html`
    <div class="chips" style="padding:var(--s-2) var(--s-3)">${trip.days.map(d => html`<button type="button" class="chip" data-day="${d.id}" aria-pressed="${d.id === day.id}">${d.label}${d.date === todayBj() ? ' · 오늘' : ''}</button>`)}</div>
    <div class="section" style="padding:0 var(--s-4)">${day.sub}</div>
    <ol class="timeline trip" style="padding:var(--s-2) var(--s-4) var(--s-6)">
      ${day.stops.map((s, i) => {
        const p = s.place ? D.placeById[s.place] : null;
        const alts = (s.alt || []).map(id => D.placeById[id]).filter(Boolean);
        return html`<li class="${i === nextIdx ? 'next' : ''} ${s.warn ? 'warn' : ''}">
          <div class="trip-time">${s.t}${i === nextIdx ? html` <span class="exit-chip">다음</span>` : ''}</div>
          <div class="trip-title">${s.title}</div>
          ${s.desc ? html`<div class="trip-desc">${s.desc}</div>` : ''}
          ${s.warn ? html`<div class="trip-warn">⚠️ ${s.warn}</div>` : ''}
          ${s.transport ? html`<div class="trip-desc">${icon('car', 'sm')} ${s.transport}</div>` : ''}
          ${s.todo ? html`<ul class="trip-todo">${s.todo.map((t, j) => { const k = `${day.id}:${i}:${j}`; return html`<li><label><input type="checkbox" data-check="${k}" ${store.checked(k) ? 'checked' : ''}> <span>${t}</span></label></li>`; })}</ul>` : ''}
          ${p ? html`<div class="trip-place">
            <a class="trip-place-name" href="#/place/${p.id}"><b>${p.name_ko}</b><span class="zh">${p.name_zh}</span></a>
            <div class="inline">
              <a class="btn sm primary" href="#/route?to=place:${p.id}">${icon('route', 'sm')} 길찾기</a>
              <button type="button" class="btn sm" data-driver="${p.id}">${icon('car', 'sm')} 기사에게</button>
              <button type="button" class="btn sm ghost" data-copy="${p.id}">${icon('copy', 'sm')} 디디용 복사</button>
            </div>
            ${alts.length ? html`<div class="trip-alts">${alts.map(a => html`<a class="chip" href="#/place/${a.id}">${a.name_ko}</a>`)}</div>` : ''}
          </div>` : ''}
          ${!p && s.zhNote ? html`<div class="inline" style="margin-top:4px"><button type="button" class="btn sm ghost" data-copytext="${s.zhNote}">${icon('copy', 'sm')} ${s.zhNote}</button></div>` : ''}
          ${s.link ? html`<a class="btn sm ghost" href="${s.link}" target="_blank" rel="noopener" style="margin-top:4px">열기 ↗</a>` : ''}
          ${s.go ? html`<a class="btn sm ghost" href="${s.go}" style="margin-top:4px">보관함 보기 ›</a>` : ''}
        </li>`;
      })}
    </ol>
    <div style="padding:0 var(--s-4) var(--s-6)"><button type="button" class="btn wide" id="btnDayZh">${icon('car')} 오늘 갈 곳 전부 중국어로</button><p class="note">${trip.note}</p></div>`;
}

// ── 준비물 ──
function renderPack() {
  return html`<div class="panel-body-inner" style="padding:var(--s-2) var(--s-3) var(--s-6)">
    <p class="note">체크한 항목은 이 폰에만 저장돼요. 사람별 항목은 이름 칩을 눌러 바꿔요.</p>
    ${trip.checklist.map(g => {
      const people = g.people || [null];
      const person = g.people ? (g.people[state.person] || g.people[0]) : null;
      const done = people.flatMap(pp => g.items.map((_, j) => store.checked(`${g.id}:${pp || ''}:${j}`))).filter(Boolean).length;
      const total = people.length * g.items.length;
      return html`<div class="section" style="display:flex;justify-content:space-between;align-items:center"><span>${g.title}</span><span class="muted t-xs">${done}/${total}</span></div>
        ${g.people ? html`<div class="chips" style="margin-bottom:var(--s-2)">${g.people.map((pp, k) => html`<button type="button" class="chip" data-person="${k}" aria-pressed="${k === state.person}">${pp}</button>`)}</div>` : ''}
        <div class="list">${g.items.map((it, j) => { const k = `${g.id}:${person || ''}:${j}`; return html`<label class="row-place check"><input type="checkbox" data-check="${k}" ${store.checked(k) ? 'checked' : ''}><span class="main"><span class="name">${it}</span></span></label>`; })}</div>`;
    })}
    <div class="inline" style="margin-top:var(--s-4)"><button type="button" class="btn ghost sm" id="btnResetDaily">매일 아침 항목 다시 체크 해제</button></div>
  </div>`;
}

// ── 보관함 ──
function renderVault() {
  const v = store.vault();
  return html`<div style="padding:var(--s-2) var(--s-3) var(--s-6)" class="stack">
    <div class="banner"><span>🔐 예약번호·항공권번호·여권 이름·입장권 QR은 인터넷에 올라가지 않고 <b>이 폰에만</b> 저장돼요. 다른 폰에 옮기려면 더보기 → 내 데이터로 복사하세요.</span></div>
    ${v.notes.length ? '' : html`<button type="button" class="btn primary wide" id="btnVaultTemplate">${icon('edit')} 예약 메모 틀 만들기 (항공·호텔·천단·유니버설·보험)</button>`}
    ${v.notes.map(n => html`<div class="card vault-note" data-note="${n.id}"><div class="t-md" style="display:flex;justify-content:space-between;align-items:center"><b>${n.title}</b><span class="inline"><button type="button" class="btn icon sm" data-note-big="${n.id}" aria-label="크게 보기">${icon('speech', 'sm')}</button><button type="button" class="btn icon sm" data-note-edit="${n.id}" aria-label="고치기">${icon('edit', 'sm')}</button><button type="button" class="btn icon sm" data-note-del="${n.id}" aria-label="삭제">${icon('trash', 'sm')}</button></span></div><pre class="vault-body">${n.body}</pre></div>`)}
    <div class="inline"><button type="button" class="btn sm" id="btnNoteAdd">${icon('plus', 'sm')} 메모 추가</button></div>
    <div class="section">입장권·예약 화면 캡처</div>
    <div class="vault-grid">${v.images.map(im => html`<button type="button" class="vault-thumb" data-img="${im.id}"><img src="${im.data}" alt="${im.title}"><span>${im.title}</span></button>`)}
      <label class="vault-thumb add"><input type="file" accept="image/*" id="vaultFile" hidden>${icon('plus')}<span>사진 추가</span></label></div>
    <p class="note">천단 QR 3장(각자 이름), 유니버설 예약 화면, 호텔 예약 화면을 넣어 두세요. 사진은 줄여서 저장돼요(장당 약 150KB).</p>
  </div>`;
}

function bind() {
  panel.onclick = async e => {
    const v = e.target.closest('[data-view]'); if (v) { state.view = v.dataset.view; history.replaceState(null, '', `#/trip?v=${state.view}`); render(); return; }
    const d = e.target.closest('[data-day]'); if (d) { state.day = d.dataset.day; render(); return; }
    const pr = e.target.closest('[data-person]'); if (pr) { state.person = +pr.dataset.person; render(); return; }
    const dr = e.target.closest('[data-driver]'); if (dr) { const p = D.placeById[dr.dataset.driver]; driver.show({ zh: p.name_zh, addr: p.address_zh, ko: p.name_ko }); return; }
    const cp = e.target.closest('[data-copy]'); if (cp) { const p = D.placeById[cp.dataset.copy]; copyText(`${p.name_zh}\n${p.address_zh}`); return; }
    const ct = e.target.closest('[data-copytext]'); if (ct) { copyText(ct.dataset.copytext); return; }
    if (e.target.closest('#btnDayZh')) { const day = trip.days.find(x => x.id === state.day); const items = []; const seen = new Set(); for (const s of day.stops) for (const id of [s.place, ...(s.alt || [])]) { const p = id && D.placeById[id]; if (p && !seen.has(id)) { seen.add(id); items.push({ zh: p.name_zh, addr: p.address_zh }); } } if (!items.length) { toast('이 날은 장소가 없어요'); return; } driver.showList(items); return; }
    if (e.target.closest('#btnTripSetup')) { setupHotelAirport(); return; }
    if (e.target.closest('#btnResetDaily')) { store.uncheckPrefix('c-daily:'); render(); toast('매일 항목을 해제했어요'); return; }
    if (e.target.closest('#btnVaultTemplate')) { for (const t of trip.vaultTemplate) store.addNote(t.title, t.body); render(); toast('빈칸을 채워 넣으세요'); return; }
    if (e.target.closest('#btnNoteAdd')) { promptSheet('메모 제목', { placeholder: '예: 보험, 택시 영수증', submitLabel: '추가', onSubmit: t => { if (t?.trim()) { store.addNote(t.trim(), ''); render(); } } }); return; }
    const ne = e.target.closest('[data-note-edit]'); if (ne) { editNote(ne.dataset.noteEdit); return; }
    const nb = e.target.closest('[data-note-big]'); if (nb) { const n = store.vault().notes.find(x => x.id === nb.dataset.noteBig); driver.show({ zh: n.title, addr: n.body, ko: '', lead: '예약 정보', sub: '' }); return; }
    const nd = e.target.closest('[data-note-del]'); if (nd) { actionSheet('이 메모를 지울까요?', [{ label: '삭제', icon: 'trash', danger: true, onSelect: () => { store.removeNote(nd.dataset.noteDel); render(); } }, { label: '취소', icon: 'x' }]); return; }
    const im = e.target.closest('[data-img]'); if (im) { viewImage(im.dataset.img); return; }
  };
  panel.onchange = async e => {
    const c = e.target.closest('[data-check]'); if (c) { store.setChecked(c.dataset.check, c.checked); if (state.view === 'pack') render(); return; }
    if (e.target.id === 'vaultFile' && e.target.files[0]) {
      const f = e.target.files[0];
      try { const data = await shrinkImage(f); promptSheet('사진 이름', { value: f.name.replace(/\.[^.]+$/, ''), placeholder: '예: 천단 QR 엄마', submitLabel: '저장', onSubmit: t => { try { store.addImage(t || f.name, data); render(); toast('저장했어요'); } catch (err) { toast('저장 공간이 부족해요. 사진을 몇 장 지우세요.'); } } }); }
      catch { toast('이미지를 읽지 못했어요'); }
    }
  };
}
function editNote(id) {
  const n = store.vault().notes.find(x => x.id === id); if (!n) return;
  openSheet(html`<div class="sheet-head"><h2>${n.title}</h2><button type="button" class="btn icon" id="vnClose" aria-label="닫기">${icon('x')}</button></div>
    <textarea class="io" id="vnBody" aria-label="내용" style="min-height:220px">${n.body}</textarea>
    <button type="button" class="btn primary wide lg" id="vnSave" style="margin-top:var(--s-2)">저장</button>`);
  $('#vnClose').onclick = closeSheet;
  $('#vnSave').onclick = () => { store.updateNote(id, { body: $('#vnBody').value }); closeSheet(); render(); toast('저장했어요'); };
}
function viewImage(id) {
  const im = store.vault().images.find(x => x.id === id); if (!im) return;
  const el = $('#driver');
  el.innerHTML = html`<button type="button" class="x">닫기 ✕</button><div class="lead">${im.title}</div><img src="${im.data}" alt="${im.title}" style="max-width:100%;max-height:70vh;border-radius:8px"><div class="inline" style="margin-top:12px"><button type="button" class="btn ghost sm" id="imgDel">${icon('trash', 'sm')} 이 사진 삭제</button></div>`;
  el.classList.remove('hidden');
  $('#imgDel', el).onclick = () => { store.removeImage(id); driver.close(); render(); };
}
async function shrinkImage(file, max = 1400, q = 0.82) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
}
function setupHotelAirport() {
  const hotel = D.placeById.baochen_hotel, airport = D.placeById.pek_t2;
  actionSheet('홈 바로가기 설정', [
    { label: '호텔 = 바오천 호텔', icon: 'hotel', sub: '홈의 "호텔로" 버튼이 바오천 호텔로', onSelect: () => { const f = store.findFavorite({ place_id: hotel.id }) || store.toggleFavorite({ place_id: hotel.id }).fav; store.setFrequent('hotel', f.id); toast('호텔로 설정했어요'); } },
    { label: '공항 = 서우두 T2', icon: 'plane', sub: '귀국 날 "공항으로" 한 번에', onSelect: () => { const f = store.findFavorite({ place_id: airport.id }) || store.toggleFavorite({ place_id: airport.id }).fav; store.setFrequent('airport', f.id); toast('공항으로 설정했어요'); } },
    { label: '일정의 장소 전부 저장(★)', icon: 'star', sub: '저장 탭에 "우리 일정" 폴더로', onSelect: () => { const d = store.get(); let folder = d.folders.find(f => f.name === '우리 일정') || store.addFolder('우리 일정'); let n = 0; for (const p of D.places) if ((p.tags || []).includes('우리일정') && !store.findFavorite({ place_id: p.id })) { store.toggleFavorite({ place_id: p.id }, folder.id); n++; } toast(`${n}곳 저장했어요`); } },
  ]);
}
