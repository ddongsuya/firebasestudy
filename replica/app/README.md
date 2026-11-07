# 고덕 KO v2 (replica/app)

베이징 여행용 한국어 지도. 빌드 없는 정적 PWA. 자세한 설계는 `../recon.md`, `../architecture.md`, `../design/`, `../parity.md`.

```bash
# 미리보기
cd replica/app && python3 -m http.server 8765        # http://127.0.0.1:8765/index.html
# 테스트
npm install            # Playwright 테스트 러너·axe (앱 자체는 의존성 없음)
npm run test:unit      # 라우팅·요금·검색 단위 테스트
npm run test:e2e       # F01~F08 흐름 (Chromium)
# 데이터 재생성 (Wikidata 스냅샷·v1 장소 → data/*.json, 검증 포함)
npm run build:data
```

배포: 이 폴더를 그대로 정적 호스팅(GitHub Pages·Vercel·Netlify)에 올리면 된다. HTTPS여야 위치·서비스워커가 동작한다.
루트 v1 앱을 교체하려면 이 폴더 내용을 레포 루트로 옮기면 된다(`js/data.js`를 읽는 `tools/build-places.mjs`의 경로만 조정).

장소 추가: `data/places.json`에 직접 추가하거나(좌표는 GCJ-02, `coord:"gcj02"`), v1 방식대로 루트 `js/data.js`에 WGS-84로 넣고 `npm run build:data`.
