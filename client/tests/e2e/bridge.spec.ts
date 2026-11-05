// W6 BRIDGE 금문교급 현수교: 도시 대로 → 진입로 → 상판 → 야생지 순환로까지 걸어서·차로 끊김 없이 이어지는가, 울타리 없음, 탑·교각 충돌체, 다리 위 높이, 바다로 떨어짐, 밤 조명, 삼각형 예산, 스크린샷
import {test, expect, unexpected, OUT} from './fixtures';

/** 페이지 안에서 쓰는 경로: harbor-s 중간 → 진입로 → 상판 → 접속부 → 호숫가 길 */
const PATH = `
  const B = await import('/js/data/bridge.js'), R = await import('/js/data/wild-road.js');
  const pts = [[0, 150], [0, B.CITY_APPROACH_START]];
  B.cityApproach().forEach(p => pts.push([p.x, p.z]));
  pts.push([B.BX, B.Z_DN1]);
  for (const p of R.ROAD_LINES[1].pts) pts.push([p.x, p.z]);
`;

test('bridge: sea floor under the span, deck layers, falling into the sea, tower/pier solids, rails and approach are free', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const T = await import('/js/core/terrain.js'),
      W = await import('/js/core/water.js'),
      B = await import('/js/data/bridge.js'),
      D = await import('/js/core/deck.js');
    const g = T.groundH,
      X = B.BX,
      [t1, t2] = B.TOWER_Z;
    return {
      floor: g(X, 550), // 다리 밑은 바다 바닥
      deck: [g(X, 550, B.DECK_Y), g(X + 20, 600, B.DECK_Y), g(X - 20, 480, B.DECK_Y)], // 상판 위
      edgeFall: g(X + B.HW + 2, 550, B.DECK_Y), // 상판 옆으로 벗어나면 물 속 바닥
      farSide: g(X + 80, 550), // 해협 띠 밖은 허공
      rampMid: g(X, 420, 0.5),
      rampMidUp: g(X, 420, 3.6),
      foot: g(X, B.Z_UP0 + 1, 0),
      wild: g(X, B.Z_DN1 + 3, 0),
      water: W.waterAt(X, 550),
      sideWater: W.waterAt(X + B.HW + 3, 550),
      decks: D.deckList().filter((d: any) => d.id.startsWith('br-')).length,
      legs: [-1, 1].map(s => [T.solidAt(X + s * B.TOWER_X, t1, 0.5, 60), T.solidAt(X + s * B.TOWER_X, t2, 0.5, 5.5), T.solidAt(X + s * B.TOWER_X, t2, 0.5)]),
      onDeckAtTower: [T.solidAt(X, t1, 0.6, B.DECK_Y), T.solidAt(X + 20, t2, 0.6, B.DECK_Y), T.solidAt(X - 22, t1, 0.6, B.DECK_Y)],
      pier: [T.solidAt(X + 14, 421, 0.5, -6), T.solidAt(X + 14, 421, 0.5, B.DECK_Y)],
      rail: T.solidAt(X + B.HW - 0.3, 550, 0.3, B.DECK_Y), // 난간은 충돌 없음 (걸어 나가면 떨어진다)
      anchor: T.solidAt(X + 28, B.ANCHOR_Z[0], 0.5, 0),
      embankment: [T.solidAt(X + 10, 400, 0.4, 0), T.solidAt(X + 10, 400, 0.4, 2.6)], // 램프 둑: 지상은 막고 상판 위는 통과
    };
  });
  expect(r.floor).toBe(-12);
  r.deck.forEach((v: number) => expect(v).toBeCloseTo(5.5, 3));
  expect(r.edgeFall).toBe(-12);
  expect(r.farSide).toBe(-Infinity);
  expect(r.rampMid).toBe(-12); // 물 위 램프 밑을 걸으면(발 y 0.5) 상판 밑 바다 바닥
  expect(r.rampMidUp).toBeGreaterThan(2.4);
  expect(Math.abs(r.foot)).toBeLessThan(0.6);
  expect(Math.abs(r.wild)).toBeLessThan(0.6);
  expect(r.water.id).toBe('sea');
  expect(r.water.depth).toBeGreaterThan(5);
  expect(r.sideWater.depth).toBeGreaterThan(5);
  expect(r.decks).toBe(3);
  for (const [up, deck, ground] of r.legs) expect([up, deck, ground]).toEqual([true, true, true]); // 탑 다리는 전 높이 충돌
  expect(r.onDeckAtTower).toEqual([false, false, false]); // 탑 사이 상판은 막히지 않는다
  expect(r.pier).toEqual([true, false]); // 교각은 상판 밑만
  expect(r.rail).toBe(false);
  expect(r.anchor).toBe(true);
  expect(r.embankment[1]).toBe(false);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('walking: avenue → harbor-s → approach → bridge deck → wild road is continuous (no fence, no solid, no cliff)', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  const r = await page.evaluate(async (PATHSRC: string) => {
    const T = await import('/js/core/terrain.js');
    const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
    const pts: number[][] = await new AsyncFn(PATHSRC + '; return pts;')();
    let x = pts[0][0], z = pts[0][1], y = T.groundH(x, z), maxY = -9, minY = 9, fail: any = null, steps = 0, bridgeFree = 0;
    // 플레이어와 같은 규칙: solidAt(BODY_R 0.5, y) · walkable · groundH(y) 로 0.25u 씩 걷는다
    for (let k = 1; k < pts.length && !fail; k++) {
      const [tx, tz] = pts[k];
      let guard = 0;
      while (Math.hypot(tx - x, tz - z) > 0.3 && guard++ < 4000) {
        const d = Math.hypot(tx - x, tz - z), nx = x + ((tx - x) / d) * 0.25, nz = z + ((tz - z) / d) * 0.25;
        const gnd = T.groundH(nx, nz, y);
        if (T.solidAt(nx, nz, 0.5, y) || !T.walkable(x, z, y, nx, nz) || gnd === -Infinity || gnd < y - 1.5) {
          fail = {at: [+nx.toFixed(1), +nz.toFixed(1)], y: +y.toFixed(2), solid: T.solidAt(nx, nz, 0.5, y), gnd};
          break;
        }
        x = nx; z = nz; y = gnd; steps++;
        maxY = Math.max(maxY, y); minY = Math.min(minY, y);
      }
    }
    // 차도 폭 전체(±12)를 가로질러도 막는 것이 없는가: 진입로~상판~접속부 구간의 가로 단면
    const B = await import('/js/data/bridge.js'), blocked: number[][] = [];
    for (let zz = B.Z_UP0; zz <= 790; zz += 6) {
      const yy = T.groundH(74, zz, 6);
      for (let u = -12; u <= 12; u += 2) if (T.solidAt(74 + u, zz, 0.5, Math.max(yy, 0.4))) blocked.push([74 + u, zz]);
    }
    for (const p of B.cityApproach()) {
      const nx = p.tz, nz = -p.tx;
      for (let u = -p.r * 0.9; u <= p.r * 0.9; u += 2) if (T.solidAt(p.x + nx * u, p.z + nz * u, 0.5, 0)) blocked.push([p.x + nx * u, p.z + nz * u]);
    }
    return {fail, steps, maxY, minY, end: [x, z, y], blocked};
  }, PATH);
  expect(r.fail).toBeNull();
  expect(r.steps).toBeGreaterThan(3000);
  expect(r.maxY).toBeGreaterThan(5.2); // 상판(5.5)까지 올랐다
  expect(r.maxY).toBeLessThan(6);
  expect(r.minY).toBeGreaterThan(-1.5);
  expect(r.blocked).toEqual([]); // 진입로·상판 차도 가로 단면에 충돌체(울타리·난간 포함) 없음
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('driving: a sedan drives from the avenue over the bridge to the wild ring road with no bump and no water damage', async ({game}) => {
  test.setTimeout(150_000);
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  const r = await page.evaluate(async (PATHSRC: string) => {
    const V = await import('/js/systems/vehicle.js'),
      T = await import('/js/core/terrain.js'),
      W = await import('/js/core/water.js');
    const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
    const pts: number[][] = await new AsyncFn(PATHSRC + '; return pts;')();
    const v = V.spawnVeh({t: 'sedan', x: pts[0][0] + 3, z: pts[0][1], h: 0});
    T.dropDynSolid(v.solid);
    v.solid = null;
    let k = 1, bumps = 0, maxY = -9, wet = 0, frames = 0;
    const where: number[][] = [];
    while (k < pts.length && frames++ < 60 * 90) {
      // 추종점: 현재 점 앞 10u 이내의 가장 먼 경로점
      while (k < pts.length - 1 && Math.hypot(pts[k][0] - v.x, pts[k][1] - v.z) < 10) k++;
      const want = Math.atan2(pts[k][0] - v.x, pts[k][1] - v.z),
        err = Math.atan2(Math.sin(want - v.h), Math.cos(want - v.h));
      const b = V.stepVehicle(v, 1, Math.max(-1, Math.min(1, err * 2.5)), false, 1 / 60);
      if (b) {
        bumps++;
        if (where.length < 4) where.push([+v.x.toFixed(1), +v.z.toFixed(1)]);
      }
      maxY = Math.max(maxY, v.y);
      const w = W.waterAt(v.x, v.z);
      if (w && w.depth > 0.5 && v.y < w.y + 1.5) wet++;
      if (k >= pts.length - 1 && Math.hypot(pts[k][0] - v.x, pts[k][1] - v.z) < 8) break;
    }
    return {bumps, where, maxY, wet, frames, end: [+v.x.toFixed(1), +v.z.toFixed(1), +v.y.toFixed(2)], last: pts[pts.length - 1], k, n: pts.length};
  }, PATH);
  expect(r.bumps).toBe(0);
  expect(r.wet).toBe(0);
  expect(r.maxY).toBeGreaterThan(5.2);
  expect(r.k).toBeGreaterThanOrEqual(r.n - 1);
  expect(Math.hypot(r.end[0] - r.last[0], r.end[1] - r.last[1])).toBeLessThan(10);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('real game loop: holding forward on the approach carries the player up onto the deck', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.teleport(74, 366);
    g.G.yaw = Math.PI; // 카메라가 북쪽에서 남쪽을 봄 → W = 남쪽(+z)
    g.G.keys.KeyW = true;
  });
  await page.waitForTimeout(9000);
  const r = await page.evaluate(() => {
    const g = (window as any).__game;
    g.G.keys.KeyW = false;
    return {z: g.G.me.pos.z, y: g.G.me.pos.y};
  });
  expect(r.z).toBeGreaterThan(400);
  expect(r.y).toBeGreaterThan(1);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('walking off the deck edge drops the player into the sea (swim), and the bridge group is a budgeted merged mesh set', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.teleport(74 + 22, 560);
    g.G.me.pos.y = 5.5;
    g.G.yaw = -Math.PI / 2;
    g.G.keys.KeyW = true; // 동쪽(+x)으로 걸어 난간 밖으로
  });
  // 난간 밖으로 나가 떨어지는 순간(y < 0)의 위치를 잡는다
  const fall = await page.evaluate(async () => {
    const g = (window as any).__game;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 150));
      if (g.G.me.pos.y < 0) break;
    }
    g.G.keys.KeyW = false;
    return {x: g.G.me.pos.x, y: g.G.me.pos.y};
  });
  const r = await page.evaluate(async () => {
    const g = (window as any).__game, M = await import('/js/render/lowpoly/merge.js');
    const b = g.G.scene.getObjectByName('bridge');
    const meshes: any[] = [];
    b.traverse((o: any) => o.isMesh && meshes.push(o));
    return {
      tris: M.countTris(b),
      n: meshes.length,
      culled: meshes.every((m: any) => m.frustumCulled !== false && m.geometry.boundingSphere && m.geometry.boundingSphere.radius > 0),
      hiddenDay: meshes.filter((m: any) => m.material.isMeshBasicMaterial).every((m: any) => !m.visible),
      basic: meshes.filter((m: any) => m.material.isMeshBasicMaterial).length,
    };
  });
  expect(fall.x).toBeGreaterThan(74 + 23.5); // 난간(충돌 없음)을 지나 상판 밖으로 나갔다
  expect(fall.y).toBeLessThan(0); // 떨어졌다(바다)
  expect(r.tris).toBeLessThanOrEqual(12000);
  expect(r.tris).toBeGreaterThan(3000);
  expect(r.n).toBeGreaterThan(5);
  expect(r.culled).toBe(true);
  expect(r.basic).toBeGreaterThan(0);
  expect(r.hiddenDay).toBe(true); // 낮에 보이는 MeshBasicMaterial 없음
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('night: cable/tower lights and aviation lamps switch on with G.night', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => (window as any).__game.teleport(74, 340));
  const state = () =>
    page.evaluate(() => {
      const g = (window as any).__game, b = g.G.scene.getObjectByName('bridge');
      const vis: boolean[] = [];
      b.traverse((o: any) => o.isMesh && o.material.isMeshBasicMaterial && vis.push(o.visible));
      return vis;
    });
  await page.waitForTimeout(600);
  expect((await state()).some(v => v)).toBe(false);
  await page.evaluate(() => ((window as any).__game.G.night = 9));
  await page.waitForTimeout(1500);
  expect((await state()).some(v => v)).toBe(true);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

