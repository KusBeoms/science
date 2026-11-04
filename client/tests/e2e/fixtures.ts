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
    const open = async (query = '') => {
      await page.goto(`${server.url}/${query}`);
      await page.waitForSelector('#menu.on');
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
