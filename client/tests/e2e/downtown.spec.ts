// W6 DOWNTOWN: 고층·본사·거래소·아파트 단지 — 수·높이, 입장(로비·엘리베이터), 사과 시선 축 보호, 밤에만 창 불빛, 삼각형 예산, 스크린샷
import {test, expect, unexpected, OUT} from './fixtures';

const boot = async (game: any, q = '?debug=1') => {
  await game.open(q);
  await game.page.click('#mstart');
  await game.page.waitForTimeout(800);
};

test('downtown data: 10+ skyscrapers up to 200u, apartment complexes of 4~8 slabs, nothing overlaps', async ({game}) => {
  await boot(game);
  const r = await game.page.evaluate(async () => {
    const C = await import('/js/data/city.js'),
      W = await import('/js/data/city-w6.js'),
      mine = W.BUILDINGS_W6,
      tall = mine.filter((b: any) => b.hr && b.hr.kind !== 'slab' && b.hr.H >= 90),
      slabs = (p: string) => mine.filter((b: any) => b.id.startsWith(p)),
      hit = (a: number[], b: number[]) => a[0] < b[2] + 2 && a[2] > b[0] - 2 && a[1] < b[3] + 2 && a[3] > b[1] - 2,
      mineIds = new Set(mine.map((b: any) => b.id)),
      bad: string[] = [];
    for (const b of mine) for (const o of C.CITY_BUILDINGS) if (o.id !== b.id && hit(C.footprint(b), C.footprint(o)) && (mineIds.has(o.id) ? o.id > b.id : true)) bad.push(b.id + '×' + o.id);
    const kinds = new Set(mine.filter((b: any) => b.hr).map((b: any) => b.hr.kind));
    return {tall: tall.length, maxH: Math.max(...mine.map((b: any) => b.hr?.H ?? 0)), minTallH: Math.min(...tall.map((b: any) => b.hr.H)),
      aptA: slabs('w6-apta').length, aptB: slabs('w6-aptb').length, slabFloors: slabs('w6-apt').map((b: any) => b.floors), bad, kinds: [...kinds].sort(),
      villas: mine.filter((b: any) => b.district === 'villa').length, purposes: [...new Set(mine.map((b: any) => b.purpose))].sort()};
  });
  expect(r.tall).toBeGreaterThanOrEqual(10);
  expect(r.maxH).toBeGreaterThanOrEqual(180);
  expect(r.maxH).toBeLessThanOrEqual(210);
  expect(r.minTallH).toBeGreaterThanOrEqual(90);
  expect(r.aptA).toBeGreaterThanOrEqual(4);
  expect(r.aptB).toBeLessThanOrEqual(8);
  for (const f of r.slabFloors) { expect(f).toBeGreaterThanOrEqual(15); expect(f).toBeLessThanOrEqual(30); }
  expect(r.bad).toEqual([]);
  expect(r.kinds).toEqual(expect.arrayContaining(['glass', 'stepped', 'twin', 'crown', 'slab', 'mixed', 'exchange']));
  expect(r.villas).toBeGreaterThanOrEqual(8);
  expect(r.purposes).toEqual(expect.arrayContaining(['hq', 'exchange', 'bank', 'hotel', 'apartment', 'office']));
});

test('apple sight-line axis stays clear: no building blocks due north of the base (±8°, above 8° elevation)', async ({game}) => {
  await boot(game);
  const blockers = await game.page.evaluate(async () => {
    const C = await import('/js/data/city.js'),
      B = await import('/js/render/city/building.js'),
      out: string[] = [],
      T8 = Math.tan((8 * Math.PI) / 180);
    for (const b of C.CITY_BUILDINGS) {
      const [x0, z0, x1, z1] = C.footprint(b),
        H = b.hr ? b.hr.H : B.buildingHeight(b);
      if (z1 >= 17) continue;
      // 정북 ±8° 부채꼴 안의 가장 가까운 점 (밑변이 부채꼴과 겹치는가)
      for (let x = x0; x <= x1; x += 1) for (const z of [z0, z1]) {
        const D = 17 - z;
        if (Math.abs(x) < D * T8 && H > D * T8) { out.push(b.id); x = x1; break; }
      }
    }
    return out;
  });
  expect(blockers.filter(id => id.startsWith('w6-'))).toEqual([]);
  expect(blockers).toEqual([]);
});

