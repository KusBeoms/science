// 로우폴리 헬퍼: 갤러리 로드(콘솔 error 0·삼각형 상한)와 프리미티브 삼각형 수·면 법선 검사
import {test, expect, unexpected, canvasColors, OUT} from './fixtures';

const LP = './js/render/lowpoly';

test('gallery renders with no errors and stays inside the triangle budget', async ({game}) => {
  const {page, problems} = game;
  await page.goto(`${game.base}/?gallery=1&cine=0`);
  await page.evaluate(async lp => (await import(`${lp}/gallery.js`)).showGallery(), LP);
  const root = page.locator('#lowpoly-gallery');
  await expect(root).toHaveAttribute('data-calls', /^[1-9]/);
  await page.waitForTimeout(500);
  expect(await canvasColors(page)).toBeGreaterThan(8);
  await page.screenshot({path: `${OUT}/lowpoly-gallery.png`});

  const per = await page.$$eval('#lowpoly-gallery li', els => els.map(e => [e.getAttribute('data-name')!, Number(e.getAttribute('data-tris'))] as const));
  const tris = Object.fromEntries(per);
  const total = Number(await root.getAttribute('data-tris'));
  console.log(`GALLERY total=${total} ${per.map(([n, t]) => `${n}:${t}`).join(' ')}`);
  expect([tris.ico0, tris.ico1, tris.ico2, tris.ico3]).toEqual([20, 80, 180, 320]); // r128: 20*(detail+1)^2
  for (const k of ['building1', 'building2', 'building3']) {
    expect(tris[k]).toBeGreaterThanOrEqual(60);
    expect(tris[k]).toBeLessThanOrEqual(600);
  }
  for (const k of ['tree0', 'tree1', 'tree2']) expect(tris[k]).toBeLessThanOrEqual(60);
  expect(tris.rock).toBeLessThanOrEqual(40);
  expect(total).toBeLessThanOrEqual(15000);
  expect(Number(await root.getAttribute('data-calls'))).toBeLessThanOrEqual(120);
  expect(Number(await root.getAttribute('data-render-tris'))).toBeLessThanOrEqual(150000);

  const u = unexpected(problems);
  expect(u.pageerrors).toEqual([]);
  expect(u.console).toEqual([]);
  expect(u.failed).toEqual([]);
});

test('primitives: exact triangle counts, flat face normals, seeded determinism, merge', async ({game}) => {
  await game.page.goto(`${game.base}/?cine=0`);
  const r = await game.page.evaluate(async lp => {
    const P = await import(`${lp}/prim.js`);
    const M = await import(`${lp}/merge.js`);
    const S = await import(`${lp}/samples.js`);
    const tris = (g: any) => M.geoStats(g).tris;
    const flat = (g: any) => {
      const n = g.attributes.normal.array;
      for (let i = 0; i < n.length; i += 9) {
        for (let k = 3; k < 9; k++) if (Math.abs(n[i + k] - n[i + (k % 3)]) > 1e-5) return false;
      }
      return true;
    };
    const boxG = P.box(2, 2, 2, 0xffffff);
    const merged = M.mergeGeometries([boxG, P.cone(1, 1, 0xff0000), P.wedge(1, 1, 1, 0x00ff00)]);
    const inst = M.instanced(P.box(1, 1, 1, 0xffffff), M.lowMat(), [{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0, color: 0xff0000}]);
    const a = S.sampleBuilding(7).solid.attributes.position.array;
    const b = S.sampleBuilding(7).solid.attributes.position.array;
    return {
      box: tris(boxG),
      prism6: tris(P.prism(6, 1, 1, 1)),
      cone8: tris(P.cone(1, 1, 1)),
      wedge: tris(P.wedge(1, 1, 1, 1)),
      gable: tris(P.gable(1, 1, 1, 1)),
      ico: [0, 1, 2, 3].map(d => tris(P.ico(1, d, 1))),
      boxFlat: flat(boxG),
      icoFlat: flat(P.ico(1, 1, 1)),
      indexed: boxG.index !== null,
      mergedTris: tris(merged),
      mergedHasColor: merged.attributes.color.count === merged.attributes.position.count,
      instTris: M.countTris(inst),
      lambertFlat: 'flatShading' in new THREE.MeshLambertMaterial(),
      same: a.length === b.length && a.every((v: number, i: number) => v === b[i]),
    };
  }, LP);
  expect(r).toMatchObject({box: 12, prism6: 20, cone8: 14, wedge: 8, gable: 8, ico: [20, 80, 180, 320]});
  expect(r.boxFlat && r.icoFlat && !r.indexed).toBe(true);
  expect(r.mergedTris).toBe(12 + 14 + 8);
  expect(r.mergedHasColor).toBe(true);
  expect(r.instTris).toBe(24);
  expect(r.lambertFlat).toBe(false); // r128 Lambert 에는 flatShading 이 없어 면 분리가 필요하다
  expect(r.same).toBe(true);
});
