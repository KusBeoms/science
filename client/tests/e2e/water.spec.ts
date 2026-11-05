// 진짜 물: 호수 판정(waterAt)·수면 메시·호숫가 길·수영, 그리고 호수 스크린샷(OUT)
import {test, expect, unexpected, OUT} from './fixtures';

test('lakes: waterAt gives each lake its own level, independent of the sea; bed is below, road is dry', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  const r = await page.evaluate(async () => {
    const W = await import('/js/core/water.js'),
      T = await import('/js/core/terrain.js'),
      D = await import('/js/data/wild.js'),
      R = await import('/js/data/wild-road.js'),
      V = await import('/js/data/world-map.js'),
      M = await import('/js/core/heightmap.js');
    const [G1, P1] = D.LAKES;
    const out: any = {bake: M.bakeMs, sea: V.SEA_Y, grand: D.LAKES[0].level, pond: D.LAKES[1].level};
    out.gc = W.waterAt(G1.x, G1.z);
    out.pc = W.waterAt(P1.x, P1.z);
    out.cityDry = W.waterAt(0, 0);
    out.mtnDry = W.waterAt(D.SUMMIT.x, D.SUMMIT.z);
    out.far = W.waterAt(G1.x + G1.rx * 2, G1.z);
    // 순환로: 모든 점이 땅이고 물이 아니며 높이가 길 높이와 같다
    let wet = 0, maxDy = 0, n = 0;
    for (const L of R.ROAD_LINES) for (const p of L.pts) {
      n++;
      if (W.waterAt(p.x, p.z)) wet++;
      maxDy = Math.max(maxDy, Math.abs(T.groundH(p.x, p.z) - p.y));
    }
    out.road = {wet, maxDy, n};
    out.submerged = W.submerged(G1.x, G1.z, D.LAKES[0].level - 3);
    out.lakeBed = T.groundH(G1.x, G1.z);
    // 다리 끝(BRIDGE_ENDS) → 길 → 순환로가 끊기지 않고 걸을 수 있다
    const link = R.ROAD_LINES[1].pts;
    let walk = true;
    for (let k = 1; k < link.length; k++) {
      const a = link[k - 1], b = link[k];
      for (let s = 0; s <= 10; s++) {
        const x0 = a.x + (b.x - a.x) * (s / 10), z0 = a.z + (b.z - a.z) * (s / 10);
        const x1 = a.x + (b.x - a.x) * ((s + 1) / 10), z1 = a.z + (b.z - a.z) * ((s + 1) / 10);
        if (!T.walkable(x0, z0, T.groundH(x0, z0), x1, z1)) walk = false;
      }
    }
    out.linkWalk = walk;
    out.linkStart = T.groundH(link[0].x, link[0].z);
    return out;
  });
  expect(r.gc.id).toBe('grand');
  expect(r.gc.y).toBeCloseTo(r.grand, 3);
  expect(r.gc.depth).toBeGreaterThan(10);
  expect(r.pc.id).toBe('pond');
  expect(r.pc.y).toBeCloseTo(r.pond, 3);
  expect(r.grand).toBeGreaterThan(r.sea + 1); // 수면은 바다와 독립(더 높다)
  expect(r.lakeBed).toBeLessThan(r.sea - 3);
  expect(r.cityDry).toBeNull();
  expect(r.mtnDry).toBeNull();
  expect(r.far).toBeNull();
  expect(r.road.wet).toBe(0);
  expect(r.road.maxDy).toBeLessThan(0.3);
  expect(r.linkWalk).toBe(true);
  expect(Math.abs(r.linkStart)).toBeLessThan(1);
  expect(r.submerged).toBeGreaterThan(2.5);
  expect(r.bake).toBeLessThan(400); // W6: 격자 확대(561×671)
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('water meshes exist (lake per lake + sea), shader compiles without errors', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => (window as any).__game.teleport(90, 1490));
  await page.waitForTimeout(1200);
  const r = await page.evaluate(async () => {
    const g = (window as any).__game, D = await import('/js/data/wild.js');
    const out: any = {};
    for (const L of D.LAKES) {
      const m = g.G.scene.getObjectByName('lake:' + L.id);
      out[L.id] = m ? {tris: m.userData.tris, shader: m.material.isShaderMaterial, y: m.geometry.attributes.position.array[1]} : null;
    }
    out.sea = !!g.G.scene.getObjectByName('sea');
    out.road = !!g.G.scene.getObjectByName('lakeRoad');
    return out;
  });
  expect(r.grand.shader).toBe(true);
  expect(r.grand.tris).toBeGreaterThan(500);
  expect(r.pond.tris).toBeGreaterThan(30);
  expect(r.sea && r.road).toBe(true);
  expect(unexpected(game.problems).console.filter(t => /shader|GLSL|WebGL/i.test(t))).toEqual([]);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('swimming: deep water floats you at the lake level (slowed, no drowning), shore walks out', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const g = (window as any).__game, D = await import('/js/data/wild.js'), T = await import('/js/core/terrain.js');
    const L = D.LAKES[0], out: any = {};
    g.teleport(L.x, L.z);
    await new Promise(r => setTimeout(r, 1500));
    out.y = g.G.me.pos.y - L.level;
    out.tilt = g.G.me.rotation.x;
    const R = await import('/js/systems/registry.js');
    out.mul = R.speedMul();
    out.alive = g.G.me.pos.y > -45;
    g.teleport(L.x, L.z - L.rz * 1.6);
    await new Promise(r => setTimeout(r, 600));
    out.mulDry = R.speedMul();
    out.tiltDry = g.G.me.rotation.x;
    return out;
  });
  expect(Math.abs(r.y + 0.45)).toBeLessThan(0.3);
  expect(r.tilt).toBeGreaterThan(0.5);
  expect(r.mul).toBeLessThan(0.7);
  expect(r.alive).toBe(true);
  expect(r.mulDry).toBe(1);
  expect(r.tiltDry).toBeLessThan(0.1);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

