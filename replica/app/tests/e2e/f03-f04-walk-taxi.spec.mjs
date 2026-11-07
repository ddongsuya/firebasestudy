import { test, expect, boot, go } from './fixtures.mjs';

test.describe('F03 도보 · F04 택시', () => {
  test('F03-H1 도보 모드 결과와 도보 안내 시작', async ({ page }) => {
    await boot(page, '#/route?to=station:wangjing&mode=walk');
    await expect(page.locator('.route-card').first()).toContainText('kcal', { timeout: 10000 });
    await page.locator('.route-card').first().click();
    await page.getByRole('link', { name: '도보 안내 시작' }).click();
    await expect(page).toHaveURL(/#\/walk/);
    await expect(page.getByRole('button', { name: '안내 종료' })).toBeVisible();
    await expect(page.locator('.walk-nav')).toContainText(/m|km/, { timeout: 10000 });
    await page.getByRole('button', { name: '안내 종료' }).click();
    await expect(page.locator('.walk-nav')).toHaveCount(0);
  });
  test('F03-E1 안내 중 위치 권한 없음', async ({ page, context }) => {
    await context.clearPermissions();
    await boot(page, '#/walk?to=station:wangjing');
    await expect(page.locator('.walk-nav')).toContainText(/위치/, { timeout: 10000 });
  });
  test('F04-H1 택시 요금 추정과 기사 카드', async ({ page }) => {
    await boot(page, '#/route?from=station:wangjing&to=place:gugong&mode=taxi');
    const card = page.locator('.route-card').first();
    await expect(card).toContainText(/¥\d+~\d+/, { timeout: 10000 });
    await card.click();
    await page.getByRole('button', { name: /기사에게 보여주기/ }).click();
    const dlg = page.getByRole('dialog', { name: '기사에게 보여주는 카드' });
    await expect(dlg).toContainText('故宫博物院');
    await expect(dlg).toContainText('北京市东城区景山前街4号');
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
  });
});
