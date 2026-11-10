// 2026-11-10 전체 기능 점검에서 찾은 오류 재발 방지
import { test, expect, boot, go } from './fixtures.mjs';

test.describe('점검 수정', () => {
  test('역 상세의 "이 역 근처" 항목을 누르면 장소가 열린다(처음 연 화면에서도)', async ({ page }) => {
    await boot(page, '#/station/wangjing');
    await page.locator('#sheetBody [data-go^="#/place/"]').first().dispatchEvent('click');
    await expect(page).toHaveURL(/#\/place\//);
  });
  test('검색 결과 정렬을 여러 번 바꿔도 항목 클릭은 한 번만 처리', async ({ page }) => {
    await boot(page, '#/search?q=' + encodeURIComponent('공원'));
    for (let i = 0; i < 4; i++) await page.locator('#sheetBody [data-sort]').nth(i % 2).click();
    const calls = await page.evaluate(() => { let c = 0; const o = app.go; app.go = h => { c++; o.call(app, h); }; document.querySelector('#sheetBody [data-go^="#/place/"]').click(); app.go = o; return c; });
    expect(calls).toBe(1);
  });
  test('출발 시각은 주소에 남고, 다른 길찾기로 가면 "지금 출발"로 돌아간다', async ({ page }) => {
    await boot(page, '#/route?to=place:gugong');
    await expect(page.locator('.route-card').first()).toBeVisible({ timeout: 10000 });
    await page.locator('[data-depart]').click();
    await page.locator('#psInput').fill('23:30'); await page.locator('#psOk').click();
    await expect(page).toHaveURL(/at=23%3A30/);
    await expect(page.locator('[data-depart]')).toContainText('23:30');
    await go(page, '#/route?to=place:tiantan');
    await expect(page.locator('[data-depart]')).toContainText('지금 출발');
  });
  test('지도 핀 고르기에서 지도를 움직인 뒤 다른 탭으로 가면 핀이 사라진다', async ({ page }) => {
    await boot(page, '#/pick?for=view');
    await page.evaluate(() => window.app && document.querySelector('#map') && 0);
    await page.mouse.move(195, 300); await page.mouse.down(); await page.mouse.move(150, 260, { steps: 5 }); await page.mouse.up();
    await page.waitForTimeout(400);
    await go(page, '#/fav');
    await expect(page.locator('.pick-pin')).toBeHidden();
    await expect(page.locator('body')).not.toHaveClass(/picking/);
  });
});
