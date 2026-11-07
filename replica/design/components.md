# 컴포넌트 스펙: 고덕지도 한국어판 v2

토큰은 `tokens.json` → `app/css/tokens.css`(`--c-*`, `--t-*`, `--s-*`, `--r-*`). 구현은 `app/css/ui.css`, 미리보기는 `app/design.html`.
아이콘: 자체 인라인 SVG(스트로크 2px, 24 그리드, `app/js/ui/icons.js`). 고덕의 아이콘·로고·사진은 쓰지 않는다. 모든 라벨은 새로 쓴다.
공통 규칙: 터치 타깃 44px 이상, `:focus-visible`은 2px accent 링 + 2px 오프셋, 애니메이션은 `prefers-reduced-motion`에서 끔, 라이트/다크 모두 토큰만 쓴다(원시 hex 금지. 예외: 노선색은 데이터).

```
Button (.btn)
  variants  primary(accent 채움), secondary(accent-soft 배경+accent 글자), ghost(border), danger(danger 글자+테두리), icon(원형 44)
  sizes     sm 36px, md 44px, lg 52px(시트 CTA)
  states    default, active(투명도 .85), focus-visible(2px accent 링), disabled(.45 불투명, pointer none), loading(스피너 + 라벨 유지, aria-busy)
  tokens    radius md(아이콘은 pill), font md/600, 패딩 s-3 s-4
  a11y      <button> 또는 href 있는 <a>, 아이콘만이면 aria-label 필수
  used on   전체

Tabbar (.tabbar)
  variants  5탭(아이콘 24 + 라벨 xs), 배지(저장 개수, fav 색)
  states    selected(accent, 아이콘 채움), default(text-muted), 배지 0이면 숨김
  tokens    높이 l-tabbar + safe-b, surface, border 상단 1px
  a11y      <nav aria-label="주요"> 안의 <button role="tab" aria-selected>, 라벨 항상 표시(아이콘만 금지)
  used on   S01, S10, S11, S12, S17

Searchbar (.searchbar)
  variants  home(둥근 pill, 로고 글자 "고덕 KO" + placeholder "장소·역 검색 (한글·中文·pinyin)", 우측 마이크 없음 → 지우기), input(뒤로가기 + 입력 + 지우기), nearby(도시 라벨 고정 "베이징" + 입력)
  states    empty, typing(지우기 표시), focus(shadow float → 링), disabled(오프라인 검색은 되므로 없음)
  tokens    높이 l-searchbar, surface, shadow float, radius pill, font base
  a11y      <input type="search" enterkeyhint="search" autocomplete="off">, 지우기 버튼 aria-label="지우기", 결과 리스트는 role="listbox" + aria-activedescendant
  used on   S01, S02, S10

Chip (.chip)
  variants  filter(surface-2 배경), selected(accent-soft 배경 + accent 글자 + ✓), dropdown(끝에 ▾), category(아이콘+라벨), line(노선색 배경, 글자색은 노선색 밝기로 자동 결정: 휘도 > .55면 text 아니면 on-accent), bus(테두리 노선색, 글자 노선색), taxi(accent 채움), walk(surface-2 + 걷기 아이콘 + 분)
  states    default, selected(aria-pressed=true), disabled
  tokens    높이 32(터치 영역 44로 확장), radius pill, font sm/600, 패딩 s-2 s-3
  a11y      filter/selected는 <button aria-pressed>, dropdown은 <button aria-haspopup="listbox">, line 칩은 장식이므로 aria-hidden + 숨은 텍스트("2호선")
  used on   S01, S06, S07, S10, S11, S13

Sheet (.sheet)
  variants  peek(132px, 제목+액션 1줄), half(52vh), full(88vh); 데스크톱(≥720)에서는 좌측 420px 패널
  states    closed(translateY 100%), open, dragging(transition 없음), scroll-locked(full에서만 내부 스크롤)
  tokens    surface, radius sheet 상단, shadow sheet, 그립 40×5 border 색, motion sheet
  a11y      role="dialog" aria-modal=false(지도는 계속 조작 가능), 닫기 버튼 aria-label="닫기", Esc로 닫힘, 포커스는 열릴 때 제목으로
  used on   S04, S07, S10, S14

PlaceRow (.row-place)
  variants  simple(아이콘·한국어 이름·중국어 작게·거리), suggest(S02: 종류 아이콘 + 노선 배지 + 출구 칩), ranking(S10: 사진 3장 없음 → 자체 태그 칩 + 평점 + 1인당 ¥ + 거리), favorite(S11: ★ 채움 + 폴더 + 메모)
  states    default, pressed(accent-soft), favorited(★ fav 색), closed-now(영업 종료 라벨 warning)
  tokens    패딩 s-3 s-4, border 하단 1px, 이름 md/600, 보조 sm/text-muted
  a11y      전체가 <button>(또는 <a>), 거리와 종류는 시각적 순서대로 텍스트에 포함, 아이콘은 aria-hidden
  used on   S02, S03, S10, S11

RouteCard (.route-card)
  variants  transit(총 시간 xl + "걷기 1.1km" + 노선 체인 + 요약줄 + 다음 차 줄), walk(시간 + 거리 + 칼로리), taxi(요금 범위 + 시간), combo(택시 칩 + 노선 체인)
  states    default, selected(accent 2px 테두리), best(배지 "가장 빠름" success-soft), warning(막차 임박 warning 배너 한 줄), unavailable(운행 종료, 흐리게 + 사유)
  tokens    surface, radius lg, shadow card, 패딩 s-4, 간격 s-2
  a11y      <article> 안의 <button> 전체 탭, 노선 체인은 숨은 텍스트 "도보 14분, 2호선, 환승, 11호선, 도보 2분"
  used on   S06

LineChain (.linechain)
  variants  compact(S06: 칩만 + 화살표 없이 간격), detailed(S07 요약: 구간 길이 비례 막대)
  states    -
  tokens    walk 칩 surface-2, line 칩 노선색, 간격 s-1, 화살표는 text-muted 8px 삼각형
  a11y      role="list", 각 칩 role="listitem", 전체 숨은 문장 제공
  used on   S06, S07

Timeline (.timeline)
  variants  step 종류: origin(start 점), walk(점선 + 거리·분 + "도보 안내" 링크), board(역 + 노선 칩 + 방향 "○○ 방면" + "n역 · m분" 펼침 버튼), transfer(환승 걷기 분 + 안내), alight(역 + 출구 칩 + 출구 랜드마크), destination(end 점)
  states    collapsed/expanded(경유역 목록, aria-expanded), current(도보 내비 중 현재 단계 accent 강조)
  tokens    세로선 2px(노선 구간은 노선색, 도보는 border 점선), 점 12px, 글자 base, 보조 sm/text-muted
  a11y      <ol>, 각 단계 <li>, 펼침은 <button aria-expanded aria-controls>
  used on   S07, S08

LineBadge (.badge-line) / CrowdHint (.crowd)
  variants  metro(채움 노선색), bus(테두리), airport(채움 + 비행기 아이콘); crowd 1~5 사람 아이콘 + "혼잡" 텍스트(정적 안내: 출퇴근 시간)
  tokens    xs/600, radius sm, 패딩 2px 6px
  a11y      배지 텍스트 = 노선 한국어 이름, crowd는 텍스트가 주 정보(아이콘 aria-hidden)
  used on   S02, S06, S07, S13

MapControls (.fab)
  variants  locate(추적 중이면 accent 채움), zoom-in/out, layers(타일 언어 中/EN 토글), compass(헤딩 추적 시만), route(파란 화살표, 홈에서만, 크기 56)
  states    default, active(tracking), disabled(위치 거부 시 locate는 눌리면 안내 토스트)
  tokens    원형 l-fab(46), surface, shadow float; route는 accent + on-accent
  a11y      aria-label 각각("현재 위치", "확대", "축소", "지도 글자 中/EN", "길찾기"), aria-pressed(locate, layers)
  used on   S01, S07, S08, S14

Marker (.pin, .me-dot, .pt-start/.pt-end)
  variants  category(카테고리 색 원형 핀 + 아이콘), selected(크게 + accent 테두리), favorite(fav 색), station(노선색 원 + "역" 아이콘), origin(start), destination(end), via, me(accent 점 + 정확도 원 + 헤딩 삼각형)
  states    label-on(줌 ≥ 14 한국어 라벨), label-off, dimmed(필터에서 제외)
  tokens    핀 30×30, 라벨 surface .92 + text + xs/700 + radius sm
  a11y      Leaflet 마커에 title=한국어 이름, keyboard로 포커스 가능(leaflet keyboard 옵션)
  used on   S01, S03, S07, S08, S14

ActionRow (.actions)
  variants  place(길찾기 primary 전폭 + 저장★ + 기사 카드 + 복사 + 고덕 앱), route(저장 + 공유 + 도보 안내 시작 primary)
  states    ★ on/off(aria-pressed), 복사됨(토스트)
  tokens    grid 2열 s-2, 버튼 md
  a11y      각 버튼 텍스트 라벨 있음
  used on   S04, S07

RouteInput (.route-input)
  variants  2줄(출발 start 점 + "내 위치", 도착 end 점), 교환 버튼(⇅ 아이콘 44), 경유 추가(+, could)
  states    empty, filled, locating(출발 "위치 찾는 중…" + 스피너), location-denied(출발 빈칸 + 안내), invalid(같은 지점)
  tokens    surface 카드 radius lg, 입력 base, 점 10px
  a11y      각 입력 <label>(시각 숨김) "출발지"/"도착지", 교환 버튼 aria-label="출발·도착 바꾸기"
  used on   S05

SegmentedTabs (.segtabs)
  variants  mode(지하철·도보·택시·자전거(could): 아이콘 + 라벨), favorites(장소·경로)
  states    selected(accent-soft pill + accent), default(text-muted)
  tokens    높이 44, radius pill, font sm/600
  a11y      role="tablist"/"tab" aria-selected, 좌우 화살표 키 이동
  used on   S06, S11

Banner (.banner)
  variants  info(accent-soft + accent 아이콘), warning(warning-soft + warning 글자: "막차 23:10, 지금 출발하면 여유 25분"), danger(운행 종료), offline(surface-2: "오프라인 — 저장된 데이터로 동작 중")
  states    dismissible(×), persistent
  tokens    radius md, 패딩 s-3, sm
  a11y      role="status"(info), role="alert"(warning/danger)
  used on   S01, S06, S07, S12

Toast (.toast)
  variants  text, text+action("실행 취소")
  states    show(2.4s), hide
  tokens    scrim .92 + on-accent 글자, radius pill, 위치 tabbar 위 s-6
  a11y      role="status" aria-live="polite", 액션은 버튼
  used on   전체

RadioList (.radiolist) / Toggle (.toggle)
  variants  언어·테마·라벨 모드 라디오, 타일 언어 토글
  states    checked, focus
  a11y      네이티브 <input type="radio"/"checkbox"> + <label>, 시각은 CSS로
  used on   S12

TranslateToggle (.xlate)
  variants  "원문 보기"/"한국어 보기" 작은 ghost 버튼
  states    원문(중국어 이름·주소 우선), 번역(한국어 우선)
  a11y      aria-pressed, 변경 시 aria-live로 "원문 표시"
  used on   S04, S10

EmptyState (.empty)
  variants  검색 0건("'xx'를 못 찾았어요. 한글·중국어·병음으로 다시 검색"), 즐겨찾기 없음("★를 눌러 저장하면 여기 모여요"), 주변 0건, 위치 없음, 오프라인
  tokens    가운데 정렬, 아이콘 40 text-muted, 제목 md, 설명 sm, 버튼 secondary
  a11y      제목은 <h2>
  used on   S03, S10, S11

DriverCard (.driver)
  variants  place(중국어 이름 + 주소), favorite 묶음(여러 줄 스크롤), phrase(회화 한 줄)
  states    light 고정(기사에게 보여줄 땐 항상 흰 배경·검은 글자), landscape(글자 축소)
  tokens    driver-zh 64/900, driver-addr 30/700, 한국어 base/text-muted, 닫기 pill 상단 우측
  a11y      role="dialog" aria-label="기사에게 보여주는 카드", 닫기 Esc, 화면 밝기 안내 텍스트
  used on   S16

Skeleton / Spinner
  variants  route 계산 중(카드 3개 스켈레톤), 위치 찾는 중(스피너 20)
  tokens    surface-2 → border 그라디언트 1.2s
  a11y      aria-busy on 컨테이너, 텍스트 "경로 계산 중"
  used on   S05, S06, S08
```

## 레이아웃

- 모바일 기본: 지도 전체화면, 상단 검색바(gutter 12, safe-t), 우측 FAB 스택(tabbar + 40 위), 하단 탭바 56 + safe-b, 시트는 탭바 위에서 올라옴.
- 데스크톱(≥720px): 좌측 420px 패널에 검색·시트·탭바를 모두 넣고 지도는 우측. v1과 동일.
- 글자 크기 최소 13px(sm). 중국어는 한국어보다 한 단계 크게(기사·역무원이 읽는 글자).

## 모션

- 시트 열림 280ms ease, 칩 선택 120ms, 토스트 200ms. `prefers-reduced-motion: reduce`면 전부 0ms.
- 지도 flyTo는 Leaflet 기본 0.8s, 경로 결과 선택 시 fitBounds 패딩 [40, 40, 시트 높이, 40].
