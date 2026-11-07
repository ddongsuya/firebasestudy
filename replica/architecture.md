# Architecture: 고덕지도 한국어판 v2 (高德地图 핵심 기능의 재구축)

기준 문서: `replica/recon.md`, `replica/features.csv`. 날짜: 2026-11-07.
전제(사용자 확정): 정적 PWA 유지, 서버·로그인·결제 없음, 1인 로컬 앱, 베이징 지하철 라우팅은 자체 데이터로 클라이언트에서 계산.

## Stack

| layer | choice | why |
| --- | --- | --- |
| web | Vanilla JS(ES modules) + HTML + CSS, 빌드 없음 | v1이 이미 이 구조. 여행 전에 끝내야 하므로 툴체인 추가 금지. 폰에서 `npx serve`도 필요 없는 순수 정적 |
| 지도 | Leaflet 1.9.4(로컬 vendored) + 고덕 래스터 타일(zh_cn/en) | v1 그대로. 중국 현지 네트워크에서 뜨는 유일한 무료 타일 |
| 좌표 | GCJ-02 단일 저장, `gcj02.js`로 WGS-84 ↔ GCJ-02 양방향 변환 | 기기 GPS와 외부 라우터는 WGS-84, 타일과 고덕 딥링크는 GCJ-02 |
| database | 정적 데이터: `data/*.json`(읽기 전용, 앱에 내장) / 사용자 데이터: `localStorage` 키 하나 `goduk.v2`(JSON, 버전 필드) | 사용자 데이터가 100KB 미만. IndexedDB는 과함. 데이터베이스는 하나(정적 JSON)이고, 로컬 저장은 그 위의 사용자 레이어 |
| 라우팅 | 자체 엔진 `routing/transit.js`(Dijkstra, 역×노선 상태 그래프), `routing/walk.js`(직선+방향 안내, OSRM 옵션), `routing/taxi.js`(베이징 요금표) | 고덕 API 키 발급 불가(실명 인증). 지하철은 그래프가 작아(약 400역) 폰에서 수 ms |
| auth | 없음 | 1인 앱. 공유는 "중국어 주소+좌표 링크 복사" |
| payments | 없음 | |
| email | 없음 | |
| jobs | 없음(런타임). 개발 시 `tools/validate-data.mjs`가 데이터 무결성 검사 | 노선·역 데이터 오류는 길찾기 오류로 직결되므로 커밋 전에 검사 |
| hosting | GitHub Pages(또는 Vercel 정적) | 빌드 없음. HTTPS 필요(위치·서비스워커) |
| tests | `node --test`(라우팅 엔진·요금·좌표 변환), Playwright(화면 흐름 F01~F08) | 둘 다 설치 부담 없음. Playwright는 세션에 이미 있음 |
| 외부 호출 | 고덕 타일 서버(GET), `uri.amap.com`·`iosamap://`·`amapuri://`·Apple Maps 딥링크(열기만), OSRM 공개 데모 서버(선택, 기본 꺼짐) | 모두 공개·문서화된 것. 고덕의 사설 엔드포인트는 쓰지 않음 |

코드 위치: `replica/app/` (자체 완결 정적 PWA). 루트의 v1은 레플리카가 끝날 때까지 손대지 않고, 완료 후 루트를 v2로 교체한다. v1에서 가져오는 것: `js/gcj02.js`(그대로), `js/data.js`의 장소 40곳·회화·팁(JSON으로 변환), `sw.js` 캐시 전략, 기사 카드 CSS.

```
replica/app/
  index.html
  manifest.json  sw.js  icons/
  css/tokens.css  css/app.css          ← replica-design이 채움
  js/main.js                           앱 부팅, 라우터(해시 기반 화면 전환)
  js/store.js                          localStorage 사용자 데이터 (favorites, folders, frequent, history, settings) + v1 마이그레이션
  js/data.js                           data/*.json 로드·인덱스 (id→객체, 검색 인덱스)
  js/geo.js                            haversine, 방위, 반경 검색
  js/gcj02.js                          v1 복사
  js/routing/transit.js  walk.js  taxi.js  fare.js  schedule.js
  js/screens/ home.js search.js place.js route-input.js route-results.js route-detail.js walk-nav.js nearby.js favorites.js station.js pick-point.js driver-card.js more.js
  js/ui/ sheet.js chips.js toast.js linechain.js timeline.js
  data/ places.json stations.json lines.json transfers.json categories.json phrases.json tips.json fares.json
  tools/ validate-data.mjs  build-data.mjs(선택: CSV→JSON)
  tests/ unit/*.test.mjs  e2e/*.spec.mjs
```

