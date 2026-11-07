# 디자인 산출물

- `tokens.json` 원본 토큰(역할 이름 고정). 바꾼 뒤 `node replica/design/build-tokens.mjs` → `replica/app/css/tokens.css`, `tailwind.config.js`(참고용) 재생성.
- `components.md` 컴포넌트 스펙(변형·상태·토큰·접근성·사용 화면).
- 구현: `replica/app/css/ui.css`, 미리보기 `replica/app/design.html` (브라우저로 열고 우측 상단 버튼으로 테마 전환).
- 대비 검사: `python3 .claude/skills/replica-design/contrast.py replica/design/tokens.json` → 39쌍 전부 AA 통과(2026-11-07).
- `primitives-light.png`, `primitives-dark.png` 프리미티브 페이지 스크린샷(390px, 검수용).
- 자산 규칙: 고덕의 로고·아이콘·사진·폰트를 쓰지 않는다. 아이콘은 자체 인라인 SVG, 글꼴은 시스템 글꼴. accent는 역할이므로 replica-brand에서 값만 바꾼다.
