// S05 경로 입력 · S06 결과 · S07 상세
// 화면 구성: 위쪽 고정 머리(출발·도착 + 이동 수단 탭) / 지도 / 아래 드래그 시트(결과·상세·선택기)
import { D, search, describePoint, bestExit, exitLabel, exitsOf } from '../data.js';
import * as store from '../store.js';
import * as mapx from '../map.js';
import { $, html, raw, icon, toast, lineChip, lineChain, crowdHint, fmtDist, fmtMin, promptSheet, openSheet, sheetSnap } from '../ui.js';
import { locate, distance, BEIJING_CENTER } from '../geo.js';
import * as transit from '../routing/transit.js';
import * as walk from '../routing/walk.js';
import * as taxi from '../routing/taxi.js';
import { check as checkSchedule } from '../routing/schedule.js';
import { beijingDateParts } from '../routing/fare.js';
import { amapRoute } from '../deeplink.js';
import * as driver from './driver.js';
import { row as searchRow } from './search.js';

const state = { from: null, to: null, mode: 'transit', strategy: 'recommend', depart: 'now', plans: [], sel: null, editing: null, status: 'idle', error: null };
let panel, token = 0;

/** 참조 문자열 → 지점. "me" | "place:id" | "station:id" | "pt:lat,lon,name" */
export async function resolve(ref) {
  if (!ref || ref === 'me') {
    if (app.me && Date.now() - app.me.at < 120000) return { ...app.me, name: '내 위치', name_zh: '我的位置', ref: 'me' };
    const pos = await locate(); app.me = pos; mapx.showMe(pos); return { ...pos, name: '내 위치', name_zh: '我的位置', ref: 'me' };
  }
  const [kind, rest] = ref.split(/:(.+)/);
  if (kind === 'place') { const p = D.placeById[rest]; return p && { lat: p.lat, lon: p.lon, name: p.name_ko, name_zh: p.name_zh, addr: p.address_zh, ref }; }
  if (kind === 'station') { const s = D.stationById[rest]; return s && { lat: s.lat, lon: s.lon, name: s.ko + '역', name_zh: s.zh + '站', ref }; }
  if (kind === 'pt') {
    const [lat, lon, ...nameParts] = rest.split(','); if (!isFinite(+lat) || !isFinite(+lon)) return null;
    let name = nameParts.join(','); try { name = decodeURIComponent(name); } catch { /* 이미 풀린 이름 */ }
    const d = describePoint({ lat: +lat, lon: +lon }); return { lat: +lat, lon: +lon, name: name || d.label_ko, name_zh: d.label_zh, ref };
  }
  return null;
}
const refOf = x => x?.ref || 'me';
const farFromBeijing = pt => pt && distance(pt, BEIJING_CENTER) > 80000;

