import {test, expect, unexpected} from './fixtures';

test('E boarding and exit show the actor and pose, ignore repeated actions, and release walking', async ({game}) => {
  const {page} = game; await game.open('?debug=1'); await page.click('#mstart');
  await page.evaluate(async () => {
    const {G, S} = (window as any).__game, V = await import('/js/systems/vehicle.js');
    S.wanted = 0;
    const v = V.spawnVeh({t: 'sedan', c: 0x4275bb, x: 0, z: -90, h: 0});
    (window as any).__transitionCar = v;
    G.me.pos.set(3, v.y, -90); G.me.vy = 0; G.yaw = 0; G.pitch = 0.4;
  });
  await page.waitForFunction(() => (window as any).__game.G.target?.v === (window as any).__transitionCar);
  await page.keyboard.press('KeyE');
  const before = await page.evaluate(async () => {
    const {G, S} = (window as any).__game, M = await import('/js/systems/vehicle-transition.js');
    return {active: M.vehicleTransitionActive(), visible: G.me.visible, drive: !!G.drive, count: S.cars.list.length};
  });
  expect(before).toMatchObject({active: true, visible: true, drive: false});
  await page.keyboard.down('KeyW'); await page.keyboard.press('KeyE'); await page.keyboard.press('KeyE');
  await page.waitForTimeout(120);
  const mid = await page.evaluate(async () => {
    const {G, S} = (window as any).__game, M = await import('/js/systems/vehicle-transition.js'), v = (window as any).__transitionCar;
    return {active: M.vehicleTransitionActive(), visible: G.me.visible, x: v.x, z: v.z, count: S.cars.list.length,
      pose: ['armL', 'armR', 'legL', 'legR'].reduce((sum, k) => sum + Math.abs(G.me.userData[k].rotation.x), 0)};
  });
  await page.keyboard.up('KeyW');
  expect(mid.active).toBe(true); expect(mid.visible).toBe(true); expect(mid.pose).toBeGreaterThan(0.02);
  expect(mid.count).toBe(before.count); expect(mid.x).toBe(0); expect(mid.z).toBe(-90);
  await expect.poll(() => page.evaluate(async () => {
    const M = await import('/js/systems/vehicle-transition.js'), {G} = (window as any).__game;
    return !M.vehicleTransitionActive() && G.drive === (window as any).__transitionCar && !G.me.visible;
  })).toBe(true);
  await page.waitForFunction(() => (window as any).__game.G.target?.kind === 'carexit');
  await page.keyboard.press('KeyE');
  const exitMid = await page.evaluate(async () => {
    const M = await import('/js/systems/vehicle-transition.js'), {G} = (window as any).__game;
    return {active: M.vehicleTransitionActive(), visible: G.me.visible, drive: !!G.drive};
  });
  expect(exitMid).toEqual({active: true, visible: true, drive: false});
  await expect.poll(() => page.evaluate(async () => !(await import('/js/systems/vehicle-transition.js')).vehicleTransitionActive())).toBe(true);
  const out = await page.evaluate(async () => {
    const {G} = (window as any).__game, T = await import('/js/core/terrain.js');
    return {x: G.me.pos.x, z: G.me.pos.z, solid: T.solidAt(G.me.pos.x, G.me.pos.z, 0.42, G.me.pos.y)};
  });
  expect(out.solid).toBe(false);
  await page.keyboard.down('KeyW'); await page.waitForTimeout(350); await page.keyboard.up('KeyW');
  const moved = await page.evaluate(([x, z]) => Math.hypot((window as any).__game.G.me.pos.x - x, (window as any).__game.G.me.pos.z - z), [out.x, out.z]);
  expect(moved).toBeGreaterThan(0.5);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('force warp cancels entry and exit without a late snap or hidden character', async ({game}) => {
  const {page} = game; await game.open('?debug=1'); await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const {G} = (window as any).__game, V = await import('/js/systems/vehicle.js'),
      M = await import('/js/systems/vehicle-transition.js'), P = await import('/js/game/phone-apps.js'), Portal = await import('/js/game/portal-map.js');
    const v = V.spawnVeh({t: 'hatch', x: 0, z: -90, h: 0});
    G.me.pos.set(3, v.y, -90);
    const began = V.enterVeh(v, true); M.updateVehicleTransition(0.2);
    P.warpTo(0, -115); const phone = {active: M.vehicleTransitionActive(), drive: !!G.drive, visible: G.me.visible, x: G.me.pos.x, z: G.me.pos.z};
    M.updateVehicleTransition(1);
    const stable = G.me.pos.x === phone.x && G.me.pos.z === phone.z;
    V.enterVeh(v); const immediate = G.drive === v && !G.me.visible;
    const exited = V.exitVeh(false, true); M.updateVehicleTransition(0.2);
    Portal.warpTo('hub'); const pad = G.pads.hub;
    const portal = {active: M.vehicleTransitionActive(), drive: !!G.drive, visible: G.me.visible, d: Math.hypot(G.me.pos.x - pad.x, G.me.pos.z - pad.z - 3)};
    return {began, phone, stable, immediate, exited, portal};
  });
  expect(r.began).toBe(true); expect(r.phone).toEqual({active: false, drive: false, visible: true, x: 0, z: -115});
  expect(r.stable).toBe(true); expect(r.immediate).toBe(true); expect(r.exited).toBe(true);
  expect(r.portal).toEqual({active: false, drive: false, visible: true, d: 0});
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('blocked exits roll back to driving; forced exit and vehicle removal always release the transition', async ({game}) => {
  const {page} = game; await game.open('?debug=1'); await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const {G} = (window as any).__game, V = await import('/js/systems/vehicle.js'), M = await import('/js/systems/vehicle-transition.js'), T = await import('/js/core/terrain.js');
    const v = V.spawnVeh({t: 'sedan', x: 0, z: -90, h: 0.6});
    V.enterVeh(v); T.addSolid(-12, -102, 12, -78);
    const exited = V.exitVeh(false, true), rollback = G.drive === v && !G.me.visible && !v.solid && !M.vehicleTransitionActive();
    V.exitVeh(true); const forced = !G.drive && G.me.visible && !M.vehicleTransitionActive();
    const w = V.spawnVeh({t: 'hatch', x: 0, z: -120, h: 0}); G.me.pos.set(3, w.y, -120);
    const began = V.enterVeh(w, true); M.updateVehicleTransition(0.2); V.removeVeh(w);
    return {exited, rollback, forced, began, removed: !M.vehicleTransitionActive() && G.me.visible && !G.drive};
  });
  expect(r).toEqual({exited: false, rollback: true, forced: true, began: true, removed: true});
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