## Schema

Tables: 13 (정적 8, 사용자 5). Access rules: 서버가 없으므로 접근 규칙은 "정적 데이터는 읽기 전용, 사용자 데이터는 이 기기의 이 브라우저만"이다. `store.js`가 유일한 쓰기 경로이며 모든 쓰기는 버전 필드와 함께 원자적으로 통째로 저장한다.

논리 스키마는 `replica/schema.sql`(SQLite 방언)에 있다. 실제 런타임 매핑:

| SQL 테이블 | 런타임 | 비고 |
| --- | --- | --- |
| categories, places, lines, stations, line_stations, exits, transfers, fares | `data/*.json` | 정적. `tools/validate-data.mjs`가 schema.sql의 제약(FK, 유일성, 체크)을 JSON에 대해 검사 |
| folders, favorites, frequent_places, search_history, settings | `localStorage["goduk.v2"]` | 하나의 JSON 문서 `{v:2, folders:[], favorites:[], frequent:{}, history:[], settings:{}}` |

핵심 제약(recon의 "어려운 부분"을 데이터 제약으로):
- `line_stations (line_id, seq)` 유일, `(line_id, station_id)` 유일 → 노선 순서가 꼬이면 검증에서 걸린다.
- `transfers`는 `(from_station_id, to_station_id)` 유일, 양방향을 각각 한 행 → 환승 도보 시간이 비대칭인 역(예: 西直门)을 표현.
- 모든 좌표는 GCJ-02, `lat between 39.4 and 40.6`, `lon between 115.4 and 117.5`(베이징 범위 체크) → WGS-84를 실수로 넣으면 500m 어긋나는데, 범위 체크로는 못 잡으므로 `places.json`에 `coord: "gcj02"` 필드를 필수로 두고 변환 스크립트가 표시한다.
- `favorites (place_id)`는 `place_id is null`이면 `custom_name, lat, lon` 필수(지도 선택 지점) — 체크 제약.
- `frequent_places.role`은 `hotel | airport | meetup` 중 하나, role당 1행.
- 시각은 `"HHMM"` 문자열(첫차·막차, 현지 시각 고정). timestamptz는 사용자 데이터의 `created_at`에만(ISO 8601 UTC).

## API

HTTP API가 없다. "라우트"는 화면이 호출하는 모듈 함수다. 입력·출력은 JSDoc 타입으로 고정한다.

