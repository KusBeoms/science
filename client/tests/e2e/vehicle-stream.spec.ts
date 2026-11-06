// 논리 차량/렌더 분리(W8 P2-b): 거리 스트리밍 왕복에서 중복·누수 없음, 운전 중 차 보호, 도난/재생성, 파손 유지, 나쁜 세이브 보호
import {test, expect, unexpected} from './fixtures';

const boot = async (game: any, pre?: () => void) => {
  if (pre) await game.page.addInitScript(pre);
  await game.open('?debug=1');
  await game.page.click('#mstart');
  await game.page.waitForTimeout(900);
};
/** 페이지 안에서 쓸 모듈 묶음 */
const MODS = `const V = await import('/js/systems/vehicle.js'), Z = await import('/js/systems/vehicle-store.js'), W = await import('/js/systems/vehicle-stream.js'),
  T = await import('/js/core/terrain.js'), D = await import('/js/systems/vehicle-damage.js'), g = (window as any).__game, G = g.G;`;
/** 본문은 TS 표기로 적어도 되도록 브라우저 실행 전에 타입 표기만 걷어낸다 */
const strip = (s: string) => s.replace(/\(window as any\)/g, 'window').replace(/ as any/g, '').replace(/: (any|number)\b/g, '').replace(/\)!/g, ')');
const run = <R>(page: any, body: string): Promise<R> =>
  page.evaluate((src: string) => new Function(`return (async () => { ${src} })()`)(), strip(MODS + body));

