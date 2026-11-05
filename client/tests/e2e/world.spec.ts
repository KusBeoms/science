// 월드 W0: 구세이브 섹터 id 병합 · 지면 판정(groundH) · 구역 간 통로 연결
import {test, expect, unexpected} from './fixtures';

const T = '/js/core/terrain.js';
const gameEval = <T>(page: any, fn: string): Promise<T> => page.evaluate(`(() => { const g = window.__game; return (${fn}); })()`);

test('v5 save with retired sector ids is merged without re-locking anything', async ({game}) => {
  const {page} = game;
  const v5 = {
    base: Array(12).fill(null), cr: 50, slots: 6, stolen: 3, zone: 4, dex: {0: 1, 3: 1}, mi: 0, ver: 5,
    unlocked: {solar: 1, exo: 1, pulsar: 1, edmunds: 1},
    portals: {solar: 1, neutron: 1},
    notes: {pulsar: 1, edmunds: 1, solar: 1},
  };
  await page.addInitScript(s => localStorage.setItem('stealPlanet4', s), JSON.stringify(v5));
  await game.open('?debug=1');
  const keys = (m: string) => gameEval<string[]>(page, `Object.keys(g.S.${m}).sort()`);
  expect(await keys('unlocked')).toEqual(['exo', 'gargantua', 'solar', 'supernova']);
  expect(await keys('portals')).toEqual(['solar', 'supernova']);
  expect(await keys('notes')).toEqual(['gargantua', 'solar', 'supernova']);
  expect(await gameEval(page, 'g.S.zone')).toBe(1); // 새 순서: solar 만 연속
  expect(await gameEval(page, 'Object.keys(g.S.dex).length')).toBe(2);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('v4 zone count is read in the legacy sector order', async ({game}) => {
  const {page} = game;
  const v4 = {base: Array(12).fill(null), cr: 50, slots: 6, stolen: 3, zone: 3, dex: {}, mi: 0, ver: 4};
  await page.addInitScript(s => localStorage.setItem('stealPlanet4', s), JSON.stringify(v4));
  await game.open('?debug=1');
  expect(await gameEval<string[]>(page, 'Object.keys(g.S.unlocked).sort()')).toEqual(['exo', 'gargantua', 'solar']);
});

test('groundH: city, wild and the 12 sector islands are separate lands (no pass between them)', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  const r = await page.evaluate(async t => {
    const T = await import(t);
    const g = (window as any).__game;
    const before = [T.groundH(0, 0), T.groundH(0, -350), T.groundH(-200, -1100), T.groundH(100, 2000)];
    g.unlockAll();
    const reach = (x0: number, z0: number) => {
      const K = 8, key = (i: number, j: number) => (i + 300) * 1000 + (j + 300);
      const q = [[Math.round(x0 / K), Math.round(z0 / K)]], seen = new Set<number>([key(q[0][0], q[0][1])]);
      while (q.length) {
        const [i, j] = q.pop()!;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const a = i + di, b = j + dj;
          if (Math.abs(a) > 260 || Math.abs(b) > 260 || seen.has(key(a, b)) || T.groundH(a * K, b * K) === -Infinity) continue;
          seen.add(key(a, b));
          q.push([a, b]);
        }
      }
      return (x: number, z: number) => seen.has(key(Math.round(x / K), Math.round(z / K)));
    };
    const has = reach(0, 0);
    return {
      before,
      land: g.SECTORS.map((s: any) => T.groundH(s.center.x, s.center.z) > -Infinity),
      linked: g.SECTORS.map((s: any) => has(s.center.x, s.center.z)),
      wild: has(0, 1310), jail: has(-200, 1260), void1: has(-900, -800),
    };
  }, T);
  expect(r.before[0]).toBe(0);
  expect(r.before[1]).toBeGreaterThan(-Infinity); // 도시 북쪽 산자락(윤곽 안)은 땅
  expect(r.before[2]).toBe(-Infinity); // 잠긴 S1 은 허공 취급(막힘은 blockedAt)
  expect(r.before[3]).toBe(-Infinity);
  expect(r.land).toEqual(Array(12).fill(true)); // 해금하면 12개 섬 모두 땅
  expect(r.linked).toEqual(Array(12).fill(false)); // 도시에서 걸어서는 어느 섬에도 못 간다 (포탈만)
  expect(r.void1).toBe(false);
  expect(r.wild).toBe(true); // 도시 남쪽 다리를 건너 야생지(산·호수·사막·교도소)에 닿는다
  expect(r.jail).toBe(true);
});

test('walking north from the city never reaches S1 (islands are portal-only)', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.unlockAll();
    g.teleport(0, -120);
  });
  await page.keyboard.down('KeyW');
  await page.keyboard.down('Shift');
  await page.waitForTimeout(7000);
  await page.keyboard.up('Shift');
  await page.keyboard.up('KeyW');
  expect(await gameEval<number>(page, 'g.G.curZone')).not.toBe(0);
  expect(await gameEval<number>(page, 'g.G.me.pos.z')).toBeGreaterThan(-800); // 북쪽 해안에서 멈춘다(또는 되돌려짐)
});

test('debug overlay shows renderer.info counters', async ({game}) => {
  await game.open('?debug=1');
  await game.page.click('#mstart');
  await expect(game.page.locator('pre', {hasText: /calls \d+/})).toBeVisible();
});
