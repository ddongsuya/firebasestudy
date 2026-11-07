/* 고덕지도 한국어판 — 메인 앱 로직 */
(function () {
  'use strict';

  const D = window.GODUK_DATA;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const CAT_ICON = Object.fromEntries(D.categories.map(c => [c.id, c.icon]));

  // ───────── 상태 ─────────
  const state = {
    cat: 'all',
    query: '',
    tileLang: load('tileLang', 'zh_cn'),   // zh_cn | en
    favs: new Set(load('favs', [])),
    current: null,
    meMarker: null,
    meCircle: null,
  };
  function load(k, def) { try { const v = localStorage.getItem('goduk.' + k); return v ? JSON.parse(v) : def; } catch { return def; } }
  function save(k, v) { try { localStorage.setItem('goduk.' + k, JSON.stringify(v)); } catch { /* 사생활 모드 등 */ } }

  // ───────── 지도 ─────────
  const map = L.map('map', { zoomControl: false, attributionControl: true, maxZoom: 18, minZoom: 9 })
    .setView(GCJ02.wgs2gcj(39.9163, 116.3908), 13);
  map.attributionControl.setPrefix('').addAttribution('© 高德地图 AutoNavi · 한국어 라벨: 고덕지도 한국어판');

  let tileLayer = null;
  function setTiles(lang) {
    if (tileLayer) map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(
      `https://webrd0{s}.is.autonavi.com/appmaptile?lang=${lang}&size=1&scale=1&style=8&x={x}&y={y}&z={z}`,
      { subdomains: ['1', '2', '3', '4'], maxZoom: 18 }
    ).addTo(map);
    // 타일 로드 실패 시 안내 (중국 외 네트워크 차단 등)
    let failed = 0;
    tileLayer.on('tileerror', () => { if (++failed === 6) toast('지도 타일을 불러오지 못했습니다. 네트워크를 확인하세요.'); });
    state.tileLang = lang; save('tileLang', lang);
    $('#btnLang').textContent = lang === 'zh_cn' ? '中' : 'EN';
  }
  setTiles(state.tileLang);

  const markers = {};
  const markerGroup = L.layerGroup().addTo(map);
  function pinIcon(p) {
    const cls = ['pin', p.cat, state.favs.has(p.id) ? 'fav' : ''].join(' ');
    return L.divIcon({ className: '', html: `<div class="${cls}"><span>${CAT_ICON[p.cat] || '📍'}</span></div>`, iconSize: [30, 30], iconAnchor: [15, 30], tooltipAnchor: [0, -28] });
  }
  function renderMarkers() {
    markerGroup.clearLayers();
    visiblePlaces().forEach(p => {
      const m = L.marker(GCJ02.wgs2gcj(p.lat, p.lon), { icon: pinIcon(p) })
        .bindTooltip(p.ko, { permanent: true, direction: 'top', className: 'ko-label', opacity: 1 })
        .on('click', () => openPlace(p.id, false));
      markers[p.id] = m; markerGroup.addLayer(m);
    });
    updateLabelVisibility();
  }
  function updateLabelVisibility() {
    const z = map.getZoom();
    document.body.classList.toggle('labels-off', z < 14);
    $$('.ko-label').forEach(el => { el.style.display = z < 14 ? 'none' : ''; });
  }
  map.on('zoomend', updateLabelVisibility);

  // ───────── 필터/검색 ─────────
  function norm(s) { return (s || '').toLowerCase().replace(/\s+/g, ''); }
  function visiblePlaces() {
    const q = norm(state.query);
    return D.places.filter(p =>
      (state.cat === 'all' || p.cat === state.cat) &&
      (!q || norm(p.ko).includes(q) || norm(p.zh).includes(q) || norm(p.py).includes(q) || norm(p.addr).includes(q))
    );
  }
  function renderChips() {
    $('#chips').innerHTML = D.categories.map(c =>
      `<button class="chip ${state.cat === c.id ? 'on' : ''}" data-cat="${c.id}">${c.icon} ${c.label}</button>`).join('');
  }
  $('#chips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.cat = b.dataset.cat; renderChips(); renderMarkers(); renderResults();
    const pts = visiblePlaces().map(p => GCJ02.wgs2gcj(p.lat, p.lon));
    if (state.cat !== 'all' && pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.15), { maxZoom: 14 });
  });

  const inp = $('#q');
  inp.addEventListener('input', () => { state.query = inp.value.trim(); renderResults(); renderMarkers(); });
  inp.addEventListener('focus', renderResults);
  $('#btnClear').addEventListener('click', () => { inp.value = ''; state.query = ''; renderResults(); renderMarkers(); inp.blur(); });
  function renderResults() {
    const box = $('#results');
    const q = state.query;
    if (!q && document.activeElement !== inp) { box.classList.add('hidden'); return; }
    const list = visiblePlaces().slice(0, 12);
    box.innerHTML = list.length ? list.map(p =>
      `<button class="result" data-id="${p.id}"><span class="ico">${CAT_ICON[p.cat]}</span>
        <span><div class="ko">${p.ko}</div><div class="zh">${p.zh} · ${p.metro.split('·')[0].trim()}</div></span></button>`).join('')
      : `<div class="result"><span class="zh">검색 결과 없음. 한글·중국어·병음으로 입력해 보세요.</span></div>`;
    box.classList.remove('hidden');
  }
  $('#results').addEventListener('click', e => {
    const b = e.target.closest('.result'); if (!b || !b.dataset.id) return;
    $('#results').classList.add('hidden'); inp.blur();
    openPlace(b.dataset.id, true);
  });
  map.on('click', () => { $('#results').classList.add('hidden'); closeSheet(); });

  // ───────── 장소 상세 시트 ─────────
  function amapLinks(p) {
    const [glat, glon] = GCJ02.wgs2gcj(p.lat, p.lon);
    const name = encodeURIComponent(p.zh);
    return {
      nav: `https://uri.amap.com/navigation?to=${glon.toFixed(6)},${glat.toFixed(6)},${name}&mode=car&policy=1&src=goduk-ko&coordinate=gaode&callnative=1`,
      marker: `https://uri.amap.com/marker?position=${glon.toFixed(6)},${glat.toFixed(6)}&name=${name}&src=goduk-ko&coordinate=gaode&callnative=1`,
      apple: `https://maps.apple.com/?q=${name}&ll=${glat.toFixed(6)},${glon.toFixed(6)}`,
    };
  }
  function openPlace(id, fly) {
    const p = D.places.find(x => x.id === id); if (!p) return;
    state.current = p;
    const links = amapLinks(p);
    const fav = state.favs.has(p.id);
    $('#sheetBody').innerHTML = `
      <button class="iconbtn close" id="sheetClose" aria-label="닫기">✕</button>
      <button class="iconbtn favbtn ${fav ? 'on' : ''}" id="sheetFav" aria-label="내 일정에 저장">${fav ? '♥' : '♡'}</button>
      <div style="font-size:13px;color:var(--muted)">${CAT_ICON[p.cat]} ${D.categories.find(c => c.id === p.cat).label}</div>
      <h2>${p.ko}</h2>
      <div class="zh-big">${p.zh}</div>
      <div class="py">${p.py}</div>
      <div class="actions">
        <button class="btn primary" id="btnDriver">🚕 기사에게 보여주기 (중국어 큰 글씨)</button>
        <a class="btn" href="${links.nav}" target="_blank" rel="noopener">🧭 고덕지도로 길찾기</a>
        <a class="btn" href="${links.apple}" target="_blank" rel="noopener">🍎 애플지도로 열기</a>
        <button class="btn ghost" id="btnCopyZh">📋 중국어 이름 복사</button>
        <button class="btn ghost" id="btnCopyAddr">📋 주소 복사</button>
      </div>
      <div class="row"><div class="k">주소</div><div class="v">${p.addr}</div></div>
      <div class="row"><div class="k">지하철</div><div class="v">🚇 ${p.metro}</div></div>
      <div class="row"><div class="k">팁</div><div class="v">${p.tip}</div></div>
      <div class="row"><div class="k">좌표</div><div class="v" style="color:var(--muted);font-size:12px">WGS84 ${p.lat}, ${p.lon} (근사치 · 디디/고덕 입력 시엔 중국어 이름을 쓰세요)</div></div>`;
    $('#sheet').classList.add('open');
    closePanels();
    $('#sheetClose').onclick = closeSheet;
    $('#sheetFav').onclick = () => toggleFav(p.id);
    $('#btnDriver').onclick = () => showDriver(p.zh, p.addr, p.ko);
    $('#btnCopyZh').onclick = () => copy(p.zh);
    $('#btnCopyAddr').onclick = () => copy(p.addr);
    if (fly) {
      const target = GCJ02.wgs2gcj(p.lat, p.lon);
      map.flyTo(target, Math.max(map.getZoom(), 15), { duration: .8 });
    }
    if (markers[p.id]) markers[p.id].setZIndexOffset(1000);
  }
  function closeSheet() { $('#sheet').classList.remove('open'); state.current = null; }

  function toggleFav(id) {
    if (state.favs.has(id)) { state.favs.delete(id); toast('내 일정에서 뺐어요'); }
    else { state.favs.add(id); toast('내 일정에 저장했어요 ♥'); }
    save('favs', Array.from(state.favs));
    if (state.current && state.current.id === id) {
      const b = $('#sheetFav'); b.classList.toggle('on', state.favs.has(id)); b.textContent = state.favs.has(id) ? '♥' : '♡';
    }
    updateFavBadge(); renderMarkers();
    if (!$('#panelFav').classList.contains('hidden')) renderFavPanel();
  }
  function updateFavBadge() {
    const n = state.favs.size; const b = $('#favBadge');
    b.textContent = n; b.classList.toggle('hidden', n === 0);
  }

  // ───────── 기사에게 보여주기 ─────────
  function showDriver(zh, addr, ko) {
    const el = $('#driver');
    $('#driverZh', el).textContent = zh;
    $('#driverAddr', el).textContent = addr || '';
    $('#driverKo', el).textContent = ko ? `(${ko})` : '';
    el.classList.remove('hidden');
    try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(() => {}); } catch { /* 무시 */ }
  }
  $('#driverClose').addEventListener('click', () => $('#driver').classList.add('hidden'));

  // ───────── 공용 ─────────
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('복사했어요: ' + text); }
    catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('복사했어요'); } catch { toast('복사 실패. 길게 눌러 복사하세요.'); }
      ta.remove();
    }
  }

  // ───────── 플로팅 버튼 ─────────
  $('#btnLocate').addEventListener('click', () => {
    if (!navigator.geolocation) { toast('이 브라우저는 위치를 지원하지 않아요'); return; }
    toast('현재 위치 찾는 중…');
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude, accuracy } = pos.coords;
      const g = GCJ02.wgs2gcj(latitude, longitude);   // GPS → 고덕 좌표계 보정
      if (!state.meMarker) {
        state.meMarker = L.marker(g, { icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), zIndexOffset: 2000 }).addTo(map);
        state.meCircle = L.circle(g, { radius: accuracy, color: '#0a84ff', weight: 1, fillOpacity: .08 }).addTo(map);
      } else { state.meMarker.setLatLng(g); state.meCircle.setLatLng(g).setRadius(accuracy); }
      map.flyTo(g, Math.max(map.getZoom(), 15));
      // 베이징 밖이면 안내
      if (Math.abs(latitude - 39.9) > 1.5 || Math.abs(longitude - 116.4) > 1.5) toast('지금은 베이징 밖에 계시네요. 지도는 베이징 기준입니다.');
    }, err => {
      toast(err.code === 1 ? '위치 권한을 허용해 주세요 (설정 > 브라우저 > 위치)' : '위치를 가져오지 못했어요');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 });
  });
  $('#btnLang').addEventListener('click', () => {
    setTiles(state.tileLang === 'zh_cn' ? 'en' : 'zh_cn');
    toast(state.tileLang === 'en' ? '지도 글자: 영어' : '지도 글자: 중국어');
  });
  $('#btnHome').addEventListener('click', () => map.flyTo(GCJ02.wgs2gcj(39.9163, 116.3908), 13));
  $('#btnZoomIn').addEventListener('click', () => map.zoomIn());
  $('#btnZoomOut').addEventListener('click', () => map.zoomOut());

  // ───────── 탭 / 패널 ─────────
  const PANELS = { map: null, list: '#panelList', fav: '#panelFav', phrase: '#panelPhrase', tips: '#panelTips' };
  function closePanels() { Object.values(PANELS).forEach(s => s && $(s).classList.add('hidden')); $$('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === 'map')); }
  $('#tabbar').addEventListener('click', e => {
    const t = e.target.closest('.tab'); if (!t) return;
    const tab = t.dataset.tab;
    closePanels(); closeSheet(); $('#results').classList.add('hidden');
    $$('.tab').forEach(x => x.classList.toggle('on', x.dataset.tab === tab));
    if (tab === 'list') renderListPanel();
    if (tab === 'fav') renderFavPanel();
    if (tab === 'phrase') renderPhrasePanel();
    if (tab === 'tips') renderTipsPanel();
    if (PANELS[tab]) $(PANELS[tab]).classList.remove('hidden');
  });

  function placeItem(p, extra = '') {
    return `<button class="card list-item" data-id="${p.id}" style="width:100%;text-align:left">
      <span class="ico">${CAT_ICON[p.cat]}</span>
      <span class="main"><div class="ko">${p.ko}</div><div class="zh">${p.zh}</div><div class="metro">🚇 ${p.metro}</div></span>
      <span class="go">${extra || '지도 ›'}</span></button>`;
  }
  function bindPlaceClicks(root) {
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-id]'); if (!b) return;
      openPlace(b.dataset.id, true);
    });
  }
  function renderListPanel() {
    const el = $('#panelList');
    el.innerHTML = `<h1>📍 장소 목록</h1><div class="sub">터치하면 지도에서 보여 드려요. 총 ${D.places.length}곳</div>` +
      D.categories.filter(c => c.id !== 'all').map(c => {
        const ps = D.places.filter(p => p.cat === c.id);
        return `<div class="section">${c.icon} ${c.label} (${ps.length})</div>` + ps.map(p => placeItem(p)).join('');
      }).join('');
  }
  function renderFavPanel() {
    const el = $('#panelFav');
    const ps = D.places.filter(p => state.favs.has(p.id));
    el.innerHTML = `<h1>♥ 내 일정</h1><div class="sub">장소 카드의 ♡를 누르면 여기에 모여요. 이 기기에만 저장됩니다.</div>` +
      (ps.length ? ps.map(p => placeItem(p, '지도 ›')).join('') +
        `<div class="card"><div class="t">🚕 전부 중국어로 보기</div><div class="d" style="font-size:18px;font-weight:800;line-height:1.8">${ps.map(p => `• ${p.zh}`).join('<br>')}</div></div>`
        : `<div class="empty">아직 저장한 장소가 없어요.<br>지도에서 장소를 고른 뒤 ♡를 눌러 보세요.</div>`);
  }
  function renderPhrasePanel() {
    const el = $('#panelPhrase');
    const cats = [...new Set(D.phrases.map(p => p.cat))];
    el.innerHTML = `<h1>🗣️ 여행 회화</h1><div class="sub">👁 버튼을 누르면 상대에게 보여줄 큰 글씨로 바뀝니다.</div>` +
      cats.map(c => `<div class="section">${c}</div>` + D.phrases.filter(p => p.cat === c).map((p, i) =>
        `<div class="card phrase"><div><div class="zh">${p.zh}</div><div class="py">${p.py}</div><div class="ko">${p.ko}</div></div>
         <button class="show" data-zh="${p.zh}" data-ko="${p.ko}" aria-label="크게 보기">👁</button></div>`).join('')).join('');
  }
  $('#panelPhrase').addEventListener('click', e => {
    const b = e.target.closest('.show'); if (!b) return; showDriver(b.dataset.zh, '', b.dataset.ko);
  });
  function renderTipsPanel() {
    $('#panelTips').innerHTML = `<h1>💡 베이징 여행 팁</h1><div class="sub">출국 전에 한 번 읽어 두면 좋아요.</div>` +
      D.tips.map(t => `<div class="card"><div class="t">${t.t}</div><div class="d">${t.d}</div></div>`).join('') +
      `<div class="card"><div class="t">ℹ️ 데이터 안내</div><div class="d">장소 좌표·주소·운영 정보는 참고용 근사치입니다. 예약·휴관일·요금은 방문 전 고덕지도(高德地图) 또는 Trip.com에서 한 번 더 확인하세요.</div></div>`;
  }
  bindPlaceClicks($('#panelList')); bindPlaceClicks($('#panelFav'));

  // ───────── 시작 ─────────
  renderChips(); renderMarkers(); updateFavBadge();

  // 첫 방문 안내
  if (!load('seen', false)) { save('seen', true); setTimeout(() => toast('장소 핀을 눌러 보세요 👆'), 800); }

  // PWA 서비스워커
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
})();
