// W8 P2-a 충돌 API: 소유자 기반 등록·제거·교체, 격자 누수 없음, OBB 정밀도, 층 판정 불변, 데크 소유자, 동적 해시 = 선형 훑기
import {test, expect, unexpected} from './fixtures';

const T = '/js/core/terrain.js';
const D = '/js/core/deck.js';

test('solids: owner add / remove / replace is atomic and leaves no leak', async ({game}) => {
  const {page, problems} = game;
  await game.open('?debug=1');
  const r = await page.evaluate(
    async ([t]) => {
      const m = await import(t);
      const base = {n: m.solidCount(), e: m.solidCellEntries(), c: m.solidCellCount()};
      const X = 9000; // 실제 지도 밖: 기존 충돌체와 섞이지 않는다
      const out: any = {};
      m.addSolid(X, X, X + 40, X + 10, undefined, undefined, undefined, 'own-a');
      m.addSolid(X + 100, X, X + 104, X + 4, 0, 5, false, 'own-a');
      m.addSolidOBB(X + 200, X, 3, 1, 30, undefined, undefined, undefined, 'own-b');
      out.counts = [m.solidsOwnedBy('own-a').length, m.solidsOwnedBy('own-b').length, m.solidCount() - base.n];
      out.hit0 = m.solidAt(X + 20, X + 5, 0.3);
      // 교체: 같은 순간 이전 것은 사라지고 새것이 서 있다
      m.replaceSolids('own-a', [{x0: X + 500, z0: X, x1: X + 510, z1: X + 10}]);
      out.afterReplace = [m.solidAt(X + 20, X + 5, 0.3), m.solidAt(X + 505, X + 5, 0.3), m.solidsOwnedBy('own-a').length];
      // 교체 중 둘 다 없는 순간이 없는지: 동기 호출이라 질의를 끼울 수 없다 -> 교체 후 새것만 존재
      out.removedB = m.removeSolidsByOwner('own-b');
      out.removedBAgain = m.removeSolidsByOwner('own-b');
      m.removeSolidsByOwner('own-a');
      out.clean = [m.solidCount() - base.n, m.solidCellEntries() - base.e, m.solidCellCount() - base.c, m.solidOwners().includes('own-a')];
      // 100회 반복
      for (let i = 0; i < 100; i++) {
        m.addSolid(X, X, X + 50, X + 50, undefined, undefined, undefined, 'loop');
        m.addSolidOBB(X, X, 20, 5, i * 7, undefined, undefined, undefined, 'loop');
        m.replaceSolids('loop', [{x0: X, z0: X, x1: X + 33, z1: X + 33}, {cx: X + 9, cz: X + 9, hx: 5, hz: 2, rotDeg: i}]);
        m.removeSolidsByOwner('loop');
      }
      out.loop = [m.solidCount() - base.n, m.solidCellEntries() - base.e, m.solidCellCount() - base.c, m.solidOwners().includes('loop')];
      // 핸들 제거와 무소유 등록은 소유 목록에 섞이지 않는다
      const h = m.addSolid(X, X, X + 5, X + 5);
      out.handle = [m.solidAt(X + 2, X + 2, 0.2), m.removeSolid(h), m.solidAt(X + 2, X + 2, 0.2), m.removeSolid(h)];
      return out;
    },
    [T],
  );
  expect(r.counts).toEqual([2, 1, 3]);
  expect(r.hit0).toBe(true);
  expect(r.afterReplace).toEqual([false, true, 1]);
  expect(r.removedB).toBe(1);
  expect(r.removedBAgain).toBe(0);
  expect(r.clean).toEqual([0, 0, 0, false]);
  expect(r.loop).toEqual([0, 0, 0, false]);
  expect(r.handle).toEqual([true, true, false, false]);
  expect(unexpected(problems)).toEqual({console: [], failed: [], pageerrors: []});
});

