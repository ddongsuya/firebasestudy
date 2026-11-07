# Bugs: 고덕 KO v2

재현된 것만 적는다. 형식은 `.claude/skills/replica-test/bug-report.md`.

### BUG-001: 꺼진 상태의 aria-pressed / aria-selected 가 빈 문자열로 렌더됨

- Severity: S3 (화면은 동작하지만 스크린리더·테스트에 상태가 잘못 전달됨)
- Flow / case: F06 / F06-E1
- Screen: S04, S06, S10, S11, S13, S01
- Build: adb631d  Browser / device: Chromium 1.63, 390px

Steps
1. #/place/tiantan 열기
2. ★ 저장 버튼의 aria-pressed 확인

Expected: "false"
Actual: "" (템플릿 헬퍼가 false를 빈 문자열로 바꿈)
Evidence: e2e F06-E1 실패 로그 `Expected: "false" Received: ""`
Suspected cause: `ui.js` toStr()이 `false`를 조건부 렌더용으로 ''로 처리
Status: fixed (ui.js: 불리언은 'true'/'false'로 렌더) — 커밋은 테스트 단계 커밋 참조

### BUG-002: 패널이 열린 상태(길찾기·주변·저장)에서 홈 바로가기 칩이 패널 머리 아래로 비침

- Severity: S4
- Flow / case: F02 / F02-H1
- Screen: S05, S06
- Build: ae47721

Steps
1. #/route?to=place:gugong 열기
Expected: 패널만 보임
Actual: "호텔 설정" 칩이 패널 머리 아래 지도 위에 보임
Evidence: replica/clone-screens/S05-route-input-editor.png(수정 전)
Status: fixed in adb631d (`body.panel-open .topbar { display: none }`)

### BUG-003: 중첩 템플릿이 HTML로 이스케이프되어 태그가 글자로 보임

- Severity: S1 (핵심 흐름 S04·S06 전부 깨짐)
- Flow / case: F01 / F01-H1
- Screen: S04, S06
- Build: 빌드 중(커밋 전)

Steps
1. 장소 카드 열기
Expected: 제목·지하철 행이 정상
Actual: `<br><span class="big-zh">…` 텍스트가 그대로 보이고 경로 카드가 0개
Evidence: 스모크 1차 스크린샷(S06-route-results, 폐기)
Suspected cause: `html` 헬퍼가 중첩 결과를 raw로 표시하지 않음
Status: fixed in adb631d (Raw String 서브클래스 반환)

### BUG-004: 위치 권한이 거부되면 길찾기 화면이 "출발지와 도착지를 골라 주세요"만 보여주고 선택기를 열지 않음

- Severity: S2 (위치 꺼진 폰에서는 길찾기 진입 후 한 번 더 눌러야 해서 흐름이 막힌 것처럼 보임)
- Flow / case: F02 / F02-E2
- Screen: S05
- Build: adb631d  Browser / device: Chromium 1.63, 390px, geolocation 권한 없음

Steps
1. 위치 권한을 거부한 상태에서 #/route?to=place:gugong 열기

Expected: 경고 배너("위치 권한이 꺼져 있어요…")와 출발지 검색/선택기가 바로 열림
Actual: 빈 상태 문구만 보이고 배너 없음. 출발지 칸을 다시 눌러야 선택기가 열림
Evidence: e2e F02-E2 실패 `getByRole('alert') element(s) not found`
Suspected cause: route.show()가 출발지 실패 시 editing='from'을 설정하지 않음
Status: fixed (route.js show(): 출발지 없으면 editing='from')