| module.function | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| data.load() | data/*.json 전부 로드·인덱스 | 부팅 | - | {places, stations, lines, …, byId} | 전체 |
| data.search(q, {limit}) | 한글·중국어·병음·주소 통합 검색(정규화: 공백 제거, 성조 제거, 소문자) | S02 | string | Place\|Station[] 점수순 | F01 |
| data.nearby(center, {radius, cats, sort}) | 반경 내 장소·역, 거리순/평점순 | S10 | GCJ 좌표, m | {item, distance_m}[] | F05 |
| data.nearestStations(pt, n) | 가까운 역 n개(직선 거리) | 라우팅 | 좌표 | {station, distance_m}[] | F02 |
| transit.plan(req) | 지하철 경로 탐색 | S06 | RouteRequest{origin, destination, strategy, depart_at} | RoutePlan[] (최대 4: 추천·환승적음·도보적음·대안) | F02 |
| schedule.check(plan, at) | 첫차·막차·막차 임박 경고 | S06/S07 | RoutePlan, Date | {ok, warnings[]} | F02 |
| fare.metro(distance_m, lines[]) | 베이징 지하철 거리 요금(공항선 정액) | transit | m, line ids | yuan(정수) | F02 |
| walk.plan(origin, destination, {router}) | 도보 경로: 직선 ×1.3 + 방위 안내, OSRM 옵션 | S06/S08 | 좌표 2개 | WalkPlan{distance_m, duration_s, steps[], polyline} | F03 |
| taxi.estimate(distance_m, at) | 베이징 택시 요금 추정(기본 ¥13/3km, ¥2.3/km, 15km 초과 할증, 23~05시 야간) | S06 | m, Date | {low, high, duration_s} | F04 |
| deeplink.amapRoute(dest, mode) | uri.amap.com/navigation + iosamap://path 폴백 | S04/S06 | Place, mode | url[] | F04 |
| deeplink.amapMarker(place) / apple(place) | 지도 앱에서 위치 열기 | S04 | Place | url | F04 |
| store.get() / store.save(doc) | 사용자 문서 읽기/원자 저장 | 전체 | - / doc | doc | F06 |
| store.toggleFavorite(ref, folder_id) | 저장/해제(중복 방지) | S04/S11 | place_id 또는 custom | Favorite | F06 |
| store.setFrequent(role, ref) | 호텔·공항 설정 | S11 | role, ref | - | F06 |
| store.pushHistory(q, place_id) | 최근 검색 10개 | S02 | - | - | F01 |
| geo.locate() | GPS → GCJ-02, 정확도, 실패 사유 | S01/S05/S08 | - | {lat, lon, acc} \| Error(denied\|timeout\|unavailable) | 전체 |
| geo.reverse(pt) | 역지오코딩 없음 → 가장 가까운 장소/역 + 거리로 "○○ 근처" 생성 | S14 | 좌표 | {label_ko, label_zh} | F07 |
| share.text(place) | 중국어 이름·주소·좌표 텍스트 | S04/S16 | Place | string | F08 |

Webhooks in: 없음. Webhooks out: 없음.
Jobs: 없음(런타임). 개발 시 `node tools/validate-data.mjs`(커밋 전, CI), `node --test tests/unit`.

## The parts that bite

- time zones: 첫차·막차·택시 야간 할증은 **베이징 시각(UTC+8) 고정**. 폰이 한국 시각(UTC+9)이어도 `Intl.DateTimeFormat('ko', {timeZone:'Asia/Shanghai'})`로 계산한다. 출발 시각 선택 UI도 베이징 시각으로 표시하고 "베이징 시각" 라벨을 붙인다.
- 좌표계: 한 번 섞이면 끝. 저장은 GCJ-02만. GPS 입력 직후 변환, OSRM 호출 직전 역변환. 단위 테스트로 천안문 좌표 왕복 오차 < 1m 확인.
- idempotency: 즐겨찾기 토글 연타 → `store.save`는 문서 전체를 교체하므로 마지막 쓰기만 남는다. 토글은 현재 상태를 읽고 반전하는 순수 함수로.
- races: localStorage는 동기라 경쟁이 없다. 탭 두 개는 `storage` 이벤트로 재로딩.
- 검색: 400역 + 200장소를 매 키 입력마다 선형 스캔해도 1ms. 인덱스는 부팅 시 정규화 문자열을 미리 만들어 둔다. 중국어 간체 검색은 글자 포함 검색, 병음은 성조 제거(`NFD` + 결합 문자 제거).
- 라우팅 품질: 역간 시간은 실측이 없으므로 "역간 거리/35km/h + 정차 0.5분"으로 근사, 환승은 역별 `transfers.walk_min`(기본 4분) + 대기 3분. 결과 시간에 "약"을 붙이고 ±10% 범위로 표시한다.
- 막차: 노선별 `first/last`는 종점 기준이라 중간역은 다르다. 방향별·역별 시각표를 다 넣는 건 과하다. "막차 60분 전부터 경고"로 보수적으로 처리하고 안내문에 명시.
- 오프라인: `data/*.json`은 앱 셸 캐시에 포함(약 500KB). 타일은 최근 본 것만. 지하철 안에서는 GPS가 없으므로 도보 내비는 "현재 위치 없음" 상태를 가져야 한다.
- 고덕 타일 의존: 타일 서버 포맷이 바뀌면 지도가 빈다. `tileerror` 6회에 안내 토스트(v1) + 타일 URL을 `settings`에서 바꿀 수 있게.
- 딥링크: WeChat 내장 브라우저에서는 `callnative=1`이 안 열린다(문서 명시). 설치형 PWA(홈 화면)에서 열도록 안내.
- 데이터 저작권: 노선·역·첫차 막차는 사실 정보(베이징 지하철 공식 사이트 공개). 좌표는 자체 수집 또는 ODbL(OSM) 출처 표기. 고덕 POI·사진·리뷰는 쓰지 않는다.
- 폰 저장소 삭제: Safari는 7일 미사용 시 localStorage를 지울 수 있다. "내 일정 내보내기/가져오기"(JSON 텍스트 복사)를 should로 둔다.

## Build order

1. **Vertical slice** (F02 끝까지, 못생겨도 됨): S01 홈 → S05 경로 입력 → S06 결과 → S07 상세.
   데이터: `lines.json`, `stations.json`, `line_stations`, `transfers.json`(1·2·4·5·6·8·10·13호선 + 공항선부터, 나머지는 2단계), `places.json`(v1 40곳 변환).
   모듈: data, geo, gcj02, transit, fare, schedule, store(settings만), main 라우터.
   완료 조건: "왕징 → 자금성"을 검색해 지하철 경로가 환승역·출구와 함께 나오고 단위 테스트가 통과.
2. **Must-haves** (features.csv must 24행):
   - map/search: S01 전체(FAB, 위치, 타일 언어), S02 자동완성+최근 검색, S03 결과, S04 상세(원문 토글·주소·시간·역·출구·액션)
   - routing: 나머지 전 노선 데이터, 전략 3종, 막차 경고, 도보(S06 步行), 택시 요금, 딥링크 폴백
   - traveler: S16 기사 카드, 복사
   - favorites: ★ 저장, 호텔·공항 설정 + 홈 "호텔로" 버튼
   - offline: sw.js(셸+데이터+타일), manifest
   - 테이블: 정적 8 전부, 사용자 favorites·frequent·history·settings
3. **Should-haves**: S10 주변(칩·정렬·반경), S13 역 상세, S08 도보 내비, S11 폴더, 출발 시각 설정, 즐겨찾기 전체 중국어 보기·내보내기, S12 설정, S17 회화·팁 이식.
   Could: S14 지도 선택, 사진, 버스 주요 노선, 노선도 SVG, 경로 저장.
4. **Fixes from replica-entrepreneur**: 이번 프로젝트에서는 생략 가능(판매용 아님). 대신 replica-test의 버그와 와이프 분의 실제 사용 피드백을 같은 자리에서 처리.

## 데이터 수집 계획 (라우팅의 절반)

| 데이터 | 출처(공개) | 양 | 방법 |
| --- | --- | --- | --- |
| 노선 목록·색·역 순서 | 베이징 지하철 공식 사이트(bjsubway.com) 노선 페이지, 위키백과 "베이징 지하철 N호선" | 27개 노선, 약 400역(환승 포함 490개 노선-역) | `tools/build-data.mjs`로 CSV → JSON. 1단계는 핵심 9개 노선 |
| 첫차·막차 | 공식 사이트 역별 시각표(종점 기준 요약) | 노선·방향별 | 종점 기준 2개 값만, 보수적 경고 |
| 역 좌표 | 위키백과 역 문서 좌표(WGS-84) → GCJ-02 변환 | 400 | 변환 후 `coord:"gcj02"` 표기 |
| 출구 | 공식 사이트 역 정보(출구 번호·주변) | 주요 역 60개부터 | 출구별 좌표는 역 좌표 + 방위 근사, 랜드마크 한국어 번역 |
| 환승 도보 시간 | 공식 안내·여행 후기 | 환승역 약 70개 | 기본 4분, 알려진 긴 환승(西直门·东直门·宋家庄 등) 개별 값 |
| 장소 | v1 40곳 + 와이프 분 일정 | 100~200 | 한/중/병음·주소·가까운 역·출구·팁 직접 작성 |
| 요금 | 베이징 지하철·택시 공시 요금 | 표 2개 | `fares.json` |