test('every downtown building is enterable; HQ lobby has a working elevator (🛗 floor animation)', async ({game}) => {
  await boot(game);
  const r = await game.page.evaluate(async () => {
    const I = await import('/js/data/interiors.js'),
      W = await import('/js/data/city-w6.js'),
      B = await import('/js/game/interior.js'),
      L = await import('/js/game/lift.js'),
      T = await import('/js/core/terrain.js'),
      g = (window as any).__game,
      fails: string[] = [];
    for (const b of W.BUILDINGS_W6) {
      const i = I.ENTERABLES.findIndex((e: any) => e.id === b.id);
      if (i < 0) { fails.push('no-enterable ' + b.id); continue; }
      const e = I.ENTERABLES[i];
      if (T.groundH(e.door.x, e.door.z) === -Infinity || T.solidAt(e.door.x, e.door.z, 0.45)) fails.push('door ' + b.id);
      B.enterBuilding(i);
      if (!g.G.inside) fails.push('enter ' + b.id);
      B.leaveBuilding();
    }
    const hq = I.ENTERABLES.findIndex((e: any) => e.purpose === 'hq');
    B.enterBuilding(hq);
    const lift = g.G.inside.spots.find((s: any) => s.fx === 'lift');
    g.G.me.pos.set(lift.x, 0, lift.z + 0.5);
    return {fails, hasLift: !!lift, n: W.BUILDINGS_W6.length};
  });
  expect(r.fails).toEqual([]);
  expect(r.hasLift).toBe(true);
  await game.page.waitForTimeout(500);
  await game.page.screenshot({path: `${OUT}/downtown-lobby.png`});
  await game.page.keyboard.press('e');
  await game.page.waitForTimeout(1200);
  expect(await game.page.evaluate(async () => (await import('/js/game/lift.js')).liftBusy())).toBe(true);
  await game.page.screenshot({path: `${OUT}/downtown-lift.png`});
  await game.page.waitForTimeout(3500);
  await game.page.evaluate(async () => { (await import('/js/game/interior.js')).leaveBuilding(); });
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('night: tower windows are lit only at night (lit meshes hidden by day); triangle budget; skyline shots', async ({game}) => {
  await boot(game, '?debug=1&cine=0');
  const stat = (night: number) =>
    game.page.evaluate(async n => {
      const g = (window as any).__game;
      g.G.night = n;
      await new Promise(r => setTimeout(r, 500));
      let city: any = null;
      g.G.scene.traverse((o: any) => o.name === 'city' && (city = o));
      let on = 0, off = 0, dtOn = 0, dtOff = 0;
      city.traverse((o: any) => {
        if (!(o.isMesh && o.material && o.material.type === 'MeshBasicMaterial')) return;
        o.visible ? on++ : off++;
        // 도심 구역의 밤 메시(경계 상자 중심이 금융 지구 안)
        o.geometry.computeBoundingBox();
        const c = o.geometry.boundingBox.getCenter(new (window as any).THREE.Vector3());
        if (Math.abs(c.x) < 400 && (o.name === 'downtown' || o.parent?.name === 'downtown' || (c.x > 85 && c.x < 190 && c.z < -160))) o.visible ? dtOn++ : dtOff++;
      });
      return {on, off, dtOn, dtOff};
    }, night);
  const day = await stat(0),
    nt = await stat(6);
  expect(day.on).toBe(0);
  expect(nt.off).toBe(0);
  expect(nt.dtOn).toBeGreaterThanOrEqual(1);
  expect(day.dtOn).toBe(0);
  // 예산: 고층 건물 + 단지 소품 삼각형이 나머지 도시 삼각형의 30% 이하
  const tris = await game.page.evaluate(async () => {
    const H = await import('/js/render/city/highrise.js'),
      C = await import('/js/data/city.js'),
      g = (window as any).__game;
    let hr = 0;
    for (const b of C.CITY_BUILDINGS) if (b.hr) {
      const m = H.makeHighrise(b);
      hr += m.solid.attributes.position.count / 3 + m.lit.attributes.position.count / 3;
    }
    let city: any = null, all = 0;
    g.G.scene.traverse((o: any) => o.name === 'city' && (city = o));
    city.traverse((o: any) => { if (o.isMesh && o.geometry?.attributes?.position) all += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? 1 : 1); });
    return {hr, all};
  });
  console.log('highrise tris', tris.hr, 'city meshes tris', tris.all);
  expect(tris.hr).toBeLessThan((tris.all - tris.hr) * 0.3);
  // 스크린샷: 스카이라인(낮) · 밤 · 거리 · 아파트 단지
  const shot = async (name: string, x: number, z: number, yaw: number, pitch: number, cam: number, night: number) => {
    await game.page.evaluate(([x, z, yaw, pitch, cam, night]) => {
      const g = (window as any).__game;
      g.teleport(x, z); g.G.yaw = yaw; g.G.pitch = pitch; g.G.camDist = cam; g.G.night = night;
    }, [x, z, yaw, pitch, cam, night]);
    await game.page.waitForTimeout(900);
    await game.page.screenshot({path: `${OUT}/downtown-${name}.png`});
  };
  await shot('skyline-day', 130, -100, Math.PI, 0.12, 24, 0);
  await shot('skyline-night', 130, -100, Math.PI, 0.12, 24, 6);
  await shot('boulevard', 80, -200, 1.57, 0.2, 16, 0);
  await shot('apt-a', -120, -150, Math.PI, 0.2, 18, 0);
  await shot('apt-b', -119, 188, 0, 0.2, 18, 0);
  await shot('apt-b-night', -119, 188, 0, 0.2, 18, 6);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
