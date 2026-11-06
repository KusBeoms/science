// W8 CITY_RENDER: CityCompiled → 장면. 손으로 쓴 고정 데이터(city-render-fixture.ts)만 쓰며 citygen 빌더에는 의존하지 않는다.
// 확인: 예산(메시·드로우콜·삼각형) · 충돌(줄기/기둥/회전 건물, 보도 통행) · 데크 · 거리 LOD · 밤 조명 · 100회 build/dispose 누수 없음 · 로더 오류 분류 · 스크린샷.
import fs from 'node:fs';
import path from 'node:path';
import {test, expect, unexpected, OUT} from './fixtures';
import {makeFixture} from './city-render-fixture';

const OX = 9000, OZ = 9000; // 실제 지도 밖: 기존 도시와 섞이지 않는다
const SHOTS = path.join(OUT, 'city-render');
const M = {
  city: '/js/render/citygen/index.js', terrain: '/js/core/terrain.js', deck: '/js/core/deck.js', run: '/js/core/runtime.js',
  store: '/js/data/city-compiled-store.js', surf: '/js/render/surface-detail.js',
};
type Win = {__fx: any; __city: any; __m: any};

/** 모듈을 불러 window.__m 에 두고 고정 데이터를 장면에 붙인다(player 위치는 건드리지 않음) */
async function setup(page: any, build = true, opt: any = {}) {
  const full = makeFixture(OX, OZ),
    fx = {compiled: full.compiled, buildings: full.buildings, meta: {roadKm: full.meta.roadKm}}; // 함수(meta.hill)는 직렬화되지 않는다
  await page.evaluate(async ([fx, M, build, opt]: any) => {
    const w = window as any;
    const m = (w.__m = {
      city: await import(M.city), T: await import(M.terrain), D: await import(M.deck), R: await import(M.run), S: await import(M.store), SD: await import(M.surf),
    });
    w.__fx = fx;
    await m.SD.surfaceTexturesReady();
    if (build) w.__city = m.city.buildCityFromCompiled(fx.compiled, m.R.G.scene, {buildings: fx.buildings, ...opt});
  }, [fx, M, build, opt]);
  return full;
}

test('budget: meshes, draw calls and triangles for the fixture stay small and add up', async ({game}) => {
  const {page, problems} = game;
  await game.open('?debug=1');
  const fx = await setup(page);
  const r = await page.evaluate(([ox, oz]: number[]) => {
    const w = window as any, c = w.__city;
    c.update({x: ox, y: 0, z: oz});
    const near = c.stats();
    c.update({x: ox + 4000, y: 0, z: oz});
    const far = c.stats();
    c.update({x: ox, y: 0, z: oz});
    return {near, far};
  }, [OX, OZ]);
  const s = r.near;
  console.log('[city-render] fixture stats', JSON.stringify({drawCalls: s.drawCalls, tris: s.tris, meshes: s.meshes, residentTris: s.residentTris, ribbons: s.ribbons.tris, ribbonMeshes: s.ribbons.meshes, props: s.props, buildings: s.buildings.tris, colliders: s.colliders, decks: s.decks, buildMs: s.buildMs}));
  console.log('[city-render] ribbon tris per road km (fixture, 8 surfaces, 4 m sampling):', Math.round(s.ribbons.tris / fx.meta.roadKm));
  // 구성 수
  expect(s.ribbons.bad).toEqual([]);
  expect(s.ribbons.flippedTris).toBe(0); // 고정 데이터는 윗면이 +y 로 감겨 있다
  expect(Object.keys(s.ribbons.bySurface).sort()).toEqual(['asphalt', 'crosswalk', 'curb', 'deck', 'marking', 'median', 'shoulder', 'sidewalk']);
  expect(s.props.unknownAssets).toEqual({mystery: 1});
  expect(s.props.byAsset['tree.round']).toBeGreaterThan(3); // 모르는 asset 'tree.weird' 도 kind 기본 에셋으로 그려진다
  expect(s.buildings.buildings).toBe(3);
  expect(s.buildings.unresolved).toEqual([]);
  expect(s.rejected).toBe(1);
  // 예산: 청크(64m) × 층 × 표면 병합이므로 메시 수는 입력 청크 수 이하
  expect(s.ribbons.meshes).toBeLessThanOrEqual(r.near.ribbons.inputChunks);
  expect(s.ribbons.meshes).toBeLessThan(60);
  expect(s.drawCalls).toBeLessThan(110);
  expect(s.tris).toBeLessThan(40000);
  expect(s.residentTris).toBeLessThan(60000);
  expect(s.tris).toBeLessThanOrEqual(s.residentTris);
  // 멀리 가면 리본·소품이 숨고 건물만 남는다(고층은 근거리 모델, 나머지는 단순 모델)
  expect(r.far.drawCalls).toBeLessThanOrEqual(3); // 고층 1 + 건물 청크 2개의 원거리 단순 모델(구 도심과 같이 건물은 멀어도 유지)
  expect(r.far.tris).toBeLessThan(s.tris / 5);
  expect(unexpected(problems)).toEqual({console: [], failed: [], pageerrors: []});
});

