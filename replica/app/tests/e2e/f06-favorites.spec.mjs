import { test, expect, boot, go, a11y } from './fixtures.mjs';

test.describe('F06 저장 · 호텔', () => {
  test('F06-H1 ★ 저장 → 저장 탭 → 호텔 설정 → 홈 "호텔로"', async ({ page }) => {
    await boot(page, '#/place/tiantan');
    await page.getByRole('button', { name: '저장' }).click();
    await expect(page.getByRole('button', { name: '저장' })).toHaveAttribute('aria-pressed', 'true');
    await go(page, '#/fav');
    await expect(page.getByRole('heading', { name: '저장' })).toBeVisible();
    await expect(page.locator('#panel').getByText('천단공원').first()).toBeVisible();
    await a11y(page, 'S11');
    await page.getByRole('link', { name: '설정' }).first().click();
    await expect(page.getByRole('heading', { name: '호텔로 쓸 곳 고르기' })).toBeVisible();
    await page.getByRole('button', { name: /천단공원/ }).click();
    await expect(page.locator('#panel').getByText('호텔', { exact: true }).first()).toBeVisible();
    await go(page, '#/');
    await expect(page.getByRole('link', { name: '호텔로' })).toBeVisible();
    await page.getByRole('link', { name: '호텔로' }).click();
    await expect(page.locator('.route-card').first()).toBeVisible({ timeout: 10000 });
  });
  test('F06-E1 같은 곳 두 번 눌러도 하나만, 해제 실행 취소', async ({ page }) => {
    await boot(page, '#/place/tiantan');
    const star = page.getByRole('button', { name: '저장' });
    await star.click(); await star.click();
    await expect(star).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('button', { name: '실행 취소' }).click();
    await expect(star).toHaveAttribute('aria-pressed', 'true');
    const n = await page.evaluate(() => JSON.parse(localStorage.getItem('goduk.v2')).favorites.length);
    expect(n).toBe(1);
  });
  test('F06-E2 새로고침 후에도 저장 유지, 전부 중국어로', async ({ page }) => {
    await boot(page, '#/place/tiantan');
    await page.getByRole('button', { name: '저장' }).click();
    await page.reload(); await page.waitForSelector('#chips .chip', { state: 'attached' });
    await go(page, '#/fav');
    await page.getByRole('button', { name: '전부 중국어로' }).click();
    await expect(page.getByRole('dialog', { name: '기사에게 보여주는 카드' })).toContainText('天坛公园');
  });
  test('F06-E3 v1 즐겨찾기 키가 있으면 옮겨온다', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('goduk.favs', JSON.stringify(['gugong', 'tiantan'])); });
    await page.reload(); await page.waitForSelector('#chips .chip', { state: 'attached' });
    await go(page, '#/fav');
    await expect(page.locator('#panel').getByText('자금성').first()).toBeVisible();
    await expect(page.locator('#panel').getByText('천단공원').first()).toBeVisible();
  });
  test('F06-E4 빈 상태', async ({ page }) => {
    await boot(page, '#/fav');
    await expect(page.getByRole('heading', { name: '저장한 곳이 없어요' })).toBeVisible();
  });
});
