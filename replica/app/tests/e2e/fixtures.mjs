// 공통 픽스처: 콘솔 오류·5xx 실패, axe 접근성 검사, 앱 부팅 대기
import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(new Date('2026-11-12T06:00:00Z'));   // 베이징 11/12 14:00 (지하철 운행 중)
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('response', r => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`); });
    // 지도 타일은 네트워크 변수이므로 1px 투명 PNG로 대체
    await page.route(/autonavi\.com|amap\.com/, r => r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') }));
    await use(page);
    expect(errors, '콘솔 오류 / 5xx 없음').toEqual([]);
  },
});
export { expect };
export async function boot(page, hash = '#/') {
  await page.goto('/index.html' + hash);
  await page.waitForSelector('#chips .chip', { state: 'attached' });
  await page.waitForTimeout(300);
}
export async function go(page, hash) { await page.evaluate(h => { location.hash = h; }, hash); await page.waitForTimeout(400); }
export async function a11y(page, name) {
  const r = await new AxeBuilder({ page }).disableRules(['region', 'landmark-one-main', 'page-has-heading-one']).exclude('.leaflet-container').analyze();
  const serious = r.violations.filter(v => ['serious', 'critical'].includes(v.impact));
  expect(serious.map(v => `${name}: ${v.id} ${v.help} (${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')})`)).toEqual([]);
}
