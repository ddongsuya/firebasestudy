# 원천 데이터

- `wikidata-*.csv`: Wikidata SPARQL(query.wikidata.org) 결과 스냅샷, 2026-11-07. 라이선스 CC0.
  - stations: 베이징 지하철 역(P81 노선이 Q235319의 일부), 좌표 P625(WGS-84), 라벨 zh/ko/en
  - adjacency: P197 인접역 + 한정자 P81(노선), P5051(방면)
  - lines: 노선 라벨·색(P465)
- 좌표는 WGS-84 → 빌드 시 GCJ-02로 변환한다.
- 첫차·막차·환승 도보 시간은 Wikidata에 없어 `tools/build-subway.mjs`의 표(공식 사이트 공개 시각표 요약, 근사치)에서 넣는다.

- `wikidata-poi.json`: 베이징 명소(박물관·공원·궁·역 등) 좌표·라벨 스냅샷(CC0). `places-extra.json`과 이름이 같으면 좌표를 교정한다.
- `places-extra.json`: 직접 큐레이션한 장소 110곳(한국어 팁·운영시간·요금·가까운 역·출구). 좌표 WGS-84, ±200m.
- 출구(`data/exits.json`): 중국어 위키백과 역 문서(413개)의 출구 표에서 추출(번호·방향·거리·주변). 원문 CC BY-SA 4.0, 사실 정보만. 원문 파일은 저장소에 넣지 않음.

재생성: `node replica/app/tools/build-subway.mjs && node replica/app/tools/build-places.mjs && node replica/app/tools/parse-zhwiki.mjs <zhwiki raw 폴더>`
