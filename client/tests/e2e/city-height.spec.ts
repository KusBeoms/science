// W8 P3-b: 도시 섬 높이를 data/city-terrain.json 에서 읽는다 — 노드 일치, 쌍3차 연속, 보존 구역 ≤0.05u, bake 시간, boot 실패 분류, 전후 사진
import {test, expect, unexpected, OUT, bootRoute} from './fixtures';
import fs from 'node:fs';
import path from 'node:path';
import {mapReview} from './map-review';

const DIR = path.join(OUT, 'city-height');
const json = () => fs.readFileSync(path.resolve(__dirname, '../../public/data/city-terrain.json'), 'utf8');

/** 절차 모드로 한 번 굽고(기준값 수집) 비우고, JSON 모드로 다시 굽는다. 같은 점들의 높이를 두 모드에서 돌려준다 */
async function bothModes(game: any) {
  const {page} = game;
  await page.goto(game.base + '/__none__'); // 404 문서지만 같은 출처 — 게임 기동 없이 /js 모듈만 쓴다
  return page.evaluate(async (txt: string) => {
    const hm = await import('/js/core/heightmap.js'), ch = await import('/js/core/city-height.js'), cd = await import('/js/data/city-terrain-codec.js'),
      ol = await import('/js/data/outline.js'), br = await import('/js/data/bridge.js'), mr = await import('/js/data/mountain-road.js'), wm = await import('/js/data/world-map.js');
    const f = JSON.parse(txt), t = cd.decodeTerrain(f);
    // 시험 점: 도시 섬 bbox 안 2.5u 반격자(노드+반노드) 전부가 아니라 1/3 간격 + 무작위 비정렬 점
    let seed = 12345;
    const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const bb = {x0: f.bbox.x0, x1: f.bbox.x1, z0: f.bbox.z0, z1: f.bbox.z1}, pts: number[] = [];
    for (let k = 0; k < 40000; k++) pts.push(bb.x0 + rnd() * (bb.x1 - bb.x0), bb.z0 + rnd() * (bb.z1 - bb.z0));
    const sample = () => pts.map((_, i) => (i % 2 ? NaN : hm.heightAt(pts[i], pts[i + 1])));
    const read = () => { const a = sample().filter((_, i) => i % 2 === 0); return a; };
    hm.resetHeightmapForTest(); ch.resetCityHeightForTest();
    const procBake = (hm.bakeContinent(), hm.bakeMs), procSrc = hm.citySource, procGrid = Float32Array.from(hm.bakeContinent());
    const proc = read();
    hm.resetHeightmapForTest(); ch.resetCityHeightForTest();
    ch.setCityHeight(t);
    const jsonBake = (hm.bakeContinent(), hm.bakeMs), jsonSrc = hm.citySource, G = hm.gridOf();
    const jh = read();
    // 노드 일치: 도시 땅 노드(마스크=1, 윤곽 안)는 JSON 값과 정확히 같아야 한다
    let nodes = 0, nodeMax = 0, regCity = 0;
    const i0 = Math.round((f.origin.x - hm.GX0) / hm.STEP), j0 = Math.round((f.origin.z - hm.GZ0) / hm.STEP);
    for (let j = 0; j < t.nz; j++) for (let i = 0; i < t.nx; i++) {
      const o = j * t.nx + i, g = (j0 + j) * hm.NX + (i0 + i);
      if (!t.land[o] || G.reg[g] !== hm.REG_CITY) continue;
      regCity++;
      if (ol.CITY_POLY.dist(f.origin.x + i * hm.STEP, f.origin.z + j * hm.STEP, 14, 200) < 0) continue;
      nodes++; nodeMax = Math.max(nodeMax, Math.abs(G.h[g] - t.cm[o] / 100));
    }
    // 도시 밖(야생지·섹터·바다) 노드는 두 모드에서 같아야 한다
    let outDiff = 0;
    for (let g = 0; g < G.h.length; g++) {
      const x = hm.GX0 + (g % hm.NX) * hm.STEP, z = hm.GZ0 + Math.floor(g / hm.NX) * hm.STEP;
      if (G.reg[g] === hm.REG_CITY && x >= bb.x0 && x <= bb.x1 && z >= bb.z0 && z <= bb.z1) continue;
      outDiff = Math.max(outDiff, Math.abs(G.h[g] - procGrid[g]));
    }
    // 보존 구역별 편차 (JSON 모드 vs 절차 모드). 구역 분류는 점 단위: 5u 노드(격자 값)와 비정렬 무작위 점(2.5u 보간 결과) 두 가지
    const OBS = mr.OBS;
    const zoneStats = (list: {x: number; z: number; d: number}[]) => {
      const zs: Record<string, {n: number; max: number; sum: number}> = {};
      const add = (k: string, d: number) => { const z = zs[k] || (zs[k] = {n: 0, max: 0, sum: 0}); z.n++; z.max = Math.max(z.max, d); z.sum += d; };
      for (const {x, z, d} of list) {
        const cd0 = ol.CITY_POLY.dist(x, z, 14, 200), sq = Math.max(Math.abs(x), Math.abs(z));
        if (cd0 < 0) { add('outside-city', d); continue; }
        if (cd0 <= 9) add('coast<=9u', d);
        if (sq <= wm.CITY_HALF + 2) add('square(plaza/stadium/hill)', d);
        if (z > wm.CITY_HALF) {
          if (Math.abs(x - ol.BRIDGE_ENDS.x) <= 69) add('bridge-end', d);
          const ap = br.approachNear(x, z);
          if (ap.d <= ap.w + br.FLAT_MARGIN + 3) add('bridge-approach', d);
        }
        if (mr.mroadNear(x, z).d <= mr.MROAD_FLAT + mr.MROAD_SHOULDER) add('mountain-road', d);
        if (Math.hypot(x - OBS.x, z - OBS.z) <= OBS.r + 9) add('observatory', d);
        if (sq > wm.CITY_HALF) add('all-belt', d);
      }
      return Object.fromEntries(Object.entries(zs).map(([k, v]) => [k, {n: v.n, max: v.max, mean: v.sum / v.n}]));
    };
    const zones = zoneStats(proc.map((p, k) => ({x: pts[k * 2], z: pts[k * 2 + 1], d: Math.abs(jh[k] - p)})));
    const nodeList: {x: number; z: number; d: number}[] = [];
    for (let j = 0; j < t.nz; j++) for (let i = 0; i < t.nx; i++) {
      const g = (j0 + j) * hm.NX + (i0 + i);
      if (t.land[j * t.nx + i] && G.reg[g] === hm.REG_CITY) nodeList.push({x: f.origin.x + i * hm.STEP, z: f.origin.z + j * hm.STEP, d: Math.abs(G.h[g] - procGrid[g])});
    }
    const nodeZones = zoneStats(nodeList);
    // 매끈함: 0.5u 간격 2차 차분(톱니·계단 지표). 도시 땅·해안에서 10u 이상 안쪽 점만
    const curv = (mode: 'proc' | 'json') => {
      const out: number[] = [];
      for (let k = 0; k < 6000; k++) {
        const x = bb.x0 + rnd() * (bb.x1 - bb.x0), z = bb.z0 + rnd() * (bb.z1 - bb.z0);
        if (ol.CITY_POLY.dist(x, z, 14, 200) < 10 || ol.CITY_POLY.dist(x + 2, z + 2, 14, 200) < 10) continue;
        out.push(x, z);
      }
      return out;
    };
    const cp = curv('json');
    const second = (h: (x: number, z: number) => number) => {
      const v: number[] = [];
      for (let k = 0; k < cp.length; k += 2) {
        const x = cp[k], z = cp[k + 1], c = h(x, z);
        v.push(Math.abs(h(x + 0.5, z) - 2 * c + h(x - 0.5, z)), Math.abs(h(x, z + 0.5) - 2 * c + h(x, z - 0.5)));
      }
      v.sort((a, b) => a - b);
      return {p50: v[v.length >> 1], p99: v[Math.floor(v.length * 0.99)], max: v[v.length - 1]};
    };
    const jsonCurv = second(hm.heightAt);
    hm.resetHeightmapForTest(); ch.resetCityHeightForTest();
    const procCurv = second(hm.heightAt);
    // 비교용 스냅샷 (ch 는 비운 상태 → 다음 테스트에 영향 없음, 페이지가 새로 열린다)
    return {procBake, jsonBake, procSrc, jsonSrc, nodes, nodeMax, regCity, outDiff, zones, nodeZones, jsonCurv, procCurv};
  }, json());
}