test('colliders: trunks, poles, benches and rotated buildings block; sidewalks, roads and the hill stay walkable', async ({game}) => {
  const {page, problems} = game;
  await game.open('?debug=1');
  await setup(page);
  const r = await page.evaluate(([ox, oz]: number[]) => {
    const w = window as any, {T} = w.__m, fx = w.__fx, c = w.__city;
    const BODY = 0.42; // systems/move.ts BODY_R
    const hill = (z: number) => (z <= -5 ? Math.min(-z - 5, 115) * 0.08 : 0); // 고정 데이터와 같은 식(상대 z)
    const out: any = {stats: c.stats().colliders};
    // 1) 필수 소품의 중심은 막힌다
    const need = fx.compiled.placements.filter((p: any) => p.kind !== 'building' && p.kind !== 'shrub' && p.asset !== 'mystery');
    out.needN = need.length;
    out.freeCenters = need.filter((p: any) => !T.solidAt(p.x, p.z, 0.1, p.y + 0.3)).map((p: any) => p.id + ':' + p.asset);
    out.shrubBlocked = fx.compiled.placements.filter((p: any) => p.kind === 'shrub').some((p: any) => T.solidAt(p.x, p.z, 0.1, p.y + 0.3));
    // 2) 쓸어가기: 소품 중심을 향해 걸으면 중심에 닿기 전에 막힌다(도로 쪽에서 접근)
    const sweep = (x0: number, z0: number, x1: number, z1: number, y: (z: number) => number, r: number) => {
      const L = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(L / 0.05);
      let px = x0, pz = z0;
      for (let i = 1; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n, z = z0 + ((z1 - z0) * i) / n, yy = y(z - oz) as number;
        if (T.solidAt(x, z, r, yy) || !T.walkable(px, pz, yy, x, z)) return {blocked: true, at: [x - x0, z - z0], d: Math.hypot(x - x0, z - z0), L};
        px = x; pz = z;
      }
      return {blocked: false, d: L, L};
    };
    const props = fx.compiled.placements.filter((p: any) => ['lamp', 'tree'].includes(p.kind));
    out.propSweeps = props.map((p: any) => {
      const dz = p.z - oz < 0 ? 1 : -1; // 도로(z=0 또는 x=0)쪽에서 다가간다: R1 소품은 z 방향, R2 소품은 x 방향
      const onR1 = p.owner === 'R1';
      const sx = onR1 ? p.x : p.x + (p.x > ox ? -4 : 4), sz = onR1 ? p.z + dz * 4 : p.z;
      const s = sweep(sx, sz, p.x, p.z, () => p.y, BODY);
      return {id: p.id, blocked: s.blocked, short: s.d < s.L - 0.1};
    });
    out.propBlockedAll = out.propSweeps.every((s: any) => s.blocked && s.short);
    // 3) 회전 건물: 로컬(hw,hd) 사각형 안/밖. 집(explicit, 30°), 사무소(derived, −20°)
    const bt = (id: string, hw: number, hd: number, rot: number) => {
      const p = fx.compiled.placements.find((q: any) => q.id === id), a = (rot * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
      const W = (lx: number, lz: number) => [p.x + lx * cs + lz * sn, p.z - lx * sn + lz * cs]; // three rotation.y 규약
      const hit = (lx: number, lz: number, rad = 0.05) => { const [x, z] = W(lx, lz); return T.solidAt(x, z, rad, p.y + 0.3); };
      return {
        inside: [hit(0, 0), hit(hw - 0.3, hd - 0.3), hit(-hw + 0.3, 0), hit(0, hd - 0.2)],
        outside: [hit(hw + 0.6, 0, 0.3), hit(0, hd + 0.6, 0.3), hit(-hw - 0.6, 0, 0.3)],
        // 회전 사각형 밖이지만 감싸는 AABB 안인 모서리 점(AABB 로 근사했다면 막혔을 곳): 사각형에서 0.5m 이상 떨어진 것만 모아 전부 비어 있어야 한다
        hull: (() => {
          const ex = Math.abs(cs) * hw + Math.abs(sn) * hd, ez = Math.abs(sn) * hw + Math.abs(cs) * hd, res: boolean[] = [];
          for (const [kx, kz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            const rx = kx * 0.95 * ex, rz = kz * 0.95 * ez, lx = rx * cs - rz * sn, lz = rx * sn + rz * cs;
            if (Math.abs(lx) > hw + 0.5 || Math.abs(lz) > hd + 0.5) res.push(T.solidAt(p.x + rx, p.z + rz, 0.05, p.y + 0.3));
          }
          return res;
        })(),
        ahead: sweep(W(-hw - 5, 0)[0], W(-hw - 5, 0)[1], p.x, p.z, () => p.y, BODY).d,
      };
    };
    out.house = bt('bld-house', 5, 4, 30);
    out.office = bt('bld-office', 8, 6, -20);
    // 4) 통행: 보도·차도·언덕길은 막히지 않는다
    const free = (name: string, x0: number, z0: number, x1: number, z1: number, y: (z: number) => number, r = BODY) => (out[name] = sweep(ox + x0, oz + z0, ox + x1, oz + z1, y, r).blocked);
    free('walkSidewalkR1', -95, -5.4, -10, -5.4, () => 0.15);
    free('walkSidewalkR2N', 5.4, -12, 5.4, -118, z => hill(z) + 0.15);
    free('driveR1', -95, 0, 95, 0, () => 0, 1.1);
    free('driveHill', 0, -6, 0, -118, z => hill(z), 1.1);
    free('walkR2S', 0, 6, 0, 98, () => 0);
    // 5) 차량 반경으로도 가로등·가로수는 막힌다
    out.carBlocked = props.every((p: any) => T.solidAt(p.x + (p.owner === 'R1' ? 0 : 0.9), p.z + (p.owner === 'R1' ? 0.9 : 0), 1.1, p.y + 0.3));
    // 6) 다리 난간은 고가 층에서만 막는다
    const rx = ox, rz = oz - 67;
    out.rail = [T.solidAt(rx, rz, 0.3, 12.3), T.solidAt(rx, rz, 0.3), T.solidAt(rx, rz, 0.3, 4.4)];
    return out;
  }, [OX, OZ]);
  console.log('[city-render] colliders', JSON.stringify(r.stats));
  expect(r.stats.input).toBe(3);
  expect(r.stats.derivedBuildings).toBe(2); // 사무소·고층(집은 컴파일 충돌체가 이미 덮음)
  expect(r.stats.derivedProps).toBeGreaterThan(10);
  expect(r.stats.bad).toBe(0);
  expect(r.stats.elevated).toBe(1);
  expect(r.freeCenters).toEqual([]);
  expect(r.shrubBlocked).toBe(false); // 관목은 예외 종류(걸어 지나감)
  expect(r.propBlockedAll).toBe(true);
  for (const b of [r.house, r.office]) {
    expect(b.inside).toEqual([true, true, true, true]);
    expect(b.outside).toEqual([false, false, false]);
    expect(b.hull.length).toBeGreaterThanOrEqual(2);
    expect(b.hull.some(Boolean)).toBe(false);
  }
  expect(r.house.ahead).toBeLessThan(5.3 - 0.4 + 0.5); // 앞에서 걸어가면 벽 앞에서 멈춘다(중심 도달 불가)
  expect([r.walkSidewalkR1, r.walkSidewalkR2N, r.driveR1, r.driveHill, r.walkR2S]).toEqual([false, false, false, false, false]);
  expect(r.carBlocked).toBe(true);
  expect(r.rail).toEqual([true, false, false]);
  expect(unexpected(problems)).toEqual({console: [], failed: [], pageerrors: []});
});

test('decks: bridge is walkable at its own height and seam heights match the ribbon', async ({game}) => {
  const {page, problems} = game;
  await game.open('?debug=1');
  await setup(page, false);
  const r = await page.evaluate(([ox, oz]: number[]) => {
    const w = window as any, {T, D, R, city} = w.__m, fx = w.__fx;
    const before = D.deckCount();
    const c = city.buildCityFromCompiled(fx.compiled, R.G.scene, {buildings: fx.buildings});
    const mid = D.deckCount();
    const box = new THREE.Box3();
    c.group.traverse((o: any) => o.isMesh && o.name.startsWith('ribbon:') && o.name.includes(':L1:') && box.expandByObject(o));
    const out = {
      added: mid - before, ids: D.decksOwnedBy('city-v2:deck:B1').length,
      onDeck: [T.groundH(ox, oz - 60, 12.3), T.groundH(ox + 30, oz - 60, 12.0), T.groundH(ox - 39, oz - 60, 12.2)],
      sideOff: T.groundH(ox, oz - 60 + 7.6, 12.3), // 데크 폭(±7) 밖
      below: T.groundH(ox, oz - 60, 4.4), // 다리 밑을 지나는 몸은 데크를 밟지 않음
      boxY: [box.min.y, box.max.y],
    };
    c.dispose();
    return {...out, after: D.deckCount() - before};
  }, [OX, OZ]);
  expect(r.added).toBeGreaterThanOrEqual(2); // 80m 다리 = 40m 이하 직선 데크 여러 개로 합침(1m 표본 80개가 아님)
  expect(r.added).toBeLessThanOrEqual(4);
  expect(r.ids).toBe(r.added);
  for (const h of r.onDeck) expect(Math.abs(h - 12)).toBeLessThan(0.02);
  expect(r.sideOff).toBe(-Infinity);
  expect(r.below).not.toBeGreaterThan(5); // 허공(−Infinity) 또는 아래 지면
  expect(r.boxY[0]).toBeGreaterThanOrEqual(11.99);
  expect(r.boxY[1]).toBeLessThanOrEqual(12.05); // 리본 윗면 높이 = 데크 높이(+0.02 포장)
  expect(r.after).toBe(0);
  expect(unexpected(problems)).toEqual({console: [], failed: [], pageerrors: []});
});

test('lod and night: chunks swap by distance and night-only meshes follow the nightMeshes pattern', async ({game}) => {
  const {page, problems} = game;
  await game.open('?debug=1');
  await setup(page);
  const r = await page.evaluate(([ox, oz]: number[]) => {
    const w = window as any, c = w.__city;
    const names = (pre: string) => { const l: any[] = []; c.group.traverse((o: any) => o.isMesh && o.name.startsWith(pre) && l.push(o)); return l; };
    const vis = (pre: string) => names(pre).map((o: any) => o.visible);
    const out: any = {};
    c.setNight(false);
    c.update({x: ox - 30, z: oz - 25}); // 집 바로 옆
    out.nearBld = [vis('bld:'), vis('bld-far:')];
    out.nearRibbonsAll = vis('ribbon:').every(Boolean);
    c.update({x: ox - 30 + 300, z: oz - 25}); // 300m 밖: 근거리 모델 반경(120) 밖, 리본 반경(600) 안
    out.farBld = [vis('bld:'), vis('bld-far:')];
    out.hrAlways = vis('hr:');
    out.ribbonsStill = vis('ribbon:').some(Boolean);
    c.update({x: ox + 5000, z: oz});
    out.farRibbons = vis('ribbon:').some(Boolean);
    // 밤
    c.update({x: ox - 30, z: oz - 25});
    out.nightN = c.nightMeshes.length;
    out.lit = [names('prop-lit:').length, names('bld-lit:').length, names('hr-lit:').length];
    out.dayLitVisible = c.nightMeshes.some((m: any) => m.visible);
    c.setNight(true);
    out.nightLitVisible = c.nightMeshes.filter((m: any) => m.visible).length;
    out.nightNearOnly = (() => { c.update({x: ox + 5000, z: oz}); return c.nightMeshes.filter((m: any) => m.visible).length; })();
    c.update({x: ox - 30, z: oz - 25});
    c.setNight(false);
    out.afterDay = c.nightMeshes.some((m: any) => m.visible);
    // null 이면 G.night 를 따른다
    c.setNight(null);
    const R = w.__m.R, old = R.G.night;
    R.G.night = 1; c.update({x: ox - 30, z: oz - 25});
    out.followNight = c.nightMeshes.some((m: any) => m.visible);
    R.G.night = 0; c.update({x: ox - 30, z: oz - 25});
    out.followDay = c.nightMeshes.some((m: any) => m.visible);
    R.G.night = old;
    return out;
  }, [OX, OZ]);
  expect(r.nearBld[0].every(Boolean)).toBe(true);
  expect(r.nearBld[1].some(Boolean)).toBe(false);
  expect(r.farBld[0].some(Boolean)).toBe(false);
  expect(r.farBld[1].every(Boolean)).toBe(true);
  expect(r.hrAlways.every(Boolean)).toBe(true);
  expect(r.nearRibbonsAll && r.ribbonsStill).toBe(true);
  expect(r.farRibbons).toBe(false);
  expect(r.nightN).toBe(r.lit[0] + r.lit[1] + r.lit[2]);
  expect(r.lit[0]).toBeGreaterThan(0);
  expect(r.dayLitVisible).toBe(false);
  expect(r.nightLitVisible).toBeGreaterThan(0);
  expect(r.nightNearOnly).toBeLessThan(r.nightLitVisible); // 멀리서는 조명 메시도 꺼진다
  expect(r.afterDay).toBe(false);
  expect(r.followNight).toBe(true);
  expect(r.followDay).toBe(false);
  expect(unexpected(problems)).toEqual({console: [], failed: [], pageerrors: []});
});

test('leaks: 100x build/dispose returns geometry, solid, deck and scene counts to baseline', async ({game}) => {
  const {page, problems} = game;
  await game.open('?debug=1');
  await setup(page, false);
  const r = await page.evaluate(async ([ox, oz]: number[]) => {
    const w = window as any, {city, T, D, R} = w.__m, fx = w.__fx, G = R.G;
    const snap = () => ({
      solids: T.solidCount(), cells: T.solidCellEntries(), cellKeys: T.solidCellCount(), owners: T.solidOwners().length, decks: D.deckCount(),
      scene: G.scene.children.length, gpuGeo: G.renderer.info.memory.geometries, tex: G.renderer.info.memory.textures, programs: G.renderer.info.programs.length,
    });
    const cam = new THREE.PerspectiveCamera(60, 1.6, 0.5, 1500);
    cam.position.set(ox + 40, 70, oz + 90);
    cam.lookAt(ox, 0, oz - 20);
    cam.updateMatrixWorld(true);
    const draw = () => G.renderer.render(G.scene, cam);
    const cycle = (render: boolean) => {
      const c = city.buildCityFromCompiled(fx.compiled, G.scene, {buildings: fx.buildings});
      c.update({x: ox, y: 0, z: oz});
      if (render) draw();
      c.dispose();
      if (render) draw();
    };
    cycle(true); // 워밍업: 공유 싱글턴(재질·keep 지오메트리·프로그램) 생성
    const base = snap();
    for (let i = 0; i < 100; i++) cycle(i % 20 === 0);
    const end = snap();
    // 한 핸들이 살아 있는 동안은 장면·충돌체가 늘고, dispose 는 두 번 불러도 안전하다
    const c = city.buildCityFromCompiled(fx.compiled, G.scene, {buildings: fx.buildings});
    const live = snap();
    let dup = '';
    try { city.buildCityFromCompiled(fx.compiled, G.scene, {buildings: fx.buildings}); } catch (e) { dup = String(e); }
    c.dispose(); c.dispose();
    const after = snap();
    // replaceOwner: 소유자 단위 교체가 충돌체를 새는 일 없이 바꾼다
    const c2 = city.buildCityFromCompiled(fx.compiled, G.scene, {buildings: fx.buildings});
    const n0 = T.solidCount();
    for (let i = 0; i < 50; i++) c2.colliders.replaceOwner('R2', [{owner: 'R2', shape: {t: 'circle', cx: ox + 6.5, cz: oz - 20, r: 0.35}, y0: 1, y1: 4, required: true}]);
    const n1 = T.solidCount();
    c2.dispose();
    return {base, end, live, dup, after, replace: [n0, n1], final: snap()};
  }, [OX, OZ]);
  expect(r.end).toEqual(r.base);
  expect(r.after).toEqual(r.base);
  expect(r.final).toEqual(r.base);
  expect(r.live.solids).toBeGreaterThan(r.base.solids + 20);
  expect(r.live.decks).toBeGreaterThan(r.base.decks);
  expect(r.live.scene).toBe(r.base.scene + 1);
  expect(r.dup).toContain('이미 살아 있습니다');
  expect(r.replace[1]).toBeLessThan(r.replace[0]); // R2 소유 충돌체 여럿(가로수 등) → 1건(원=2솔리드)으로 교체
  expect(unexpected(problems)).toEqual({console: [], failed: [], pageerrors: []});
});

test('store: header validation, once-only set, and load error classification', async ({game}) => {
  const {page, problems} = game;
  await game.open('?debug=1');
  await setup(page, false);
  const r = await page.evaluate(async () => {
    const w = window as any, S = w.__m.S, good = w.__fx.compiled;
    const res = (body: string, status = 200) => async () => new Response(body, {status});
    const kinds: any = {};
    const run = async (name: string, f: any, extra: any = {}) => { const x = await S.loadCompiled({baseURI: 'http://h/steal-an-planet/', fetchImpl: f, ...extra}); kinds[name] = x.ok ? 'ok' : x.kind; return x; };
    await run('404', res('x', 404));
    await run('500', res('x', 500));
    await run('html', res('<html>'));
    await run('truncated', res('{"header":'));
    await run('ok', res(JSON.stringify(good)));
    await run('verCompiled', res(JSON.stringify({...good, header: {...good.header, compiledVersion: 99}})));
    await run('verSchema', res(JSON.stringify({...good, header: {...good.header, schemaVersion: 99}})));
    await run('noArray', res(JSON.stringify({...good, ribbons: undefined})));
    await run('badChunk', res(JSON.stringify({...good, header: {...good.header, chunkSize: 0}})));
    await run('stale', res(JSON.stringify(good)), {expectSourceHash: 'other'});
    await run('freshHash', res(JSON.stringify(good)), {expectSourceHash: 'fixture'});
    await run('network', async () => { throw new TypeError('fetch failed'); });
    await run('timeout', (_u: any, init: any) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))), {timeoutMs: 40});
    let url = '';
    await S.loadCompiled({baseURI: 'http://h/steal-an-planet/', fetchImpl: async (u: string) => { url = u; return new Response('x', {status: 404}); }});
    S.resetCityCompiledForTest();
    const before = S.hasCityCompiled();
    let early = '';
    try { S.getCityCompiled(); } catch (e) { early = String(e); }
    S.setCityCompiled(good);
    let twice = '';
    try { S.setCityCompiled(good); } catch (e) { twice = String(e); }
    const got = S.getCityCompiled() === good;
    S.resetCityCompiledForTest();
    let bad = '';
    try { S.setCityCompiled({header: {compiledVersion: 99}}); } catch (e) { bad = String(e); }
    return {kinds, url, before, early, twice, got, bad, after: S.hasCityCompiled()};
  });
  expect(r.kinds).toEqual({
    '404': 'not-found', '500': 'http', html: 'invalid-json', truncated: 'invalid-json', ok: 'ok', verCompiled: 'unsupported-version', verSchema: 'unsupported-version',
    noArray: 'invalid', badChunk: 'invalid', stale: 'stale', freshHash: 'ok', network: 'network', timeout: 'timeout',
  });
  expect(r.url).toBe('http://h/steal-an-planet/data/city.compiled.json'); // 문서 base 기준(하위 경로 배포 지원)
  expect([r.before, r.got, r.after]).toEqual([false, true, false]);
  expect(r.early).toContain('아직 로드되지 않았습니다');
  expect(r.twice).toContain('이미 설정');
  expect(r.bad).toContain('검증 실패');
  expect(unexpected(problems)).toEqual({console: [], failed: [], pageerrors: []});
});

