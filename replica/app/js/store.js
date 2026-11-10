// 사용자 데이터: localStorage["goduk.v2"] 문서 하나. v1 키(goduk.favs, goduk.tileLang) 마이그레이션.
const KEY = 'goduk.v2';
const DEFAULT = () => ({ v: 2, folders: [], favorites: [], frequent: {}, history: [], checks: {}, vault: { notes: [], images: [] }, settings: { tile_lang: 'zh_cn', label_mode: 'both', theme: 'auto', walk_router: 'straight', tile_url: '' } });
let doc = null;
const listeners = new Set();
export const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));

export function get() {
  if (doc) return doc;
  try { const raw = localStorage.getItem(KEY); doc = raw ? { ...DEFAULT(), ...JSON.parse(raw) } : migrateV1(); }
  catch { doc = DEFAULT(); }
  doc.settings = { ...DEFAULT().settings, ...(doc.settings || {}) };
  return doc;
}
function migrateV1() {
  const d = DEFAULT();
  try {
    const favs = JSON.parse(localStorage.getItem('goduk.favs') || '[]');
    for (const id of favs) d.favorites.push({ id: uuid(), place_id: id, folder_id: null, note_ko: '', tags: [], created_at: new Date().toISOString() });
    const tl = JSON.parse(localStorage.getItem('goduk.tileLang') || 'null'); if (tl) d.settings.tile_lang = tl;
  } catch { /* 무시 */ }
  return d;
}
export function save(next = doc) {
  doc = next;
  try { localStorage.setItem(KEY, JSON.stringify(doc)); } catch { /* 사생활 모드 등: 메모리만 */ }
  listeners.forEach(f => f(doc));
  return doc;
}
export function onChange(f) { listeners.add(f); return () => listeners.delete(f); }
if (typeof window !== 'undefined') window.addEventListener('storage', e => { if (e.key === KEY) { doc = null; get(); listeners.forEach(f => f(doc)); } });

// ── 즐겨찾기 ──
export const favorites = () => get().favorites;
export function findFavorite(ref) {
  return get().favorites.find(f => (ref.place_id && f.place_id === ref.place_id) || (ref.station_id && f.station_id === ref.station_id) || (ref.id && f.id === ref.id));
}
export function toggleFavorite(ref, folder_id = null) {
  const d = get(); const cur = findFavorite(ref);
  if (cur) { d.favorites = d.favorites.filter(f => f !== cur); for (const k of Object.keys(d.frequent)) if (d.frequent[k] === cur.id) delete d.frequent[k]; save(d); return { on: false, fav: cur }; }
  const fav = { id: uuid(), folder_id, place_id: ref.place_id || null, station_id: ref.station_id || null, custom_name: ref.custom_name || null, custom_zh: ref.custom_zh || null, lat: ref.lat ?? null, lon: ref.lon ?? null, note_ko: '', tags: [], created_at: new Date().toISOString() };
  d.favorites.push(fav); save(d); return { on: true, fav };
}
export function updateFavorite(id, patch) { const d = get(); const f = d.favorites.find(x => x.id === id); if (f) Object.assign(f, patch); save(d); }
export function removeFavorite(id) { const d = get(); d.favorites = d.favorites.filter(f => f.id !== id); for (const k of Object.keys(d.frequent)) if (d.frequent[k] === id) delete d.frequent[k]; save(d); }
// ── 폴더 ──
export function addFolder(name) { const d = get(); const f = { id: uuid(), name, sort: d.folders.length, created_at: new Date().toISOString() }; d.folders.push(f); save(d); return f; }
export function removeFolder(id) { const d = get(); d.folders = d.folders.filter(f => f.id !== id); d.favorites.forEach(f => { if (f.folder_id === id) f.folder_id = null; }); save(d); }
// ── 자주 가는 곳(호텔·공항·집결지) ──
export function setFrequent(role, favorite_id) { const d = get(); if (favorite_id) d.frequent[role] = favorite_id; else delete d.frequent[role]; save(d); }
export function frequent(role) { const d = get(); return d.favorites.find(f => f.id === d.frequent[role]) || null; }
// ── 최근 검색 ──
export function pushHistory(query, ref = {}) {
  const d = get(); d.history = d.history.filter(h => h.query !== query);
  d.history.unshift({ query, place_id: ref.place_id || null, station_id: ref.station_id || null, searched_at: new Date().toISOString() });
  d.history = d.history.slice(0, 10); save(d);
}
export function clearHistory() { const d = get(); d.history = []; save(d); }
// ── 설정 ──
export const settings = () => get().settings;
export function setSetting(k, v) { const d = get(); d.settings[k] = v; save(d); }
// ── 체크리스트(일정·준비물) ──
export const checked = key => !!get().checks?.[key];
export function setChecked(key, on) { const d = get(); d.checks ||= {}; if (on) d.checks[key] = 1; else delete d.checks[key]; save(d); }
export function uncheckPrefix(prefix) { const d = get(); for (const k of Object.keys(d.checks || {})) if (k.startsWith(prefix)) delete d.checks[k]; save(d); }
// ── 예약·티켓 보관함(이 기기에만) ──
export const vault = () => { const d = get(); d.vault ||= { notes: [], images: [] }; d.vault.notes ||= []; d.vault.images ||= []; return d.vault; };
export function addNote(title, body) { const d = get(); vault().notes.push({ id: uuid(), title, body, updated_at: new Date().toISOString() }); save(d); }
export function updateNote(id, patch) { const d = get(); const n = vault().notes.find(x => x.id === id); if (n) Object.assign(n, patch, { updated_at: new Date().toISOString() }); save(d); }
export function removeNote(id) { const d = get(); d.vault.notes = vault().notes.filter(x => x.id !== id); save(d); }
export function addImage(title, data) { const d = get(); vault().images.push({ id: uuid(), title, data, created_at: new Date().toISOString() }); const ok = trySave(d); if (!ok) { d.vault.images.pop(); throw new Error('quota'); } }
export function removeImage(id) { const d = get(); d.vault.images = vault().images.filter(x => x.id !== id); save(d); }
function trySave(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); doc = d; listeners.forEach(f => f(doc)); return true; } catch { return false; } }
// ── 내보내기/가져오기 ──
export const exportJSON = () => JSON.stringify(get());
export function importJSON(text) { const j = JSON.parse(text); if (j.v !== 2 || !Array.isArray(j.favorites)) throw new Error('형식이 맞지 않아요'); save({ ...DEFAULT(), ...j }); }
