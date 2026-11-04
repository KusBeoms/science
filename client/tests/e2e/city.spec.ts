// 도시 W2: 전 구역 데이터 무결성(겹침·문 막힘) · 밤 점등 · 구역별 스크린샷 · 삼각형 예산 · 거래의 선
import {test, expect, unexpected, canvasColors, OUT} from './fixtures';

const CITY = '/js/data/city.js';
const TERRAIN = '/js/core/terrain.js';

test('city data: no overlapping buildings, roads stay clear, every door is reachable ground', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  const r = await page.evaluate(
    async ([city, terrain]) => {
      const C = await import(city);
      const T = await import(terrain);
      const fp = C.CITY_BUILDINGS.map((b: any) => ({id: b.id, r: C.footprint(b)}));
      const hit = (a: number[], b: number[], m = 0) => a[0] < b[2] + m && a[2] > b[0] - m && a[1] < b[3] + m && a[3] > b[1] - m;
      const overlap: string[] = [];
      for (let i = 0; i < fp.length; i++) for (let j = i + 1; j < fp.length; j++) if (hit(fp[i].r, fp[j].r)) overlap.push(fp[i].id + '/' + fp[j].id);
      const road = (o: any) => {
        const h = o.w / 2;
        return o.z0 === o.z1
          ? [Math.min(o.x0, o.x1), o.z0 - h, Math.max(o.x0, o.x1), o.z0 + h]
          : [o.x0 - h, Math.min(o.z0, o.z1), o.x0 + h, Math.max(o.z0, o.z1)];
      };
      const onRoad: string[] = [];
      for (const f of fp) for (const o of C.CITY_ROADS) if (hit(f.r, road(o), -0.05)) onRoad.push(f.id + '@' + o.id);
      const lmRect = (l: any) => [l.x - (l.w ?? 2 * l.r) / 2, l.z - (l.d ?? 2 * l.r) / 2, l.x + (l.w ?? 2 * l.r) / 2, l.z + (l.d ?? 2 * l.r) / 2];
      const onLandmark: string[] = [];
      for (const f of fp) for (const l of C.CITY_LANDMARKS) if (l.kind !== 'arch' && hit(f.r, lmRect(l))) onLandmark.push(f.id + '@' + l.id);
      (window as any).__game.unlockAll();
      const blockedDoors: string[] = [];
      for (const b of C.CITY_BUILDINGS) {
        const d = C.doorOf(b);
        if (T.solidAt(d.x, d.z, 0.45) || !T.onGround(d.x, d.z)) blockedDoors.push(b.id);
      }
      return {n: fp.length, overlap, onRoad, onLandmark, blockedDoors, districts: [...new Set(C.CITY_BUILDINGS.map((b: any) => b.district))]};
    },
    [CITY, TERRAIN],
  );
  expect(r.overlap).toEqual([]);
  expect(r.onRoad).toEqual([]);
  expect(r.onLandmark).toEqual([]);
  expect(r.blockedDoors).toEqual([]);
  expect(r.n).toBeGreaterThanOrEqual(80);
  expect(r.districts).toEqual(expect.arrayContaining(['avenue', 'shops', 'alley', 'market', 'garage', 'port', 'science', 'resi']));
});

test('every district can be walked to: teleport + ground height + canvas screenshot', async ({game}) => {
  const {page, problems} = game;
  await game.open('?debug=1&cine=0');
  await page.click('#mstart');
  const spots: [string, number, number, number][] = [
    ['market', -90, -30, Math.PI / 2], // 위 골목에서 서쪽(노점 줄)
    ['garage', 70, -80, -0.9], // 격납고(L5)
    ['tower', 20, 100, 3.71], // 관제탑(L4)
    ['port', 0, 100, Math.PI],
    ['science', 100, 74, Math.PI],
    ['resi', -75, 92, Math.PI / 2],
    ['hill', -62, -62, Math.PI / 4], // 언덕 위 성(L7)
    ['tradeline', 120, 120, Math.PI * 0.75],
  ];
  for (const [name, x, z, yaw] of spots) {
    await page.evaluate(([x, z, yaw]) => {
      const g = (window as any).__game;
      g.teleport(x, z);
      g.G.yaw = yaw;
      g.G.pitch = 0.12;
      g.G.cycT = 100;
      g.G.night = 0;
    }, [x, z, yaw]);
    await page.waitForTimeout(900);
    const h = await page.evaluate(([x, z]) => (window as any).__game.G.me.pos.y + 0 * x * z, [x, z]);
    expect(Math.abs(h)).toBeLessThan(20);
    expect(await canvasColors(page)).toBeGreaterThan(8);
    await page.screenshot({path: `${OUT}/city-${name}.png`});
  }
  const u = unexpected(problems);
  expect(u.pageerrors).toEqual([]);
  expect(u.console).toEqual([]);
});

test('night lights every district (lit meshes visible), day hides them; tris stay under the budget', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1&cine=0');
  await page.click('#mstart');
  const lit = (night: number) =>
    page.evaluate(async n => {
      const g = (window as any).__game;
      g.G.night = n;
      await new Promise(r => setTimeout(r, 400));
      let city: any = null;
      g.G.scene.traverse((o: any) => o.name === 'city' && (city = o));
      let on = 0,
        off = 0;
      city.traverse((o: any) => {
        if (o.isMesh && o.material && o.material.type === 'MeshBasicMaterial') (o.visible ? on++ : off++);
      });
      return {on, off};
    }, night);
  const day = await lit(0);
  const night = await lit(6);
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.teleport(-70, 0);
    g.G.yaw = Math.PI / 2;
    g.G.night = 6;
  });
  await page.waitForTimeout(700);
  await page.screenshot({path: `${OUT}/city-night.png`});
  expect(day.on).toBe(0);
  expect(night.off).toBe(0);
  expect(night.on).toBeGreaterThanOrEqual(12);
  // 스폰 시야 삼각형 (Q2 95k 이내)
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.G.night = 0;
    g.teleport(0, 17);
  });
  await page.waitForTimeout(700);
  const tris = await page.evaluate(() => (window as any).__game.G.renderer.info.render.triangles);
  expect(tris).toBeLessThan(95_000);
});
