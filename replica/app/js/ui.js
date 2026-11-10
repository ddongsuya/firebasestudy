// UI 헬퍼: HTML 템플릿, 토스트, 시트, 아이콘, 공통 조각(노선 칩·체인·타임라인)
import { D, isLightColor } from './data.js';
import { fmtDist, fmtMin } from './geo.js';
import { sheetCtl } from './sheet.js';

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** 태그드 템플릿: 보간값은 이스케이프, raw()로 감싼 값은 그대로 */
class Raw extends String { get __raw() { return this.valueOf(); } }
export function html(strings, ...vals) {
  return new Raw(strings.reduce((out, s, i) => out + s + (i < vals.length ? toStr(vals[i]) : ''), ''));
}
const toStr = v => v == null ? '' : typeof v === 'boolean' ? String(v) : Array.isArray(v) ? v.map(toStr).join('') : v.__raw != null ? v.__raw : esc(v);
export const raw = s => new Raw(String(s));

// ── 아이콘(자체 SVG, 24 그리드) ──
const PATHS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  locate: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  route: '<path d="M4 19l6-14 4 9 2-4 4 9"/>',
  swap: '<path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/>',
  star: '<path d="M12 3l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.4 6.3 20.5l1.2-6.4L2.8 9.7l6.4-.8z"/>',
  starFill: '<path fill="currentColor" d="M12 3l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.4 6.3 20.5l1.2-6.4L2.8 9.7l6.4-.8z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  car: '<path d="M5 17h14M6 17l1-5h10l1 5M4 12l2-5h12l2 5"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/>',
  walk: '<circle cx="13" cy="4" r="1.5"/><path d="M10 21l2-7 3 2v5M8 13l3-5 3 1 3 3"/>',
  metro: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M8 21l1-4M16 21l-1-4"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  pin: '<path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  lang: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  share: '<path d="M12 3v12M8 7l4-4 4 4M5 13v6h14v-6"/>',
  hotel: '<path d="M3 21V9l9-6 9 6v12M9 21v-6h6v6"/>',
  plane: '<path d="M2 16l20-8-4 12-5-5-6 3z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>', down: '<path d="M6 9l6 6 6-6"/>', check: '<path d="M5 12l5 5 9-10"/>',
  bike: '<circle cx="6" cy="17" r="3.5"/><circle cx="18" cy="17" r="3.5"/><path d="M6 17l4-8h5l3 8M10 9l5 8"/>',
  nav: '<path d="M12 2l7 20-7-5-7 5z"/>', layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>', phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', edit: '<path d="M4 20h4l10-10-4-4L4 16z"/>', folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  speech: '<path d="M4 5h16v11H9l-5 4z"/>',
  landmark: '<path d="M3 21h18M5 21V10M19 21V10M9 21v-6h6v6M2 10l10-6 10 6z"/>',
  tower: '<path d="M6 21V8l2-2V3h2v2h4V3h2v3l2 2v13M10 21v-4a2 2 0 0 1 4 0v4M6 12h12"/>',
  museum: '<path d="M3 21h18M4 9h16M12 3l9 6H3zM6 9v9M10 9v9M14 9v9M18 9v9"/>',
  food: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 0-3 3-3 7h3"/>',
  bag: '<path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
  tree: '<path d="M12 22v-6M12 2l6 9h-3l4 5H5l4-5H6z"/>',
  train: '<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 10h12M9 21l1.5-4M15 21l-1.5-4"/><circle cx="9.5" cy="13.5" r=".8"/><circle cx="14.5" cy="13.5" r=".8"/>',
  bed: '<path d="M3 18V7M3 13h18v5M21 18v-3a3 3 0 0 0-3-3h-8v6"/><circle cx="7" cy="10.5" r="1.5"/>',
  cross: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  alert: '<path d="M12 3l10 18H2zM12 10v4M12 17.5v.5"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 0 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6H3z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
  check2: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/>', bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5V16h8v-2.5A6 6 0 0 0 12 3z"/>',
};
export const CAT_ICON = { sight: 'landmark', wall: 'tower', museum: 'museum', food: 'food', shop: 'bag', park: 'tree', transit: 'train', hotel: 'bed', help: 'cross', station: 'metro', all: 'grid', nearby: 'pin' };
export const catIcon = (cat, cls = '') => icon(CAT_ICON[cat] || 'pin', cls);
export const iconSvg = (name) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name] || ''}</svg>`;
export const icon = (name, cls = '') => raw(`<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name] || ''}</svg>`);

// ── 토스트 ──
let toastT = null;
export function toast(msg, { action, onAction, ms = 2400 } = {}) {
  const el = $('#toast'); if (!el) return;
  el.innerHTML = html`${msg}${action ? html`<button type="button">${action}</button>` : ''}`;
  if (action) $('button', el).onclick = () => { onAction?.(); el.classList.remove('show'); };
  el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms);
}

// ── 노선 칩·배지·체인 ──
export function lineChip(lineId, { badge = false } = {}) {
  const l = D.lineById[lineId]; if (!l) return '';
  const light = isLightColor(l.color);
  return raw(`<span class="${badge ? 'badge-line' : 'chip line'}${light ? ' light' : ''}" style="background:${l.color}">${esc(l.ko)}</span>`);
}
export function lineChain(plan) {
  const items = [];
  for (const s of plan.segments) {
    if (s.kind === 'walk' && s.distance_m >= 60) items.push(raw(`<li><span class="chip walk">${icon('walk', 'sm').__raw} ${Math.max(1, Math.round(s.duration_s / 60))}분</span></li>`));
    if (s.kind === 'ride') items.push(raw(`<li>${lineChip(s.line).__raw}</li>`));
    if (s.kind === 'taxi') items.push(raw(`<li><span class="chip taxi">${icon('car', 'sm').__raw} 택시 ¥${s.fare_low}</span></li>`));
  }
  const sr = plan.segments.map(s => s.kind === 'walk' ? `도보 ${fmtMin(s.duration_s)}` : s.kind === 'ride' ? D.lineById[s.line]?.ko : s.kind === 'transfer' ? '환승' : '').filter(Boolean).join(', ');
  return raw(`<ul class="linechain" aria-label="${esc(sr)}">${items.map(x => x.__raw).join('<li class="arrow" aria-hidden="true"></li>')}</ul>`);
}
export function crowdHint(lineId, at = new Date()) {
  const h = +new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', hour12: false }).format(at);
  const rush = (h >= 7 && h < 10) || (h >= 17 && h < 20);
  const n = rush ? 4 : 2;
  return raw(`<span class="crowd${rush ? ' high' : ''}" title="출퇴근 시간 기준 일반적 혼잡도">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')} ${rush ? '혼잡' : '보통'}</span>`);
}
export { fmtDist, fmtMin };

