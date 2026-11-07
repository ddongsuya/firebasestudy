# Recon map: 高德地图 / Amap Global (모바일 앱 → PWA 레플리카)

Scope: 지도 + 길찾기(대중교통·도보·택시 요금 안내)가 핵심. 장소 즐겨찾기와 주변 탐색(附近/탐색 탭)은 should.
For: 와이프 분의 베이징 여행 1회용. 중국어를 못 읽는 한국인 여행자 1명이 현지 데이터로 길을 찾고, 기사·점원에게 중국어를 보여주는 용도.
Date: 2026-11-07
Original version observed: Amap Global 17.3.0 (2026-11-04), 高德地图 17.3.0 (중국 스토어). 한국어 UI 지원(78개 언어).
Existing v1 in repo: `index.html`, `js/app.js`, `js/data.js`, `css/style.css` (고덕 타일 + 한국어 라벨 + 40곳 장소 + 기사용 카드 + 회화·팁). 레플리카는 이 v1의 데이터와 좌표 변환 코드를 재사용한다.

## 규칙 확인

- 공개 자료(앱스토어 공개 스크린샷, 공개 가이드, 고덕 공개 개발자 문서)만 사용했다. 앱 바이너리·번들·사설 API는 보지 않았다.
- 고덕 지도 타일은 v1이 이미 쓰는 공개 타일 서버를 개인 용도로만 쓴다. 고덕의 상표·로고·아이콘·사진은 쓰지 않는다.
- `replica/screens/`의 이미지는 레이아웃 비교용 참고본이며 결과물에 넣지 않는다. 목록은 `screens/README.md`.
- 고덕 LBS 오픈플랫폼 키는 실명 인증(중국 휴대폰/신분증)이 필요해 한국인 개인이 받기 어렵다. 따라서 "라우팅은 자체 데이터"가 기본 가정이다(아키텍트 단계에서 확정).

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | App Store 한국 스토어 (Amap Global) | https://apps.apple.com/kr/app/id461703208 | 한국어 스크린샷 6장, 설명문, What's New. iTunes lookup으로 메타데이터 |
| 2 | App Store 중국 스토어 (高德地图) | https://apps.apple.com/cn/app/id461703208 | 중국어 스크린샷 10장, 2025~26 신기능(탭 구성 확인) |
| 3 | 고덕 공식 PC 도움말: 路线规划 | https://www.amap.com/ssr/doc/route-plan | 경로 모드·선호 옵션·결과 카드 항목 라벨 (2026-08-11) |
| 4 | 고덕 공개 Web 서비스 API 문서: 路径规划 2.0 | https://lbs.amap.com/api/webservice/guide/api/newroute | 대중교통·도보 응답 구조 = 데이터 모델 근거 |
| 5 | 고덕 공개 Web 서비스 API 문서: 路径规划 v3 | https://lbs.amap.com/api/webservice/guide/api/direction | 지하철 출입구(entrance/exit), 버스 노선 필드 |
| 6 | 고덕 공개 Web 서비스 API 문서: 搜索POI 2.0 | https://lbs.amap.com/api/webservice/guide/api-advanced/newpoisearch | POI 필드, 周边搜索 파라미터 |
| 7 | 고덕 URI API (웹 딥링크) | https://lbs.amap.com/api/uri-api/guide/travel/route | uri.amap.com/navigation, marker, search 파라미터 |
| 8 | 고덕 모바일 URI (앱 스킴) | https://lbs.amap.com/api/amap-mobile/guide/ios/route | iosamap://path, amapuri://route/plan, viewMap, navi |
| 9 | chinaservicesinfo "How to use Gaode Maps" | https://www.chinaservicesinfo.com/s/202412/25/WS676b6de2498eec7e1f72b962/how-to-use-gaode-maps.html | 2024-12. 실제 앱 캡처 8장: 홈·경로 입력·결과·상세·즐겨찾기 |
| 10 | Trip.com Amap 가이드 | https://www.trip.com/guide/info/amap.html | 2026-06. 언어 설정 경로, 외국인 제약 |
| 11 | Trip.com(UK) Gaode 가이드 | https://uk.trip.com/guide/phone/gaode-map.html | 2026-10. 즐겨찾기(★), 로그인 +86 제한, 오프라인 지도 |
| 12 | wanderinchina Amap 가이드 | https://wanderinchina.com/en/survival-guide/useful-mobile-apps/amap-gaode-map/ | 2026-10. 탭 이름, 주변 화장실, 오프라인 범위 |
| 13 | 레포 v1 (`index.html`, `js/`, `css/`) | 이 레포 | 이미 만든 화면·데이터. 레플리카의 출발점 |