test('OBB matches a brute-force oriented rectangle test; AABB behaviour and y layers are unchanged', async ({game}) => {
  const {page, problems} = game;
  await game.open('?debug=1');
  const r = await page.evaluate(
    async ([t]) => {
      const m = await import(t);
      let seed = 12345;
      const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      const X = 9000;
      // 기준 구현: 회전 사각형(꼭짓점) 위 가장 가까운 점까지의 거리 — 변마다 선분 거리의 최솟값, 내부면 0
      const brute = (cx: number, cz: number, hx: number, hz: number, deg: number, x: number, z: number, r: number) => {
        const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
        const P = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]].map(([u, v]) => [cx + u * c - v * s, cz + u * s + v * c]);
        let inside = true, best = Infinity;
        for (let i = 0; i < 4; i++) {
          const [ax, az] = P[i], [bx, bz] = P[(i + 1) % 4];
          const ex = bx - ax, ez = bz - az, cr = ex * (z - az) - ez * (x - ax);
          if (cr < 0) inside = false;
          const u = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez)));
          best = Math.min(best, Math.hypot(x - (ax + u * ex), z - (az + u * ez)));
        }
        return inside || best < r;
      };
      let mism = 0, hits = 0, n = 0, sliver = 0;
      for (let k = 0; k < 40; k++) {
        const cx = X + rnd() * 200, cz = X + rnd() * 200, hx = 1 + rnd() * 14, hz = 0.5 + rnd() * 6, deg = rnd() * 360 - 180;
        const h = m.addSolidOBB(cx, cz, hx, hz, deg, undefined, undefined, undefined, 'obb-t');
        for (let i = 0; i < 150; i++) {
          const x = cx + (rnd() - 0.5) * 50, z = cz + (rnd() - 0.5) * 50, rr = 0.2 + rnd() * 2.5;
          // 다른 OBB 가 섞이지 않도록 하나씩 켜고 끈다
          const want = brute(cx, cz, hx, hz, deg, x, z, rr);
          const got = m.solidAt(x, z, rr);
          if (want) hits++;
          n++;
          if (want !== got) {
            // 경계선 위의 부동소수 판정만 허용(거리 차이 1e-9 이내)
            const a = (deg * Math.PI) / 180, lx = Math.abs((x - cx) * Math.cos(a) + (z - cz) * Math.sin(a)), lz = Math.abs(-(x - cx) * Math.sin(a) + (z - cz) * Math.cos(a));
            const d = Math.hypot(Math.max(lx - hx, 0), Math.max(lz - hz, 0));
            if (Math.abs(d - rr) > 1e-9) mism++;
            else sliver++;
          }
        }
        m.removeSolid(h);
      }
      // 회전 0 은 AABB 와 같고, 대각 박스의 AABB 모서리 빈틈은 막지 않는다
      m.addSolidOBB(X + 500, X, 5, 2, 0, undefined, undefined, undefined, 'obb-t');
      m.addSolid(X + 600 - 5, X - 2, X + 600 + 5, X + 2);
      let eq = 0;
      for (let i = 0; i < 300; i++) {
        const dx = (rnd() - 0.5) * 20, dz = (rnd() - 0.5) * 12, rr = 0.1 + rnd();
        if (m.solidAt(X + 500 + dx, X + dz, rr) !== m.solidAt(X + 600 + dx, X + dz, rr)) eq++;
      }
      m.removeSolidsByOwner('obb-t');
      m.addSolidOBB(X + 700, X, 10, 1, 45, undefined, undefined, undefined, 'obb-t');
      const corner = [m.solidAt(X + 700 + 6, X + 6, 0.2), m.solidAt(X + 700 + 6, X - 6, 0.2), m.solidAt(X + 700, X, 0.2)]; // 45° 선 위 막힘 / 대각 반대편 빈틈
      m.removeSolidsByOwner('obb-t');
      // y 층: OBB 와 AABB 모두 기존 규칙(lo−1.4 ≤ y < hi, up 은 y 없으면 무시)
      m.addSolid(X, X, X + 4, X + 4, 2, 6, true, 'lay');
      m.addSolidOBB(X + 20, X, 2, 2, 33, 2, 6, true, 'lay');
      m.addSolid(X + 40, X, X + 44, X + 4, undefined, 3, undefined, 'lay');
      const lay = (x: number, z: number) => [m.solidAt(x, z, 0.2), m.solidAt(x, z, 0.2, 0), m.solidAt(x, z, 0.2, 0.7), m.solidAt(x, z, 0.2, 5.9), m.solidAt(x, z, 0.2, 6)];
      const layers = {aabb: lay(X + 2, X + 2), obb: lay(X + 20, X), ground: lay(X + 42, X + 2)};
      m.removeSolidsByOwner('lay');
      return {mism, sliver, hits, n, eq, corner, layers};
    },
    [T],
  );
  expect(r.mism).toBe(0);
  expect(r.hits).toBeGreaterThan(300); // 적중·비적중 표본이 모두 충분해야 의미가 있다
  expect(r.n - r.hits).toBeGreaterThan(300);
  expect(r.eq).toBe(0);
  expect(r.corner).toEqual([true, false, true]);
  // 층: [y 없음, y=0, y=0.7, y=5.9, y=6]
  expect(r.layers.aabb).toEqual([false, false, true, true, false]); // up 층: y 없으면 무시, lo−1.4=0.6 이상일 때만
  expect(r.layers.obb).toEqual([false, false, true, true, false]);
  expect(r.layers.ground).toEqual([true, true, true, false, false]); // lo 없음 hi=3: y<3 만 막힌다
  expect(unexpected(game.problems)).toEqual({console: [], failed: [], pageerrors: []});
});

