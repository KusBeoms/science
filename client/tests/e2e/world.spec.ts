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

test('groundH: city, passes and void; walkable network connects all 12 sectors once unlocked', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  const r = await page.evaluate(async t => {
    const T = await import(t);
    const g = (window as any).__game;
    const before = [T.groundH(0, 0), T.groundH(0, -165), T.groundH(0, -230), T.groundH(100, 200), T.groundH(120, 350), T.groundH(120, 300)];
    g.unlockAll();
    const reach = (x0: number, z0: number) => {
      const seen = new Set<number>([0]);
      const W = 200, key = (i: number, j: number) => (i + 400) * 1000 + (j + 400);
      const q = [[Math.round(x0 / 4), Math.round(z0 / 4)]];
      seen.clear();
      seen.add(key(q[0][0], q[0][1]));
      while (q.length) {
        const [i, j] = q.pop()!;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const a = i + di, b = j + dj;
          if (Math.abs(a) > W || Math.abs(b) > W || seen.has(key(a, b)) || T.groundH(a * 4, b * 4) === -Infinity) continue;
          seen.add(key(a, b));
          q.push([a, b]);
        }
      }
      return (x: number, z: number) => seen.has(key(Math.round(x / 4), Math.round(z / 4)));
    };
    const has = reach(0, 0);
    return {before, centers: g.SECTORS.map((s: any) => has(s.center.x, s.center.z)), void1: has(100, 200)};
  }, T);
  expect(r.before).toEqual([0, 0, -Infinity, -Infinity, 0, -Infinity]); // 잠긴 S1 은 허공 취급(막힘은 blockedAt), 해협 다리·허공 구분
  expect(r.centers).toEqual(Array(12).fill(true));
  expect(r.void1).toBe(false);
});

test('walking north from the city reaches the unlocked S1 through the pass', async ({game}) => {
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
  await page.waitForFunction(() => (window as any).__game.G.curZone === 0, undefined, {timeout: 30000});
  await page.keyboard.up('Shift');
  await page.keyboard.up('KeyW');
  expect(await gameEval<number>(page, 'g.G.me.pos.y')).toBeGreaterThan(-1); // 떨어지지 않았다 (통로를 지나 S1 안)
});

test('debug overlay shows renderer.info counters', async ({game}) => {
  await game.open('?debug=1');
  await game.page.click('#mstart');
  await expect(game.page.locator('pre', {hasText: /calls \d+/})).toBeVisible();
});