## Core loop

**목적지를 찾아서(검색/주변/즐겨찾기) → 지금 위치에서 그곳까지 가는 법(지하철·버스·도보·택시 요금)을 보고 → 가면서 따라간다(출구·환승·도보).**
한국인 여행자에게는 여기에 "중국어를 못 읽어도 되게" 한 겹이 더 붙는다: 모든 장소와 역 이름을 한국어로 보여주되, 기사·역무원에게는 중국어로 보여준다.

## Screens

원본 탭 구성(2026): 중국판 `首页 · 探索 · AI助手 · 打车 · 我的`, 글로벌판 한국어 `홈 · 탐색 · 메시지 · Ride · 내(로그인하지 않음)`. 2024년판은 `首页 · 附近 · 消息 · 打车 · 我的`.
레플리카 탭(제안): `지도 · 주변 · 길찾기 · 저장 · 더보기`.

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | 홈 지도 (首页/홈) | 앱 실행 | 지도 보기, 검색 진입, 현재 위치, 길찾기 진입 | 전체화면 지도, 상단 검색바(placeholder "查找地点、公交、地铁" + 스캔/마이크), 우측 버튼 스택(알림·레이어·피드백), 현재위치 버튼, 파란 "路线" 길찾기 FAB, 날씨/제한 번호 칩, 검색바 아래 빠른 진입 아이콘 그리드(公交地铁·实时公交·驾车·打车·订酒店·步行·火车票机票·代驾·收藏夹), 하단 탭바 | 기본, 위치 권한 거부, 타일 로드 실패, 라벨 언어(中/EN) |
| S02 | 검색 입력/자동완성 | S01 검색바 탭 | 장소·역·주소 찾기 | 입력창(지우기, 마이크), 최근 검색, 바로가기(我的位置·收藏的点·地图选点·家·公司), 제안 리스트(아이콘, 이름, 종류·주소, 지하철 노선 배지, 하위 입구 칩 예 "2号航站楼/1号航站楼", 평점) | 빈 입력(최근 검색), 입력 중(제안), 결과 없음 |
| S03 | 검색 결과 (리스트+지도) | S02 엔터 | 후보 비교 | 지도 핀들, 하단 결과 리스트(이름, 거리, 평점, 주소), 정렬/필터 칩, 리스트↔지도 토글 | 1건(바로 S04), 여러 건, 0건 |
| S04 | 장소 상세 카드 (POI 詳情) | 핀/리스트 탭, 지도 롱프레스 | 장소 확인 후 행동 | 바텀시트: 이름(한국어/원문 토글 "원문 보기"), 종류·거리·평점·1인당 가격, 주소, 영업시간, 전화, 사진 스트립, 가까운 지하철역·출구, 액션 버튼(路线 길찾기·导航·收藏 ★·打车·分享), 리뷰 요약 | 접힘/펼침, 즐겨찾기 됨/안 됨, 정보 없음 |
| S05 | 경로 입력 (路线 입력) | S01 길찾기 FAB, S04 "路线" | 출발·도착 지정 | 출발(기본 我的位置)/도착 입력 2줄, 교환(⇅) 버튼, 경유지(+), 바로가기 칩(我的位置·收藏的点·地图选点·家·公司), 제안 리스트 | 출발만 있음, 둘 다 있음, 위치 없음 |
| S06 | 경로 결과 목록 | S05 완료 | 모드별 경로 비교 | 상단 모드 탭(驾车·打车·公交地铁·骑行·步行·더보기 ▾), 선호 칩(现在出发▾ / 선호▾, 高德推荐 ✓·地铁优先·步行少·换乘少·不坐地铁), 안내 배너(温馨提示), 경로 카드 리스트: 총 시간(1h5 min), 걷기 거리, 배지(最快·骑行方案·택시 결합 "택시¥22.2"), 노선 칩 체인(🚶14 → Line 2 → Line 16 → Line 11 → 🚶2, 노선색), 요약줄("10역 · ¥5 · Lujiazui(Exit 1) 도착"), 다음 차 줄("Line 2(방향) 2분 혼잡도") | 로딩, 결과 있음, 결과 없음(너무 가까움/멀음), 심야(nightflag), 모드 전환 |
| S07 | 경로 상세 | S06 카드 탭 | 단계별 안내 | 상단 지도+폴리라인(구간별 색), 요약 카드(全程 48分钟, 구간 바, 共步行1公里·5元·10站), 경고(운행 변경), 타임라인 단계: 출발지 → 步行 802米(12分钟)[步行导航] → 승차역 "南京东路 地铁站-2号口" + 노선·방향(徐泾东方向) + 발차 간격·혼잡도 + "乘坐10站(30分钟)" 펼침 → 하차역 "출입구" + 역내외 걷기 → 도착지; 하단 바(收藏·路线分享·截图·放到首页·开始导航) | 펼침/접힘(경유역 목록), 저장됨 |
| S08 | 도보 내비게이션 | S07 "步行导航/开始导航" | 걸으며 따라가기 | 상단 다음 턴 카드(거리·방향·도로명), 지도 헤딩 추적, 하단 바(남은 시간·거리·도착 예정 시각, 종료 X), 음성 | 진행 중, 경로 이탈, GPS 약함, 도착 |
| S09 | 택시 호출 (打车/Ride) | 탭 Ride, S06 "打车" 모드 | 차 부르기 | 지도+승차 핀("탑승 >"), "어디로 가시나요?" 입력, 차종·요금 비교 리스트, 예약/대리호출/공항픽업/대절 아이콘, 약관 | 레플리카에서는 **요금 추정 + 기사용 카드**로 대체 (호출·결제 불가) |
| S10 | 주변 탐색 (附近/탐색) | 탭 탐색, S01 "附近" | 근처 뭐 있나 | 도시 선택 "Beijing ▾", 검색바 "附近好吃的", 카테고리 칩(미식·관광지·호텔·쇼핑·화장실·편의점·지하철역), 정렬(기본·거리·평점), 랭킹 리스트 카드(사진 3장, 최근 30일 인기 지수, 종합 평가 4.6, 이름, 요리·1인당 ¥·거리, 태그, 리뷰 한 줄, "원문 보기" 번역 토글) | 위치 있음/없음, 카테고리별, 결과 없음 |
| S11 | 즐겨찾기 (收藏夹) | 탭 내 → 收藏夹, 홈 빠른 아이콘 | 저장한 곳 관리 | 상단 탭(地点·路线·图文·地图), 常去地点 행(家 去设置 · 公司 去设置), 默认收藏夹 리스트(필터 全部标签·全部类型·全部城市), 항목(이름, 주소, 더보기), 创建收藏夹 버튼 | 비어 있음, 채워짐, 집/회사 미설정 |
| S12 | 내 / 설정 | 탭 내 | 언어·오프라인·도움말 | 프로필(로그인 없음), 설정 → 通用设置 → 语言设置(라디오 리스트, "변경 후 앱 재시작" 배너), 离线地图(도시 목록·지도/내비 다운로드), 帮助与反馈 | 로그인 안 함(레플리카 기본) |
| S13 | 지하철역 상세 | 검색/주변에서 역 탭 | 노선·출구·첫차 막차 | 역 이름(한/중/병음), 노선 배지, 출구 목록(A/B/C… + 출구 주변 랜드마크), 첫차·막차, 길찾기 버튼 | 환승역(여러 노선), 단일 노선 |
| S14 | 지도 선택 (地图选点) | S02/S05 "地图选点" | 핀으로 지점 고르기 | 중앙 고정 핀, 하단 주소 카드(역지오코딩), 확인 버튼 | 주소 없음(좌표만) |
| S15 | 위치 공유 카드 (位置口令 유사) | S04 공유 | 내 위치를 남에게 | 6자리 코드/링크, 복사 | 레플리카에서는 **중국어 주소+좌표 복사·공유**로 축소 |
| S16 | 기사용 카드 (레플리카 고유, 원본의 "이중 언어 카드"에 대응) | S04 "기사에게 보여주기" | 중국어 큰 글씨 | 请带我去这里, 중국어 이름·주소, 한국어 작은 글씨, 닫기 | 장소/즐겨찾기/호텔 |
| S17 | 회화·팁 (레플리카 v1 유지) | 탭 더보기 | 택시·식당·긴급 회화 | v1 패널 그대로 | 크게 보기 |