export async function show(p) {
  const my = ++token;
  panel = $('#panel'); panel.classList.remove('hidden'); panel.classList.add('with-map', 'route-mode');
  state.mode = p.mode || state.mode; state.strategy = p.strategy || state.strategy; state.sel = p.sel != null ? +p.sel : null; state.editing = p.edit || null;
  state.status = 'resolving'; state.error = null; state.plans = []; render();
  let from = null, to = null;
  try { [from, to] = await Promise.all([resolve(p.from || 'me'), p.to ? resolve(p.to) : null]); }
  catch (e) {
    to = p.to ? await resolve(p.to).catch(() => null) : null;
    state.error = { denied: '위치 권한이 꺼져 있어요. 출발지를 직접 골라 주세요.', timeout: '위치를 찾지 못했어요. 출발지를 직접 골라 주세요.' }[e.code] || '출발지를 찾지 못했어요. 직접 골라 주세요.';
  }
  if (my !== token) return;                                  // 그 사이 다른 경로를 열었음
  state.from = from; state.to = to;
  if (state.from?.ref === 'me' && farFromBeijing(state.from)) state.error = '지금 위치가 베이징이 아니에요. 출발지를 골라 주세요(예: 호텔).';
  if ((!state.from || state.error) && !state.editing) state.editing = 'from';
  else if (!state.to && !state.editing) state.editing = 'to';
  if (state.from && state.to && !state.editing) await compute(my); else { state.status = 'idle'; render(); mapx.clearRoute(); }
}
async function compute(my = token) {
  state.status = 'computing'; render();
  const at = departAt();
  let plans;
  if (state.mode === 'transit') plans = transit.plan({ origin: state.from, destination: state.to, strategy: state.strategy }, D).map(pl => ({ ...pl, schedule: checkSchedule(pl, at, D) }));
  else if (state.mode === 'walk') { const w = await walk.plan(state.from, state.to, { router: store.settings().walk_router }); plans = [{ ...w, segments: [{ kind: 'walk', distance_m: w.distance_m, duration_s: w.duration_s, polyline: w.polyline, steps: w.steps }] }]; }
  else { const t = taxi.estimate(state.from, state.to, at, D); plans = [{ ...t, segments: [{ kind: 'taxi', ...t }] }]; }
  if (my !== token) return;
  // 운행 가능한 경로를 먼저, 그 안에서는 빠른 순
  state.plans = plans.map(pl => ({ ...pl, origin: state.from, destination: state.to })).sort((a, b) => ((a.schedule && !a.schedule.ok) - (b.schedule && !b.schedule.ok)) || a.duration_s - b.duration_s);
  state.status = 'done';
  if (state.sel != null && !state.plans[state.sel]) state.sel = null;
  render();
  const pl = state.plans[state.sel ?? 0]; if (pl) mapx.drawPlan(pl, { fit: true }); else mapx.clearRoute();
}
function departAt() { if (state.depart === 'now') return new Date(); const { y, mo, d } = beijingDateParts(); const [h, m] = state.depart.split(':'); return new Date(Date.UTC(y, mo - 1, d, +h - 8, +m)); }
const arriveAt = s => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(departAt().getTime() + s * 1000));
function setHash(extra = {}) {
  const q = new URLSearchParams({ from: refOf(state.from), ...(state.to ? { to: refOf(state.to) } : {}), mode: state.mode, strategy: state.strategy, ...(state.sel != null ? { sel: state.sel } : {}), ...extra });
  for (const [k, v] of [...q]) if (v === '' || v == null) q.delete(k);
  history.replaceState(null, '', '#/route?' + q.toString());
}

