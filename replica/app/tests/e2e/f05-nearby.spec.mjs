import { test, expect, boot, a11y } from './fixtures.mjs';

test.describe('F05 주변', () => {
  test('F05-H1 내 위치 기준 주변 목록, 카테고리·반경', async ({ page }) => {
    await boot(page, '#/nearby');
    await expect(page.getByRole('heading', { name: '주변' })).toBeVisible();
    await expect(page.getByRole('button', { name: /왕징역/ })).toBeVisible({ timeout: 10000 });
    await a11y(page, 'S10');
    await page.getByRole('button', { name: /지하철역/ }).click();
    await expect(page.getByRole('button', { name: /왕징역/ })).toBeVisible();
    await page.getByRole('button', { name: /맛집/ }).click();
    await page.getByRole('button', { name: '500m', exact: true }).click();
    await expect(page.getByRole('heading', { name: /안에 .*없어요/ })).toBeVisible();
    await page.getByRole('button', { name: '3km로 넓히기' }).click();
    await expect(page.getByRole('button', { name: '3km', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });
  test('F05-E1 위치 없으면 지도 중심 기준', async ({ page, context }) => {
    await context.clearPermissions();
    await boot(page, '#/nearby');
    await expect(page.getByRole('button', { name: /지도 중심 기준/ })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /자금성/ }).first()).toBeVisible();
  });
});
