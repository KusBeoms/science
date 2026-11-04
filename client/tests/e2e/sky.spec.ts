// 하늘 W1: 스폰에서 정북을 보면 사과 천체가 프레임 중앙 상단에 보인다 · 낮밤 틴트 · 삼각형 예산
import {test, expect, unexpected, OUT} from './fixtures';

const W = 256,
  H = 160;

/** 캔버스를 256x160 으로 줄여 붉은(사과·후광) 픽셀의 개수와 중심(0..1)을 돌려준다 */
async function redBlob(page: any, maxY = 1) {
  return page.evaluate(
    ([w, h, my]: number[]) =>
      new Promise<{n: number; cx: number; cy: number; top: number[]}>(res =>
        requestAnimationFrame(() => {
          const src = document.querySelector('canvas') as HTMLCanvasElement,
            c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const x = c.getContext('2d')!;
          x.drawImage(src, 0, 0, w, h);
          const d = x.getImageData(0, 0, w, h).data;
          let n = 0, sx = 0, sy = 0;
          for (let i = 0; i < d.length; i += 4) {
            if (i / 4 / w >= h * my) break; // 아래쪽(건물 지붕)은 세지 않는다
            if (d[i] > 70 && d[i] > d[i + 1] * 2 && d[i] > d[i + 2] * 2) {
              n++;
              sx += (i / 4) % w;
              sy += Math.floor(i / 4 / w);
            }
          }
          const p = (px: number, py: number) => Array.from(d.slice((py * w + px) * 4, (py * w + px) * 4 + 3));
          res({n, cx: n ? sx / n / w : -1, cy: n ? sy / n / h : -1, top: p(w / 2, 4)});
        }),
      ),
    [W, H, maxY],
  );
}

const look = (page: any, js: string) =>
  page.evaluate(`(() => { const g = window.__game.G; ${js}; })()`);

test('spawn north view: the apple sits at the top centre of the frame, in day and night', async ({game}) => {
  const {page, problems} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await look(page, 'g.cycT = 100; g.night = 0; g.yaw = 0; g.pitch = 0.1');
  await page.waitForTimeout(600);
  const day = await redBlob(page);
  await page.screenshot({path: `${OUT}/sky-day-north.png`});
  console.log(`SKY day n=${day.n} cx=${day.cx.toFixed(2)} cy=${day.cy.toFixed(2)}`);
  expect(day.n).toBeGreaterThan(40);
  expect(day.cx).toBeGreaterThan(0.4);
  expect(day.cx).toBeLessThan(0.6);
  expect(day.cy).toBeGreaterThan(0.05);
  expect(day.cy).toBeLessThan(0.4);

  await look(page, 'g.yaw = Math.PI'); // 정남: 사과가 없다
  await page.waitForTimeout(400);
  expect((await redBlob(page, 0.35)).n).toBeLessThan(5); // 하늘 영역만: 남쪽 건물의 붉은 기와는 제외

  await look(page, 'g.yaw = 0; g.cycT = 5; g.night = 6');
  await page.waitForTimeout(600);
  const night = await redBlob(page);
  await page.screenshot({path: `${OUT}/sky-night-north.png`});
  expect(night.n).toBeGreaterThan(40);
  expect(night.cx).toBeGreaterThan(0.4);
  expect(night.cx).toBeLessThan(0.6);
  expect(night.top[2]).toBeLessThan(day.top[2]); // 밤 하늘은 낮보다 어둡다 (파랑 채널)

  const u = unexpected(problems);
  expect(u.pageerrors).toEqual([]);
  expect(u.console).toEqual([]);
});

test('day/night tint follows the cycle and the sky stays inside its triangle budget', async ({game}) => {
  await game.page.goto(`${game.base}/?cine=0`);
  const r = await game.page.evaluate(async () => {
    const D = await import('./js/systems/daynight.js');
    const P = await import('./js/render/lowpoly/palette.js');
    const A = await import('./js/render/apple.js');
    const M = await import('./js/render/lowpoly/merge.js');
    return {
      day: D.tintAt(100, 0, 0).sky === P.TINT.day.sky,
      night: D.tintAt(5, 6, 0).sky === P.TINT.night.sky,
      duskBetween: D.tintAt(270, 0, 0).sky === P.TINT.dusk.sky,
      dawnStart: D.tintAt(20, 0, 4).sky === P.TINT.night.sky,
      nightStart: D.tintAt(0, 12, 0).sky !== P.TINT.night.sky,
      appleTris: M.countTris(A.buildApple().group),
    };
  });
  expect(r.day && r.night && r.duskBetween && r.dawnStart && r.nightStart).toBe(true);
  expect(r.appleTris).toBeGreaterThan(200);
  expect(r.appleTris).toBeLessThanOrEqual(600);
});
