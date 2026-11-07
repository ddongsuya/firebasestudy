/*
 * WGS-84 <-> GCJ-02 좌표 변환
 * 고덕(高德) 지도 타일은 중국 정부 규정에 따라 GCJ-02 좌표계를 씁니다.
 * GPS(WGS-84) 좌표를 그대로 찍으면 베이징 기준 약 500m 어긋나므로 반드시 변환합니다.
 */
(function (global) {
  const PI = Math.PI;
  const A = 6378245.0;              // 장반경
  const EE = 0.00669342162296594323; // 이심률 제곱

  function outOfChina(lat, lon) {
    return lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271;
  }

  function transformLat(x, y) {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
    return ret;
  }

  function transformLon(x, y) {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
    return ret;
  }

  function delta(lat, lon) {
    let dLat = transformLat(lon - 105.0, lat - 35.0);
    let dLon = transformLon(lon - 105.0, lat - 35.0);
    const radLat = lat / 180.0 * PI;
    let magic = Math.sin(radLat);
    magic = 1 - EE * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
    dLon = (dLon * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);
    return [dLat, dLon];
  }

  /** WGS-84 -> GCJ-02. 반환: [lat, lon] */
  function wgs2gcj(lat, lon) {
    if (outOfChina(lat, lon)) return [lat, lon];
    const [dLat, dLon] = delta(lat, lon);
    return [lat + dLat, lon + dLon];
  }

  /** GCJ-02 -> WGS-84 (근사 역변환, 오차 수 m). 반환: [lat, lon] */
  function gcj2wgs(lat, lon) {
    if (outOfChina(lat, lon)) return [lat, lon];
    const [dLat, dLon] = delta(lat, lon);
    return [lat - dLat, lon - dLon];
  }

  global.GCJ02 = { wgs2gcj, gcj2wgs };
})(window);
