// 남부 야생지(산·호수·사막·시골·교도소), 수배 ★6 + 경찰 추격 + 검거 → 교도소(허점 탈출), 시민 충돌
import {test, expect, unexpected, OUT} from './fixtures';

test('wild lands: bridge from the city, climbable mountain, lake under sea level, desert dunes', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  const r = await page.evaluate(async () => {
    const T = await import('/js/core/terrain.js'),
      W = await import('/js/data/wild.js'),
      V = await import('/js/data/world-map.js');
    // 산 정상까지 스위치백 등산로(core/wild-trail.ts)를 0.5u 걸음으로 걸어 오른다: 모든 걸음이 walkable, 경사 ≤ 0.9
    const TR = await import('/js/core/wild-trail.js');
    let ok = true, maxSlope = 0, y = T.groundH(TR.TRAIL[0].x, TR.TRAIL[0].z), x = TR.TRAIL[0].x, z = TR.TRAIL[0].z, length = 0;
    for (let k = 1; k < TR.TRAIL.length; k++) {
      const a = TR.TRAIL[k - 1], b = TR.TRAIL[k], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.5);
      for (let i = 1; i <= n; i++) {
        const nx = a.x + (b.x - a.x) * (i / n), nz = a.z + (b.z - a.z) * (i / n), ny = T.groundH(nx, nz);
        if (ny === -Infinity || !T.walkable(x, z, y, nx, nz) || T.solidAt(nx, nz, 0.4)) ok = false;
        const st = Math.hypot(nx - x, nz - z);
        maxSlope = Math.max(maxSlope, (ny - y) / (st || 1));
        length += st; x = nx; z = nz; y = ny;
      }
    }
    const reachedSummit = Math.hypot(x - W.SUMMIT.x, z - W.SUMMIT.z) < 2;
    return {
      bridge: T.groundH(74, 550, 5.5), // 금문교 상판 (BRIDGE_ENDS.x, 상판 높이 5.5)
      bridgeFloor: T.groundH(74, 550), // 상판 밑은 바다 바닥(−12)
      bridgeSide: T.groundH(150, 550),
      summit: T.groundH(W.SUMMIT.x, W.SUMMIT.z),
      climbable: ok && reachedSummit,
      maxSlope,
      trailLength: length,
      lake: T.groundH(W.LAKES[0].x, W.LAKES[0].z),
      sea: V.SEA_Y,
      desert: T.groundH(520, 1470),
    };
  });
  expect(r.bridge).toBeCloseTo(5.5, 2);
  expect(r.bridgeFloor).toBe(-12);
  expect(r.bridgeSide).toBe(-Infinity); // 다리 옆은 바다
  expect(r.summit).toBeGreaterThan(70);
  expect(r.climbable).toBe(true);
  expect(r.maxSlope).toBeLessThan(0.7);
  expect(r.trailLength).toBeGreaterThan(600); // 꼬불꼬불 스위치백
  expect(r.lake).toBeLessThan(r.sea - 3);
  expect(Math.abs(r.desert)).toBeLessThan(12);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('police: stars rise to 6, cops chase, getting caught sends you to prison; the loose-brick loophole frees you', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const P = await import('/js/systems/police.js'),
      J = await import('/js/systems/jail.js'),
      V = await import('/js/systems/vehicle.js'),
      T = await import('/js/core/terrain.js'),
      W = await import('/js/data/wild.js'),
      g = (window as any).__game;
    const out: any = {};
    P.addStars(9, 'test');
    out.stars = g.S.wanted;
    g.teleport(0, -100);
    for (let k = 0; k < 60 && !V.VEH.some((v: any) => v.own === -3); k++) await new Promise(r => setTimeout(r, 250));
    out.cops = V.VEH.filter((v: any) => v.own === -3).length;
    // 경찰차를 바로 옆에 붙여 검거
    const cop = V.VEH.find((v: any) => v.own === -3);
    cop.x = g.G.me.pos.x + 1.5;
    cop.z = g.G.me.pos.z;
    for (let k = 0; k < 40 && !g.G.jail; k++) await new Promise(r => setTimeout(r, 250));
    out.jailed = !!g.G.jail;
    out.starsAfter = g.S.wanted;
    out.inCell = Math.hypot(g.G.me.pos.x - W.JAIL.cell.x, g.G.me.pos.z - W.JAIL.cell.z) < 6;
    // 허점: 벽돌을 빼기 전에는 감방 밖으로 못 나가고, 뺀 뒤에는 담장 틈까지 길이 이어진다
    const reach = (): boolean => {
      const seen = new Set<string>(), q: [number, number][] = [[W.JAIL.cell.x, W.JAIL.cell.z]];
      const key = (x: number, z: number) => Math.round(x * 2) + ',' + Math.round(z * 2);
      seen.add(key(q[0][0], q[0][1]));
      while (q.length) {
        const [x, z] = q.pop()!;
        if (z < W.JAIL.rect[1] - 1.5) return true; // 담장 밖
        for (const [dx, dz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) {
          const a = x + dx, b = z + dz;
          if (seen.has(key(a, b)) || T.solidAt(a, b, 0.42) || T.groundH(a, b) === -Infinity) continue;
          seen.add(key(a, b));
          q.push([a, b]);
        }
      }
      return false;
    };
    out.blockedBefore = !reach();
    g.G.me.pos.set(W.JAIL.brick.x + 1.5, 0, W.JAIL.brick.z);
    const IT = await import('/js/game/interactables.js');
    for (let k = 0; k < 3; k++) IT.interactableOf('brick').act({kind: 'brick', d: 1}, 'e');
    out.openAfter = reach();
    // 탈출: 담장 밖으로 나가면 복역이 끝난다(쫓지 않는다)
    g.G.me.pos.set(W.JAIL.gap.x0 + 1, 0, W.JAIL.rect[1] - 3);
    await new Promise(r => setTimeout(r, 600));
    out.freed = !g.G.jail;
    out.noStars = g.S.wanted === 0;
    return out;
  });
  expect(r.stars).toBe(6);
  expect(r.cops).toBeGreaterThanOrEqual(1);
  expect(r.jailed).toBe(true);
  expect(r.starsAfter).toBe(0);
  expect(r.inCell).toBe(true);
  expect(r.blockedBefore).toBe(true);
  expect(r.openAfter).toBe(true);
  expect(r.freed).toBe(true);
  expect(r.noStars).toBe(true);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('driving into citizens knocks them down and raises a star', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async () => {
    const C = await import('/js/systems/crowd.js'),
      g = (window as any).__game,
      p = C.crowdApi.positions()[0];
    const n = C.crowdApi.hitAt(p.x, p.z, 2, 5, 0);
    return {n, down: 0};
  });
  expect(r.n).toBeGreaterThanOrEqual(1);
  await page.screenshot({path: `${OUT}/crowd-hit.png`});
});
