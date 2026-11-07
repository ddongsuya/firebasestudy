-- 고덕지도 한국어판 v2: 논리 스키마 (SQLite 방언)
-- 런타임에는 정적 테이블 → data/*.json, 사용자 테이블 → localStorage["goduk.v2"] 로 매핑된다.
-- tools/validate-data.mjs 가 이 제약을 JSON에 대해 검사한다.
-- 좌표는 전부 GCJ-02. 시각 "HHMM"은 베이징 현지 시각. created_at 은 ISO 8601 UTC.

pragma foreign_keys = on;

-- ───────── 정적 데이터 (읽기 전용) ─────────

create table categories (
  id          text primary key,                 -- 'sight','food','shop','park','transit','hotel','toilet'
  label_ko    text not null,
  label_zh    text not null,
  icon        text not null,
  typecodes   text not null default '[]',       -- 고덕 POI 대분류 코드 배열(JSON). 참고용
  sort        integer not null
);

create table places (
  id            text primary key,
  cat           text not null references categories(id) on delete restrict,
  name_ko       text not null,
  name_zh       text not null,
  name_en       text,
  pinyin        text not null,
  lat           real not null check (lat between 39.4 and 41.1),
  lon           real not null check (lon between 115.4 and 117.6),
  coord         text not null default 'gcj02' check (coord = 'gcj02'),
  address_zh    text not null,
  district_zh   text,
  tel           text,
  opentime      text,                           -- '08:30-17:00' 또는 '월 휴관; 08:30-17:00'
  price_yuan    integer check (price_yuan >= 0),
  rating        real check (rating between 0 and 5),
  tags          text not null default '[]',     -- JSON 배열, 한국어 태그
  tip_ko        text,
  station_id    text references stations(id) on delete set null,   -- 가까운 역
  exit_code     text,                           -- 'A','B2' (station_id 없으면 null)
  parent_id     text references places(id) on delete set null,     -- 공항 → 터미널
  updated_at    text not null
);
create index places_cat on places(cat);
create index places_station on places(station_id);
create index places_parent on places(parent_id);

create table lines (
  id          text primary key,                 -- 'L1','L2','AE'(공항선),'DXAE'
  name_zh     text not null,                    -- '2号线'
  name_ko     text not null,                    -- '2호선'
  color       text not null,                    -- '#A4D3EE'
  kind        text not null default 'metro' check (kind in ('metro','airport','tram')),
  loop        integer not null default 0 check (loop in (0,1)),
  first_dep   text not null check (length(first_dep) = 4),  -- 종점 기준 첫차 'HHMM'
  last_dep    text not null check (length(last_dep) = 4),   -- 종점 기준 막차
  headway_min real not null default 4,
  avg_kmh     real not null default 35,
  fare_rule   text not null default 'distance' check (fare_rule in ('distance','flat','airport'))
);

create table stations (
  id          text primary key,                 -- 'wangjing', 'xizhimen'
  name_zh     text not null,
  name_ko     text not null,
  pinyin      text not null,
  lat         real not null check (lat between 39.4 and 41.1),
  lon         real not null check (lon between 115.4 and 117.6),
  is_transfer integer not null default 0 check (is_transfer in (0,1))
);
create unique index stations_name_zh on stations(name_zh);

-- 노선별 역 순서. 같은 물리역이 여러 노선에 속하면 노선마다 한 행.
create table line_stations (
  line_id     text not null references lines(id) on delete cascade,
  station_id  text not null references stations(id) on delete cascade,
  seq         integer not null,
  dist_prev_m integer check (dist_prev_m >= 0),   -- 직전 역까지 거리(없으면 haversine*1.15로 계산)
  primary key (line_id, seq),
  unique (line_id, station_id)
);
create index line_stations_station on line_stations(station_id);

-- 출구. 주요 역부터 채운다.
create table exits (
  id            text primary key,               -- 'wangjing:A'
  station_id    text not null references stations(id) on delete cascade,
  code          text not null,                  -- 'A','B2','西北口'
  lat           real,
  lon           real,
  landmark_ko   text,                           -- '망징 SOHO 방면'
  landmark_zh   text,
  unique (station_id, code)
);
create index exits_station on exits(station_id);

-- 환승(물리적으로 같은 역 또는 연결 통로). 방향별 한 행.
create table transfers (
  from_station_id text not null references stations(id) on delete cascade,
  to_station_id   text not null references stations(id) on delete cascade,
  walk_min        real not null default 4 check (walk_min between 0 and 20),
  note_ko         text,
  primary key (from_station_id, to_station_id),
  check (from_station_id <> to_station_id)
);

-- 요금표(지하철 거리 구간, 공항선 정액, 택시 규칙)
create table fares (
  id        text primary key,                   -- 'metro_distance','airport_express','daxing_express','taxi_day','taxi_night'
  rule      text not null                       -- JSON: {"bands":[[6000,3],[12000,4],[22000,5],[32000,6]],"extra_per_m":20000,"extra_yuan":1}
);

-- ───────── 사용자 데이터 (이 기기, 이 브라우저) ─────────

create table folders (
  id          text primary key,                 -- uuid
  name        text not null,
  sort        integer not null default 0,
  created_at  text not null
);

create table favorites (
  id            text primary key,
  folder_id     text references folders(id) on delete set null,     -- null = 기본
  place_id      text references places(id) on delete cascade,
  station_id    text references stations(id) on delete cascade,
  custom_name   text,
  custom_zh     text,
  lat           real,
  lon           real,
  note_ko       text,
  tags          text not null default '[]',
  created_at    text not null,
  check (
    (place_id is not null and station_id is null and custom_name is null)
    or (station_id is not null and place_id is null and custom_name is null)
    or (place_id is null and station_id is null and custom_name is not null and lat is not null and lon is not null)
  )
);
create unique index favorites_place on favorites(place_id) where place_id is not null;
create unique index favorites_station on favorites(station_id) where station_id is not null;
create index favorites_folder on favorites(folder_id, created_at);

create table frequent_places (
  role        text primary key check (role in ('hotel','airport','meetup')),
  favorite_id text not null references favorites(id) on delete cascade,
  updated_at  text not null
);

create table search_history (
  id          integer primary key autoincrement,
  query       text not null,
  place_id    text references places(id) on delete cascade,
  station_id  text references stations(id) on delete cascade,
  searched_at text not null
);
create index search_history_time on search_history(searched_at desc);   -- 최근 10개만 유지(store.js)

create table settings (
  key   text primary key,   -- 'tile_lang'(zh_cn|en), 'label_mode'(ko|zh|both), 'theme'(auto|light|dark), 'walk_router'(straight|osrm), 'tile_url'
  value text not null
);