async function shot(game: any, name: string, x: number, z: number, y: number, yaw: number, pitch: number, dist: number, night = false) {
  await game.page.evaluate(([x, z, y, yaw, pitch, dist, night]: any) => {
    const g = (window as any).__game;
    g.teleport(x, z);
    g.G.me.pos.y = y;
    g.G.yaw = yaw;
    g.G.pitch = pitch;
    g.G.camDist = dist;
    g.G.night = night ? 9 : 0;
  }, [x, z, y, yaw, pitch, dist, night]);
  await game.page.waitForTimeout(2200);
  await game.page.screenshot({path: `${OUT}/bridge-${name}.png`});
}
test('screenshots: far view, on the deck, under a tower, night, wild end', async ({game}) => {
  test.setTimeout(180_000);
  await game.open('?debug=1');
  await game.page.click('#mstart');
  await shot(game, 'far', 74, 566, 5.5, Math.PI / 2, 0.15, 230);
  await shot(game, 'deck', 74, 500, 5.5, Math.PI, 0.12, 26);
  await shot(game, 'tower', 74 + 18, 452, 5.5, Math.PI, 0.5, 8);
  await shot(game, 'night', 74, 566, 5.5, Math.PI / 2, 0.15, 230, true);
  await shot(game, 'night-deck', 74, 500, 5.5, Math.PI, 0.12, 26, true);
  await shot(game, 'wild', 74, 770, 0.5, 0, 0.15, 100);
  await shot(game, 'city', 0, 300, 0, Math.PI, 0.2, 40);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
