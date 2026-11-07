// S05 경로 입력 · S06 결과 · S07 상세
import { D, search, describePoint, bestExit, exitLabel, exitsOf } from '../data.js';
import * as store from '../store.js';
import * as mapx from '../map.js';
import { $, $$, html, raw, icon, toast, lineChip, lineChain, crowdHint, fmtDist, fmtMin, promptSheet } from '../ui.js';
import { locate, distance } from '../geo.js';
import * as transit from '../routing/transit.js';
import * as walk from '../routing/walk.js';
import * as taxi from '../routing/taxi.js';
import { check as checkSchedule } from '../routing/schedule.js';
import { beijingHHMM, beijingDateParts } from '../routing/fare.js';
import { amapRoute } from '../deeplink.js';
import * as driver from './driver.js';
import { row as searchRow } from './search.js';

const state = { from: null, to: null, mode: 'transit', strategy: 'recommend', depart: 'now', plans: [], sel: null, editing: null, status: 'idle', error: null, walkPlan: null, taxiPlan: null };
let panel, params = {};

/** 참조 문자열 → 지점. "me" | "place:id" | "station:id" | "pt:lat,lon,name" */
export async function resolve(ref) {
  if (!ref || ref === 'me') {
    if (app.me && Date.now() - app.me.at < 120000) return { ...app.me, name: '내 위치', name_zh: '我的位置', ref: 'me' };
    const pos = await locate(); app.me = pos; mapx.showMe(pos); return { ...pos, name: '내 위치', name_zh: '我的位置', ref: 'me' };
  }
  const [kind, rest] = ref.split(/:(.+)/);
  if (kind === 'place') { const p = D.placeById[rest]; return p && { lat: p.lat, lon: p.lon, name: p.name_ko, name_zh: p.name_zh, addr: p.address_zh, ref }; }
  if (kind === 'station') { const s = D.stationById[rest]; return s && { lat: s.lat, lon: s.lon, name: s.ko + '역', name_zh: s.zh + '站', ref }; }
  if (kind === 'pt') { const [lat, lon, name] = rest.split(','); const d = describePoint({ lat: +lat, lon: +lon }); return { lat: +lat, lon: +lon, name: decodeURIComponent(name || '') || d.label_ko, name_zh: d.label_zh, ref }; }
  return null;
}
const refOf = x => x?.ref || 'me';

export async function show(p) {
  params = p; panel = $('#panel'); panel.classList.remove('hidden'); panel.classList.add('with-map');
  state.mode = p.mode || state.mode; state.strategy = p.strategy || state.strategy; state.sel = p.sel != null ? +p.sel : null; state.editing = p.edit || null;
  state.status = 'resolving'; state.error = null; state.plans = []; render();
  try {
    [state.from, state.to] = await Promise.all([resolve(p.from || 'me'), p.to ? resolve(p.to) : null]);
  } catch (e) {
    state.from = null; state.error = { denied: '위치 권한이 꺼져 있어요. 출발지를 직접 골라 주세요.', timeout: '위치를 찾지 못했어요. 출발지를 직접 골라 주세요.' }[e.code] || '출발지를 찾지 못했어요. 직접 골라 주세요.';
  }
  if (!state.from && !state.editing) state.editing = 'from';
  else if (!p.to && !state.editing) state.editing = 'to';
  if (state.from && state.to && !state.editing) await compute(); else { state.status = 'idle'; render(); }
}
async function compute() {
  state.status = 'computing'; render();
  const at = departAt();
  if (state.mode === 'transit') {
    state.plans = transit.plan({ origin: state.from, destination: state.to, strategy: state.strategy }, D).map(pl => ({ ...pl, origin: state.from, destination: state.to, schedule: checkSchedule(pl, at, D) }));
  } else if (state.mode === 'walk') {
    const w = await walk.plan(state.from, state.to, { router: store.settings().walk_router }); state.plans = [{ ...w, origin: state.from, destination: state.to, segments: [{ kind: 'walk', distance_m: w.distance_m, duration_s: w.duration_s, polyline: w.polyline, steps: w.steps }] }];
  } else {
    const t = taxi.estimate(state.from, state.to, at, D); state.plans = [{ ...t, origin: state.from, destination: state.to, segments: [{ kind: 'taxi', ...t }] }];
  }
  state.status = 'done';
  if (state.sel != null && !state.plans[state.sel]) state.sel = null;
  render();
  const pl = state.plans[state.sel ?? 0]; if (pl) mapx.drawPlan(pl, { fit: true }); else mapx.clearRoute();
}
function departAt() { if (state.depart === 'now') return new Date(); const { y, mo, d } = beijingDateParts(); const [h, m] = state.depart.split(':'); return new Date(Date.UTC(y, mo - 1, d, +h - 8, +m)); }
function setHash(extra = {}) {
  const q = new URLSearchParams({ from: refOf(state.from), ...(state.to ? { to: refOf(state.to) } : {}), mode: state.mode, strategy: state.strategy, ...(state.sel != null ? { sel: state.sel } : {}), ...extra });
  for (const [k, v] of [...q]) if (v === '' || v == null) q.delete(k);
  history.replaceState(null, '', '#/route?' + q.toString());
}