test('screenshots: aerial, hill street, bridge and night views of the fixture', async ({game}) => {
  const {page, problems} = game;
  await game.open('?debug=1');
  await setup(page);
  fs.mkdirSync(SHOTS, {recursive: true});
  const shots = await page.evaluate(async ([ox, oz]: number[]) => {
    const w = window as any, c = w.__city, G = w.__m.R.G;
    const views: [string, number[], number[], boolean][] = [
      ['aerial', [ox + 150, 150, oz + 160], [ox, 0, oz - 20], false],
      ['hill-street', [ox - 2, 2.6, oz - 4], [ox, 6, oz - 100], false],
      ['bridge', [ox - 60, 14, oz - 20], [ox, 8, oz - 60], false],
      ['junction', [ox + 26, 7, oz + 26], [ox, 0, oz], false],
      ['night', [ox + 70, 45, oz + 90], [ox, 0, oz - 15], true],
    ];
    const out: Record<string, {data: string; colors: number}> = {};
    const size = G.renderer.getSize(new THREE.Vector2());
    for (const [name, p, t, night] of views) {
      const cam = new THREE.PerspectiveCamera(62, size.x / size.y, 0.3, 1500);
      cam.position.set(p[0], p[1], p[2]);
      cam.lookAt(t[0], t[1], t[2]);
      cam.updateMatrixWorld(true);
      c.setNight(night);
      c.update({x: p[0], y: p[1], z: p[2]});
      G.renderer.render(G.scene, cam);
      const data = G.renderer.domElement.toDataURL();
      const img = new Image();
      img.src = data;
      await img.decode();
      const cv = document.createElement('canvas');
      cv.width = 96; cv.height = 60;
      const x = cv.getContext('2d')!;
      x.drawImage(img, 0, 0, 96, 60);
      const d = x.getImageData(0, 0, 96, 60).data, set = new Set<number>();
      for (let i = 0; i < d.length; i += 4) set.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4));
      out[name] = {data, colors: set.size};
    }
    return out;
  }, [OX, OZ]);
  for (const [name, s] of Object.entries(shots) as [string, {data: string; colors: number}][]) {
    fs.writeFileSync(path.join(SHOTS, `${name}.png`), Buffer.from(s.data.split(',')[1], 'base64'));
    expect(s.colors, `${name} 가 거의 단색`).toBeGreaterThan(12);
  }
  expect(unexpected(problems)).toEqual({console: [], failed: [], pageerrors: []});
});

export type {Win};
