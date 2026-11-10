import { test, expect, boot, go, a11y } from './fixtures.mjs';

test.describe('F02 지하철 길찾기', () => {
  test('F02-H1 내 위치 → 자금성: 결과 카드, 상세 타임라인, 경유역 펼침', async ({ page }) => {
    await boot(page, '#/route?to=place:gugong');
    const cards = page.locator('.route-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
    await expect(cards.first()).toContainText(/\d+분/);
    await expect(cards.first()).toContainText(/\d\d:\d\d 도착/);
    await expect(cards.first()).toContainText('¥');
    await expect(page.getByText('가장 빠름')).toBeVisible();
    await a11y(page, 'S06');
    await cards.first().click();
    await expect(page).toHaveURL(/sel=0/);
    await expect(page.getByRole('list').filter({ hasText: '내 위치' })).toBeVisible();
    await page.getByRole('button', { name: '시트 펼치기' }).click();
    const expand = page.getByRole('button', { name: /정거장/ }).first();
    await expand.click();
    await expect(expand).toHaveAttribute('aria-expanded', 'true');
    await a11y(page, 'S07');
    await expect(page.getByRole('link', { name: /첫 역까지 안내/ })).toBeVisible();
    await expect(page.getByRole('link', { name: '고덕 앱' })).toHaveAttribute('href', /uri\.amap\.com\/navigation/);
  });
  test('F02-H2 전략 전환: 환승 적게 / 걷기 적게', async ({ page }) => {
    await boot(page, '#/route?from=station:wangjing&to=place:gugong');
    await expect(page.locator('.route-card').first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: '환승 적게' }).click();
    await expect(page.getByRole('button', { name: /환승 적게/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/strategy=fewer_transfers/);
    await page.getByRole('button', { name: '걷기 적게' }).click();
    await expect(page.locator('.route-card').first()).toBeVisible();
  });
  test('F02-H3 역에서 역으로, 교환 버튼', async ({ page }) => {
    await boot(page, '#/route?from=station:wangjing&to=station:tian-anmendong');
    await expect(page.locator('.route-card').first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: '출발·도착 바꾸기' }).click();
    await expect(page.getByRole('button', { name: /출발지: 톈안먼둥역/ })).toBeVisible();
    await expect(page.locator('.route-card').first()).toBeVisible();
  });
  test('F02-E1 너무 가까우면 빈 상태 + 도보 제안', async ({ page }) => {
    await boot(page, '#/route?from=station:wangjing&to=pt:39.9970,116.4720,왕징근처');
    await expect(page.getByRole('heading', { name: '지하철 경로가 없어요' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: '도보 보기' }).click();
    await expect(page.locator('.route-card').first()).toContainText('kcal');
  });
  test('F02-E2 위치 권한 거부: 출발지 선택기로 안내', async ({ page, context }) => {
    await context.clearPermissions();
    await boot(page, '#/route?to=place:gugong');
    await expect(page.getByRole('alert')).toContainText(/위치 권한|출발지/, { timeout: 10000 });
    await expect(page.getByRole('searchbox', { name: '출발지 검색' })).toBeVisible();
  });
  test('F02-E3 출발지 검색으로 선택', async ({ page }) => {
    await boot(page, '#/route?to=place:gugong');
    await expect(page.locator('.route-card').first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /출발지:/ }).click();
    const rq = page.getByRole('searchbox', { name: '출발지 검색' });
    await rq.fill('베이징남');
    await page.getByRole('button', { name: /베이징남역/ }).first().click();
    await expect(page.getByRole('button', { name: /출발지: 베이징남역/ })).toBeVisible();
    await expect(page.locator('.route-card').first()).toBeVisible({ timeout: 10000 });
  });
  test('F02-E4 출발 시각을 23:50으로 하면 막차 경고', async ({ page }) => {
    await boot(page, '#/route?from=station:wangjing&to=place:gugong');
    await expect(page.locator('.route-card').first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /지금 출발/ }).click();
    await page.getByLabel('출발 시각 (베이징 시각)').fill('23:50');
    await page.getByRole('button', { name: '적용' }).click();
    await expect(page.getByText(/막차.*지났어요/).first()).toBeVisible();
  });
  test('F02-E5 뒤로 가기: 상세 → 목록 → 홈', async ({ page }) => {
    await boot(page, '#/route?from=station:wangjing&to=place:gugong');
    await page.locator('.route-card').first().click();
    await page.getByRole('button', { name: '뒤로' }).click();
    await expect(page).not.toHaveURL(/sel=/);
    await page.getByRole('button', { name: '뒤로' }).click();
    await expect(page).toHaveURL(/#\/$/);
  });
  test('F02-E6 데스크톱 1440px에서도 결과가 보인다', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await boot(page, '#/route?from=station:wangjing&to=place:gugong');
    await expect(page.locator('.route-card').first()).toBeVisible({ timeout: 10000 });
    const box = await page.locator('#panel').boundingBox();
    expect(box.width).toBeLessThan(500);
  });
});
