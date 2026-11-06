// 휴대폰: P 로 열기, 인터넷 사이트(부동산 구매·딜러·상점), 지도 길안내, 택시, 배달, 내 차 호출
import {test, expect, unexpected, OUT} from './fixtures';

test('phone: P opens, estate.web buys a building (income), taxi warps, food delivery, map waypoint', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => ((window as any).__game.S.cr = 1e6));
  await page.keyboard.press('KeyP');
  await expect(page.locator('#phone')).toHaveClass(/on/);
  await page.waitForTimeout(700); // 튀어나오는 애니메이션이 끝난 뒤 촬영
  await page.screenshot({path: `${OUT}/phone-home.png`});
  // 부동산
  await page.click('[data-act="app:web:estate"]');
  await expect(page.locator('#phurl')).toHaveText('estate.web');
  const before = await page.evaluate(() => (window as any).__game.S.cr);
  await page.locator('[data-act^="buy:"]').first().click();
  const after = await page.evaluate(() => ({cr: (window as any).__game.S.cr, props: Object.keys((window as any).__game.S.props).length}));
  expect(after.props).toBe(1);
  expect(after.cr).toBeLessThan(before);
  await page.screenshot({path: `${OUT}/phone-estate.png`});
  // 수익이 흐른다
  const c0 = await page.evaluate(() => (window as any).__game.S.cr);
  await page.keyboard.press('Escape');
  await expect(page.locator('#phone')).not.toHaveClass(/on/);
  await page.waitForTimeout(3000);
  expect(await page.evaluate(() => (window as any).__game.S.cr)).toBeGreaterThanOrEqual(c0);
  // 지도 + 길안내
  await page.click('#phoneBtn');
  await page.click('[data-act="app:map"]');
  await expect.poll(() => page.evaluate(async () => (await import('/js/game/world-map.js')).worldMapState().phase)).toBe('open');
  await expect(page.locator('#wm-canvas')).toBeVisible();
  await page.locator('#wm-search').fill('경기장');
  await page.locator('#wm-places button[data-place-id="stadium"]').click();
  await expect(page.locator('#wm-detail')).toContainText('경기장');
  await page.screenshot({path: `${OUT}/phone-map.png`});
  await page.locator('#wm-waypoint').click();
  await expect(page.locator('#lines')).toContainText('경기장');
  // 택시: 경기장
  const mapOpen = await page.evaluate(async () => (await import('/js/game/world-map.js')).worldMapState().phase !== 'closed');
  if (mapOpen) await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(async () => (await import('/js/game/world-map.js')).worldMapState().phase)).toBe('closed');
  await page.keyboard.press('KeyP');
  await expect(page.locator('#phone')).toHaveClass(/on/);
  await page.click('[data-act="app:taxi"]');
  await page.locator('[data-act="taxi:stadium"]').click();
  await expect(page.locator('#phone')).not.toHaveClass(/on/);
  const p = await page.evaluate(() => ({x: (window as any).__game.G.me.pos.x, z: (window as any).__game.G.me.pos.z}));
  expect(Math.hypot(p.x - 270, p.z + 203)).toBeLessThan(5);
  // 배달
  await page.keyboard.press('KeyP');
  await page.click('[data-act="app:food"]');
  await page.evaluate(() => ((window as any).__game.G.stam = 10));
  await page.locator('[data-act="food:burger"]').click();
  expect(await page.evaluate(() => (window as any).__game.G.stam)).toBeGreaterThan(50);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('phone websites open the shop and the car dealer; calling my car places it nearby', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => ((window as any).__game.S.cr = 1e6));
  await page.keyboard.press('KeyP');
  await page.click('[data-act="app:web"]');
  await page.click('[data-act="app:web:mart"]');
  await page.click('[data-act="shop:spr"]');
  await expect(page.locator('#shop')).toHaveClass(/on/);
  await page.keyboard.press('Escape');
  await page.keyboard.press('KeyP');
  await page.click('[data-act="app:web"]');
  await page.click('[data-act="app:web:cars"]');
  await page.click('[data-act="car:buy"]');
  await expect(page.locator('#carshop')).toHaveClass(/on/);
  await page.locator('#csgrid > button').first().click(); // 첫 차 구매
  expect(await page.evaluate(() => (window as any).__game.S.cars.list.length)).toBe(1);
  await page.keyboard.press('Escape');
  await page.keyboard.press('KeyP');
  await page.click('[data-act="app:cars"]');
  await page.locator('[data-act^="call:"]').first().click();
  const near = await page.evaluate(async () => {
    const V = await import('/js/systems/vehicle.js'), g = (window as any).__game;
    const v = V.VEH.find((x: any) => x.own === 0);
    return Math.hypot(v.x - g.G.me.pos.x, v.z - g.G.me.pos.z);
  });
  expect(near).toBeLessThan(12);
});