test('30 round trips across the activation boundary: no duplicates, no mesh/geometry/solid growth', async ({game}) => {
  await boot(game);
  const r: any = await run(game.page, `
    W.STREAM.enabled = false; // 실시간 시스템과 겹치지 않게 수동으로만 정리한다
    const R = Z.recordList().find((v: any) => v.own === -1)!;
    const carGroups = () => { let n = 0, geo = new Set(); G.scene.traverse((o: any) => { if (o.userData?.look) { n++; o.traverse((m: any) => m.geometry && geo.add(m.geometry.uuid)); } }); return {n, geo: geo.size}; };
    const snap = () => ({veh: V.VEH.length, rec: Z.recordCount(), dyn: T.dynSolidCount(), groups: carGroups(), geoMem: G.renderer.info.memory.geometries, kids: G.scene.children.length});
    const go = (x: number, z: number) => { g.teleport(x, z); W.streamTick(); };
    go(R.x + 200, R.z);
    const farA = snap();
    go(R.x + 40, R.z);
    const nearA = snap();
    const log = [];
    for (let i = 0; i < 32; i++) {
      go(R.x + 40, R.z);
      log.push(R.grp !== null && V.VEH.includes(R) && !!R.solid);
      go(R.x + 200, R.z);
      log.push(R.grp === null && !V.VEH.includes(R) && R.solid === null);
    }
    const farB = snap();
    go(R.x + 40, R.z);
    const nearB = snap();
    const ids = Z.recordList().map((v: any) => v.id);
    const slots = Z.recordList().filter((v: any) => v.slot).map((v: any) => v.slot);
    const dupVeh = V.VEH.length - new Set(V.VEH).size;
    W.STREAM.enabled = true;
    return {farA, farB, nearA, nearB, ok: log.every(Boolean), n: log.length, dupId: ids.length - new Set(ids).size, dupSlot: slots.length - new Set(slots).size, dupVeh};
  `);
  expect(r.n).toBe(64);
  expect(r.ok).toBe(true);
  expect(r.dupId).toBe(0);
  expect(r.dupSlot).toBe(0);
  expect(r.dupVeh).toBe(0);
  expect(r.farB.rec).toBe(r.farA.rec); // 논리 레코드는 늘지도 줄지도 않는다
  for (const k of ['veh', 'dyn', 'kids'] as const) {
    expect(r.farB[k]).toBe(r.farA[k]);
    expect(r.nearB[k]).toBe(r.nearA[k]);
  }
  expect(r.farB.groups).toEqual(r.farA.groups);
  expect(r.nearB.groups).toEqual(r.nearA.groups);
  expect(r.nearB.geoMem).toBeLessThanOrEqual(r.nearA.geoMem + 2); // GPU 지오메트리 누적 없음(다른 시스템 잡음 여유 2)
  expect(r.farB.geoMem).toBeLessThanOrEqual(r.farA.geoMem + 2);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('hysteresis, cap, driven/owned cars are never released by distance', async ({game}) => {
  await boot(game);
  const r: any = await run(game.page, `
    W.STREAM.enabled = false;
    const recs = Z.recordList().filter((v: any) => v.own === -1);
    const R = recs[0];
    const out: any = {};
    // 히스테리시스: 켜기 90 · 끄기 120 사이에서는 현 상태 유지
    g.teleport(R.x + 100, R.z); W.streamTick(); out.inBandOff = R.grp === null;
    g.teleport(R.x + 80, R.z); W.streamTick(); out.on80 = R.grp !== null;
    g.teleport(R.x + 110, R.z); W.streamTick(); out.inBandOn = R.grp !== null;
    g.teleport(R.x + 125, R.z); W.streamTick(); out.off125 = R.grp === null;
    // 상한
    const keepOn = W.STREAM.rOn, keepCap = W.STREAM.cap;
    W.STREAM.rOn = 1e6; W.STREAM.rOff = 2e6; W.STREAM.cap = 5;
    W.streamTick();
    out.capped = W.activeParkedCount();
    W.STREAM.cap = 2; W.streamTick(); out.shrunk = W.activeParkedCount();
    W.STREAM.rOn = keepOn; W.STREAM.rOff = 120; W.STREAM.cap = keepCap;
    // 운전 중인 길가 차(own -1 인 채로 enterVeh)는 멀리 가도 해제되지 않는다
    const P = recs[1]; g.teleport(P.x + 3, P.z); W.streamTick();
    V.enterVeh(P);
    G.me.pos.set(P.x + 5000, 0, P.z); // 플레이어(=운전자) 위치가 멀어졌다고 가정
    W.streamTick();
    out.drivenKept = P.grp !== null && V.VEH.includes(P) && V.deactivateVehicle(P.id) === false;
    V.exitVeh(true);
    // 내 차: 멀리 두어도 활성 유지
    g.S.cars.list.push({t: 'sedan', c: 0xe5483f, plate: 'x', stolen: 0, eng: 0, tire: 0, neon: 0, stored: 0, x: R.x, z: R.z + 8, h: 0});
    const O = V.spawnOwned(g.S.cars.list.length - 1);
    g.teleport(R.x + 400, R.z); W.streamTick();
    out.ownedKept = O.grp !== null && V.deactivateVehicle(O.id) === false;
    W.STREAM.enabled = true;
    return out;
  `);
  expect(r).toMatchObject({inBandOff: true, on80: true, inBandOn: true, off125: true, drivenKept: true, ownedKept: true});
  expect(r.capped).toBeLessThanOrEqual(5);
  expect(r.shrunk).toBeLessThanOrEqual(2);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('stolen car frees its slot and respawns a new car after 60s; no-room trial car despawns after 90s', async ({game}) => {
  await boot(game);
  const r: any = await run(game.page, `
    W.STREAM.enabled = false;
    const C = await import('/js/game/cars.js');
    const R = Z.recordList().find((v: any) => v.own === -1)!;
    const slot = R.slot, oldId = R.id, oldLook = Z.slotLook(slot, 0);
    g.teleport(R.x + 3, R.z); W.streamTick();
    C.takeCar(R); // 시승 → 슬롯 비움, 내 차 목록에 stolen=1 로 추가
    const out: any = {slotCleared: R.slot === '', pending: Z.pendingRespawns().some((p: any) => p.slot === slot), stolenFlag: g.S.cars.list.length === 1 && g.S.cars.list[0].stolen === 1, driven: G.drive === R};
    V.exitVeh(true);
    V.vehicleSystem.update(30);
    out.stillEmpty = !Z.slotOccupied(slot);
    V.vehicleSystem.update(31);
    const fresh = Z.recordList().filter((v: any) => v.slot === slot);
    out.refilled = fresh.length === 1 && fresh[0].id !== oldId && fresh[0].own === -1;
    out.gen = Z.slotGen(slot);
    out.deterministic = JSON.stringify(Z.slotLook(slot, 0)) === JSON.stringify(oldLook) && JSON.stringify(Z.slotLook(slot, 1)) === JSON.stringify({t: fresh[0].t, c: fresh[0].c});
    out.stolenStays = Z.recordById(oldId) === R && R.own === 0;
    // 자리 없는 임시 시승(own -2): 90초 뒤 사라진다 (보관 칸 1개가 이미 찼다)
    const Q = Z.recordList().find((v: any) => v.own === -1 && v !== fresh[0] && v.id !== oldId)!;
    g.teleport(Q.x + 3, Q.z); W.streamTick();
    C.takeCar(Q);
    out.temp = Q.own === -2;
    V.exitVeh(true);
    V.vehicleSystem.update(50); out.tempAt50 = Z.recordById(Q.id) !== undefined;
    V.vehicleSystem.update(50); out.tempGone = Z.recordById(Q.id) === undefined && !V.VEH.includes(Q) && Q.grp === null;
    W.STREAM.enabled = true;
    return out;
  `);
  expect(r).toMatchObject({slotCleared: true, pending: true, stolenFlag: true, driven: true, stillEmpty: true, refilled: true, deterministic: true, stolenStays: true, temp: true, tempAt50: true, tempGone: true});
  expect(r.gen).toBe(1);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('damage state survives deactivate/activate and is re-applied to the new mesh', async ({game}) => {
  await boot(game);
  const r: any = await run(game.page, `
    W.STREAM.enabled = false;
    const R = Z.recordList().find((v: any) => v.own === -1)!;
    g.teleport(R.x + 30, R.z); W.streamTick();
    const base = R.grp.children[0].geometry.attributes.position.count;
    const d = D.dmgOf(R);
    d.hp = 41; d.engine = 33; d.zn[0] = 0.9; d.dirty = true;
    await new Promise(r => setTimeout(r, 500)); // 파손 시스템이 메시에 입힌다
    const dented = R.grp.children[0].geometry.attributes.position.count;
    const out: any = {dented: dented > base};
    g.teleport(R.x + 300, R.z); W.streamTick();
    out.released = R.grp === null && R.d === d;
    g.teleport(R.x + 30, R.z); W.streamTick();
    await new Promise(r => setTimeout(r, 500));
    out.same = R.d === d && d.hp === 41 && d.engine === 33 && d.zn[0] === 0.9;
    out.reapplied = R.grp.children[0].geometry.attributes.position.count === dented && d.grp === R.grp;
    W.STREAM.enabled = true;
    return out;
  `);
  expect(r).toEqual({dented: true, released: true, same: true, reapplied: true});
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('slot looks are seed-stable across reloads and a custom slot provider plugs in', async ({game}) => {
  await boot(game);
  const read = () => run<any>(game.page, `return Z.recordList().filter((v: any) => v.own === -1).map((v: any) => [v.id, v.t, v.c, v.slot, Math.round(v.x), Math.round(v.z)]).sort();`);
  const a = await read();
  expect(a.length).toBeGreaterThan(10);
  await game.page.reload();
  await game.page.waitForSelector('#menu.on');
  await game.page.click('#mstart');
  await game.page.waitForTimeout(900);
  expect(await read()).toEqual(a);
  const p: any = await run(game.page, `
    const before = Z.parkingSlots().length;
    Z.setSlotProvider(() => [{id: 'lot:a', x: 1, z: 2, h: 0, y: 0, kind: 'lot'}, {id: 'lot:b', x: 9, z: 2, h: 0, y: 0, kind: 'lot'}]);
    const n = Z.parkingSlots().length, b = Z.slotById('lot:b');
    Z.setSlotProvider(null);
    return {before, n, hasB: !!b, look: Z.slotLook('lot:a', 0).t === Z.slotLook('lot:a', 0).t};
  `);
  expect(p.before).toBeGreaterThan(30);
  expect(p).toMatchObject({n: 2, hasB: true, look: true});
});

test('save protection: bad owned-car poses are relocated, unknown building ids are ignored', async ({game}) => {
  await boot(game, () => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    const car = (x: any, z: any, h: any) => ({t: 'sedan', c: 0xe5483f, plate: 'p', stolen: 0, eng: 0, tire: 0, neon: 0, stored: 0, x, z, h});
    localStorage.setItem('stealPlanet4', JSON.stringify({
      ver: 6, base: Array(12).fill(null), cr: 500, slots: 6, stolen: 3, zone: 0, dex: {}, mi: 0,
      cars: {garage: 3, list: [car(0, 99999, 0), car(null, null, null), car(-7000, 40, 1), car(130, -70, 1.57)]},
      props: {'old-city-tower-1': 1, '': 1, 'w6-ghost': 1},
    }));
  });
  const r: any = await run(game.page, `
    const E = await import('/js/game/estate.js'), P = await import('/js/systems/vehicle-safety.js');
    const out: any = {};
    // 안전 검사는 자기 충돌체를 빼고 한다 (이미 세워진 차는 자기 자신과 겹친다)
    out.cars = V.VEH.filter((v: any) => v.own >= 0).map((v: any) => { T.dropDynSolid(v.solid); const ok = P.poseIsSafe(v.t, v); V.syncSolid(v); return {ok, x: v.x, z: v.z}; });
    out.active = V.VEH.filter((v: any) => v.own >= 0).length;
    out.props = Object.keys(g.S.props);
    out.estate = [E.ownedListings().length, E.buyProp(undefined), E.sellProp(undefined)];
    // 벽 안: 충돌체가 있는 점을 찾아 직접 보정해 본다
    let wall: any = null;
    for (let x = -330; x < 330 && !wall; x += 3) for (let z = -330; z < 330 && !wall; z += 3) if (T.groundH(x, z) > -Infinity && T.solidAt(x, z, 1)) wall = {x, z};
    out.wallFound = !!wall;
    if (wall) {
      const list = [{t: 'sedan', c: 1, plate: '', stolen: 0, eng: 0, tire: 0, neon: 0, stored: 0, x: wall.x, z: wall.z, h: 0}];
      out.wallBad = !P.poseIsSafe('sedan', list[0]);
      out.moved = P.sanitizeOwnedCars(list as any, () => false);
      out.wallFixed = P.poseIsSafe('sedan', list[0]);
    }
    // 바다 한가운데
    const sea = {t: 'sedan', c: 1, plate: '', stolen: 0, eng: 0, tire: 0, neon: 0, stored: 0, x: -1500, z: 0, h: 0};
    out.seaMoved = P.sanitizeOwnedCars([sea] as any, () => false) + (P.poseIsSafe('sedan', sea) ? 0 : 100);
    return out;
  `);
  expect(r.cars.length).toBe(4);
  expect(r.cars).toEqual([1, 2, 3, 4].map(() => expect.objectContaining({ok: true})));
  expect(r.active).toBe(4);
  expect(r.props).toEqual([]);
  expect(r.estate).toEqual([0, false, false]);
  expect(r.wallFound).toBe(true);
  expect(r.wallBad).toBe(true);
  expect(r.moved).toBe(1);
  expect(r.wallFixed).toBe(true);
  expect(r.seaMoved).toBe(1);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