// ── 머리(고정) + 시트 ──
function render() {
  const fromTxt = state.from?.name || (state.status === 'resolving' ? '위치 찾는 중' : ''), toTxt = state.to?.name || '';
  const modes = [['transit', 'metro', '지하철'], ['walk', 'walk', '도보'], ['taxi', 'car', '택시']];
  panel.innerHTML = html`
    <div class="panel-head route-head">
      <div class="rh-row">
        <button type="button" class="btn icon" id="btnBack" aria-label="뒤로">${icon('back')}</button>
        <div class="route-input grow">
          <div class="lines">
            <button type="button" class="field ${state.editing === 'from' ? 'editing' : ''}" id="fFrom" aria-label="출발지: ${fromTxt || '선택'}"><span class="dot start"></span><span class="fv ${fromTxt ? '' : 'ph'}">${fromTxt || '출발지 선택'}</span>${state.status === 'resolving' && !state.from ? html`<span class="spinner on"></span>` : ''}</button>
            <button type="button" class="field ${state.editing === 'to' ? 'editing' : ''}" id="fTo" aria-label="도착지: ${toTxt || '선택'}"><span class="dot end"></span><span class="fv ${toTxt ? '' : 'ph'}">${toTxt || '어디로 가세요?'}</span></button>
          </div>
          <button type="button" class="btn icon swap" id="btnSwap" aria-label="출발·도착 바꾸기" ${state.from && state.to ? '' : 'disabled'}>${icon('swap')}</button>
        </div>
      </div>
      ${state.editing ? '' : html`<div class="segtabs" role="tablist" aria-label="이동 수단">${modes.map(([m, ic, lb]) => html`<button type="button" role="tab" data-mode="${m}" aria-selected="${state.mode === m}">${icon(ic, 'sm')} ${lb}</button>`)}</div>`}
    </div>`;
  $('#btnBack').onclick = () => {
    if (state.editing && state.from && state.to) { state.editing = null; compute(); }
    else if (state.sel != null) { state.sel = null; setHash(); render(); mapx.drawPlan(state.plans[0] || { segments: [] }); }
    else app.go('#/');
  };
  $('#fFrom').onclick = () => { state.editing = 'from'; render(); };
  $('#fTo').onclick = () => { state.editing = 'to'; render(); };
  $('#btnSwap').onclick = () => { [state.from, state.to] = [state.to, state.from]; state.sel = null; state.error = null; setHash(); if (state.from && state.to) compute(); else render(); };
  panel.querySelector('.segtabs')?.addEventListener('click', e => { const m = e.target.closest('[data-mode]'); if (!m || m.dataset.mode === state.mode) return; state.mode = m.dataset.mode; state.sel = null; setHash(); compute(); });
  const body = state.editing ? editor() : state.sel != null && state.plans[state.sel] ? detail(state.plans[state.sel]) : results();
  openSheet(html`<div id="routeBody">${body}</div>`, { keep: !state.editing, initial: state.editing ? 'full' : 'half', dismissible: false, focus: false });
  bind();
}