test('JSON 구동: 노드 일치 · 보존 구역 ≤0.05u · 도시 밖 불변 · 쌍3차 매끈함 · bake 시간', async ({game}) => {
  const r = await bothModes(game);
  console.log('city-height', JSON.stringify(r));
  fs.mkdirSync(DIR, {recursive: true});
  fs.writeFileSync(path.join(DIR, 'report.json'), JSON.stringify(r, null, 1));
  expect(r.procSrc).toBe('procedural');
  expect(r.jsonSrc).toBe('json');
  expect(r.nodes).toBeGreaterThan(40000);
  expect(r.nodeMax).toBeLessThan(0.0002); // Float32 반올림만
  expect(r.outDiff).toBe(0);
  // 5u 노드: 보존 구역은 원본과 0.05u 이내 (실측 0.005u). 다듬기로 바뀌는 구역은 all-belt
  for (const k of ['coast<=9u', 'square(plaza/stadium/hill)', 'bridge-end', 'bridge-approach', 'mountain-road', 'observatory']) {
    expect(r.nodeZones[k], k).toBeTruthy();
    expect(r.nodeZones[k].max, `node ${k}`).toBeLessThanOrEqual(0.05);
  }
  // 2.5u 보간 결과(걷는 면): 5u 원천을 보간하므로 절차 공식의 2.5u 세부는 되살아나지 않는다 — 평탄·도로 구역은 0.15u 이내, 해안 비탈은 평균 0.3u/최대 3.5u 이내
  for (const k of ['square(plaza/stadium/hill)', 'bridge-end', 'bridge-approach', 'mountain-road', 'observatory']) expect(r.zones[k].max, `interp ${k}`).toBeLessThanOrEqual(0.15);
  expect(r.zones['coast<=9u'].mean).toBeLessThan(0.3);
  expect(r.zones['coast<=9u'].max).toBeLessThan(3.5);
  expect(r.zones['all-belt'].max).toBeLessThan(23); // maxDev 20u 상한 + 보간
  expect(r.jsonCurv.p99).toBeLessThanOrEqual(0.1);
  expect(r.jsonCurv.p99).toBeLessThanOrEqual(r.procCurv.p99 + 1e-6);
  expect(r.jsonBake).toBeLessThan(400);
});

