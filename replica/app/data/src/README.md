# 원천 데이터

- `wikidata-*.csv`: Wikidata SPARQL(query.wikidata.org) 결과 스냅샷, 2026-11-07. 라이선스 CC0.
  - stations: 베이징 지하철 역(P81 노선이 Q235319의 일부), 좌표 P625(WGS-84), 라벨 zh/ko/en
  - adjacency: P197 인접역 + 한정자 P81(노선), P5051(방면)
  - lines: 노선 라벨·색(P465)
- 좌표는 WGS-84 → 빌드 시 GCJ-02로 변환한다.
- 첫차·막차·환승 도보 시간은 Wikidata에 없어 `tools/build-subway.mjs`의 표(공식 사이트 공개 시각표 요약, 근사치)에서 넣는다.

재생성: `node replica/app/tools/build-subway.mjs`
