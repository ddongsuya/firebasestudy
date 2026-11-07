// S12 설정 · S17 회화·팁 · 데이터 내보내기
import { D } from '../data.js';
import * as store from '../store.js';
import * as mapx from '../map.js';
import { $, html, icon, toast } from '../ui.js';
import * as driver from './driver.js';
import * as home from './home.js';
import { prefetch, cacheStats } from '../offline.js';

let panel; const state = { view: 'menu' };
export function show(params) { panel = $('#panel'); panel.classList.remove('hidden'); state.view = params.v || 'menu'; render(); }
function render() {
  const s = store.settings();
  const head = (title, back = true) => html`<div class="panel-head">${back ? html`<button type="button" class="btn icon" data-v="menu" aria-label="뒤로">${icon('back')}</button>` : ''}<h1>${title}</h1></div>`;
  let body;
  if (state.view === 'phrases') {
    const cats = [...new Set(D.phrases.map(p => p.cat))];
    body = head('회화') + html`<div class="panel-body flush">${cats.map(c => html`<div class="section" style="padding:0 var(--s-4)">${c}</div><div class="list" style="border-radius:0;box-shadow:none">${D.phrases.filter(p => p.cat === c).map(p => html`<div class="phrase"><div class="grow"><div class="zh">${p.zh}</div><div class="py">${p.py}</div><div class="ko">${p.ko}</div></div><button type="button" class="btn icon" data-phrase="${p.id}" aria-label="크게 보기">${icon('speech')}</button></div>`)}</div>`)}</div>`;
  } else if (state.view === 'tips') {
    body = head('여행 팁') + html`<div class="panel-body stack">${D.tips.map(t => html`<div class="card"><div class="t-md">${t.title}</div><div class="t-sm" style="margin-top:4px">${t.body}</div></div>`)}</div>`;
  } else if (state.view === 'settings') {
    body = head('설정') + html`<div class="panel-body stack">
      <div class="section">지도 라벨</div>
      <div class="radiolist">${[['both', '한국어 이름', '지도 위 핀 라벨은 한국어, 카드에 중국어 함께'], ['zh', '중국어 이름', '현지인에게 보여줄 때'], ['ko', '한국어만']].map(([v, l, d]) => html`<label><input type="radio" name="label_mode" value="${v}" ${s.label_mode === v ? 'checked' : ''}><span class="lbl">${l}${d ? html`<small>${d}</small>` : ''}</span></label>`)}</div>
      <div class="section">지도 글자(타일)</div>
      <div class="radiolist">${[['zh_cn', '중국어', '현지 표기 그대로'], ['en', '영어', '읽기는 쉽지만 작은 길 이름이 비어요']].map(([v, l, d]) => html`<label><input type="radio" name="tile_lang" value="${v}" ${s.tile_lang === v ? 'checked' : ''}><span class="lbl">${l}<small>${d}</small></span></label>`)}</div>
      <div class="section">테마</div>
      <div class="radiolist">${[['auto', '기기 설정 따름'], ['light', '라이트'], ['dark', '다크']].map(([v, l]) => html`<label><input type="radio" name="theme" value="${v}" ${s.theme === v ? 'checked' : ''}><span class="lbl">${l}</span></label>`)}</div>
      <div class="section">도보 경로</div>
      <div class="radiolist">${[['straight', '직선 추정 (기본)', '오프라인에서도 동작. 거리는 1.3배로 보정'], ['osrm', '인터넷 도로 경로 시도', 'OSRM 공개 서버. 중국 내 데이터가 빈약하면 자동으로 직선으로 돌아가요']].map(([v, l, d]) => html`<label><input type="radio" name="walk_router" value="${v}" ${s.walk_router === v ? 'checked' : ''}><span class="lbl">${l}<small>${d}</small></span></label>`)}</div>
      <p class="note">첫차·막차와 택시 야간 할증은 베이징 시각(UTC+8) 기준으로 계산해요.</p>
    </div>`;
  } else if (state.view === 'offline') {
    body = head('오프라인 지도') + html`<div class="panel-body stack">
      <p class="note">지금 지도에 보이는 범위를 줌 13~16까지 미리 내려받아요. 호텔·일정 지역을 화면에 맞춘 뒤 누르세요. 최대 3,000장(약 40MB)씩, 한 번에 한 지역. 와이파이에서 하세요.</p>
      <div class="card"><div class="t-md" id="offStat">저장된 타일 확인 중…</div><div class="muted t-sm">장소·노선 데이터는 설치 때 이미 저장돼요. 타일만 추가로 저장합니다.</div></div>
      <button type="button" class="btn primary lg" id="btnPrefetch">${icon('map')} 지금 보이는 지역 저장</button>
      <div id="offProg" class="note"></div>
      <a class="btn ghost" href="#/">지도로 가서 범위 맞추기</a>
    </div>`;
  } else if (state.view === 'data') {
    body = head('내 데이터') + html`<div class="panel-body stack">
      <p class="note">저장한 곳·호텔·설정을 텍스트로 복사해 두면, 브라우저 데이터가 지워져도 복구할 수 있어요. 카톡 "나와의 채팅"에 붙여넣어 두세요.</p>
      <textarea class="io" id="ioText" aria-label="내 데이터 JSON">${store.exportJSON()}</textarea>
      <div class="inline"><button type="button" class="btn" id="btnCopyData">${icon('copy')} 복사</button><button type="button" class="btn ghost" id="btnImportData">붙여넣은 내용으로 복구</button></div>
    </div>`;
  } else {
    const items = [['offline', 'map', '오프라인 지도 저장', '보이는 지역의 타일을 미리 내려받기'], ['phrases', 'speech', '회화', '택시·식당·결제·긴급 24문장, 크게 보기'], ['tips', 'bulb', '여행 팁', '결제·VPN·예약·여권'], ['settings', 'menu', '설정', '라벨 언어·테마·도보 경로'], ['data', 'copy', '내 데이터', '저장한 곳 내보내기/복구']];
    body = head('더보기', false) + html`<div class="panel-body stack">
      <div class="list">${items.map(([v, ic, t, d]) => html`<button type="button" class="row-place" data-v="${v}"><span class="ico">${icon(ic)}</span><span class="main"><span class="name">${t}</span><span class="sub">${d}</span></span>${icon('chevron', 'sm')}</button>`)}</div>
      <a class="btn ghost" href="./design.html" target="_blank" rel="noopener">디자인 프리미티브 (개발용)</a>
      <p class="note">고덕 KO v2 · 지도 타일 © AutoNavi(개인 용도) · 역·명소 좌표 Wikidata(CC0) · 출구 정보 中文维基百科(CC BY-SA 4.0) · 장소 정보는 참고용이며 방문 전 재확인하세요. 오프라인에서도 검색·길찾기가 되고, 최근 본 지도는 캐시돼요.</p>
    </div>`;
  }
  panel.innerHTML = body;
  panel.addEventListener('click', e => {
    const v = e.target.closest('[data-v]'); if (v) { state.view = v.dataset.v; history.replaceState(null, '', '#/more?v=' + state.view); render(); return; }
    const ph = e.target.closest('[data-phrase]'); if (ph) { const p = D.phrases.find(x => x.id === ph.dataset.phrase); driver.show({ zh: p.zh, addr: '', ko: p.ko, lead: p.py, sub: '' }); }
  });
  panel.addEventListener('change', e => {
    const r = e.target; if (r.type !== 'radio') return;
    store.setSetting(r.name, r.value);
    if (r.name === 'tile_lang') mapx.setTiles(r.value);
    if (r.name === 'theme') document.documentElement.dataset.theme = r.value === 'auto' ? '' : r.value;
    if (r.name === 'label_mode') home.refreshMarkers();
    toast('저장했어요');
  });
  if (state.view === 'offline') {
    cacheStats().then(s => { $('#offStat').textContent = s ? `저장된 타일 ${s.tiles.toLocaleString()}장` : '이 브라우저는 오프라인 캐시를 지원하지 않아요'; });
    $('#btnPrefetch').onclick = async () => {
      const b = $('#btnPrefetch'); b.disabled = true; b.setAttribute('aria-busy', 'true');
      const bb = mapx.map.getBounds(); const bounds = { north: bb.getNorth(), south: bb.getSouth(), east: bb.getEast(), west: bb.getWest() };
      const prog = $('#offProg');
      const r = await prefetch(bounds, { onProgress: (d, t) => { prog.textContent = `내려받는 중 ${d}/${t}`; } });
      prog.textContent = `완료: ${r.done - r.failed}장 저장${r.failed ? `, ${r.failed}장 실패` : ''}${r.total >= 3000 ? ' (범위가 커서 3,000장에서 멈췄어요. 지도를 더 확대해 나눠 저장하세요)' : ''}`;
      b.disabled = false; b.removeAttribute('aria-busy'); cacheStats().then(s => { if (s) $('#offStat').textContent = `저장된 타일 ${s.tiles.toLocaleString()}장`; });
      toast('오프라인 지도를 저장했어요');
    };
  }
  $('#btnCopyData') && ($('#btnCopyData').onclick = async () => { try { await navigator.clipboard.writeText($('#ioText').value); toast('복사했어요'); } catch { $('#ioText').select(); toast('전체 선택했어요. 길게 눌러 복사하세요'); } });
  $('#btnImportData') && ($('#btnImportData').onclick = () => { try { store.importJSON($('#ioText').value); toast('복구했어요'); home.refreshMarkers(); } catch (e) { toast('복구 실패: ' + e.message); } });
}