function render() {
  const fromTxt = state.from?.name || (state.status === 'resolving' ? '위치 찾는 중…' : ''), toTxt = state.to?.name || '';
  panel.innerHTML = html`
    <div class="panel-head">
      <button type="button" class="btn icon" id="btnBack" aria-label="뒤로">${icon('back')}</button>
      <div class="route-input grow">
        <div class="lines">
          <button type="button" class="field" id="fFrom" aria-label="출발지: ${fromTxt || '선택'}"><span class="dot start"></span><span class="grow" style="text-align:left;${!fromTxt ? 'color:var(--c-text-muted)' : ''}">${fromTxt || '출발지 선택'}</span>${state.status === 'resolving' && !state.from ? html`<span class="spinner on"></span>` : ''}</button>
          <button type="button" class="field" id="fTo" aria-label="도착지: ${toTxt || '선택'}"><span class="dot end"></span><span class="grow" style="text-align:left;${!toTxt ? 'color:var(--c-text-muted)' : ''}">${toTxt || '어디로 가세요?'}</span></button>
        </div>
        <button type="button" class="btn icon swap" id="btnSwap" aria-label="출발·도착 바꾸기">${icon('swap')}</button>
      </div>
    </div>
    <div class="panel-body" id="routeBody">${state.editing ? editor() : state.sel != null && state.plans[state.sel] ? detail(state.plans[state.sel]) : results()}</div>`;
  $('#btnBack').onclick = () => { if (state.editing && state.from && state.to) { state.editing = null; render(); compute(); } else if (state.sel != null) { state.sel = null; setHash(); render(); mapx.drawPlan(state.plans[0] || { segments: [] }); } else app.go('#/'); };
  $('#fFrom').onclick = () => { state.editing = 'from'; render(); };
  $('#fTo').onclick = () => { state.editing = 'to'; render(); };
  $('#btnSwap').onclick = () => { [state.from, state.to] = [state.to, state.from]; state.sel = null; setHash(); if (state.from && state.to) compute(); else render(); };
  bind();
}

