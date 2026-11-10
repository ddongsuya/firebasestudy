import { test, expect, boot, go, a11y } from './fixtures.mjs';

test.describe('F01 장소 검색 → 상세 → 길찾기', () => {
  test('F01-H1 한글 검색으로 자금성 찾고 길찾기까지', async ({ page }) => {
    await boot(page);
    await a11y(page, 'S01');
    const q = page.getByRole('searchbox', { name: '장소 검색' });
    await q.click();
    await expect(page.getByRole('button', { name: /내 주변에서 찾기/ })).toBeVisible();
    await q.fill('자금성');
    await page.getByRole('button', { name: /자금성 \(고궁박물원\)/ }).first().click();
    await expect(page).toHaveURL(/#\/place\/gugong/);
    await expect(page.getByRole('dialog', { name: '상세' }).getByRole('heading', { name: /자금성/ })).toBeVisible();
    await a11y(page, 'S04');
    await page.getByRole('dialog', { name: '상세' }).getByRole('link', { name: '길찾기', exact: true }).click();
    await expect(page).toHaveURL(/#\/route\?to=place:gugong/);
    await expect(page.locator('.route-card').first()).toBeVisible({ timeout: 10000 });
  });
  test('F01-H2 중국어·병음으로도 같은 결과', async ({ page }) => {
    await boot(page);
    const q = page.getByRole('searchbox', { name: '장소 검색' });
    await q.click(); await q.fill('故宫');
    await expect(page.getByRole('button', { name: /자금성/ }).first()).toBeVisible();
    await q.fill('gugong');
    await expect(page.getByRole('button', { name: /자금성/ }).first()).toBeVisible();
  });
  test('F01-E1 결과 0건이면 빈 상태와 주변 버튼', async ({ page }) => {
    await boot(page);
    const q = page.getByRole('searchbox', { name: '장소 검색' });
    await q.click(); await q.fill('zzzz없는곳🧧');
    await expect(page.getByRole('heading', { name: /못 찾았어요/ })).toBeVisible();
    await expect(page.getByRole('button', { name: '주변에서 찾기' })).toBeVisible();
  });
  test('F01-E2 아주 긴 입력도 깨지지 않음', async ({ page }) => {
    await boot(page);
    const q = page.getByRole('searchbox', { name: '장소 검색' });
    await q.click(); await q.fill('자금성'.repeat(30));
    await expect(page.getByRole('heading', { name: /못 찾았어요/ })).toBeVisible();
  });
  test('F01-E3 키보드만으로 검색 → 상세', async ({ page }) => {
    await boot(page);
    await page.getByRole('searchbox', { name: '장소 검색' }).focus();
    await page.keyboard.type('천단');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/place\/tiantan/);
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/#\/$/);
  });
  test('F01-E4 최근 검색이 남는다', async ({ page }) => {
    await boot(page);
    const q = page.getByRole('searchbox', { name: '장소 검색' });
    await q.click(); await q.fill('이화원'); await page.locator('#results').getByRole('button', { name: /이화원/ }).first().click();
    await go(page, '#/');
    await q.click();
    await page.getByRole('button', { name: '지우기' }).click();
    await expect(page.locator('#results').getByRole('button', { name: '이화원', exact: true })).toBeVisible();
  });
  test('F01-E5 새로고침해도 같은 장소가 열린다', async ({ page }) => {
    await boot(page, '#/place/tiantan');
    await expect(page.getByRole('heading', { name: /천단공원/ })).toBeVisible();
    await page.reload(); await page.waitForSelector('#chips .chip', { state: 'attached' });
    await expect(page.getByRole('heading', { name: /천단공원/ })).toBeVisible();
  });
});

test.describe('S03 검색 결과 화면', () => {
  test('F01-H3 결과가 여러 개면 Enter로 지도+리스트 결과 화면', async ({ page }) => {
    await boot(page);
    const q = page.getByRole('searchbox', { name: '장소 검색' });
    await q.click(); await q.fill('공원'); await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/search\?q=/);
    const dlg = page.getByRole('dialog', { name: '상세' });
    await expect(dlg.getByRole('heading', { name: /검색 결과/ })).toBeVisible();
    await dlg.getByRole('button', { name: '이름순' }).click();
    await expect(dlg.getByRole('button', { name: '이름순' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: '시트 펼치기' }).click();   // 절반 높이에서는 아래 목록이 가려져 있음
    await dlg.getByRole('button', { name: /^천단공원 天坛公园/ }).click();
    await expect(page).toHaveURL(/#\/place\/tiantan/);
  });
});
