// 군중 W1: 경로 그래프 연결성 · 24명 스폰 · 건물(solid)/허공 통과 없음 · 콘솔 error 0
import {test, expect, unexpected, canvasColors, OUT} from './fixtures';

const CROWD = '/js/systems/crowd.js';
const GRAPH = '/js/data/citygraph.js';
const TERRAIN = '/js/core/terrain.js';

test('citygraph is connected, has no dead ends, and keeps clear of buildings', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  const r = await page.evaluate(
    async ([graph, terrain]) => {
      const {CITY_GRAPH: g} = await import(graph);
      const {solidAt} = await import(terrain);
      const seen = new Set<number>([0]);
      const q = [0];
      while (q.length) for (const n of g.adj[q.pop()!]) if (!seen.has(n)) (seen.add(n), q.push(n));
      let blocked = 0;
      g.adj.forEach((adj: Uint16Array, a: number) =>
        adj.forEach(b => {
          const len = Math.hypot(g.x[b] - g.x[a], g.z[b] - g.z[a]);
          for (let t = 0; t <= len; t += 0.5) if (solidAt(g.x[a] + ((g.x[b] - g.x[a]) * t) / len, g.z[a] + ((g.z[b] - g.z[a]) * t) / len, 0.45)) blocked++;
        })
      );
      return {nodes: g.x.length, reached: seen.size, minDeg: Math.min(...g.adj.map((a: Uint16Array) => a.length)), blocked};
    },
    [GRAPH, TERRAIN],
  );
  expect(r.nodes).toBeGreaterThan(40);
  expect(r.reached).toBe(r.nodes);
  expect(r.minDeg).toBeGreaterThanOrEqual(2);
  expect(r.blocked).toBe(0);
});

test('crowd fills to 66, never enters solids, and reacts with at most 6 emoji bubbles', async ({game}) => {
  const {page, problems} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.waitForTimeout(1500);
  const count = () => page.evaluate(async u => (await import(u)).crowdApi.count(), CROWD);
  expect(await count()).toBeGreaterThanOrEqual(50);
  expect(await count()).toBeLessThanOrEqual(66);
  expect(await canvasColors(page)).toBeGreaterThan(8);

  // 상점가 입구(동쪽 보도 고리 ↔ 도로)에 건물 벽을 세우고 6초 동안 모든 행인 위치를 표본 조사
  const bad = await page.evaluate(
    async ([crowd, terrain]) => {
      const C = await import(crowd);
      const T = await import(terrain);
      const g = (window as any).__game;
      T.addSolid(30, -14, 120, 14);
      g.teleport(40, 60); // 군중과 가까운 곳 (비킴·시선 경로도 지나간다)
      g.G.carry.push({id: 0, z: 0, k: 0, st: 0});
      await new Promise(r => setTimeout(r, 1500)); // 벽 안에 있던 행인은 사라질 시간
      const t0 = performance.now();
      const hits: number[][] = [];
      let max = 0;
      while (performance.now() - t0 < 6000) {
        await new Promise(r => setTimeout(r, 100));
        for (const p of C.crowdApi.positions()) if (T.solidAt(p.x, p.z, 0.2) || !T.onGround(p.x, p.z)) hits.push([p.x, p.z]);
        max = Math.max(max, document.querySelectorAll('.bub:not([style*="hidden"])').length);
      }
      g.G.carry.length = 0;
      return {hits: hits.slice(0, 5), max};
    },
    [CROWD, TERRAIN],
  );
  expect(bad.hits).toEqual([]);
  expect(bad.max).toBeLessThanOrEqual(6);

  const u = unexpected(problems);
  expect(u.pageerrors).toEqual([]);
  expect(u.console).toEqual([]);
  expect(u.failed).toEqual([]);
});

test('crowd screenshots at spawn view and plaza', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.waitForTimeout(2500);
  await page.screenshot({path: `${OUT}/crowd-spawn.png`});
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.teleport(0, 52);
    g.G.yaw = 0.6;
    g.G.pitch = 0.3;
    g.G.camDist = 14;
  });
  await page.waitForTimeout(2000);
  expect(await canvasColors(page)).toBeGreaterThan(8);
  await page.screenshot({path: `${OUT}/crowd-plaza.png`});
});