// ── 출발/도착 선택기 ──
function editor() {
  const which = state.editing; const favs = store.favorites(); const fr = store.get().frequent;
  const favRef = f => f.place_id ? `place:${f.place_id}` : f.station_id ? `station:${f.station_id}` : `pt:${f.lat},${f.lon},${encodeURIComponent(f.custom_name || '')}`;
  const favName = f => f.place_id ? D.placeById[f.place_id]?.name_ko : f.station_id ? D.stationById[f.station_id]?.ko + '역' : f.custom_name;
  const other = which === 'from' ? (state.to ? 'to=' + encodeURIComponent(refOf(state.to)) : '') : (state.from ? 'from=' + encodeURIComponent(refOf(state.from)) : '');
  const sorted = [...favs].sort((a, b) => (fr.hotel === b.id) - (fr.hotel === a.id) || (fr.airport === b.id) - (fr.airport === a.id));
  return html`
    <h2 class="sec-title first" data-peek>${which === 'from' ? '어디서 출발하세요?' : '어디로 가세요?'}</h2>
    ${state.error ? html`<div class="inline-alert warning" role="alert">${icon('alert', 'sm')} ${state.error}</div>` : ''}
    <div class="searchbar inset"><span class="sb-ic">${icon('search')}</span><input id="rq" type="search" placeholder="장소·역 검색 · 한글, 中文, pinyin" autocomplete="off" enterkeyhint="search" aria-label="${which === 'from' ? '출발지' : '도착지'} 검색"></div>
    <div class="list flat" id="rqList">
      <button type="button" class="row-place" data-pick="me"><span class="ico">${icon('locate')}</span><span class="main"><span class="name">내 위치</span><span class="sub">GPS 현재 위치</span></span></button>
      <a class="row-place" href="#/pick?for=${which}&${other}"><span class="ico">${icon('map')}</span><span class="main"><span class="name">지도에서 고르기</span><span class="sub">핀을 옮겨 선택</span></span></a>
      ${sorted.slice(0, 10).map(f => html`<button type="button" class="row-place" data-pick="${favRef(f)}"><span class="ico star">${icon(fr.hotel === f.id ? 'hotel' : fr.airport === f.id ? 'plane' : 'starFill')}</span><span class="main"><span class="name">${favName(f)}</span><span class="sub">${fr.hotel === f.id ? '호텔' : fr.airport === f.id ? '공항' : '저장한 곳'}</span></span></button>`)}
    </div>`;
}
function bind() {
  const rq = $('#rq');
  if (rq) {
    if (window.matchMedia('(pointer:fine)').matches) rq.focus();
    rq.addEventListener('input', () => {
      const q = rq.value.trim(); const list = $('#rqList'); if (!q) { render(); return; }
      const rs = search(q, { limit: 20 });
      list.innerHTML = rs.length ? rs.map(r => searchRow(r).replace(/data-go="#\/(place|station)\/([^"]+)"/, 'data-pick="$1:$2"')).join('') : html`<div class="empty"><h2>못 찾았어요</h2><p>한글·중국어·병음으로 다시 검색해 보세요</p></div>`;
    });
    rq.addEventListener('focus', () => sheetSnap('full'));
    rq.addEventListener('keydown', e => { if (e.key === 'Enter') $('#rqList [data-pick]')?.click(); });
  }
  $('#routeBody').addEventListener('click', async e => {
    const pick = e.target.closest('[data-pick]');
    if (pick) {
      const which = state.editing; state.editing = null; state.status = 'resolving'; state.error = null; render();
      try { state[which] = await resolve(pick.dataset.pick); } catch { state[which] = null; state.error = '위치를 찾지 못했어요. 목록에서 골라 주세요.'; }
      if (which === 'from' && state.from?.ref === 'me' && farFromBeijing(state.from)) state.error = '지금 위치가 베이징이 아니에요. 출발지를 골라 주세요(예: 호텔).';
      state.sel = null; setHash();
      if (state.from && state.to && !state.error) compute();
      else { state.editing = !state.from || state.error ? 'from' : 'to'; state.status = 'idle'; render(); }
      return;
    }
    const strat = e.target.closest('[data-strategy]'); if (strat) { if (strat.dataset.strategy === state.strategy) return; state.strategy = strat.dataset.strategy; state.sel = null; setHash(); compute(); return; }
    const mode = e.target.closest('[data-mode]'); if (mode) { state.mode = mode.dataset.mode; state.sel = null; setHash(); compute(); return; }
    const dep = e.target.closest('[data-depart]'); if (dep) { promptSheet('출발 시각 (베이징 시각)', { value: state.depart === 'now' ? '' : state.depart, placeholder: '예 22:30 · 비우면 지금 출발', submitLabel: '적용', onSubmit: v => { state.depart = /^\d{1,2}:\d{2}$/.test((v || '').trim()) ? v.trim().padStart(5, '0') : 'now'; compute(); } }); return; }
    const card = e.target.closest('[data-sel]'); if (card) { state.sel = +card.dataset.sel; setHash(); render(); mapx.drawPlan(state.plans[state.sel], { fit: true }); return; }
    const exp = e.target.closest('[data-expand]'); if (exp) { const ul = $('#' + exp.dataset.expand); const open = ul.hidden; ul.hidden = !open; exp.setAttribute('aria-expanded', String(open)); return; }
    const drv = e.target.closest('[data-driver]'); if (drv) { driver.show({ zh: state.to.name_zh, addr: state.to.addr || '', ko: state.to.name }); return; }
  });
}