test('decks: owner lifecycle without leaks, clearDecks still works', async ({game}) => {
  const {page, problems} = game;
  await game.open('?debug=1');
  const r = await page.evaluate(
    async ([d]) => {
      const m = await import(d);
      const base = m.deckCount();
      const mk = (id: string, x: number) => ({id, ax: x, az: 9000, bx: x + 10, bz: 9000, hw: 1, h0: 4, h1: 4});
      m.addDeck(mk('plain', 8000)); // 소유자 없는 기존 방식
      m.addDeck(mk('o1', 8100), 'own');
      m.addDeck(mk('o2', 8200), 'own');
      const a = [m.deckCount() - base, m.decksOwnedBy('own')];
      const here = (x: number) => m.deckHeights(x, 9000).length;
      m.replaceDecks('own', [mk('o3', 8300)]);
      const b = [m.decksOwnedBy('own'), here(8105), here(8305), here(8005)];
      for (let i = 0; i < 100; i++) {
        m.replaceDecks('own', [mk('l' + i, 8400), mk('m' + i, 8500)]);
        m.removeDecksByOwner('own');
        m.addDeck(mk('x', 8600), 'own');
        m.removeDecksByOwner('own');
      }
      const c = [m.deckCount() - base, m.removeDecksByOwner('own'), here(8005)];
      m.clearDecks();
      return {a, b, c, cleared: m.deckCount()};
    },
    [D],
  );
  expect(r.a).toEqual([3, ['o1', 'o2']]);
  expect(r.b).toEqual([['o3'], 0, 1, 1]);
  expect(r.c).toEqual([1, 0, 1]);
  expect(r.cleared).toBe(0);
  expect(unexpected(problems)).toEqual({console: [], failed: [], pageerrors: []});
});

test('dynamic solids: spatial hash equals linear scan and does not leak', async ({game}) => {
  const {page, problems} = game;
  await game.open('?debug=1');
  const r = await page.evaluate(
    async ([t]) => {
      const m = await import(t);
      let seed = 777;
      const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      const X = 9000;
      const b0 = [m.dynSolidCount(), m.dynCellEntries()];
      const hs: any[] = [];
      for (let i = 0; i < 60; i++) {
        const x = X + rnd() * 300, z = X + rnd() * 300, w = 0.5 + rnd() * 30, d = 0.5 + rnd() * 30;
        hs.push(m.addDynSolid(x, z, x + w, z + d));
      }
      let bad = 0, hit = 0;
      const sample = () => {
        for (let i = 0; i < 1500; i++) {
          const x = X - 5 + rnd() * 340, z = X - 5 + rnd() * 340, rr = rnd() * 6;
          const y = rnd() < 0.3 ? rnd() * 10 : undefined;
          const lin = m.dynHitLinear(x, z, rr, y), got = m.solidAt(x, z, rr, y);
          if (lin) hit++;
          if (lin !== got) bad++;
        }
      };
      sample();
      for (let i = 0; i < 40; i++) m.dropDynSolid(hs[i]); // 일부 제거 후에도 동일
      sample();
      const dropAgain = m.dropDynSolid(hs[0]);
      hs.slice(40).forEach(h => m.dropDynSolid(h));
      m.dropDynSolid(null);
      for (let i = 0; i < 100; i++) m.dropDynSolid(m.addDynSolid(X, X, X + 40, X + 40));
      return {bad, hit, dropAgain, end: [m.dynSolidCount() - b0[0], m.dynCellEntries() - b0[1]]};
    },
    [T],
  );
  expect(r.bad).toBe(0);
  expect(r.hit).toBeGreaterThan(300);
  expect(r.dropAgain).toBe(false);
  expect(r.end).toEqual([0, 0]);
  expect(unexpected(problems)).toEqual({console: [], failed: [], pageerrors: []});
});
