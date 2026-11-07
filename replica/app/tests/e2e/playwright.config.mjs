// 실행: npx playwright test --config tests/e2e/playwright.config.mjs --trace off
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.mjs/,
  timeout: 30000,
  retries: 0,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8765',
    locale: 'ko-KR', timezoneId: 'Asia/Seoul',
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
    geolocation: { latitude: 39.9935, longitude: 116.4620 }, // 왕징 근처(WGS-84)
    permissions: ['geolocation'],
    trace: 'off', screenshot: 'only-on-failure',
    serviceWorkers: 'block', // page.route가 타일 요청을 가로채도록(SW는 수동 테스트 PWA-1에서 확인)
  },
  webServer: { command: 'python3 -m http.server 8765 --bind 127.0.0.1', url: 'http://127.0.0.1:8765/index.html', reuseExistingServer: true, cwd: new URL('../..', import.meta.url).pathname },
  projects: [{ name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true } }],
});