// ── 결과 목록 ──
function results() {
  const opts = state.mode === 'transit' ? html`<div class="chips tight" data-peek><button type="button" class="chip" data-depart>${icon('clock', 'sm')} ${state.depart === 'now' ? '지금 출발' : state.depart + ' 출발'} <span class="caret"></span></button>${Object.entries(transit.STRATEGIES).map(([k, s]) => html`<button type="button" class="chip" data-strategy="${k}" aria-pressed="${state.strategy === k}">${s.label}</button>`)}</div>` : '';
  if (state.status === 'resolving' || state.status === 'computing') return raw(opts + html`<div class="sk-list" aria-busy="true"><div class="skeleton"></div><div class="skeleton"></div><p class="note center">${state.status === 'resolving' ? '위치 찾는 중' : '경로 계산 중'}</p></div>`);
  if (!state.from || !state.to) return raw(opts + html`<div class="empty"><h2>출발지와 도착지를 골라 주세요</h2><p>위의 칸을 누르면 고를 수 있어요</p></div>`);
  if (!state.plans.length) {
    const d = distance(state.from, state.to);
    return raw(opts + html`<div class="empty">${icon('metro')}<h2>지하철 경로가 없어요</h2><p>${d < 1500 ? `직선 ${fmtDist(d)}라 걸어가는 편이 빨라요.` : '근처 2.5km 안에 역이 없어요. 택시를 확인해 보세요.'}</p><div class="inline center"><button type="button" class="btn sm" data-mode="walk">도보 보기</button><button type="button" class="btn sm" data-mode="taxi">택시 요금 보기</button></div></div>`);
  }
  const okPlans = state.plans.filter(p => !p.schedule || p.schedule.ok);
  const best = okPlans.length ? Math.min(...okPlans.map(p => p.duration_s)) : null;
  const allDown = state.mode === 'transit' && !okPlans.length;
  const note = state.mode === 'transit' ? '시간은 역 사이 거리로 계산한 추정이에요(±10%). 막차는 종점 기준이에요.' : state.mode === 'taxi' ? '베이징 택시 공시 요금(기본 ¥13/3km, ¥2.3/km, 야간 할증)으로 계산했어요. 정체·우회에 따라 달라져요.' : (state.plans[0].note || '');
  return raw(opts + html`
    ${allDown ? html`<div class="inline-alert danger" role="alert">${icon('alert', 'sm')} 지금은 지하철이 끊긴 시간이에요. <button type="button" class="link" data-mode="taxi">택시 요금 보기</button></div>` : ''}
    <div class="rc-list">${state.plans.map((p, i) => card(p, i, p.duration_s === best))}</div>
    <p class="note">${note}</p>`);
}
function card(p, i, best) {
  const sched = p.schedule || { ok: true, warnings: [] };
  const danger = sched.warnings.find(w => w.level === 'danger'), warn = sched.warnings.find(w => w.level === 'warning');
  const arr = html`<span class="rc-arr tnum">${arriveAt(p.duration_s)} 도착</span>`;
  if (p.mode === 'walk') return html`<button type="button" class="route-card" data-sel="${i}"><div class="head"><span class="time tnum">${fmtMin(p.duration_s)}</span>${arr}</div><div class="summary tnum">${fmtDist(p.distance_m)} · 약 ${p.kcal}kcal · ${p.steps[0]?.instruction || ''}</div></button>`;
  if (p.mode === 'taxi') return html`<button type="button" class="route-card" data-sel="${i}"><div class="head"><span class="time tnum">¥${p.fare_low}~${p.fare_high}</span><span class="rc-arr tnum">약 ${fmtMin(p.duration_s)}</span></div><div class="summary tnum">${fmtDist(p.distance_m)}${p.night ? ' · 야간 할증 포함' : ''} · 눌러서 기사 카드·디디 열기</div></button>`;
  const firstRide = p.segments.find(s => s.kind === 'ride'); const fromSt = D.stationById[p.from_station];
  return html`<button type="button" class="route-card ${danger ? 'unavailable' : ''} ${state.sel === i ? 'selected' : ''}" data-sel="${i}">
    <div class="head"><span class="time tnum">${fmtMin(p.duration_s)}</span>${danger ? '' : arr}${best && !danger ? html`<span class="best">가장 빠름</span>` : ''}</div>
    <div class="rc-chain">${lineChain(p)}</div>
    <div class="summary tnum">¥${p.fare_yuan} · ${p.transfers ? `환승 ${p.transfers}번` : '환승 없음'} · 걷기 ${fmtDist(p.walking_distance_m)}</div>
    ${danger ? html`<div class="rc-warn danger">${icon('alert', 'xs')} ${danger.text}</div>`
      : firstRide ? html`<div class="rc-board">${lineChip(firstRide.line, { badge: true })} <b>${fromSt?.ko}역</b> 승차 · ${firstRide.direction || ''} <span class="muted">· ${D.lineById[firstRide.line].headway_min}분 간격</span></div>${warn ? html`<div class="rc-warn warning">${icon('clock', 'xs')} ${warn.text}</div>` : ''}` : ''}
  </button>`;
}