## Flows

```
F01 장소를 찾아 길찾기까지
    S01 홈 -> S02 검색 입력 -> S03 결과(또는 바로 S04) -> S04 상세 -> S05 경로 입력(출발=내 위치, 도착=장소) -> S06 결과 -> S07 상세
    happy path clicks: 5 (검색바 탭, 글자 입력, 제안 탭, "길찾기", 카드 탭)
    edge: 한글로 검색했는데 중국어 이름만 있음(한/중/병음 동시 검색), 위치 권한 없음(출발지 수동), 결과 0건

F02 대중교통으로 가기 (핵심 중의 핵심)
    S05 -> S06(公交地铁, 高德推荐) -> S07(승차역·출구·방향·역 수) -> S08 도보 구간 내비
    happy path clicks: 3
    edge: 첫차 전/막차 후(nightflag, "운행 종료" 경고), 환승 2회 이상, 버스 전용 경로, 택시+지하철 결합, 같은 역 다른 출구

F03 걸어서 가기
    S04 -> S05 -> S06(步行) -> S08
    happy path clicks: 3
    edge: 2km 이상(택시 권유), 공원/단지 내부 통과 불가, GPS 튐(GCJ-02 보정)

F04 택시 타기 (레플리카: 호출 대신 요금+기사 카드)
    S04 -> S06(打车: 예상 요금 ¥, 시간) -> S16 기사용 카드 -> (딥링크로 고덕/DiDi 앱 열기)
    happy path clicks: 2
    edge: 고덕 앱 미설치(웹 uri.amap.com 폴백), 야간 할증, 공항 출발

F05 주변에서 찾기
    S10 주변 탭 -> 카테고리 칩(화장실/편의점/맛집/지하철역) -> 리스트 -> S04 -> F02/F03
    happy path clicks: 3
    edge: 위치 없음(지도 중심 기준), 반경 내 0건, 영업 종료

F06 저장하고 바로 가기
    S04 ★ -> S11 즐겨찾기 -> "호텔(집)" 설정 -> S01 홈에서 "호텔로" 한 번에 길찾기
    happy path clicks: 2 (저장), 1 (호텔로 길찾기)
    edge: 같은 곳 중복 저장, 호텔 미설정, 일정별 묶음(폴더)

F07 지도에서 찍어서 가기
    S01 롱프레스 -> S14 지도 선택 -> S04(주소만) -> F02/F03
    happy path clicks: 2
    edge: 주소 역지오코딩 불가(좌표만 표시)

F08 중국어 보여주기 (여행자 전용)
    S04 -> S16 기사용 카드 / 중국어 복사
    happy path clicks: 1
    edge: 주소가 긴 경우 줄바꿈, 다크모드에서 가독성
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| 하단 탭바 | 5탭(아이콘+라벨), 배지(저장 개수) | 선택/비선택 | 전체 |
| 검색바 | 홈(둥근, 로고+placeholder), 입력 모드(뒤로+지우기), 주변(도시 선택+검색) | 비어 있음, 입력 중, 포커스 | S01, S02, S10 |
| 칩 (Chip) | 카테고리, 선호(드롭다운 ▾), 선택됨(✓), 노선 칩(노선색 배경) | 기본, 선택, 비활성 | S01, S06, S10, S11 |
| 바텀 시트 | 접힘(peek), 반 펼침, 전체 | 드래그, 스냅 | S04, S07, S10, S14 |
| 장소 카드(리스트 행) | 간단(이름·종류·거리), 랭킹(사진 3장·지수·평점), 제안(아이콘·노선 배지) | 기본, 즐겨찾기됨 | S02, S03, S10, S11 |
| 경로 요약 카드 | 대중교통(시간·걷기·노선 체인·요약줄·다음 차), 도보(시간·거리·칼로리), 택시(요금·시간) | 최快 배지, 선택됨 | S06 |
| 노선 체인 | 🚶n → [Line 2] → [Line 11] → 🚶n | 노선색, 버스 번호(테두리), 택시 결합 | S06, S07 |
| 타임라인 단계 | 출발/도보/승차/하차/도착, 펼침(경유역) | 펼침/접힘 | S07 |
| 노선 배지 | 지하철(채움, 노선색), 버스(테두리), 택시(파랑) | - | S02, S06, S07, S13 |
| 혼잡도 표시 | 사람 아이콘 1~5 + 텍스트(非常拥挤/较拥挤) | - | S06, S07 |
| 지도 컨트롤 FAB | 현재 위치, 확대/축소, 레이어, 나침반, 길찾기(파란 화살표) | 기본, 추적 중 | S01, S07, S08 |
| 지도 마커 | 카테고리 핀, 선택 핀, 출발(초록)·도착(빨강)·경유, 역 아이콘, 내 위치(파란 점+정확도 원) | 기본, 선택, 즐겨찾기 | S01, S03, S07, S08 |
| 액션 버튼 행 | 길찾기(primary), 저장★, 기사 카드, 복사, 공유 | 기본, 활성(★ 채움) | S04, S07 |
| 버튼 | primary(파랑, 둥근), secondary(연회색), ghost, 큰 CTA("开始导航") | 기본, 눌림, 비활성 | 전체 |
| 입력(출발/도착) | 2줄, 초록·빨강 점, 교환 버튼, + 경유 | 비어 있음, 채워짐 | S05 |
| 배너/알림 | 안내(温馨提示, 파란 연한), 경고(운행 변경, 빨강 연한), 언어 변경 안내(노랑) | - | S06, S07, S12 |
| 토스트 | 하단 짧은 메시지 | - | 전체 |
| 라디오 리스트 | 언어 선택 | 선택됨 | S12 |
| 세그먼트/탭 | 모드(驾车·打车·公交·骑行·步行), 즐겨찾기 상단 탭 | 선택 | S06, S11 |
| 번역 토글 | "원문 보기 / 번역 보기" | 원문, 번역 | S04, S10 |
| 빈 상태 | 일러스트 + 문장 + 버튼 | - | S03, S10, S11 |
| 기사용 전체화면 카드 | 큰 중국어, 작은 한국어 | 라이트/다크 | S16 |

## Inferred data model

```
Place (POI)   id, name_zh, name_ko, name_en, pinyin, type (대분류), typecode (고덕 6자리),
              lat, lon (GCJ-02로 저장; WGS-84는 변환), address_zh, address_ko?, district (adname), city (cityname),
              tel, opentime_today, opentime_week, rating, cost (1인당 ¥), photos[], tags[], tip_ko,
              nearest_station_id, entrance_hint, parent_id (예: 공항 → 터미널)
              evidence: POI 2.0 응답 필드(name/id/parent/location/type/typecode/pname/cityname/adname/address, business.tel/opentime_today/opentime_week/rating/cost, photos, navi.entr_location), S04, S10 카드, v1 data.js
              confidence: high