/** 고정 카메라: 플레이어 위치·yaw·pitch·거리를 정해 스크린샷 */
async function shot(game: any, name: string, x: number, z: number, yaw: number, pitch: number, dist: number, cyc?: number) {
  const {page} = game;
  await page.evaluate(([x, z, yaw, pitch, dist, cyc]: any) => {
    const g = (window as any).__game;
    g.teleport(x, z);
    g.G.yaw = yaw;
    g.G.pitch = pitch;
    g.G.camDist = dist;
    if (cyc !== undefined && cyc >= 0) g.G.cycT = cyc;
    if (cyc !== undefined && cyc < 0) g.G.night = 9; // 한밤
  }, [x, z, yaw, pitch, dist, cyc]);
  await page.waitForTimeout(2200);
  await page.screenshot({path: `${OUT}/water-${name}.png`});
}
test('screenshots of the lakes (day, dusk, close shore, sea beach)', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => { const g = (window as any).__game; g.G.camDistMax = 400; });
  await shot(game, 'lake-wide', 90, 1485, Math.PI, 0.5, 120);
  await shot(game, 'lake-high', 90, 1530, Math.PI, 1.0, 330);
  await shot(game, 'lake-shore', -40, 1530, Math.PI * 0.9, 0.18, 14);
  await shot(game, 'lake-dusk', 90, 1485, Math.PI, 0.35, 90, 292);
  await shot(game, 'lake-night', 90, 1485, Math.PI, 0.35, 90, -1);
  await shot(game, 'lake-valley', 300, 1400, Math.PI * 0.75, 0.3, 160);
  await shot(game, 'swim', 40, 1625, Math.PI * 0.8, 0.25, 12);
  await shot(game, 'sea-beach', 0, 342, Math.PI, 0.3, 30);
  await shot(game, 'pond', -60, 960, Math.PI, 0.4, 50, 0);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('lake surface does not create a detached freshwater patch outside the rural coast',async({game})=>{
  await game.open('?debug=1');
  const r=await game.page.evaluate(async()=>{
    const {G}=(window as any).__game,O=await import('/js/data/outline.js');
    const x=-190,z=1750,geo=G.scene.getObjectByName('lake:grand').geometry,a=geo.attributes.position.array,index=geo.index.array;
    const cross=(ax:number,az:number,bx:number,bz:number)=>ax*bz-az*bx;
    let covered=false;
    for(let k=0;k<index.length;k+=3) {
      const ids=[index[k]*3,index[k+1]*3,index[k+2]*3],p=ids.map(i=>[a[i]-x,a[i+2]-z]);
      const s=[cross(p[0][0],p[0][1],p[1][0],p[1][1]),cross(p[1][0],p[1][1],p[2][0],p[2][1]),cross(p[2][0],p[2][1],p[0][0],p[0][1])];
      if(s.every(v=>v>=0)||s.every(v=>v<=0)){covered=true;break;}
    }
    return{land:O.WILD_POLY.inside(x,z),covered};
  });
  expect(r.land).toBe(false);expect(r.covered).toBe(false);
});
