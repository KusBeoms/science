// W8 P3-a: city-terrain.json 코덱 왕복 + 현재 높이맵과의 편차(다듬기 허용치·보존 구역 0)
import {test, expect, OUT} from './fixtures';
import fs from 'node:fs';
import path from 'node:path';
import {decodeTerrain, encodeHeights, decodeHeights, encodeLand, decodeLand, checksumCm, type CityTerrainFile} from '../../src/data/city-terrain-codec';
import {mapReview} from './map-review';

const FILE = path.resolve(__dirname, '../../public/data/city-terrain.json');
const file = (): CityTerrainFile => JSON.parse(fs.readFileSync(FILE, 'utf8'));

test('codec: 합성 데이터와 파일 모두 cm 단위로 정확히 왕복한다', () => {
  const syn = Int32Array.from({length: 5000}, (_, i) => [0, 0, 1, -1, 63, -64, 64, 12345, -9000, 17000, 0][i % 11] + (i % 7));
  expect(Array.from(decodeHeights(encodeHeights(syn), syn.length))).toEqual(Array.from(syn));
  const m = Uint8Array.from({length: 3000}, (_, i) => (i % 97 < 40 || i > 2900 ? 1 : 0));
  expect(Array.from(decodeLand(encodeLand(m), m.length))).toEqual(Array.from(m));
  expect(() => decodeHeights(encodeHeights(syn), syn.length - 1)).toThrow();
  const f = file(), t = decodeTerrain(f);
  expect(f.schema).toBe('city-terrain/1');
  expect(f.step).toBe(5);
  expect(t.cm.length).toBe(f.nx * f.nz);
  expect(encodeHeights(t.cm)).toBe(f.height);
  expect(encodeLand(t.land)).toBe(f.land);
  expect(checksumCm(t.cm)).toBe(f.stats.checksum);
  expect(f.stats.min).toBe(Math.min(...t.cm));
  expect(f.stats.max).toBe(Math.max(...t.cm));
  expect(() => decodeTerrain({...f, stats: {...f.stats, checksum: '00000000'}})).toThrow();
});

test('live heightmap 대비: 땅 편차는 다듬기 허용치 이내, 보존 구역·바다 칸은 0.05u 이내', async ({game}) => {
  const f = file(), t = decodeTerrain(f), {page} = game;
  await page.goto(game.base + '/__none__'); // 404 문서지만 같은 출처라 /js 모듈을 import 할 수 있다 (게임 기동 불필요)
  const r = await page.evaluate(async ({cm, land, nx, nz, ox, oz}) => {
    const hm = await import('/js/core/heightmap.js'), ol = await import('/js/data/outline.js'), br = await import('/js/data/bridge.js'),
      mr = await import('/js/data/mountain-road.js'), wm = await import('/js/data/world-map.js');
    const HM = hm.bakeContinent(), S = hm.STEP, i0 = Math.round((ox - hm.GX0) / S), j0 = Math.round((oz - hm.GZ0) / S), OBS = mr.OBS;
    const zones: Record<string, {n: number; max: number}> = {};
    const add = (k: string, d: number) => { const z = zones[k] || (zones[k] = {n: 0, max: 0}); z.n++; z.max = Math.max(z.max, d); };
    let n = 0, sum = 0, max = 0;
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const o = j * nx + i, x = ox + i * S, z = oz + j * S, live = HM[(j0 + j) * hm.NX + (i0 + i)], d = Math.abs(cm[o] / 100 - live);
        if (!land[o]) { add('sea/cliff', d); continue; }
        n++; sum += d; max = Math.max(max, d);
        const cd = ol.CITY_POLY.dist(x, z, 14, 200), sq = Math.max(Math.abs(x), Math.abs(z));
        if (cd <= 9) add('coast<=9u', d);
        if (sq <= wm.CITY_HALF + 2) add('square', d);
        if (z > wm.CITY_HALF) {
          if (Math.abs(x - ol.BRIDGE_ENDS.x) <= 69) add('bridge-end', d);
          const ap = br.approachNear(x, z);
          if (ap.d <= ap.w + br.FLAT_MARGIN + 3) add('bridge-approach', d);
        }
        if (mr.mroadNear(x, z).d <= mr.MROAD_FLAT + mr.MROAD_SHOULDER) add('mountain-road', d);
        if (Math.hypot(x - OBS.x, z - OBS.z) <= OBS.r + 9) add('observatory', d);
      }
    return {n, mean: sum / n, max, zones};
  }, {cm: Array.from(t.cm), land: Array.from(t.land), nx: f.nx, nz: f.nz, ox: f.origin.x, oz: f.origin.z});
  console.log(`땅 ${r.n}칸 편차 max ${r.max.toFixed(2)}u mean ${r.mean.toFixed(3)}u`, JSON.stringify(r.zones));
  const maxDev = (f.params.smooth as {maxDev: number}).maxDev;
  expect(r.max).toBeLessThanOrEqual(maxDev + 0.01);
  expect(r.mean).toBeLessThan(2);
  for (const k of ['sea/cliff', 'coast<=9u', 'square', 'bridge-end', 'bridge-approach', 'mountain-road', 'observatory']) {
    expect(r.zones[k]?.n, k).toBeGreaterThan(0);
    expect(r.zones[k].max, k).toBeLessThanOrEqual(0.05);
  }
});

test.skip(!process.env.TERRAIN_BAKE_SHOTS, 'tool');
test('참고: 실제 게임(현행 높이)의 도시 섬 상공 사진 → tests/out/terrain-bake/game-top.png', async ({game}) => {
  test.setTimeout(180_000);
  const {page} = game;
  await page.setViewportSize({width: 1100, height: 880});
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => { const g = (window as any).__game; g.G.cycT = 100; g.G.night = 0; });
  const img = await mapReview(page, [-780, 780, -900, 420], 1100, 5, false);
  const dir = path.join(OUT, 'terrain-bake');
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'game-top.png'), Buffer.from(img.split(',')[1], 'base64'));
});