Category      id, label_ko, label_zh, icon, typecodes[] (예 餐饮 050000, 生活服务 070000, 交通设施 150000, 购物, 风景名胜, 公共厕所, 住宿)
              evidence: POI 2.0 types 기본값 050000|070000|120000, S10 칩, v1 categories
              confidence: medium (대분류 코드 4개만 문서로 확인, 나머지는 POI 코드표 zip)

Station       id, name_zh, name_ko, pinyin, lat, lon, lines[] (line_id), exits[] {code "A"/"B2", lat, lon, landmark_ko},
              first_train, last_train, is_transfer
              evidence: v3 segments.entrance/exit(name, location), S07 "南京东路 地铁站-2号口", S13, 가이드 Exit A~F·B2
              confidence: high (구조), medium (출구 좌표는 자체 수집 필요)

Line          id, name_zh ("2号线"), name_ko ("2호선"), color, type (地铁/公交), stations[] 순서, start_time "0600", end_time "2300", headway_min
              evidence: v3 buslines(name, type, start_time/end_time, via_stops), S06 노선 칩 색, "首站发车约8分钟/趟"
              confidence: high

RouteRequest  origin {lat, lon, name, place_id?}, destination {…}, mode (transit|walk|taxi|bike|drive),
              strategy (transit: 0 推荐 | 2 换乘少 | 3 步行少 | 5 不坐地铁 | 7 地铁优先 | 8 时间短), depart_at (now|datetime), nightflag
              evidence: v5 transit strategy 0~8, URI policy 0~3, S06 선호 칩
              confidence: high