// ── 상세(타임라인) ──
function detail(p) {
  const links = amapRoute(state.to, state.mode === 'taxi' ? 'car' : state.mode === 'walk' ? 'walk' : 'bus', state.from);
  const sched = p.schedule || { warnings: [] };
  const summary = html`<div class="rd-sum" data-peek>
    <div class="rd-top"><span class="time tnum">${p.mode === 'taxi' ? `¥${p.fare_low}~${p.fare_high}` : fmtMin(p.duration_s)}</span><span class="rc-arr tnum">${p.mode === 'taxi' ? `약 ${fmtMin(p.duration_s)}` : `${arriveAt(0)} 출발 → ${arriveAt(p.duration_s)} 도착`}</span></div>
    ${p.mode === 'transit' ? html`<div class="rc-chain">${lineChain(p)}</div><div class="summary tnum">¥${p.fare_yuan} · ${p.stops}역 · 걷기 ${fmtDist(p.walking_distance_m)}</div>` : html`<div class="summary tnum">${fmtDist(p.distance_m)}${p.night ? ' · 야간 할증 포함' : ''}</div>`}
    <div class="rd-actions">
      ${p.mode === 'taxi' ? html`<button type="button" class="btn primary" data-driver>${icon('car')} 기사 카드</button>` : html`<a class="btn primary" href="#/walk?to=${encodeURIComponent(refOf(state.to))}${p.mode === 'transit' ? '&via=' + p.from_station : ''}">${icon('nav')} ${p.mode === 'transit' ? '첫 역까지 안내' : '도보 안내'}</a>`}
      <a class="btn" href="${links.web}" target="_blank" rel="noopener">${icon('external', 'sm')} 고덕 앱</a>
      ${p.mode === 'taxi' ? '' : html`<button type="button" class="btn ghost" data-driver>${icon('car', 'sm')} 중국어</button>`}
    </div>
  </div>`;
  let body;
  if (p.mode === 'walk') body = html`<ol class="timeline"><li class="origin"><span class="dot"></span><div class="title">${state.from.name}</div></li>${p.steps.map(s => html`<li class="walk"><span class="dot"></span><div class="title">${s.instruction}</div><div class="sub tnum">약 ${fmtMin(s.duration_s)}</div></li>`)}<li class="destination"><span class="dot"></span><div class="title">${state.to.name}</div><div class="sub zh">${state.to.name_zh}</div></li></ol>`;
  else if (p.mode === 'taxi') body = html`<ol class="timeline"><li class="origin"><span class="dot"></span><div class="title">${state.from.name}</div></li><li class="ride" style="--line:var(--c-accent)"><span class="dot"></span><div class="title">택시 · 기사에게 중국어 카드를 보여주세요</div><div class="sub">미터기(打表)로 가는지 확인하고, 내릴 때 영수증(发票)을 받아 두세요.</div></li><li class="destination"><span class="dot"></span><div class="title">${state.to.name}</div><div class="sub zh">${state.to.name_zh}${state.to.addr ? ' · ' + state.to.addr : ''}</div></li></ol>`;
  else body = html`${mergeWarnings(sched.warnings).map(w => html`<div class="inline-alert ${w.level}" role="alert">${icon('alert', 'sm')} <span>${w.texts.map((t, i) => html`${i ? raw('<br>') : ''}${t}`)}</span></div>`)}
    <ol class="timeline">
      <li class="origin"><span class="dot"></span><div class="title">${state.from.name}</div></li>
      ${p.segments.map((s, i) => segmentItem(s, i, p))}
      <li class="destination"><span class="dot"></span><div class="title">${state.to.name}</div><div class="sub zh">${state.to.name_zh}</div></li>
    </ol>`;
  return raw(summary + body);
}
function exitHint(p, s, to) {
  const isLast = p.segments.filter(x => x.kind === 'ride').at(-1) === s; if (!isLast) return '';
  const dest = state.to?.ref?.startsWith('place:') ? D.placeById[state.to.ref.slice(6)] : null;
  const ex = dest ? bestExit(dest, to.id) : null; const all = exitsOf(to.id);
  if (ex) return html`<div class="sub"><span class="exit-chip">${exitLabel(ex)}</span> <span class="zh">${ex.landmarks_zh || ex.street_zh || ''}</span></div>`;
  if (all.length) return html`<div class="sub">출구 ${all.length}개 · ${all.map(e => `${e.code}${e.dir_ko ? ' ' + e.dir_ko.replace('쪽', '') : ''}`).join(', ')} <a href="#/station/${to.id}">자세히</a></div>`;
  return '';
}
function segmentItem(s, i, p) {
  if (s.kind === 'walk') { const st = D.stationById[s.to_station || s.from_station]; if (s.distance_m < 30) return ''; return html`<li class="walk"><span class="dot"></span><div class="title tnum">도보 ${fmtDist(s.distance_m)} · 약 ${fmtMin(s.duration_s)}</div><div class="sub">${s.to_station ? `${st?.ko}역까지` : `${st?.ko}역에서 목적지까지`}</div></li>`; }
  if (s.kind === 'transfer') { const st = D.stationById[s.station]; return html`<li class="walk"><span class="dot"></span><div class="title">${st?.ko}역에서 ${D.lineById[s.to_line]?.ko}으로 갈아타기</div><div class="sub tnum">걷기 약 ${Math.round(s.walk_s / 60)}분 + 기다림</div></li>`; }
  if (s.kind === 'ride') {
    const line = D.lineById[s.line]; const from = D.stationById[s.from_station], to = D.stationById[s.to_station];
    return html`<li class="ride" style="--line:${line.color}"><span class="dot"></span>
      <div class="title">${from.ko}역 <span class="zh muted t-sm">${from.zh}</span></div>
      <div class="sub">${lineChip(s.line, { badge: true })} ${s.direction || ''} · <span class="tnum">${line.headway_min}분 간격</span> ${crowdHint(s.line, departAt())}</div>
      <button type="button" class="expand" data-expand="via${i}" aria-expanded="false" aria-controls="via${i}"><span class="tnum">${s.stops}</span>정거장 · 약 ${fmtMin(s.duration_s)} ${icon('down', 'sm')}</button>
      <ol class="vias" id="via${i}" hidden>${s.via.map(id => html`<li>${D.stationById[id]?.ko} <span class="zh">${D.stationById[id]?.zh}</span></li>`)}</ol>
      <div class="title" style="margin-top:8px">${to.ko}역 하차 <span class="zh muted t-sm">${to.zh}</span>${to.transfer ? html` <span class="tag">환승역</span>` : ''}</div>${exitHint(p, s, to)}</li>`;
  }
  return '';
}

// 같은 수준 경고는 상자 하나로 묶는다(빨간 상자가 줄줄이 쌓이지 않게)
function mergeWarnings(ws) {
  const out = [];
  for (const w of ws) { const g = out.find(o => o.level === w.level); if (g) g.texts.push(w.text); else out.push({ level: w.level, texts: [w.text] }); }
  return out;
}
