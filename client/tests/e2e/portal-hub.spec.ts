// W6 포탈: 도시 포탈 광장 E → 우주 지도 · 잠긴 섹터 → 해금 검토 UI · 퀴즈 통과 → 해금 + 이동 · 귀환
import {test, expect, unexpected, OUT} from './fixtures';
import path from 'node:path';

const G = (page: any, fn: string) => page.evaluate(`(() => { const g = window.__game; return (${fn}); })()`);
const near = (a: number, b: number, r: number) => Math.abs(a - b) < r;

async function toPlaza(page: any) {
  await page.evaluate(() => {
    const g = (window as any).__game,
      p = g.G.pads.hub;
    g.teleport(p.x + 4, p.z + 1);
  });
  await page.waitForTimeout(600);
}
const pressE = async (page: any) => {
  await page.keyboard.down('KeyE');
  await page.keyboard.up('KeyE');
};

test('plaza E opens star map; locked sector opens review; quiz pass unlocks and warps; return portal', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await toPlaza(page);
  await page.screenshot({path: path.join(OUT, 'portal-plaza.png')});

  await pressE(page);
  await expect(page.locator('#portal.on')).toHaveCount(1);
  await expect(page.locator('#plist .sm-card')).toHaveCount(13); // 도시 + 12 섹터
  await page.screenshot({path: path.join(OUT, 'portal-map.png')});

  // 잠긴 S1(달) → 해금 검토: 조건 없음 → 시험 버튼이 켜져 있다
  await page.click('#plist .sm-card[data-id="solar"]');
  await expect(page.locator('#plist.sm-review')).toHaveCount(1);
  await expect(page.locator('.sm-go')).toBeEnabled();
  await page.screenshot({path: path.join(OUT, 'portal-review-open.png')});
  await page.click('.sm-back');
  // 잠긴 S2(소행성대): 앞 섹터 + 도감 조건 미충족 → 시험 비활성, 막대 표시
  await page.click('#plist .sm-card[data-id="belt"]');
  await expect(page.locator('.sm-req.no').first()).toBeVisible();
  await expect(page.locator('.sm-go')).toBeDisabled();
  await page.screenshot({path: path.join(OUT, 'portal-review-locked.png')});
  await page.click('.sm-back');

  // S1 시험: 3문제 중 2문제 → 해금 + 달 섬으로 이동
  await page.click('#plist .sm-card[data-id="solar"]');
  await page.click('.sm-go');
  await expect(page.locator('#quiz.on')).toHaveCount(1);
  for (let k = 0; k < 3; k++) {
    await page.evaluate(() => {
      const g = (window as any).__game, c = g.G.quizCtx;
      const j = c.cur.opts.findIndex((o: any) => o.ok);
      (document.querySelectorAll('#qo button')[j] as HTMLElement).click();
    });
    await page.keyboard.press('Space');
    if (!(await page.locator('#quiz.on').count())) break;
  }
  await expect(page.locator('#quiz.on')).toHaveCount(0);
  expect(await G(page, '!!g.S.unlocked.solar && !!g.S.portals.solar')).toBe(true);
  const pad = await G(page, '({x: g.G.pads.solar.x, z: g.G.pads.solar.z, px: g.G.me.pos.x, pz: g.G.me.pos.z})');
  expect(near(pad.px, pad.x, 6) && near(pad.pz, pad.z, 8)).toBe(true);

  // 달 섬 입구 패드에서 E → 지도 → 도시 귀환
  await page.waitForTimeout(800);
  await page.screenshot({path: path.join(OUT, 'portal-moon-arrive.png')});
  await pressE(page);
  await expect(page.locator('#portal.on')).toHaveCount(1);
  await expect(page.locator('#plist .sm-card.here')).toHaveCount(1);
  await page.click('#plist .sm-card[data-id="hub"]');
  const hub = await G(page, '({x: g.G.pads.hub.x, z: g.G.pads.hub.z, px: g.G.me.pos.x, pz: g.G.me.pos.z})');
  expect(near(hub.px, hub.x, 6) && near(hub.pz, hub.z, 8)).toBe(true);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('belt review becomes ready when prev + dex are met; already-unlocked sectors open directly', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.S.unlocked.solar = 1;
    for (let i = 0; i < 6; i++) g.S.dex[i] = 1;
  });
  await toPlaza(page);
  await pressE(page);
  await page.click('#plist .sm-card[data-id="belt"]');
  await expect(page.locator('.sm-go')).toBeEnabled();
  await page.click('.sm-back');
  await page.click('#plist .sm-card[data-id="solar"]'); // 열린 섹터는 검토 없이 바로 이동
  await expect(page.locator('#portal.on')).toHaveCount(0);
  const r = await G(page, '({z: g.G.me.pos.z, pad: g.G.pads.solar.z})');
  expect(near(r.z, r.pad, 8)).toBe(true);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
