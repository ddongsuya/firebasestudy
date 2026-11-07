# Test plan: 고덕 KO v2

Build: adb631d+ (테스트 커밋)  Date: 2026-11-07  결과: 단위 11/11, e2e 31/31 통과, axe serious/critical 0  Env: 로컬 정적 서버(127.0.0.1:8765), 내장 데이터, 위치는 Playwright geolocation 모킹(왕징 근처)
실행: `cd replica/app && npm test` (단위 11 + e2e). 스펙: `replica/app/tests/e2e/*.spec.mjs`. 모든 스펙은 콘솔 오류·5xx가 있으면 실패하고, 주요 화면에서 axe(serious/critical)를 검사한다.

| case | flow | type | steps | expected | auto | result |
| --- | --- | --- | --- | --- | --- | --- |
| F01-H1 | 장소 검색→상세→길찾기 | happy | 검색바 탭, "자금성" 입력, 결과 탭, "여기로 길찾기" | 상세 시트, 경로 카드 | e2e | pass (2026-11-07) |
| F01-H2 | | happy: 중국어·병음 | "故宫", "gugong" | 같은 결과 | e2e | pass (2026-11-07) |
| F01-E1 | | edge: 0건(이모지 포함) | "zzzz없는곳🧧" | 빈 상태 + 주변 버튼 | e2e | pass (2026-11-07) |
| F01-E2 | | edge: 90자 입력 | "자금성"×30 | 깨지지 않음 | e2e | pass (2026-11-07) |
| F01-E3 | | edge: 키보드만 | Tab/타이핑/Enter/Esc | 상세 열림·닫힘 | e2e | pass (2026-11-07) |
| F01-E4 | | edge: 최근 검색 | 검색 후 재진입 | 최근 검색 노출 | e2e | pass (2026-11-07) |
| F01-E5 | | edge: 새로고침 | #/place/tiantan 새로고침 | 같은 카드 | e2e | pass (2026-11-07) |
| F02-H1 | 지하철 길찾기 | happy | #/route?to=place:gugong | 카드≥1, "가장 빠름", 상세 타임라인, 경유역 펼침, 딥링크 | e2e | pass (2026-11-07) |
| F02-H2 | | happy: 전략 전환 | 환승 적게/걷기 적게 | aria-pressed, URL strategy | e2e | pass (2026-11-07) |
| F02-H3 | | happy: 역↔역, 교환 | 왕징→톈안먼둥, ⇅ | 출발지가 바뀜 | e2e | pass (2026-11-07) |
| F02-E1 | | edge: 너무 가까움 | 왕징역→근처 400m | 빈 상태, 도보 제안 | e2e | pass (2026-11-07) |
| F02-E2 | | negative: 위치 거부 | 권한 없이 길찾기 | 경고 + 출발지 선택기 | e2e | pass (2026-11-07) |
| F02-E3 | | edge: 출발지 검색 | "북경남" 선택 | 출발지 변경, 재계산 | e2e | pass (2026-11-07) |
| F02-E4 | | edge: 막차 후(00:30 베이징) | 출발 시각 입력 | 막차 경고 | e2e | pass (2026-11-07) |
| F02-E5 | | edge: 뒤로 가기 | 상세→목록→홈 | 단계별 복귀 | e2e | pass (2026-11-07) |
| F02-E6 | | edge: 1440px | 데스크톱 | 좌측 패널 420px | e2e | pass (2026-11-07) |
| F02-E7 | | edge: 시차 | 폰이 한국 시각 | 베이징 시각으로 막차 계산 | unit(fare/schedule) | pass (unit) |
| F02-E8 | | edge: 오프라인 | 네트워크 차단 후 길찾기 | 데이터 내장이라 동작 | manual | 미실행 (배포 후 폰에서) |
| F03-H1 | 도보 | happy | 도보 모드→안내 시작→종료 | 남은 거리·종료 | e2e | pass (2026-11-07) |
| F03-E1 | | negative: 안내 중 위치 없음 | 권한 없이 #/walk | "위치" 안내 문구 | e2e | pass (2026-11-07) |
| F04-H1 | 택시 | happy | 택시 모드→상세→기사 카드 | ¥범위, 중국어 이름·주소, Esc 닫힘 | e2e | pass (2026-11-07) |
| F05-H1 | 주변 | happy | 카테고리·반경·정렬 | 목록, 빈 상태, 3km 넓히기 | e2e | pass (2026-11-07) |
| F05-E1 | | negative: 위치 없음 | 권한 없이 | 지도 중심 기준 전환 | e2e | pass (2026-11-07) |
| F06-H1 | 저장·호텔 | happy | ★→저장 탭→호텔 설정→홈 "호텔로" | 경로 카드 | e2e | pass (2026-11-07) |
| F06-E1 | | edge: 더블 토글·실행 취소 | ★★, 실행 취소 | 1건 유지 | e2e | pass (2026-11-07) |
| F06-E2 | | edge: 새로고침·전부 중국어로 | | 유지, 기사 카드 목록 | e2e | pass (2026-11-07) |
| F06-E3 | | edge: v1 데이터 마이그레이션 | goduk.favs 키 | 저장 목록에 반영 | e2e | pass (2026-11-07) |
| F06-E4 | | edge: 빈 상태 | | 안내 문구 | e2e | pass (2026-11-07) |
| F06-E5 | | edge: 두 탭 동시 | 탭 A 저장, 탭 B 확인 | storage 이벤트로 갱신 | manual | 미실행 (배포 후 폰에서) |
| F07-H1 | 지도 선택 | happy | #/pick → 여기로 길찾기 | pt: 좌표로 경로 | e2e | pass (2026-11-07) |
| F07-E1 | | edge: 지점 저장 | 이 지점 저장 | 저장 탭에 custom 항목 | e2e | pass (2026-11-07) |
| F08-H1 | 중국어 보여주기 | happy | 장소·역 카드→기사 카드 | 중국어 큰 글씨 | e2e | pass (2026-11-07) |
| F08-E1 | | edge: 원문 토글 | 원문 보기 | 중국어 우선 제목 | e2e | pass (2026-11-07) |
| MORE-1 | 더보기 | happy | 회화 크게 보기, 테마, 데이터 복구 | 각 동작 | e2e | pass (2026-11-07) |
| PWA-1 | 설치·오프라인 | manual | HTTPS 배포 후 홈 화면 추가, 비행기 모드 | 앱 셸·검색·길찾기 동작, 최근 타일 표시 | manual | 미실행 (배포 후 폰에서) |
| SR-1 | 스크린리더 | manual | VoiceOver로 F01·F02 | 라벨 읽힘(axe serious 0) | e2e(axe)+manual | pass (2026-11-07) |
