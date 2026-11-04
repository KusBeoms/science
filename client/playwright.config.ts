// E2E 설정: 정적 서버는 tests/e2e/fixtures.ts 가 워커마다 띄운다
import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'tests/out/results',
  timeout: 90_000,
  workers: 1,
  reporter: [['list']],
  use: {viewport: {width: 1024, height: 640}},
});