// ── 시트 ──
// ── 공용 바텀시트(드래그 3단) ──
let ctl = null; const sheetListeners = new Set();
export const onSheetChange = f => { sheetListeners.add(f); return () => sheetListeners.delete(f); };
/** keep: 같은 화면 재렌더 시 현재 높이 유지. initial: peek|half|full. topReserve: 위쪽에 남길 px(검색창·경로 입력) */
export function openSheet(contentHtml, { onClose, initial = 'half', keep = false, topReserve, dismissible = true, focus = true } = {}) {
  const sheet = $('#sheet'), body = $('#sheetBody');
  const wasOpen = sheet.classList.contains('open');
  if (wasOpen && !keep) { const prev = sheet._onClose; sheet._onClose = null; prev?.(); }
  body.innerHTML = contentHtml; body.scrollTop = 0;
  sheet._onClose = onClose;
  sheet.classList.add('open'); sheet.dataset.open = '1';
  const reserve = topReserve || defaultReserve;
  sheet._reserve = reserve; sheet._dismissible = dismissible;
  if (!ctl) ctl = sheetCtl(sheet, { body, initial, topReserve: () => sheet._reserve(), onDismiss: () => { if (!sheet._dismissible) { ctl.snapTo('peek'); return; } if (/^#\/(place|station|search|pick)/.test(location.hash)) location.hash = '#/'; else closeSheet(); }, onChange: (snap, px) => sheetListeners.forEach(f => f(snap, px)) });
  ctl.snapTo(keep && wasOpen ? ctl.snap : initial, wasOpen);
  if (focus) { const h = $('h2', sheet); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }
  return sheet;
}
function defaultReserve() {
  const head = document.querySelector('#panel:not(.hidden) .panel-head');
  if (head) return head.getBoundingClientRect().bottom + 4;
  const sb = document.getElementById('searchbar'); return sb && sb.offsetParent ? sb.getBoundingClientRect().bottom + 8 : 16;
}
export function sheetSnap(name) { ctl?.snapTo(name); }
export function sheetRefresh() { ctl?.refresh(true); }
export function closeSheet() {
  const sheet = $('#sheet'); if (!sheet.classList.contains('open')) return;
  sheet.classList.remove('open'); delete sheet.dataset.open; sheet.style.transform = ''; sheet.classList.remove('dragging');
  sheetListeners.forEach(f => f('closed', 0));
  const cb = sheet._onClose; sheet._onClose = null; cb?.();
}
/** 액션 시트: items [{label, icon, danger, onSelect, sub}] */
export function actionSheet(title, items, { subtitle = '' } = {}) {
  openSheet(html`<div class="sheet-head"><h2>${title}${subtitle ? html`<br><span class="muted t-sm">${subtitle}</span>` : ''}</h2><button type="button" class="btn icon" id="asClose" aria-label="닫기">${icon('x')}</button></div>
    <div class="list" style="margin-top:var(--s-2)">${items.map((it, i) => html`<button type="button" class="row-place" data-as="${i}" style="${it.danger ? 'color:var(--c-danger)' : ''}"><span class="ico">${icon(it.icon || 'chevron')}</span><span class="main"><span class="name">${it.label}</span>${it.sub ? html`<span class="sub">${it.sub}</span>` : ''}</span></button>`)}</div>`);
  $('#asClose').onclick = closeSheet;
  $('#sheetBody').onclick = e => { const b = e.target.closest('[data-as]'); if (!b) return; closeSheet(); items[+b.dataset.as].onSelect?.(); };
}
/** 한 줄 입력 시트 */
export function promptSheet(title, { value = '', placeholder = '', onSubmit, submitLabel = '저장' } = {}) {
  openSheet(html`<div class="sheet-head"><h2>${title}</h2><button type="button" class="btn icon" id="asClose" aria-label="닫기">${icon('x')}</button></div>
    <div class="searchbar" style="margin:var(--s-2) 0"><input id="psInput" type="text" value="${value}" placeholder="${placeholder}" aria-label="${title}" autocomplete="off"></div>
    <button type="button" class="btn primary wide lg" id="psOk">${submitLabel}</button>`);
  const inp = $('#psInput'); setTimeout(() => inp.focus(), 50);
  $('#asClose').onclick = closeSheet;
  const ok = () => { const v = inp.value; closeSheet(); onSubmit?.(v); };
  $('#psOk').onclick = ok; inp.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
}
export function sheetOpen() { return $('#sheet').classList.contains('open'); }
