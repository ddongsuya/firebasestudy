import { test, expect, boot, go, a11y } from './fixtures.mjs';

test.describe('F07 지도 선택 · F08 중국어 보여주기 · 더보기', () => {
  test('F07-H1 지도에서 지점 골라 길찾기', async ({ page }) => {
    await boot(page, '#/pick?for=view&lat=39.9177&lon=116.3970');
    await expect(page.getByRole('heading', { name: /자금성|근처/ })).toBeVisible();
    await page.getByRole('dialog', { name: '상세' }).getByRole('link', { name: '여기로' }).click();
    await expect(page).toHaveURL(/#\/route\?to=pt:/);
    await expect(page.locator('.route-card').first()).toBeVisible({ timeout: 10000 });
  });
  test('F07-E1 지점 저장', async ({ page }) => {
    await boot(page, '#/pick?for=view&lat=39.95&lon=116.40');
    await page.getByRole('dialog', { name: '상세' }).getByRole('button', { name: '저장' }).click();
    await expect(page).toHaveURL(/#\/fav/);
    await expect(page.getByText(/근처|지점/).first()).toBeVisible();
  });
  test('F08-H1 장소 카드 → 기사 카드, 역 카드 → 기사 카드', async ({ page }) => {
    await boot(page, '#/place/gugong');
    await page.getByRole('dialog', { name: '상세' }).getByRole('button', { name: /기사 카드/ }).click();
    const dlg = page.getByRole('dialog', { name: '기사에게 보여주는 카드' });
    await expect(dlg).toContainText('故宫博物院');
    await dlg.getByRole('button', { name: /닫기/ }).click();
    await go(page, '#/station/wangjing');
    await expect(page.getByRole('heading', { name: /왕징역/ })).toBeVisible();
    await a11y(page, 'S13');
    await page.getByRole('dialog', { name: '상세' }).getByRole('button', { name: /기사 카드/ }).click();
    await expect(dlg).toContainText('望京站');
  });
  test('F08-E1 중국어 카드를 누르면 크게 보기', async ({ page }) => {
    await boot(page, '#/place/gugong');
    await page.getByRole('button', { name: /크게 보기/ }).click();
    await expect(page.getByRole('dialog', { name: '기사에게 보여주는 카드' })).toContainText('北京市东城区景山前街4号');
  });
  test('더보기: 회화 크게 보기, 설정 변경, 데이터 복구', async ({ page }) => {
    await boot(page, '#/more');
    await a11y(page, 'S12');
    await page.getByRole('button', { name: /회화/ }).click();
    await page.getByRole('button', { name: '크게 보기' }).first().click();
    await expect(page.getByRole('dialog', { name: '기사에게 보여주는 카드' })).toContainText('请');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: '뒤로' }).click();
    await page.getByRole('button', { name: /설정/ }).click();
    await page.getByLabel('다크').check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: '뒤로' }).click();
    await page.getByRole('button', { name: /내 데이터/ }).click();
    const ta = page.getByLabel('내 데이터 JSON');
    await ta.fill('{"v":2,"favorites":[{"id":"x1","place_id":"gugong","folder_id":null,"note_ko":"","tags":[],"created_at":"2026-01-01T00:00:00Z"}],"folders":[],"frequent":{},"history":[],"settings":{}}');
    await page.getByRole('button', { name: '붙여넣은 내용으로 복구' }).click();
    await go(page, '#/fav');
    await expect(page.locator('#panel').getByText('자금성').first()).toBeVisible();
  });
});

test.describe('오프라인 지도 저장', () => {
  test('보이는 지역 저장 버튼이 타일을 내려받는다', async ({ page }) => {
    test.setTimeout(90000);
    await boot(page, '#/more?v=offline');
    await expect(page.getByRole('heading', { name: '오프라인 지도' })).toBeVisible();
    await page.getByRole('button', { name: /지금 보이는 지역 저장/ }).click();
    await expect(page.locator('#offProg')).toContainText(/완료/, { timeout: 60000 });
  });
});

test.describe('S13 출구 안내', () => {
  test('역 카드에 출구 목록, 장소 카드에 맞는 출구', async ({ page }) => {
    await boot(page, '#/station/wangfujing');
    await expect(page.getByRole('dialog', { name: '상세' })).toContainText(/출구 \d+개/);
    await expect(page.getByRole('dialog', { name: '상세' })).toContainText('동북쪽');
    await go(page, '#/place/tiantan');
    await expect(page.getByRole('dialog', { name: '상세' })).toContainText(/A\d?번 출구/);
  });
});
