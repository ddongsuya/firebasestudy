// 드래그 바텀시트: peek(머리만) · half(절반) · full(거의 전체) 3단 스냅.
// transform만 움직인다(레이아웃 재계산 없음). 데스크톱(≥720px)에서는 좌측 패널로 고정되고 드래그가 꺼진다.
//
// 사용: const ctl = sheetCtl(el, { body, initial: 'half', topReserve: () => 64, onChange: (snap, visiblePx) => {} })
//       ctl.snapTo('full') / ctl.snap / ctl.visible() / ctl.refresh()

const DESKTOP = window.matchMedia('(min-width: 720px)');
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

export function sheetCtl(el, { body, initial = 'half', topReserve = () => 0, bottomReserve = () => tabbarH(), onChange, onDismiss, peekMin = 120 } = {}) {
  let snap = initial, fullH = 0, ty = 0, drag = null, suppressClick = false;

  const heights = () => {
    const avail = Math.max(240, window.innerHeight - bottomReserve() - topReserve() - 8);
    const peekEl = body.querySelector('[data-peek]');
    let peek = peekMin;
    if (peekEl) { const r = peekEl.getBoundingClientRect(), s = el.getBoundingClientRect(); peek = Math.round(r.bottom - s.top + 12); }
    peek = Math.min(Math.max(peek, peekMin), Math.round(avail * 0.6));
    return { peek, half: Math.max(peek + 40, Math.round(avail * 0.52)), full: avail };
  };

  function layout(animate = true) {
    if (DESKTOP.matches) { el.style.removeProperty('height'); el.style.removeProperty('transform'); el.dataset.snap = 'full'; onChange?.('full', el.offsetHeight); return; }
    const h = heights(); fullH = h.full;
    el.style.height = fullH + 'px';
    const target = h[snap] ?? h.half;
    setTy(fullH - target, animate);
    el.dataset.snap = snap;
    body.style.overflowY = snap === 'full' ? 'auto' : 'hidden';
    onChange?.(snap, target);
  }
  function setTy(v, animate) {
    ty = v;
    el.classList.toggle('dragging', !animate || REDUCED.matches);
    el.style.transform = `translate3d(0, ${Math.round(v)}px, 0)`;
  }

  // ── 제스처: 머리(그립·헤더)는 항상 시트를 끈다. 본문은 full이 아니거나 맨 위에서 아래로 끌 때만 시트를 끈다.
  function start(y, target) {
    if (DESKTOP.matches) return;
    const inBody = body.contains(target) && !target.closest('[data-drag]');
    drag = { y0: y, t0: ty, last: [{ y, t: performance.now() }], inBody, mode: null };
  }
  function move(y, e) {
    if (!drag) return;
    const dy = y - drag.y0;
    if (!drag.mode) {
      if (Math.abs(dy) < 6) return;
      if (!drag.inBody) drag.mode = 'sheet';
      else if (snap !== 'full') drag.mode = 'sheet';
      else drag.mode = (body.scrollTop <= 0 && dy > 0) ? 'sheet' : 'scroll';
    }
    if (drag.mode !== 'sheet') return;
    e?.cancelable && e.preventDefault();
    let next = drag.t0 + dy;
    const h = heights(); const maxTy = fullH - Math.min(h.peek, 80);
    if (next < 0) next = next / 3;                 // 위로 고무줄
    if (next > maxTy) next = maxTy + (next - maxTy) / 3;
    setTy(next, false);
    drag.last.push({ y, t: performance.now() }); if (drag.last.length > 5) drag.last.shift();
  }
  function end() {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.mode !== 'sheet') return;
    suppressClick = true; setTimeout(() => { suppressClick = false; }, 60);
    const a = d.last[0], b = d.last[d.last.length - 1];
    const v = (b.y - a.y) / Math.max(1, b.t - a.t);          // px/ms, +는 아래로
    const h = heights();
    const visible = fullH - ty;
    if (onDismiss && snap === 'peek' && (v > 0.6 || visible < h.peek - 50)) { onDismiss(); return; }
    const projected = visible - v * 180;
    const order = ['peek', 'half', 'full'];
    let best = 'half', bd = Infinity;
    for (const k of order) { const dd = Math.abs(h[k] - projected); if (dd < bd) { bd = dd; best = k; } }
    // 빠른 플릭은 한 단계 이동
    if (Math.abs(v) > 0.5) { const i = order.indexOf(snap); best = order[Math.max(0, Math.min(2, i + (v < 0 ? 1 : -1)))]; }
    snapTo(best);
  }
  const ts = e => start(e.touches[0].clientY, e.target);
  const tm = e => move(e.touches[0].clientY, e);
  // 캡처는 끌기가 실제로 시작될 때만(시트 전체에 바로 걸면 그립의 click이 사라진다)
  const pd = e => { const h = e.pointerType === 'mouse' && e.target.closest('.grip,[data-drag]'); if (!h) return; start(e.clientY, e.target); drag.cap = { h, id: e.pointerId }; };
  const pm = e => { if (e.pointerType !== 'mouse' || !drag) return; move(e.clientY, e); if (drag?.mode === 'sheet' && drag.cap && !drag.cap.on) { drag.cap.on = true; drag.cap.h.setPointerCapture?.(drag.cap.id); } };
  const pu = e => { if (e.pointerType === 'mouse') end(); };
  const clickGuard = e => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } };
  el.addEventListener('touchstart', ts, { passive: true });
  el.addEventListener('touchmove', tm, { passive: false });
  el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
  el.addEventListener('pointerdown', pd); el.addEventListener('pointermove', pm); el.addEventListener('pointerup', pu);
  el.addEventListener('click', clickGuard, true);
  // 그립을 탭하면 다음 단계로(키보드: Enter/Space)
  const grip = el.querySelector('.grip');
  const cycle = () => snapTo(snap === 'full' ? 'half' : snap === 'half' ? 'full' : 'half');
  grip?.addEventListener('click', cycle);
  grip?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycle(); } if (e.key === 'ArrowUp') snapTo(snap === 'peek' ? 'half' : 'full'); if (e.key === 'ArrowDown') snapTo(snap === 'full' ? 'half' : 'peek'); });
  const onResize = () => layout(false);
  window.addEventListener('resize', onResize); DESKTOP.addEventListener?.('change', onResize);

  function snapTo(name, animate = true) { snap = name; layout(animate); grip?.setAttribute('aria-label', name === 'full' ? '시트 줄이기' : '시트 펼치기'); }
  layout(false);
  return {
    get snap() { return snap; },
    snapTo, refresh: (animate = false) => layout(animate),
    visible: () => DESKTOP.matches ? 0 : fullH - ty,
    destroy() {
      el.removeEventListener('touchstart', ts); el.removeEventListener('touchmove', tm); el.removeEventListener('touchend', end); el.removeEventListener('touchcancel', end);
      el.removeEventListener('pointerdown', pd); el.removeEventListener('pointermove', pm); el.removeEventListener('pointerup', pu); el.removeEventListener('click', clickGuard, true);
      grip?.removeEventListener('click', cycle); window.removeEventListener('resize', onResize); DESKTOP.removeEventListener?.('change', onResize);
    },
  };
}
export function tabbarH() { const t = document.getElementById('tabbar'); return t && getComputedStyle(t).display !== 'none' ? t.offsetHeight : 0; }
export const isDesktop = () => DESKTOP.matches;
