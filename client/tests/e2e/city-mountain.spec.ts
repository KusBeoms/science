// W7 CITY_SURROUND: 도시 둘레 산악 — 북쪽 설산 주봉(140~175u)·철탑, 서쪽 능선, 동쪽 반도 산악 도로 → 천문대, 사과 시선 축 보호, 걸어서/차로 오르기, 삼각형 예산, 스크린샷
import {test, expect, unexpected, OUT} from './fixtures';

const boot = async (game: any) => {
  await game.open('?debug=1');
  await game.page.click('#mstart');
  await game.page.waitForTimeout(800);
};

test('mountain data: peak 140~175u, ridges, observatory plateau, sky axis clear, shoreline margin', async ({game}) => {
  await boot(game);
  const r = await game.page.evaluate(async () => {
    const H = await import('/js/core/heightmap.js'),
      T = await import('/js/core/terrain.js'),
      O = await import('/js/data/outline.js'),
      R = await import('/js/data/mountain-road.js'),
      T8 = Math.tan((8 * Math.PI) / 180);
    let peak = 0, west = 0, ridgeEast = 0;
    for (let x = 0; x <= 300; x += 4) for (let z = -760; z <= -540; z += 4) peak = Math.max(peak, T.groundH(x, z));
    for (let z = -400; z <= 100; z += 5) for (let x = -600; x <= -380; x += 5) west = Math.max(west, T.groundH(x, z));
    for (let x = 500; x <= 900; x += 5) for (let z = -400; z <= -250; z += 5) ridgeEast = Math.max(ridgeEast, T.groundH(x, z));
    // 사과 시선 축: 기지 (0,17) 에서 정북 ±8° 부채꼴 안의 지형은 고도 8° 선 아래
    let worst = 0;
    for (let D = 320; D < 900; D += 6) for (let x = -D * T8; x <= D * T8; x += 5) worst = Math.max(worst, T.groundH(x, 17 - D) / (D * T8));
    const corners = [[-335, -335], [335, -335], [-335, 335], [335, 335]].map(([x, z]) => O.CITY_POLY.dist(x, z, 50, 300));
    return {
      peak, west, ridgeEast, worst, minCorner: Math.min(...corners), bake: H.bakeMs,
      bridge: [O.BRIDGE_ENDS.x, O.BRIDGE_ENDS.city, O.BRIDGE_ENDS.wild], obs: T.groundH(R.OBS.x, R.OBS.z), obsY: R.OBS.y,
      roadIn: R.MOUNTAIN_ROAD.every((p: any) => O.CITY_POLY.dist(p.x, p.z, 0, 100) > 15),
    };
  });
  console.log('mountain', JSON.stringify(r));
  expect(r.peak).toBeGreaterThanOrEqual(140);
  expect(r.peak).toBeLessThanOrEqual(175);
  expect(r.west).toBeGreaterThan(95);
  expect(r.ridgeEast).toBeGreaterThan(80);
  expect(r.worst).toBeLessThan(0.85);
  expect(r.minCorner).toBeGreaterThanOrEqual(40);
  expect(r.bridge).toEqual([74, 404, 729]);
  expect(r.bake).toBeLessThan(400);
  expect(Math.abs(r.obs - r.obsY)).toBeLessThan(0.5);
  expect(r.roadIn).toBe(true);
});

test('mountain road: gentle, walkable from the city to the observatory; foothills are climbable', async ({game}) => {
  await boot(game);
  const r = await game.page.evaluate(async () => {
    const T = await import('/js/core/terrain.js'),
      R = await import('/js/data/mountain-road.js'),
      P = R.MOUNTAIN_ROAD;
    let maxGrade = 0, maxOff = 0, blocked = 0;
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i], run = Math.hypot(b.x - a.x, b.z - a.z);
      maxGrade = Math.max(maxGrade, Math.abs(T.groundH(b.x, b.z) - T.groundH(a.x, a.z)) / run);
      maxOff = Math.max(maxOff, Math.abs(T.groundH(b.x, b.z) - b.y));
      if (!T.walkable(a.x, a.z, T.groundH(a.x, a.z), b.x, b.z)) blocked++;
    }
    // 길 옆 8u 도 걸을 수 있다(갓길)
    let side = 0;
    for (let i = 2; i < P.length - 2; i += 6) {
      const a = P[i - 1], b = P[i + 1], l = Math.hypot(b.x - a.x, b.z - a.z), nx = -(b.z - a.z) / l, nz = (b.x - a.x) / l;
      for (const s of [-1, 1]) if (!T.walkable(P[i].x, P[i].z, T.groundH(P[i].x, P[i].z), P[i].x + nx * 8 * s, P[i].z + nz * 8 * s)) side++;
    }
    return {len: R.MROAD_LEN, maxGrade, maxOff, blocked, side, top: T.groundH(P[P.length - 1].x, P[P.length - 1].z)};
  });
  console.log('road', JSON.stringify(r));
  expect(r.len).toBeGreaterThan(700);
  expect(r.maxGrade).toBeLessThan(0.2);
  expect(r.maxOff).toBeLessThan(1.2);
  expect(r.blocked).toBe(0);
  expect(r.side).toBe(0);
  expect(r.top).toBeGreaterThan(55);
});

test('mountain render: tower on the peak, observatory, forests and rocks exist; screenshots', async ({game}) => {
  test.setTimeout(240_000);
  await boot(game);
  const info = await game.page.evaluate(() => {
    const g = (window as any).__game;
    let m: any = null;
    g.G.scene.traverse((o: any) => o.name === 'city-mountain' && (m = o));
    return m ? {peak: m.userData.peak, counts: m.userData.counts} : null;
  });
  console.log('city-mountain', JSON.stringify(info));
  expect(info).not.toBeNull();
  expect(info!.counts.pines + info!.counts.snowy).toBeGreaterThan(700);
  expect(info!.counts.rocks).toBeGreaterThan(50);
  const shot = async (name: string, x: number, z: number, yaw: number, pitch: number, cam: number) => {
    await game.page.evaluate(([x, z, yaw, pitch, cam]) => {
      const g = (window as any).__game;
      g.unlockAll(); g.teleport(x, z); g.G.yaw = yaw; g.G.pitch = pitch; g.G.camDist = cam; g.G.night = 0;
    }, [x, z, yaw, pitch, cam]);
    await game.page.waitForTimeout(2500);
    await game.page.screenshot({path: `${OUT}/mountain-${name}.png`});
  };
  const pk = info!.peak;
  await shot('peak', pk.x - 30, pk.z + 150, 0, 0.35, 40);
  await shot('road-start', 345, -200, -Math.PI / 2, 0.22, 24);
  await shot('road-mid', 600, -160, -Math.PI / 2, 0.25, 24);
  await shot('observatory', 850, -225, -Math.PI / 2, 0.2, 26);
  await shot('west-ridge', -330, -150, Math.PI / 2, 0.3, 40);
  await shot('tower', pk.x, -345, 0, 0.0, 14);
  await shot('tower-far', 130, -335, 0, -0.12, 14);
  await shot('spawn-north', 0, 20, 0, 0.1, 20);
  const tris = await game.page.evaluate(() => (window as any).__game.G.renderer.info.render.triangles);
  console.log('tris', tris);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