test('boot 높이 로딩: 실패 분류와 성공 시 setCityHeight → main', async ({game}) => {
  const {page} = game;
  await page.goto(game.base + '/__none__');
  const txt = json();
  const r = await page.evaluate(async (good: string) => {
    (globalThis as any).__BOOT_NO_AUTORUN__ = true;
    const B = await import('/js/boot.js'), ch = await import('/js/core/city-height.js');
    const mk = (status: number, body: string) => async () => new Response(body, {status});
    const cases: Record<string, any> = {
      '404': mk(404, 'x'), '500': mk(500, 'x'), html200: mk(200, '<html></html>'), network: async () => { throw new TypeError('fail'); },
      timeout: (_u: any, o: any) => new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(new DOMException('a', 'AbortError')))),
      badChecksum: mk(200, JSON.stringify({...JSON.parse(good), stats: {...JSON.parse(good).stats, checksum: '00000000'}})),
      badSchema: mk(200, JSON.stringify({...JSON.parse(good), schema: 'x/9'})),
    };
    const kinds: Record<string, string> = {};
    for (const [k, f] of Object.entries(cases)) {
      const o = await B.loadCityHeight({fetchImpl: f, timeoutMs: 150, baseURI: location.href});
      kinds[k] = o.ok ? 'ok' : o.kind;
    }
    const ok = await B.loadCityHeight({fetchImpl: mk(200, good), baseURI: location.href});
    // bootGame: 실패하면 main 을 부르지 않고 오류 화면, 성공하면 높이를 넣고 main 한 번
    let main = 0, shown = '';
    const bad = await B.bootGame({terrain: undefined, fetchImpl: mk(404, 'x'), baseURI: location.href, importMain: async () => { main++; }, showError: (e: any) => { shown = e.kind; }});
    const had = ch.hasCityHeight();
    const good2 = await B.bootGame({fetchImpl: mk(200, good), baseURI: location.href, importMain: async () => { main++; }});
    const url = new URL(B.CITY_TERRAIN_PATH, 'http://h/steal-an-planet/').href;
    return {kinds, okNx: ok.ok ? ok.terrain.nx : 0, bad: bad.ok ? 'ok' : bad.kind, shown, hadBefore: had, good: good2.ok, hasAfter: ch.hasCityHeight(), main, url};
  }, txt);
  console.log('boot-height', JSON.stringify(r));
  expect(r.kinds).toEqual({'404': 'not-found', '500': 'http', html200: 'invalid-json', network: 'network', timeout: 'timeout', badChecksum: 'invalid', badSchema: 'invalid'});
  expect(r.okNx).toBeGreaterThan(300);
  expect(r.bad).toBe('not-found');
  expect(r.shown).toBe('not-found');
  expect(r.hadBefore).toBe(false);
  expect(r.good).toBe(true);
  expect(r.hasAfter).toBe(true);
  expect(r.main).toBe(1);
  expect(r.url).toBe('http://h/steal-an-planet/data/city-terrain.json');
});