// ── 출발/도착 선택기 ──
function editor() {
  const which = state.editing; const favs = store.favorites();
  const favRef = f => f.place_id ? `place:${f.place_id}` : f.station_id ? `station:${f.station_id}` : `pt:${f.lat},${f.lon},${encodeURIComponent(f.custom_name || '')}`;
  const favName = f => f.place_id ? D.placeById[f.place_id]?.name_ko : f.station_id ? D.stationById[f.station_id]?.ko + '역' : f.custom_name;
  const other = which === 'from' ? (state.to ? 'to=' + refOf(state.to) : '') : (state.from ? 'from=' + refOf(state.from) : '');
  return html`
    ${state.error ? html`<div class="banner warning" role="alert">${state.error}</div>` : ''}
    <div class="searchbar" style="margin:var(--s-2) 0"><input id="rq" type="search" placeholder="${which === 'from' ? '출발지' : '도착지'} 검색 (한글·中文·pinyin)" autocomplete="off" enterkeyhint="search" aria-label="${which === 'from' ? '출발지' : '도착지'} 검색"></div>
    <div class="list" id="rqList">
      <button type="button" class="row-place" data-pick="me"><span class="ico">${icon('locate')}</span><span class="main"><span class="name">내 위치</span><span class="sub">GPS 현재 위치</span></span></button>
      <a class="row-place" href="#/pick?for=${which}&${other}"><span class="ico">${icon('map')}</span><span class="main"><span class="name">지도에서 고르기</span><span class="sub">핀을 옮겨 선택</span></span></a>
      ${favs.slice(0, 8).map(f => html`<button type="button" class="row-place" data-pick="${favRef(f)}"><span class="ico star">${icon('starFill')}</span><span class="main"><span class="name">${favName(f)}</span><span class="sub">${store.get().frequent.hotel === f.id ? '호텔' : store.get().frequent.airport === f.id ? '공항' : '저장한 곳'}</span></span></button>`)}
    </div>`;
}
function bind() {
  const rq = $('#rq'); if (rq) {
    rq.focus();
    rq.addEventListener('input', () => {
      const q = rq.value.trim(); const list = $('#rqList'); if (!q) { render(); return; }
      const rs = search(q, { limit: 20 });
      list.innerHTML = rs.length ? rs.map(r => searchRow(r).replace(/data-go="#\/(place|station)\/([^"]+)"/, 'data-pick="$1:$2"')).join('') : html`<div class="empty"><h2>못 찾았어요</h2><p>한글·중국어·병음으로 다시 검색해 보세요</p></div>`;
    });
    rq.addEventListener('keydown', e => { if (e.key === 'Enter') $('#rqList [data-pick]')?.click(); });
  }
  $('#routeBody').addEventListener('click', async e => {
    const pick = e.target.closest('[data-pick]');
    if (pick) { const which = state.editing; state.editing = null; state.status = 'resolving'; render(); try { state[which] = await resolve(pick.dataset.pick); } catch { state.error = '위치를 찾지 못했어요'; state.status = 'idle'; render(); return; } state.sel = null; setHash(); if (state.from && state.to) compute(); else { state.editing = state.from ? 'to' : 'from'; state.status = 'idle'; render(); } return; }
    const mode = e.target.closest('[data-mode]'); if (mode) { state.mode = mode.dataset.mode; state.sel = null; setHash(); compute(); return; }
    const strat = e.target.closest('[data-strategy]'); if (strat) { state.strategy = strat.dataset.strategy; state.sel = null; setHash(); compute(); return; }
    const dep = e.target.closest('[data-depart]'); if (dep) { promptSheet('출발 시각 (베이징 시각)', { value: state.depart === 'now' ? '' : state.depart, placeholder: '예 22:30 · 비우면 지금 출발', submitLabel: '적용', onSubmit: v => { state.depart = /^\d{1,2}:\d{2}$/.test((v || '').trim()) ? v.trim().padStart(5, '0') : 'now'; compute(); } }); return; }
    const card = e.target.closest('[data-sel]'); if (card) { state.sel = +card.dataset.sel; setHash(); render(); mapx.drawPlan(state.plans[state.sel], { fit: true }); return; }
    const exp = e.target.closest('[data-expand]'); if (exp) { const ul = $('#' + exp.dataset.expand); const open = ul.hidden; ul.hidden = !open; exp.setAttribute('aria-expanded', String(open)); return; }
    const drv = e.target.closest('[data-driver]'); if (drv) { driver.show({ zh: state.to.name_zh, addr: state.to.addr || '', ko: state.to.name }); return; }
  });
}

