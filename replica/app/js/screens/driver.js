// S16 기사에게 보여주기(전체화면, 항상 흰 배경)
import { $, html, raw } from '../ui.js';
let lastFocus = null;
export function init() { $('#driver').addEventListener('click', e => { if (e.target.closest('.x')) close(); }); }
export function show({ zh, addr = '', ko = '', lead = '请带我去这里 🙏', sub = '(여기로 데려다 주세요)' }) {
  lastFocus = document.activeElement;
  $('#driver').innerHTML = html`<button type="button" class="x">닫기 ✕</button><div class="lead">${lead}<br><small>${sub}</small></div><div class="zh">${zh}</div>${addr ? html`<div class="addr zh">${addr}</div>` : ''}${ko ? html`<div class="ko">${ko}</div>` : ''}`;
  $('#driver').classList.remove('hidden'); $('.x', $('#driver')).focus();
}
export function showList(items, { lead = '我要去这些地方', sub = '(이 장소들에 갈 거예요)' } = {}) {
  lastFocus = document.activeElement;
  $('#driver').innerHTML = html`<button type="button" class="x">닫기 ✕</button><div class="lead">${lead}<br><small>${sub}</small></div>${items.map((it, i) => html`<div class="addr zh" style="margin-top:12px">${i + 1}. ${it.zh}<br><span class="t-md" style="font-weight:500;color:#444">${it.addr || ''}</span></div>`)}`;
  $('#driver').classList.remove('hidden'); $('.x', $('#driver')).focus();
}
export function close() { $('#driver').classList.add('hidden'); lastFocus?.focus?.(); }
