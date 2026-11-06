// 공용 픽스처: 정적 서버, SwiftShader WebGL, CDN three.js 로컬 대체, 에러 수집
import {test as base, expect, chromium, type Page} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {startServer} from './server';

const THREE_LOCAL = path.resolve(__dirname, '../vendor/three.min.js');
export const OUT = path.resolve(__dirname, '../out');
const ARGS = [
  '--use-angle=swiftshader',
  '--use-gl=angle',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
  '--enable-webgl',
];

/** index.html 응답의 module 진입점을 boot.js 로 치환한다 (index.html 실제 변경과 동일한 한 줄) */
export async function bootRoute(page: Page): Promise<void> {
  await page.route(/\/(index\.html)?(\?.*)?$/, async route => {
    const res = await route.fetch(),
      body = (await res.text()).replace('src="js/main.js"', 'src="js/boot.js"');
    await route.fulfill({response: res, body});
  });
}

export interface Problems {
  console: string[];
  pageerrors: string[];
  failed: string[];
}
export interface Game {
  page: Page;
  base: string;
  problems: Problems;
  open: (query?: string) => Promise<void>;
}

export const test = base.extend<{game: Game}, {server: {url: string}}>({
  server: [
    async ({}, use) => {
      const s = await startServer();
      await use(s);
      await s.close();
    },
    {scope: 'worker'},
  ],
  game: async ({server}, use) => {
    fs.mkdirSync(OUT, {recursive: true});
    const browser = await chromium.launch({args: ARGS});
    const ctx = await browser.newContext({viewport: {width: 1024, height: 640}});
    const page = await ctx.newPage();
    const problems: Problems = {console: [], pageerrors: [], failed: []};
    page.on('console', m => m.type() === 'error' && problems.console.push(m.text()));
    page.on('pageerror', e => problems.pageerrors.push(String(e)));
    page.on('requestfailed', r => problems.failed.push(`${r.url()} ${r.failure()?.errorText}`));
    // CDN three.js 는 로컬 사본으로 대체 (오프라인 대비)
    await page.route(/cdnjs\.cloudflare\.com\/.*three(\.min)?\.js/, r =>
      r.fulfill({path: THREE_LOCAL, contentType: 'text/javascript'}),
    );
    // BOOT_JS=1: index.html 의 진입점을 js/main.js → js/boot.js 로 바꿔 서빙한다(root 가 index.html 을 바꾸기 전에, 높이 JSON 구동 경로로 기존 spec 을 돌려 보는 용도)
    if (process.env.BOOT_JS === '1') await bootRoute(page);
    const open = async (query = '') => {
      // C01 자동 재생(20s, 입력 잠금)이 다른 E2E 를 막지 않도록 기본은 ?cine=0 — 컷신 테스트는 ?cine=1 을 직접 준다
      const q = /cine=/.test(query) ? query : query ? `${query}&cine=0` : '?cine=0';
      await page.goto(`${server.url}/${q}`);
      await page.waitForSelector('#menu.on');
      // boot.js 경로는 main 을 동적 import 하므로 메뉴가 먼저 보일 수 있다 — initWorld 가 끝나(G.renderer) 디버그 훅을 쓸 수 있을 때까지 기다린다
      if (process.env.BOOT_JS === '1' && /debug=1/.test(q)) await page.waitForFunction(() => !!(window as any).__game?.G?.renderer, undefined, {timeout: 20000});
    };
    await use({page, base: server.url, problems, open});
    await browser.close();
  },
});

/** /api/* 404 는 의도된 것이므로 콘솔 error 에서 제외 */
export const unexpected = (p: Problems) => ({
  console: p.console.filter(t => !/Failed to load resource.*404/.test(t)),
  pageerrors: p.pageerrors,
  failed: p.failed,
});
export {expect};

/** 캔버스를 2D 로 복사해 서로 다른 색 개수를 센다 */
export async function canvasColors(page: Page): Promise<number> {
  // preserveDrawingBuffer 가 꺼져 있으므로 렌더 직후(같은 rAF 틱)에 복사해야 한다
  return page.evaluate(() => new Promise<number>(res => requestAnimationFrame(() => {
    const src = document.querySelector('canvas') as HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 40;
    const x = c.getContext('2d')!;
    x.drawImage(src, 0, 0, 64, 40);
    const d = x.getImageData(0, 0, 64, 40).data;
    const set = new Set<number>();
    for (let i = 0; i < d.length; i += 4) set.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4));
    res(set.size);
  })));
}
