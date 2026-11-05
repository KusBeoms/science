// 월드 W1 지형: 높이 지도(언덕·능선·개구·허공), 능선 막힘, 근거리 타일 스트리밍 예산, 문 상태
import {test, expect, unexpected} from './fixtures';

const gameEval = <T>(page: any, fn: string): Promise<T> => page.evaluate(`(() => { const g = window.__game; return (${fn}); })()`);

test('heightmap: flat city, north-west hill, ridge with an opening, void between sectors; bake is fast', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  const r = await page.evaluate(async () => {
    const T = await import('/js/core/terrain.js'),
      M = await import('/js/core/heightmap.js');
    (window as any).__game.unlockAll();
    const h = (x: number, z: number) => T.groundH(x, z);
    return {
      bake: M.bakeMs,
      city: [h(0, 0), h(60, 60), h(0, -100)],
      hill: h(-105, -105),
      crest: Math.max(...[...Array(18)].map((_, k) => h(-121 - k, -1155))), // S1(-200,-1100) 동쪽 능선
      gate: h(-200, -1025), // 옛 문 개구 자리: 이제 능선이 닫혀 있다
      void: [h(-900, -800), h(1150, -750), h(300, 600), h(0, -900)], // 섬 사이·해협은 바다(허공)
      bridge: [T.groundH(74, 450, 5.5), T.groundH(74, 600, 5.5)], // 금문교 상판(높이 5.5, 발 y 를 줘야 올라탄다)
      coast: [h(0, 340), h(40, -600)], // 도시 사각형 바로 밖: 해변·산자락은 땅
      pad: h((window as any).__game.G.pads.alpha.x, (window as any).__game.G.pads.alpha.z),
    };
  });
  console.log('bakeMs', r.bake);
  expect(r.bake).toBeLessThan(400);
  r.city.forEach((v: number) => expect(Math.abs(v)).toBeLessThan(0.01));
  expect(r.hill).toBeGreaterThan(10);
  expect(r.crest).toBeGreaterThan(10); // 둘레 능선
  expect(r.gate).toBeGreaterThan(4); // 통로 없음: 능선이 닫힘
  r.void.forEach((v: number) => expect(v).toBe(-Infinity));
  r.bridge.forEach((v: number) => expect(v).toBeCloseTo(5.5, 2));
  r.coast.forEach((v: number) => expect(v).toBeGreaterThan(-Infinity));
  expect(Math.abs(r.pad)).toBeLessThan(0.01); // 포탈 패드는 평지
});

test('walking into the ridge is blocked, the opening is not', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.unlockAll();
    g.SECTORS.forEach((s: any) => (s.guard.speed = 0));
    g.teleport(-160, -1155);
    g.G.yaw = 0;
  });
  await page.keyboard.down('KeyD'); // 동쪽 능선으로
  await page.keyboard.down('Shift');
  await page.waitForTimeout(4000);
  await page.keyboard.up('Shift');
  await page.keyboard.up('KeyD');
  const x = await gameEval<number>(page, 'g.G.me.pos.x'),
    y = await gameEval<number>(page, 'g.G.me.pos.y');
  expect(x).toBeGreaterThan(-155);
  expect(x).toBeLessThan(-121); // 능선(S1 동쪽, x −138~−120) 마루를 넘지 못한다
  expect(y).toBeLessThan(10);
});

test('terrain tiles stream within the triangle budget (W6: 경계 문 없음)', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => (window as any).__game.teleport(-200, -1100));
  await page.waitForFunction(() => (window as any).__game.G.chunks[0], undefined, {timeout: 20000});
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async () => {
    const T = await import('/js/render/terrain.js'),
      G = (window as any).__game.G;
    return {stats: T.terrainStats(), calls: G.renderer.info.render.calls, tris: G.renderer.info.render.triangles};
  });
  expect(r.stats.tiles).toBeGreaterThan(0);
  expect(r.stats.tris).toBeLessThan(40000); // 근거리 지형 예산
  // W7 native detail raises resident geometry; the frame budget counts frustum-visible terrain.
  // stats.farTris still reports all resident far triangles for memory/debugging.
  expect(r.stats.drawnFarTris).toBeLessThan(36000);
  expect(r.tris).toBeLessThan(90000);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