RoutePlan     id, request_id, mode, duration_s, distance_m, walking_distance_m, fare_yuan, transfers, stops_total,
              nightflag, badges (最快|骑行方案|택시결합), segments[], polyline, taxi_fee_yuan (route level)
              evidence: v3 transit(cost, duration, nightflag, walking_distance), route.taxi_cost, S06 카드
              confidence: high

Segment       kind (walking|bus|railway|taxi), order,
              walking: distance_m, duration_s, steps[] {instruction, road, distance, duration, polyline, action}
              bus/railway: line_id, direction_zh (徐泾东方向), departure_stop {station_id, exit?}, arrival_stop {station_id, exit?},
                           via_num, via_stops[], entrance {name, lat, lon}, exit {name, lat, lon}, headway_hint, crowd_level (1~5), duration_s
              taxi: price_yuan, drivetime_s, distance_m, startname, endname
              evidence: v3 segments.walking/bus.buslines/entrance/exit, v5 segments.taxi(price, drivetime, distance, startpoint/endpoint), S07 타임라인
              confidence: high

Favorite      id, place_id | custom {name, lat, lon, address_zh}, folder_id, note_ko, tags[], created_at
Folder        id, name ("기본", "1일차"…), order
FrequentPlace role (home→"호텔" | work→"공항"/"집결지"), place_id
              evidence: S11 常去地点(家/公司), 默认收藏夹, 创建收藏夹, 全部标签/全部类型/全部城市 필터, v1 favs
              confidence: high

