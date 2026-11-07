// 중국어 위키백과 역 문서(raw wikitext) → data/exits.json (출구 번호·방향·안내), data/src/station-times.json (첫차·막차, 있을 때만)
// 실행: node replica/app/tools/parse-zhwiki.mjs <raw 디렉터리> . 원문 저작권: CC BY-SA (zh.wikipedia.org), 사실 정보만 추출.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'data');
const RAW = process.argv[2]; if (!RAW || !existsSync(RAW)) { console.error('raw 디렉터리 필요'); process.exit(1); }
const stations = JSON.parse(readFileSync(join(OUT, 'stations.json'), 'utf8'));
const byWd = Object.fromEntries(stations.map(s => [s.wd, s]));

const clean = s => (s || '')
  .replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>.*?<\/ref>/gs, '')
  .replace(/\[\[File:[^\]]*\]\]/g, '').replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
  .replace(/\{\{(?:Rail color box|rcb)\|[^}]*\}\}/g, '').replace(/\{\{[^{}]*\}\}/g, '')
  .replace(/<br\s*\/?>/gi, '、').replace(/<[^>]+>/g, '').replace(/'''?/g, '').replace(/\s*、\s*/g, '、').replace(/^、|、$/g, '').replace(/\s+/g, ' ').trim();
const DIR = { 东: '동', 東: '동', 西: '서', 南: '남', 北: '북' };
const dirKo = zh => { const m = (zh || '').match(/^([东西南北東]{1,2})(?:口|侧|出口)?/); if (!m) return null; return m[1].split('').map(c => DIR[c]).join('') + '쪽'; };

const exits = [], times = []; let pagesWithExits = 0, pagesWithTimes = 0;
for (const f of readdirSync(RAW)) {
  if (!f.endsWith('.txt')) continue;
  const wd = f.replace('.txt', ''); const st = byWd[wd]; if (!st) continue;
  const text = readFileSync(join(RAW, f), 'utf8');
  // 출구: "| {{港鐵出口|A}}<br>东北口" 로 시작하는 행 + 이어지는 셀들
  const rows = text.split(/\n\|-/);
  let found = 0; const seen = new Set();
  for (const row of rows) {
    const m = row.match(/\{\{港鐵出口\|([A-Z])(?:\|(\d))?[^}]*\}\}(?:<br\s*\/?>\s*([^\n|]*))?/);
    if (!m) continue;
    const code = m[1] + (m[2] || ''); if (seen.has(code)) continue; seen.add(code);
    const cells = row.split('\n').filter(l => l.startsWith('|') && !l.startsWith('|-') && !l.startsWith('|}')).map(l => l.replace(/^\|\s*(?:rowspan="\d+"\s*\|\s*|colspan="\d+"[^|]*\|\s*)?/, ''));
    const rawDir = clean(m[3] || ''); const dir = /^[东西南北東]/.test(rawDir) ? rawDir : ''; const note = rawDir && !dir ? rawDir.replace(/[（）()]/g, '') : null;
    const street = clean(cells[1] || ''), landmarks = clean(cells[2] || '');
    if (/File:/.test(cells[1] || '') && !street) continue;
    exits.push({ station: st.id, code, dir_zh: dir || null, dir_ko: dirKo(dir), note_zh: note, street_zh: street || null, landmarks_zh: landmarks && !/^\[\[File/.test(landmarks) ? landmarks : null, accessible: /附=輪|轮椅|无障碍/.test(row) });
    found++;
  }
  if (found) pagesWithExits++;
  // 첫차·막차: 표 안에서 "HH:MM" 두 개가 있는 행에서 노선/방향 추출(형식이 다양해 보수적으로)
  const sec = text.match(/==+\s*首末班车[^=]*==+([\s\S]*?)(?=\n==[^=]|$)/);
  if (sec) {
    let n = 0;
    for (const row of sec[1].split(/\n\|-/)) {
      const t = row.match(/(\d{1,2}:\d{2})[^\d]{0,40}(\d{1,2}:\d{2})/); if (!t) continue;
      const cells = row.split('\n').filter(l => l.startsWith('|') && !l.startsWith('|-')).map(l => clean(l.replace(/^\|\s*/, '')));
      const line = (row.match(/\{\{(?:Rail color box|rcb)\|北京地铁\|([^|}]+)/) || [])[1] || null;
      const dirTo = cells.find(c => /方向|方面|开往|往/.test(c)) || null;
      times.push({ station: st.id, line_zh: line ? (/^\d+$/.test(line) ? line + '号线' : line) : null, towards_zh: dirTo, first: t[1].padStart(5, '0'), last: t[2].padStart(5, '0') }); n++;
    }
    if (n) pagesWithTimes++;
  }
}
exits.sort((a, b) => a.station.localeCompare(b.station) || a.code.localeCompare(b.code, 'en', { numeric: true }));
writeFileSync(join(OUT, 'exits.json'), JSON.stringify(exits, null, 1));
writeFileSync(join(OUT, 'src', 'station-times.json'), JSON.stringify(times, null, 1));
console.log(`역 문서 ${readdirSync(RAW).filter(f => f.endsWith('.txt')).length}개 → 출구 ${exits.length}개(${pagesWithExits}역), 첫차·막차 ${times.length}행(${pagesWithTimes}역)`);