// ── 결과 목록 ──
function results() {
  const modes = [['transit', 'metro', '지하철'], ['walk', 'walk', '도보'], ['taxi', 'car', '택시']];
  const head = html`
    <div class="segtabs" role="tablist" aria-label="이동 수단">${modes.map(([m, ic, lb]) => html`<button type="button" role="tab" data-mode="${m}" aria-selected="${state.mode === m}">${icon(ic, 'sm')} ${lb}</button>`)}</div>
    ${state.mode === 'transit' ? html`<div class="chips" style="margin-top:var(--s-2)"><button type="button" class="chip" data-depart>${icon('clock', 'sm')} ${state.depart === 'now' ? '지금 출발' : state.depart + ' 출발'} <span class="caret"></span></button>${Object.entries(transit.STRATEGIES).map(([k, s]) => html`<button type="button" class="chip" data-strategy="${k}" aria-pressed="${state.strategy === k}">${state.strategy === k ? '✓ ' : ''}${s.label}</button>`)}</div>` : ''}`;
  if (state.status === 'resolving' || state.status === 'computing') return raw(head + html`<div style="margin-top:var(--s-3)"><div class="skeleton" aria-busy="true"></div><div class="skeleton"></div><p class="note" style="text-align:center">${state.status === 'resolving' ? '위치 찾는 중…' : '경로 계산 중…'}</p></div>`);
  if (!state.from || !state.to) return raw(head + html`<div class="empty"><h2>출발지와 도착지를 골라 주세요</h2><p>위의 칸을 눌러 선택할 수 있어요</p></div>`);
  if (!state.plans.length) {
    const d = distance(state.from, state.to);
    return raw(head + html`<div class="empty">${icon('metro')}<h2>지하철 경로가 없어요</h2><p>${d < 1500 ? `직선 ${fmtDist(d)}라 걸어가는 편이 빨라요.` : '근처(2.5km)에 역이 없거나 너무 멀어요. 택시를 확인해 보세요.'}</p><div class="inline" style="justify-content:center"><button type="button" class="btn sm" data-mode="walk">도보 보기</button><button type="button" class="btn sm" data-mode="taxi">택시 요금 보기</button></div></div>`);
  }
  const best = Math.min(...state.plans.map(p => p.duration_s));
  return raw(head + html`<div style="margin-top:var(--s-3)">${state.plans.map((p, i) => card(p, i, p.duration_s === best))}</div>
    ${state.mode === 'transit' ? html`<p class="note">시간은 역간 거리로 계산한 추정치예요(±10%). 막차는 종점 기준이라 중간역은 더 이를 수 있어요.</p>` : state.mode === 'taxi' ? html`<p class="note">베이징 택시 공시 요금(기본 ¥13/3km, ¥2.3/km, 야간 할증)으로 계산한 추정이에요. 정체·우회에 따라 달라져요.</p>` : html`<p class="note">${state.plans[0].note || ''}</p>`}`);
}
function card(p, i, best) {
  const sched = p.schedule || { ok: true, warnings: [] };
  const danger = sched.warnings.find(w => w.level === 'danger'), warn = sched.warnings.find(w => w.level === 'warning');
  if (p.mode === 'walk') return html`<button type="button" class="route-card" data-sel="${i}"><div class="head"><span class="time">약 ${fmtMin(p.duration_s)}</span><span class="walk">${fmtDist(p.distance_m)} · 약 ${p.kcal}kcal</span></div><div class="summary">${p.steps[0]?.instruction || ''}</div></button>`;
  if (p.mode === 'taxi') return html`<button type="button" class="route-card" data-sel="${i}"><div class="head"><span class="fare">¥${p.fare_low}~${p.fare_high}</span><span class="walk">약 ${fmtMin(p.duration_s)} · ${fmtDist(p.distance_m)}${p.night ? ' · 야간 할증' : ''}</span></div><div class="summary">기사에게 보여줄 중국어 카드와 고덕·DiDi 딥링크는 상세에서</div></button>`;
  const firstRide = p.segments.find(s => s.kind === 'ride'); const fromSt = D.stationById[p.from_station], toSt = D.stationById[p.to_station];
  return html`<button type="button" class="route-card ${danger ? 'unavailable' : ''} ${state.sel === i ? 'selected' : ''}" data-sel="${i}">
    <div class="head"><span class="time">약 ${fmtMin(p.duration_s)}</span><span class="walk">걷기 ${fmtDist(p.walking_distance_m)}</span>${best && !danger ? html`<span class="best">가장 빠름</span>` : ''}</div>
    <div style="margin-top:8px">${lineChain(p)}</div>
    <div class="summary">${p.stops}역 · ¥${p.fare_yuan} · ${p.transfers ? `환승 ${p.transfers}회 · ` : ''}${fromSt?.ko}역 승차 → ${toSt?.ko}역 하차</div>
    ${danger ? html`<div class="banner danger" style="margin-top:8px">${danger.text}</div>` : warn ? html`<div class="banner warning" style="margin-top:8px">${warn.text}</div>` : firstRide ? html`<div class="next"><span>${D.lineById[firstRide.line].ko} ${firstRide.direction || ''}</span>${crowdHint(firstRide.line, departAt())}<span class="min">약 ${D.lineById[firstRide.line].headway_min}분 간격</span></div>` : ''}
  </button>`;
}

