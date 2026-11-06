// 건물 내부 입장·퇴장, 차 15종 모델, 길가 차 훔치기·운전·내리기, 구매·내 차로 만들기·등록·튜닝·차고
import {test, expect, unexpected, OUT} from './fixtures';

test('every building is enterable: walk in, furniture blocks, leave through the door', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const I = await import('/js/data/interiors.js'),
      B = await import('/js/game/interior.js'),
      T = await import('/js/core/terrain.js'),
      g = (window as any).__game;
    const kinds = new Set(I.ENTERABLES.map((e: any) => e.purpose));
    const out: any = {n: I.ENTERABLES.length, kinds: [...kinds].sort(), fails: [] as any[]};
    for (let i = 0; i < I.ENTERABLES.length; i++) {
      const e = I.ENTERABLES[i];
      const blockedDoor = T.solidAt(e.door.x,e.door.z,.5,e.door.y ?? T.groundH(e.door.x,e.door.z));
      B.enterBuilding(i);
      const ok = g.G.inside && Math.abs(g.G.me.pos.x - 1500) < e.w && T.groundH(g.G.me.pos.x, g.G.me.pos.z) === 0;
      const wall = T.solidAt(1500 + e.w / 2 + 0.1, 1500, 0.4); // 벽 밖은 막힘
      B.leaveBuilding();
      const distance = Math.hypot(g.G.me.pos.x - e.door.x, g.G.me.pos.z - e.door.z);
      const back = !g.G.inside && (distance < .5 || (blockedDoor && distance <= 7.1 && !T.solidAt(g.G.me.pos.x,g.G.me.pos.z,.42,g.G.me.pos.y)));
      if (!ok || !wall || !back) out.fails.push({id:e.id,ok,wall,back,door:e.door,position:g.G.me.pos.toArray(),blocked:T.solidAt(e.door.x,e.door.z,.5,g.G.me.pos.y)});
    }
    return out;
  });
  expect(r.fails).toEqual([]);
  expect(r.n).toBeGreaterThanOrEqual(87);
  expect(r.kinds).toEqual(expect.arrayContaining(['shop', 'house', 'office', 'dealer', 'tuning', 'garage', 'lab', 'castle']));
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('press E at a door enters, press E at the exit leaves; screenshot of a shop interior', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(async () => {
    const I = await import('/js/data/interiors.js'),
      g = (window as any).__game,
      e = I.ENTERABLES.find((x: any) => x.purpose === 'shop');
    g.teleport(e.door.x, e.door.z);
  });
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => (window as any).__game.G.inside !== null, undefined, {timeout: 3000});
  await page.waitForTimeout(900);
  await page.screenshot({path: `${OUT}/interior-shop.png`});
  await page.keyboard.press('KeyE'); // 입구 안쪽 = 나가기
  await page.waitForFunction(() => (window as any).__game.G.inside === null, undefined, {timeout: 3000});
});

test('15 car types build; take a parked car, drive, exit; buy, make mine, register, tune, garage', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const D = await import('/js/data/cars.js'),
      R = await import('/js/render/vehicle.js');
    return D.CARS.map((c: any) => {
      const g = R.buildCar({t: c.id, c: c.color, eng: 3, tire: 1, neon: 1});
      return g.children.length === 2 && g.children[0].geometry.attributes.position.count > 100;
    });
  });
  expect(r.length).toBe(15);
  expect(r.every(Boolean)).toBe(true);
  // 길가 차 훔치기
  await page.evaluate(async () => {
    const V = await import('/js/systems/vehicle.js'),
      g = (window as any).__game;
    await new Promise(r => setTimeout(r, 600));
    const v = V.VEH.find((x: any) => x.own === -1);
    g.teleport(v.x + 3, v.z);
  });
  await page.waitForTimeout(400);
  await page.screenshot({path: `${OUT}/car-parked.png`});
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => (window as any).__game.G.drive !== null, undefined, {timeout: 3000});
  const stolen = await page.evaluate(() => JSON.stringify((window as any).__game.S.cars.list.map((c: any) => c.stolen)));
  expect(stolen).toBe('[1]');
  const z0 = await page.evaluate(() => (window as any).__game.G.drive.z + 1000 * (window as any).__game.G.drive.x);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1500);
  await page.screenshot({path: `${OUT}/car-drive.png`});
  await page.keyboard.up('KeyW');
  const moved = await page.evaluate(() => ({v: (window as any).__game.G.drive.v, p: (window as any).__game.G.drive.z + 1000 * (window as any).__game.G.drive.x}));
  expect(Math.abs(moved.p - z0)).toBeGreaterThan(5);
  await page.keyboard.down('Space');
  await page.waitForTimeout(1200);
  await page.keyboard.up('Space');
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => (window as any).__game.G.drive === null, undefined, {timeout: 3000});
  // 거래·튜닝·등록·차고
  const t = await page.evaluate(async () => {
    const C = await import('/js/game/cars.js'),
      g = (window as any).__game,
      S = g.S;
    S.cr = 1e7;
    const o: any = {};
    o.stolenNoTune = C.tuneCar(0, 'eng'); // 훔친 차는 튜닝 불가
    o.mine = C.makeMine(0);
    o.reg = C.registerCar(0);
    o.tune = C.tuneCar(0, 'eng') && C.tuneCar(0, 'neon');
    o.noRoom = C.buyCar('kart'); // 차고 없음 → 1대 제한
    o.garage = C.buyGarage();
    o.buy = C.buyCar('super');
    o.store = C.storeCar(1); // 미등록이라 실패
    o.reg1 = C.registerCar(1);
    o.sell = C.sellCar(1);
    o.plate = S.cars.list[0].plate;
    o.stolen = S.cars.list[0].stolen;
    o.eng = S.cars.list[0].eng;
    o.n = S.cars.list.length;
    return o;
  });
  expect(t).toMatchObject({stolenNoTune: false, mine: true, reg: true, tune: true, noRoom: false, garage: true, buy: true, store: false, reg1: true, sell: true, stolen: 0, eng: 1, n: 1});
  expect(t.plate).toMatch(/\d/);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
  expect(unexpected(game.problems).console).toEqual([]);
});

test('car shop UI opens inside the dealer and lists 15 cars', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(async () => {
    const M = await import('/js/game/car-shop.js');
    M.openCarShop('buy');
  });
  await expect(page.locator('#carshop')).toHaveClass(/on/);
  await expect(page.locator('#csgrid > button')).toHaveCount(15);
  await page.screenshot({path: `${OUT}/car-shop.png`});
});