SearchHistory query, place_id?, searched_at
              evidence: S02 최근 검색
              confidence: medium

Settings      ui_lang (ko 고정), tile_lang (zh_cn|en), label_mode (ko|zh|both), theme, offline_cities[]
              evidence: S12 语言设置, 离线地图, v1 tileLang
              confidence: high

Phrase, Tip   (v1 그대로) id, cat, ko, zh, py
              confidence: high (이미 있음)
```

Relationships: Category 1-n Place, Place n-1 Station(nearest), Line n-n Station(순서 있음), Station 1-n Exit, RouteRequest 1-n RoutePlan, RoutePlan 1-n Segment(순서), Segment n-1 Line, Folder 1-n Favorite, Favorite n-1 Place, FrequentPlace n-1 Place.

좌표계: 고덕은 GCJ-02. 기기 GPS는 WGS-84. v1의 `js/gcj02.js`가 변환한다. 저장은 한 가지(GCJ-02)로 통일하고, 입력 시 변환한다.

## Feature matrix

See `features.csv`. 56 rows. Must: 24, should: 11, could: 9, skip: 12 (skip은 clone=skip 행).

## Out of scope (cannot or should not be cloned)

- **고덕의 POI 데이터베이스와 랭킹(高德扫街榜)**: 수억 명 사용 데이터로 만든 고덕 소유 데이터. 레플리카는 베이징 여행 동선 100~200곳을 직접 큐레이션한다.
- **실시간 데이터**: 실시간 버스 위치, 지하철 혼잡도, 교통 체증, 신호등 카운트다운. 데이터 공급원이 없다. 혼잡도 UI는 "정적 안내(출퇴근 시간 혼잡)"로 축소.
- **택시 호출·결제(打车/Ride, 대리운전, 순풍차)**: Alipay/WeChat 결제·중국 전화번호·사업자 라이선스 필요. 예상 요금 + 기사용 카드 + 고덕/DiDi 딥링크로 대체.
- **계정·로그인·메시지 탭·친구 위치 공유·鹰眼守护**: 네트워크 기능. 1인 여행 앱이므로 불필요. 데이터는 기기 로컬(localStorage/IndexedDB).
- **AI 비서(小高老师, AI助手 탭, AI探索)**: 고덕의 모델·서비스. 제외.
- **차량 내비(차선 단위, 3D, 항공 스트리트뷰, 飞行街景)**: 여행자는 운전 안 함. 도보 내비만.
- **호텔·입장권 예약, 꽃·커피 주문, 충전소·주유소 지도**: 파트너 상거래.
- **오프라인 벡터 지도 다운로드**: 고덕 소유 데이터. 대신 PWA 타일 캐시(최근 본 타일) + 장소/노선 데이터는 앱에 내장이라 오프라인 동작.
- **영어/78개 언어 UI**: 한국어 하나만.
- **고덕 Web 서비스 API 직접 호출**: 키 발급이 실명 인증 필요. 아키텍트가 (a) 자체 지하철 그래프 라우팅, (b) 사용자가 키를 넣으면 고덕 API 사용하는 옵션 구조를 결정.

## Size

Screens 17, flows 8, entities 13.
Hard parts:
1. **대중교통 라우팅 엔진 없이 길찾기** — 베이징 지하철 노선·역·환승·출구 데이터를 직접 만들고(약 27개 노선, 400여 역) 클라이언트에서 최단 경로(환승 가중)를 푼다. 버스는 제외하거나 주요 노선만.
2. **도보 경로** — 중국 내 OSM 도로 데이터는 지역에 따라 빈약. 직선+안내(방향·거리)로 시작하고, 외부 라우터(OSRM 공개 서버 등)는 옵션으로.
3. **한국어 번역 품질과 데이터 수집** — 장소·역·출구 이름의 한국어/병음/중국어 3종 유지. 사람이 검수해야 한다.
4. **GCJ-02 좌표 보정과 현재 위치 신뢰도** — v1 코드 재사용. 지하철 안에서 GPS가 끊기는 상황의 UI.
5. **오프라인** — 중국 현지 데이터 불안정. 앱 셸·데이터·최근 타일 캐시를 빈틈없이.

Size: **M** (몇 주). 지하철 데이터 구축이 절반이다. 랭킹·실시간·택시 호출은 처음부터 제외했기 때문에 XL이 아니다.
