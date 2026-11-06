// 차 파손: 충돌 → hp 감소·찌그러짐, 엔진 고장, 바다에 몰고 들어가 2초 뒤 침수 고장(탑승자 하차), 수리
import {test, expect, unexpected, OUT} from './fixtures';

const boot = async (game: any) => {
  await game.open('?debug=1');
  await game.page.click('#mstart');
  await game.page.waitForTimeout(800);
};

test('crash dents the car, a hard front hit breaks the engine, light touch ignored, repair restores', async ({game}) => {
  const {page} = game;
  await boot(game);
  const r = await page.evaluate(async () => {
    const V = await import('/js/systems/vehicle.js'),
      D = await import('/js/systems/vehicle-damage.js'),
      T = await import('/js/core/terrain.js'),
      g = (window as any).__game;
    const Z = await import('/js/systems/vehicle-store.js');
    const target = Z.recordList().find((x: any) => x.own === -1)!; // 길가 차는 거리 스트리밍이라 먼 차는 논리 레코드뿐 → 켜 둔다
    V.activateVehicle(target.id);
    (window as any).__t = target;
    g.teleport(target.x, target.z);
    const fx = Math.sin(target.h), fz = Math.cos(target.h);
    const run = (speed: number, fw = 1) => {
      const a = V.spawnVeh({t: 'sedan', x: target.x - fx * 12, z: target.z - fz * 12, h: target.h, own: -2});
      T.dropDynSolid(a.solid); // 운전 중인 차처럼 자기 충돌체는 없다
      a.solid = null;
      a.v = speed;
      for (let i = 0; i < 90; i++) { a.v = Math.max(a.v, speed); if (V.stepVehicle(a, fw, 0, false, 1 / 60)) break; }
      return a;
    };
    const out: any = {};
    const soft = run(5, 0); // 가벼운 접촉: 무시
    out.softHp = D.dmgOf(soft).hp;
    V.removeVeh(soft);
    const a = run(30);
    const d = D.dmgOf(a);
    out.hp1 = d.hp; out.eng1 = d.engine; out.front = d.zn[0]; out.broken1 = d.broken;
    out.victimHp = D.dmgOf(target).hp;
    (window as any).__a = a;
    return out;
  });
  expect(r.softHp).toBe(100);
  expect(r.hp1).toBeLessThan(80);
  expect(r.front).toBeGreaterThan(0.3);
  expect(r.victimHp).toBeLessThan(100);
  await page.waitForTimeout(500);
  const m = await page.evaluate(async () => {
    const V = await import('/js/systems/vehicle.js'), D = await import('/js/systems/vehicle-damage.js');
    const a = (window as any).__a;
    // 같은 차로 한 번 더 세게
    const t = (window as any).__t;
    for (let k = 0; k < 4 && !D.dmgOf(a).broken; k++) {
      a.x = t.x - Math.sin(t.h) * 8; a.z = t.z - Math.cos(t.h) * 8; a.h = t.h; a.v = 30;
      D.dmgOf(a).cd = 0;
      for (let i = 0; i < 60; i++) { a.v = Math.max(a.v, 30); if (V.stepVehicle(a, 1, 0, false, 1 / 60)) break; }
    }
    const d = D.dmgOf(a);
    const vtx = a.grp.children[0].geometry.attributes.position.count;
    // 고장난 차는 가속이 안 된다
    a.v = 0;
    for (let i = 0; i < 30; i++) V.stepVehicle(a, 1, 0, false, 1 / 60);
    return {broken: d.broken, eng: d.engine, speed: a.v, vtx, canStart: D.canStart(a)};
  });
  expect(m.broken).toBe(1);
  expect(m.speed).toBeLessThan(1);
  expect(m.canStart).toBe(false);
  expect(m.vtx).toBeGreaterThan(1000); // 찌그러짐용으로 쪼개짐
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const g = (window as any).__game, a = (window as any).__a;
    g.teleport(a.x - Math.sin(a.h) * 9 + 4, a.z - Math.cos(a.h) * 9);
    g.G.yaw = Math.atan2(a.x - g.G.me.pos.x, a.z - g.G.me.pos.z) + Math.PI;
  });
  await page.waitForTimeout(900);
  await page.screenshot({path: `${OUT}/car-damaged.png`});
  // 수리 (내 차)
  const rep = await page.evaluate(async () => {
    const C = await import('/js/game/cars.js'), D = await import('/js/systems/vehicle-damage.js'), V = await import('/js/systems/vehicle.js'),
      g = (window as any).__game, S = g.S;
    S.cr = 1e6;
    C.buyCar('hatch');
    const v = V.vehOfOwn(0)!;
    const d = D.dmgOf(v);
    d.hp = 30; d.engine = 5; d.broken = 1; d.dirty = true;
    const cost = D.repairCost(0);
    const ok = C.repairCar(0);
    return {cost, ok, hp: D.dmgOf(v).hp, broken: D.dmgOf(v).broken, saved: S.cars.list[0].hp};
  });
  expect(rep.cost).toBeGreaterThan(0);
  expect(rep).toMatchObject({ok: true, hp: 100, broken: 0});
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('driving into the sea: works ~2s, slows, then floods and breaks; driver is put ashore; broken stays broken', async ({game}) => {
  const {page} = game;
  await boot(game);
  const spot = await page.evaluate(async () => {
    const W = await import('/js/core/water.js'), T = await import('/js/core/terrain.js');
    for (let x = -120; x <= 120; x += 6)
      for (let z = 150; z < 420; z += 2) {
        const w = W.waterAt(x, z);
        if (w && w.depth > 0.8) {
          // 물가에서 북쪽으로 30u 떨어진 마른 땅
          let sz = z - 30;
          while (sz > 100 && (W.waterAt(x, sz) || T.groundH(x, sz) === -Infinity)) sz -= 5;
          return {x, z, sz, depth: w.depth};
        }
      }
    return null;
  });
  expect(spot).not.toBeNull();
  await page.evaluate(async s => {
    const V = await import('/js/systems/vehicle.js'), g = (window as any).__game;
    g.teleport(s!.x, s!.sz);
    const v = V.spawnVeh({t: 'sedan', x: s!.x + 3, z: s!.sz, h: 0, own: -2});
    g.G.me.pos.set(v.x, v.y, v.z);
    V.enterVeh(v);
    (window as any).__v = v;
  }, spot);
  await page.waitForTimeout(300);
  await page.keyboard.down('KeyW');
  // 물에 닿기까지
  await page.waitForFunction(() => (window as any).__v.d?.inW, undefined, {timeout: 15000});
  const t0 = Date.now();
  await page.waitForTimeout(700);
  const mid = await page.evaluate(() => ({broken: (window as any).__v.d.broken, v: (window as any).__v.v, drive: !!(window as any).__game.G.drive}));
  expect(mid.broken).toBe(0); // 아직 작동
  expect(mid.drive).toBe(true);
  await page.screenshot({path: `${OUT}/car-water.png`});
  await page.waitForFunction(() => (window as any).__v.d.broken === 1, undefined, {timeout: 8000});
  const dt = Date.now() - t0;
  expect(dt).toBeGreaterThan(900);
  await page.keyboard.up('KeyW');
  await page.screenshot({path: `${OUT}/car-water-broken.png`});
  const d = await page.evaluate(() => ({cause: (window as any).__v.d.cause, eng: (window as any).__v.d.engine, hp: (window as any).__v.d.hp}));
  expect(d).toMatchObject({cause: 'water', eng: 0, hp: 100});
  await page.waitForFunction(() => (window as any).__game.G.drive === null, undefined, {timeout: 4000});
  const ashore = await page.evaluate(async () => {
    const W = await import('/js/core/water.js'), g = (window as any).__game;
    return {wet: !!W.waterAt(g.G.me.pos.x, g.G.me.pos.z), vis: g.G.me.visible};
  });
  expect(ashore).toEqual({wet: false, vis: true});
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
