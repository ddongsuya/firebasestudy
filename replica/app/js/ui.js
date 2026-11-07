// UI 헬퍼: HTML 템플릿, 토스트, 시트, 아이콘, 공통 조각(노선 칩·체인·타임라인)
import { D, isLightColor } from './data.js';
import { fmtDist, fmtMin } from './geo.js';

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
  speech: '<path d="M4 5h16v11H9l-5 4z"/>', bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5V16h8v-2.5A6 6 0 0 0 12 3z"/>',
};
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
export function openSheet(contentHtml, { onClose } = {}) {
  const sheet = $('#sheet'); $('#sheetBody').innerHTML = contentHtml;
  sheet.classList.add('open'); sheet.dataset.open = '1'; sheet._onClose = onClose;
  $('#sheetBody').scrollTop = 0;
  const h = $('h2', sheet); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  return sheet;
}
export function closeSheet() { const sheet = $('#sheet'); if (!sheet.classList.contains('open')) return; sheet.classList.remove('open'); delete sheet.dataset.open; sheet._onClose?.(); sheet._onClose = null; }
export function sheetOpen() { return $('#sheet').classList.contains('open'); }
