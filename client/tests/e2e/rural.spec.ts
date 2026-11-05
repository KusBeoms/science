// 시골 섬(W7 RURAL): 도로 연속성·평탄·무충돌, 등산로·선착장 보행, 밭 단 평탄, 삼각형 예산, 지상 스크린샷(OUT/rural-*.png)
import {test, expect, unexpected, OUT} from './fixtures';

test('rural roads: one connected network, flat, dry, nothing blocks them (no fences)', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => (window as any).__game.teleport(150, 1000));
  await page.waitForTimeout(2500); // 시골 섬 건물(충돌체) 생성
  const r = await page.evaluate(async () => {
    const T = await import('/js/core/terrain.js'), R = await import('/js/data/wild-road.js'), W = await import('/js/core/water.js'),
      B = await import('/js/data/outline.js'), BR = await import('/js/data/bridge.js');
    const out: any = {lines: {}};
    for (const L of R.ROAD_LINES) {
      let n = 0, maxDy = 0, wet = 0, blocked = 0, maxSlope = 0, steep = 0, prev: number | null = null;
      const P = L.pts, m = L.closed ? P.length : P.length - 1;
      for (let k = 0; k < m; k++) {
        const a = P[k], b = P[(k + 1) % P.length], len = Math.hypot(b.x - a.x, b.z - a.z), c = Math.max(1, Math.ceil(len / 1));
        for (let i = 0; i < c; i++) {
          const x = a.x + ((b.x - a.x) * i) / c, z = a.z + ((b.z - a.z) * i) / c, y = T.groundH(x, z), want = a.y + ((b.y - a.y) * i) / c;
          n++;
          maxDy = Math.max(maxDy, Math.abs(y - want));
          if (W.waterAt(x, z)) wet++;
          if (T.solidAt(x, z, 1.8)) blocked++; // 차 반폭 여유
          if (prev !== null) { const s = Math.abs(y - prev); maxSlope = Math.max(maxSlope, s); if (s > 0.25) steep++; }
          prev = y;
        }
      }
      out.lines[L.id] = {n, maxDy, wet, blocked, maxSlope, steep};
    }
    const link = R.roadLine('link').pts, ring = R.roadLine('ring').pts;
    const end = link[link.length - 1];
    out.linkToRing = Math.min(...ring.map((p: any) => Math.hypot(p.x - end.x, p.z - end.z)));
    out.linkStart = {x: link[0].x, z: link[0].z, bridgeX: B.BRIDGE_ENDS.x, flare: BR.Z_FLARE};
    const sp = R.roadLine('spur').pts, vr = R.roadLine('village').pts, ws = R.roadLine('west').pts;
    const near = (p: any, pts: any[]) => Math.min(...pts.map(q => Math.hypot(q.x - p.x, q.z - p.z)));
    out.spurJoin = near(sp[0], ring);
    out.villageJoin = near(vr[0], link);
    out.westJoin = near(ws[0], ring);
    // 다리 끝 → 간선 → 순환로를 0.5u 걸음으로 걷기(walkable, 충돌 0)
    let x = link[0].x, z = link[0].z, y = T.groundH(x, z), fail: any = null;
    for (let k = 1; k < link.length && !fail; k++) {
      const a = link[k - 1], b = link[k], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.5);
      for (let i = 1; i <= n; i++) {
        const nx = a.x + ((b.x - a.x) * i) / n, nz = a.z + ((b.z - a.z) * i) / n;
        if (!T.walkable(x, z, y, nx, nz) || T.solidAt(nx, nz, 0.4) || !Number.isFinite(T.groundH(nx, nz))) { fail = {x: nx, z: nz}; break; }
        x = nx; z = nz; y = T.groundH(nx, nz);
      }
    }
    out.walkFail = fail;
    return out;
  });
  for (const [id, l] of Object.entries<any>(r.lines)) {
    expect(l.wet, id).toBe(0);
    expect(l.blocked, id + ' blocked').toBe(0);
    expect(l.maxDy, id + ' flat').toBeLessThan(0.35);
    expect(l.steep, id + ' steep').toBe(0);
  }
  expect(r.linkToRing).toBeLessThan(3);
  expect(r.spurJoin).toBeLessThan(3);
  expect(r.villageJoin).toBeLessThan(3);
  expect(r.westJoin).toBeLessThan(3);
  expect(r.linkStart.z).toBe(r.linkStart.flare);
  expect(r.walkFail).toBeNull();
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('rural terrain: terraced fields are flat, trail/dock walkable, parking lot level, pond dock deck', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => (window as any).__game.teleport(-200, 1000));
  await page.waitForTimeout(2500);
  const r = await page.evaluate(async () => {
    const T = await import('/js/core/terrain.js'), F = await import('/js/data/wild-fields.js'), D = await import('/js/core/deck.js'),
      MT = await import('/js/data/wild-mountain.js'), W = await import('/js/data/wild.js'), M = await import('/js/core/wild-mountain.js');
    let worst = 0, bad = 0;
    for (const p of F.PARCELS) {
      const ys: number[] = [];
      for (const a of [-0.5, 0, 0.5]) for (const b of [-0.5, 0, 0.5]) { const u = a * p.w, v = b * p.d; ys.push(T.groundH(p.x + u * p.c - v * p.s, p.z + u * p.s + v * p.c)); }
      const d = Math.max(...ys) - Math.min(...ys);
      worst = Math.max(worst, d);
      if (d > 0.9) bad++;
    }
    // 주차장은 평지
    const lot = [[0, 0], [-18, -9], [18, 9], [-18, 9], [18, -9]].map(([a, b]) => T.groundH(MT.LOT.x + a, MT.LOT.z + b));
    // 호수 마을 선착장: 물가에서 데크로 올라 호수 안까지 걸어 나간다
    const dk = D.deckList().find((d: any) => d.id === 'rural-pond-dock');
    let dockWalk = false, dockY = 0;
    if (dk) {
      let x = dk.ax + 6, z = dk.az, y = T.groundH(x, z, 5);
      dockWalk = true;
      while (x > dk.bx + 0.6) {
        const nx = x - 0.4, ny = T.groundH(nx, z, y);
        if (!T.walkable(x, z, y, nx, z) || !Number.isFinite(ny)) { dockWalk = false; break; }
        x = nx; y = ny;
      }
      dockY = y;
    }
    // 정상: 높이·평지
    const sm = [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4]].map(([a, b]) => T.groundH(W.SUMMIT.x + a, W.SUMMIT.z + b));
    // 산은 능선과 계곡: 정상에서 같은 거리의 방위별 높이 편차가 크다(원형 봉우리가 아니다)
    const ring = Array.from({length: 24}, (_, i) => M.mountainBase(W.SUMMIT.x + Math.cos(i * 0.2618) * 120, W.SUMMIT.z + Math.sin(i * 0.2618) * 120));
    return {n: F.PARCELS.length, worst, bad, lot, dockWalk, dockY, deck: dk, summit: sm, spread: Math.max(...ring) - Math.min(...ring)};
  });
  expect(r.n).toBeGreaterThan(80);
  expect(r.bad).toBe(0);
  expect(Math.max(...r.lot) - Math.min(...r.lot)).toBeLessThan(0.05);
  expect(r.deck).toBeTruthy();
  expect(r.dockWalk).toBe(true);
  expect(r.dockY).toBeCloseTo(r.deck.h0, 2);
  expect(Math.max(...r.summit) - Math.min(...r.summit)).toBeLessThan(0.6);
  expect(r.spread).toBeGreaterThan(25); // 능선·계곡 기복
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('rural night lights are night-only, counts and wild-owned triangle budget', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => { const g = (window as any).__game; g.teleport(150, 1450); g.G.yaw = Math.PI; g.G.cycT = 100; g.G.night = 0; });
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const {G} = (window as any).__game, root = G.scene.getObjectByName('rural-landscape');
    const basic: any[] = [];
    root.traverse((o: any) => { if (o.isMesh && o.material && o.material.isMeshBasicMaterial && o.parent === root) basic.push(o); });
    const day = basic.map(o => o.visible);
    G.night = 9;
    return {counts: root.userData.counts, n: basic.length, day};
  });
  await page.waitForTimeout(1200);
  const night = await page.evaluate(() => {
    const root = (window as any).__game.G.scene.getObjectByName('rural-landscape'), a: boolean[] = [];
    root.traverse((o: any) => { if (o.isMesh && o.material && o.material.isMeshBasicMaterial && o.parent === root) a.push(o.visible); });
    return a;
  });
  expect(r.n).toBeGreaterThan(0);
  expect(r.day.every((v: boolean) => !v)).toBe(true);
  expect(night.every((v: boolean) => v)).toBe(true);
  expect(r.counts.fields).toBeGreaterThan(80);
  expect(r.counts.cottages).toBeGreaterThan(20);
  expect(r.counts.greenhouses).toBeGreaterThan(2);
  expect(r.counts.trailLength).toBeGreaterThan(600);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('wild-owned triangles stay under 110k in the worst wild views', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  const views: [number, number, number][] = [[56, 1250, Math.PI], [100, 900, Math.PI], [200, 1500, Math.PI], [-350, 1330, Math.PI], [196, 1440, 0], [-85, 1070, 1.57]];
  const worst: number[] = [];
  for (const [x, z, yaw] of views) {
    await page.evaluate(([x, z, yaw]: any) => { const g = (window as any).__game; g.teleport(x, z); g.G.yaw = yaw; g.G.pitch = 0.35; g.G.camDist = 25; g.G.cycT = 100; g.G.night = 0; }, [x, z, yaw]);
    await page.waitForTimeout(2200);
    worst.push(await page.evaluate(() => {
      const {G} = (window as any).__game, draw: any[] = [], renderer = G.renderer, orig = renderer.renderBufferDirect.bind(renderer);
      renderer.renderBufferDirect = (...a: any[]) => { const geo = a[2], o = a[4]; let n = o.name || ''; for (let p = o.parent; p && p.type !== 'Scene'; p = p.parent) n = p.name + '/' + n; draw.push({n, t: (geo.index?.count || geo.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1)}); return orig(...a); };
      renderer.render(G.scene, G.camera);
      renderer.renderBufferDirect = orig;
      return Math.round(draw.filter(d => /wild|rural|terrain|lake|sea|shoreline|terraced|orchards/.test(d.n)).reduce((s, d) => s + d.t, 0));
    }));
  }
  console.log('wild-owned tris per view', JSON.stringify(worst));
  for (const t of worst) expect(t).toBeLessThan(110_000);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

async function shot(game: any, name: string, x: number, z: number, yaw: number, pitch: number, dist: number, cyc?: number) {
  const {page} = game;
  await page.evaluate(([x, z, yaw, pitch, dist, cyc]: any) => {
    const g = (window as any).__game;
    g.teleport(x, z);
    g.G.yaw = yaw;
    g.G.pitch = pitch;
    g.G.camDist = dist;
    g.G.night = 0; g.G.cycT = 100;
    if (cyc !== undefined && cyc >= 0) g.G.cycT = cyc;
    if (cyc !== undefined && cyc < 0) g.G.night = 9;
  }, [x, z, yaw, pitch, dist, cyc]);
  await page.waitForTimeout(2400);
  await page.screenshot({path: `${OUT}/rural-${name}.png`});
}
test('rural screenshots', async ({game}) => {
  test.setTimeout(240_000);
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => { const g = (window as any).__game; g.G.camDistMax = 500; g.G.cycT = 100; g.G.night = 0; });
  const S: [string, number, number, number, number, number, number?][] = JSON.parse(process.env.RURAL_SHOTS || '[]');
  for (const [n, x, z, yaw, pitch, dist, cyc] of S) await shot(game, n, x, z, yaw, pitch, dist, cyc);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('rural tris breakdown', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  const pts: [number, number, number][] = JSON.parse(process.env.RURAL_TRIS || '[[200,1500,0]]');
  for (const [x, z, yaw] of pts) {
    await page.evaluate(([x, z, yaw]: any) => { const g = (window as any).__game; g.teleport(x, z); g.G.yaw = yaw; g.G.pitch = 0.35; g.G.camDist = 20; g.G.cycT = 100; g.G.night = 0; }, [x, z, yaw]);
    await page.waitForTimeout(2500);
    const r = await page.evaluate(async () => {
      const {G} = (window as any).__game;
      const draw: any[] = [];
      const renderer = G.renderer, orig = renderer.renderBufferDirect.bind(renderer);
      renderer.renderBufferDirect = (...args: any[]) => { const geo = args[2], obj = args[4]; let n = obj.name || ''; for (let p = obj.parent; p && p.type !== 'Scene'; p = p.parent) if (p.name && !n.includes('lake') ) n = (p.name) + '/' + n; draw.push({name: n.slice(0, 60), tris: (geo.index?.count || geo.attributes.position.count) / 3 * (obj.isInstancedMesh ? obj.count : 1)}); return orig(...args); };
      renderer.render(G.scene, G.camera);
      renderer.renderBufferDirect = orig;
      const by: Record<string, number> = {};
      for (const d of draw) { const k = d.name.split('/').slice(-2).join('/').replace(/-?\d+,-?\d+/g, '#'); by[k] = (by[k] || 0) + d.tris; }
      const wildish = draw.filter(d => /wild|rural|terrain|lake|sea|shoreline|terraced|orchards|lodge/.test(d.name)).reduce((a, d) => a + d.tris, 0);
      return {total: Math.round(draw.reduce((a, d) => a + d.tris, 0)), wildish: Math.round(wildish), top: Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => k + ' ' + Math.round(v))};
    });
    console.log(x, z, yaw, JSON.stringify(r, null, 1));
  }
});