// ── 상세(타임라인) ──
function detail(p) {
  const links = amapRoute(state.to, state.mode === 'taxi' ? 'car' : state.mode === 'walk' ? 'walk' : 'bus', state.from);
  const sched = p.schedule || { warnings: [] };
  let body;
  if (p.mode === 'walk') body = html`<ol class="timeline"><li class="origin"><span class="dot"></span><div class="title">${state.from.name}</div></li>${p.steps.map(s => html`<li class="walk"><span class="dot"></span><div class="title">${s.instruction}</div><div class="sub">약 ${fmtMin(s.duration_s)}</div></li>`)}<li class="destination"><span class="dot"></span><div class="title">${state.to.name}</div><div class="sub zh">${state.to.name_zh}</div></li></ol>`;
  else if (p.mode === 'taxi') body = html`<div class="card"><div class="t-xl">¥${p.fare_low}~${p.fare_high}</div><div class="muted t-sm">약 ${fmtMin(p.duration_s)} · 약 ${fmtDist(p.distance_m)}${p.night ? ' · 야간 할증 포함' : ''}</div></div>
    <ol class="timeline" style="margin-top:var(--s-3)"><li class="origin"><span class="dot"></span><div class="title">${state.from.name}</div></li><li class="ride" style="--line:var(--c-accent)"><span class="dot"></span><div class="title">택시 · 기사에게 아래 카드를 보여주세요</div><div class="sub">미터기(打表)로 가는지 확인. 영수증(发票)은 내릴 때 요청.</div></li><li class="destination"><span class="dot"></span><div class="title">${state.to.name}</div><div class="sub zh">${state.to.name_zh}${state.to.addr ? ' · ' + state.to.addr : ''}</div></li></ol>`;
  else body = html`<div class="card"><div class="inline"><span class="t-xl">약 ${fmtMin(p.duration_s)}</span><span class="muted t-sm">걷기 ${fmtDist(p.walking_distance_m)} · ¥${p.fare_yuan} · ${p.stops}역</span></div><div style="margin-top:8px">${lineChain(p)}</div></div>
    ${sched.warnings.map(w => html`<div class="banner ${w.level}" role="alert" style="margin-top:var(--s-2)">${w.text}</div>`)}
    <ol class="timeline" style="margin-top:var(--s-3)">
      <li class="origin"><span class="dot"></span><div class="title">${state.from.name}</div></li>
      ${p.segments.map((s, i) => segmentItem(s, i, p))}
      <li class="destination"><span class="dot"></span><div class="title">${state.to.name}</div><div class="sub zh">${state.to.name_zh}</div></li>
    </ol>`;
  return raw(body + html`
    <div class="actions">
      ${p.mode === 'taxi' ? html`<button type="button" class="btn primary wide lg" data-driver>${icon('car')} 기사에게 보여주기</button>` : html`<a class="btn primary wide lg" href="#/walk?to=${refOf(state.to)}${p.mode === 'transit' ? '&via=' + p.from_station : ''}">${icon('nav')} ${p.mode === 'transit' ? '첫 역까지 도보 안내' : '도보 안내 시작'}</a>`}
      <a class="btn" href="${links.web}" target="_blank" rel="noopener">고덕 앱으로 열기</a>
      <button type="button" class="btn ghost" data-driver>${icon('car')} 중국어 카드</button>
    </div>`);
}
function exitHint(p, s, to) {
  const isLast = p.segments.filter(x => x.kind === 'ride').at(-1) === s; if (!isLast) return '';
  const dest = state.to?.ref?.startsWith('place:') ? D.placeById[state.to.ref.slice(6)] : null;
  const ex = dest ? bestExit(dest, to.id) : null; const all = exitsOf(to.id);
  if (ex) return html`<div class="sub"><span class="exit-chip">${exitLabel(ex)}</span> <span class="zh">${ex.landmarks_zh || ex.street_zh || ''}</span></div>`;
  if (all.length) return html`<div class="sub">출구 ${all.length}개: ${all.map(e => `${e.code}${e.dir_ko ? '(' + e.dir_ko.replace('쪽', '') + ')' : ''}`).join(' · ')} <a href="#/station/${to.id}">자세히</a></div>`;
  return '';
}
function segmentItem(s, i, p) {
  if (s.kind === 'walk') { const st = D.stationById[s.to_station || s.from_station]; if (s.distance_m < 30) return ''; return html`<li class="walk"><span class="dot"></span><div class="title">도보 ${fmtDist(s.distance_m)} · 약 ${fmtMin(s.duration_s)}</div><div class="sub">${s.to_station ? `${st?.ko}역까지` : `${st?.ko}역에서 목적지까지`}</div></li>`; }
  if (s.kind === 'transfer') { const st = D.stationById[s.station]; return html`<li class="walk"><span class="dot"></span><div class="title">${st?.ko}역에서 ${D.lineById[s.to_line]?.ko}으로 환승</div><div class="sub">갈아타기 약 ${Math.round(s.walk_s / 60)}분 + 대기</div></li>`; }
  if (s.kind === 'ride') {
    const line = D.lineById[s.line]; const from = D.stationById[s.from_station], to = D.stationById[s.to_station];
    return html`<li class="ride" style="--line:${line.color}"><span class="dot"></span>
      <div class="title">${from.ko} <span class="zh muted t-sm">${from.zh}</span> ${lineChip(s.line, { badge: true })} ${s.direction || ''}</div>
      <div class="sub">약 ${line.headway_min}분 간격 ${crowdHint(s.line, departAt())}</div>
      <button type="button" class="expand" data-expand="via${i}" aria-expanded="false" aria-controls="via${i}">${s.stops}역 · 약 ${fmtMin(s.duration_s)} ${icon('down', 'sm')}</button>
      <ol class="vias" id="via${i}" hidden>${s.via.map(id => html`<li>${D.stationById[id]?.ko} <span class="zh">${D.stationById[id]?.zh}</span></li>`)}</ol>
      <div class="title" style="margin-top:8px">${to.ko} <span class="zh muted t-sm">${to.zh}</span> 하차${to.transfer ? ' · 환승역' : ''}</div>${exitHint(p, s, to)}</li>`;
  }
  return '';
}