test('boot.js 로 실제 게임: json 공급원, 오류 없음, 바다·해안·언덕 높이 정상, 지형 삼각형 예산', async ({game}) => {
  const {page} = game;
  await bootRoute(page);
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.waitForTimeout(800);
  const r = await page.evaluate(async () => {
    const hm = await import('/js/core/heightmap.js'), T = await import('/js/core/terrain.js'), R = await import('/js/render/terrain.js'), G = (window as any).__game.G;
    return {src: hm.citySource, bake: hm.bakeMs, city: [T.groundH(0, 0), T.groundH(60, 60)], hill: T.groundH(-105, -105), sea: T.groundH(300, 600), stats: R.terrainStats(), tris: G.renderer.info.render.triangles};
  });
  console.log('boot-game', JSON.stringify(r));
  expect(r.src).toBe('json');
  expect(r.city.every((v: number) => Math.abs(v) < 0.01)).toBe(true);
  expect(r.hill).toBeGreaterThan(10);
  expect(r.sea).toBe(-Infinity);
  expect(r.stats.tris).toBeLessThan(40000);
  expect(r.tris).toBeLessThan(110000);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

for (const mode of ['before', 'after'] as const)
  test(`상공 사진 ${mode} (북쪽 주봉 + 산악도로 + 다리 어귀)`, async ({game}) => {
    const {page} = game;
    if (mode === 'after') await bootRoute(page);
    await game.open('?debug=1');
    await page.click('#mstart');
    await page.waitForFunction(() => (window as any).__game?.G?.renderer);
    await page.evaluate(() => { const g = (window as any).__game; g.unlockAll(); g.G.cycT = 100; g.G.night = 0; });
    const src = await page.evaluate(async () => (await import('/js/core/heightmap.js')).citySource);
    expect(src).toBe(mode === 'after' || process.env.BOOT_JS === '1' ? 'json' : 'procedural');
    fs.mkdirSync(DIR, {recursive: true});
    for (const [name, b] of [['north', [-150, 350, -800, -400]], ['road', [700, 1100, -400, -100]], ['bridge', [-200, 300, 300, 560]]] as const) {
      const data = await mapReview(page, [b[0], b[1], b[2], b[3]], 1200, 2.5);
      fs.writeFileSync(path.join(DIR, `${name}-${mode}.png`), Buffer.from(data.split(',')[1], 'base64'));
    }
  });
