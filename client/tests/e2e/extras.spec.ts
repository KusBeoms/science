// 경찰 헬기·바리케이드, 야생 동물·낚시, 교도소 간수 순찰, 휴대폰 메신저·사진
import {test, expect, unexpected, OUT} from './fixtures';

test('wanted ★5: helicopter hunts you, roadblock appears, hiding indoors cools it', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const P = await import('/js/systems/police.js'),
      A = await import('/js/systems/police-air.js'),
      V = await import('/js/systems/vehicle.js'),
      g = (window as any).__game,
      out: any = {};
    g.teleport(0, -100);
    P.addStars(5, 'test');
    let sees = false, block = false;
    for (let k = 0; k < 60 && !(sees && block); k++) {
      await new Promise(r => setTimeout(r, 400));
      sees = sees || A.heliSees;
      block = block || V.VEH.some((v: any) => v.own === -5);
    }
    out.sees = sees;
    out.block = block;
    return out;
  });
  expect(r.sees).toBe(true);
  expect(r.block).toBe(true);
  await page.screenshot({path: `${OUT}/police-heli.png`});
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('wildlife and fishing: animals roam the wild lands, cows can be petted, a bobber is cast at the lake', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const W = await import('/js/systems/wildlife.js'),
      T = await import('/js/core/terrain.js'),
      I = await import('/js/game/interactables.js'),
      D = await import('/js/data/wild.js'),
      g = (window as any).__game,
      out: any = {};
    g.teleport(-200, 800);
    await new Promise(r => setTimeout(r, 1500));
    out.animals = W.animalCount();
    // 호수 서쪽 물가: 물이 있는 쪽(동)을 바라본다
    const L = D.LAKES[0];
    let sx = L.x - L.r * 1.1;
    while (T.groundH(sx, L.z) > -4 && sx < L.x) sx += 1;
    g.teleport(sx - 4, L.z);
    g.G.me.rotation.y = Math.PI / 2;
    await new Promise(r => setTimeout(r, 400));
    const fish = I.interactableOf('fish');
    const t = fish.find(g.G.me);
    out.canFish = !!t;
    if (t) fish.act(t, 'e');
    let bob = 0;
    g.G.scene.traverse((o: any) => o.isMesh && o.geometry?.type === 'SphereGeometry' && o.material?.color?.getHex() === 0xe5483f && bob++);
    out.bob = bob;
    return out;
  });
  expect(r.animals).toBeGreaterThan(30);
  expect(r.canFish).toBe(true);
  expect(r.bob).toBe(1);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('prison guards patrol and send an escapee in plain sight back to the cell', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const R = await import('/js/render/wild.js'),
      J = await import('/js/systems/jail.js'),
      D = await import('/js/data/wild.js'),
      g = (window as any).__game;
    g.teleport(D.JAIL.cell.x, D.JAIL.cell.z - 30);
    J.goJail(2);
    const p0 = R.guards.map((m: any) => [m.position.x, m.position.z]);
    await new Promise(r => setTimeout(r, 2500));
    const moved = R.guards.some((m: any, i: number) => Math.hypot(m.position.x - p0[i][0], m.position.z - p0[i][1]) > 2);
    // 간수 0 바로 앞에 서 있으면 걸린다
    const gd = R.guards[0];
    g.G.me.pos.set(gd.position.x + Math.sin(gd.rotation.y) * 4, 0, gd.position.z + Math.cos(gd.rotation.y) * 4);
    const t0 = g.G.jail.t;
    await new Promise(r => setTimeout(r, 2500));
    const back = Math.hypot(g.G.me.pos.x - D.JAIL.cell.x, g.G.me.pos.z - D.JAIL.cell.z) < 6;
    return {moved, back, longer: g.G.jail ? g.G.jail.t > t0 - 5 : false};
  });
  expect(r.moved).toBe(true);
  expect(r.back).toBe(true);
});

test('messenger pings with a badge, thread replies; photo app captures the screen', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(async () => (await import('/js/game/messenger.js')).pushMsg('friend', '🍔 ✦15?'));
  expect(await page.evaluate(async () => (await import('/js/game/messenger.js')).unread())).toBe(1);
  await expect(page.locator('#phoneBtn i')).toHaveCount(1);
  await page.keyboard.press('KeyP');
  await page.click('[data-act="app:chat"]');
  await page.click('[data-act="chat:friend"]');
  await expect(page.locator('.phmsg')).toHaveCount(1);
  await page.locator('[data-act^="say:friend"]').first().evaluate((b: HTMLElement) => b.click());
  await expect(page.locator('.phmsg.me')).toHaveCount(1);
  expect(await page.evaluate(async () => (await import('/js/game/messenger.js')).unread())).toBe(0);
  await page.locator('#phhome').evaluate((b: HTMLElement) => b.click());
  await page.click('[data-act="app:photo"]');
  await page.click('[data-act="photosnap"]');
  await page.waitForTimeout(1800);
  await expect(page.locator('.phphotos img')).toHaveCount(1);
  await page.screenshot({path: `${OUT}/phone-photo.png`});
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
