// tokens.json → replica/app/css/tokens.css (+ tailwind.config.js 매핑). 실행: node replica/design/build-tokens.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const t = JSON.parse(readFileSync(join(here, 'tokens.json'), 'utf8'));

const vars = (obj, prefix) => Object.entries(obj)
  .filter(([k, v]) => typeof v === 'string' && !k.startsWith('_'))
  .map(([k, v]) => `  --${prefix}${k}: ${v};`).join('\n');

const light = vars(t.color, 'c-');
const dark = vars(t.color.dark, 'c-');
const type = Object.entries(t.type).map(([k, v]) =>
  `  --t-${k}-size: ${v.size}px; --t-${k}-line: ${v.line}px; --t-${k}-weight: ${v.weight};`).join('\n');
const space = t.space.map((v, i) => `  --s-${i}: ${v}px;`).join('\n');
const radius = Object.entries(t.radius).map(([k, v]) => `  --r-${k}: ${v}px;`).join('\n');
const shadow = Object.entries(t.shadow).map(([k, v]) => `  --sh-${k}: ${v};`).join('\n');
const motion = Object.entries(t.motion).map(([k, v]) => `  --m-${k}: ${v};`).join('\n');
const layout = Object.entries(t.layout).map(([k, v]) => `  --l-${k}: ${typeof v === 'number' ? v + 'px' : v};`).join('\n');

const css = `/* 생성 파일. 원본은 replica/design/tokens.json. 손으로 고치지 말 것. */
:root {
${light}
${type}
${space}
${radius}
${shadow}
${motion}
${layout}
  --font-sans: ${t.font.sans};
  --font-mono: ${t.font.mono};
  --safe-t: env(safe-area-inset-top, 0px);
  --safe-b: env(safe-area-inset-bottom, 0px);
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${dark}
    --sh-card: 0 1px 2px rgba(0,0,0,.4), 0 2px 8px rgba(0,0,0,.45);
    --sh-float: 0 4px 16px rgba(0,0,0,.55);
    --sh-sheet: 0 -8px 30px rgba(0,0,0,.6);
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
${dark}
  --sh-card: 0 1px 2px rgba(0,0,0,.4), 0 2px 8px rgba(0,0,0,.45);
  --sh-float: 0 4px 16px rgba(0,0,0,.55);
  --sh-sheet: 0 -8px 30px rgba(0,0,0,.6);
  color-scheme: dark;
}
`;
writeFileSync(join(here, '..', 'app', 'css', 'tokens.css'), css);

// Tailwind 매핑(이 프로젝트는 Tailwind를 쓰지 않지만, 역할 이름을 그대로 쓰려는 경우를 위해 둔다)
const colors = Object.fromEntries(Object.keys(t.color).filter(k => !k.startsWith('_') && k !== 'dark').map(k => [k, `var(--c-${k})`]));
const tw = `// 생성 파일. tokens.json의 역할 이름을 Tailwind theme에 매핑. 클래스 예: bg-surface text-text-muted border-border
module.exports = {
  theme: {
    colors: ${JSON.stringify(colors, null, 6)},
    fontFamily: { sans: ['var(--font-sans)'], mono: ['var(--font-mono)'] },
    fontSize: ${JSON.stringify(Object.fromEntries(Object.entries(t.type).map(([k, v]) => [k, [v.size + 'px', { lineHeight: v.line + 'px', fontWeight: String(v.weight) }]])), null, 6)},
    spacing: ${JSON.stringify(Object.fromEntries(t.space.map((v, i) => [i, v + 'px'])), null, 6)},
    borderRadius: ${JSON.stringify(Object.fromEntries(Object.entries(t.radius).map(([k, v]) => [k, v + 'px'])), null, 6)},
    boxShadow: ${JSON.stringify(t.shadow, null, 6)},
  },
};
`;
writeFileSync(join(here, 'tailwind.config.js'), tw);
console.log('wrote app/css/tokens.css and design/tailwind.config.js');
