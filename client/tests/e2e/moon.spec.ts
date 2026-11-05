// 시작 연출: 새 게임은 달 도착 연출 → 달 구역 해금 + 달 포탈 패드 옆에서 시작
import {test, expect} from './fixtures';

test('new game: moon arrival intro, skippable, then starts unlocked on the moon', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1&cine=1');
  await page.click('#mstart');
  await expect(page.locator('#moonintro')).toHaveCount(1);
  await page.keyboard.press('Space');
  await expect(page.locator('#moonintro')).toHaveCount(0);
  const r = await page.evaluate(() => {
    const g = (window as any).__game;
    return {unlocked: !!g.S.unlocked.solar, portal: !!g.S.portals.solar, z: g.G.me.pos.z, x: g.G.me.pos.x};
  });
  expect(r.unlocked).toBe(true);
  expect(r.portal).toBe(true);
  expect(r.z).toBeLessThan(-180); // 달(S1) 안
});
