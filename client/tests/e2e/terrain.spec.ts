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
      crest: Math.max(...[...Array(18)].map((_, k) => h(79 - k, -300))),
      opening: [h(0, -180), h(10, -190), h(0, -200)],
      void: [h(100, 200), h(-120, 260), h(115, -215)],
      pass: [h(0, -165), h(115, -260), h(270, -165)],
      pad: h((window as any).__game.G.pads.alpha.x, (window as any).__game.G.pads.alpha.z),
    };
  });
  expect(r.bake).toBeLessThan(120);
  r.city.forEach((v: number) => expect(Math.abs(v)).toBeLessThan(0.01));
  expect(r.hill).toBeGreaterThan(10);
  expect(r.crest).toBeGreaterThan(10); // 둘레 능선
  r.opening.forEach((v: number) => expect(Math.abs(v)).toBeLessThan(0.5)); // 통로 개구는 열려 있다
  r.void.forEach((v: number) => expect(v).toBe(-Infinity));
  r.pass.forEach((v: number) => expect(Math.abs(v)).toBeLessThan(0.01));
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
    g.teleport(40, -310);
    g.G.yaw = 0;
  });
  await page.keyboard.down('KeyD'); // 동쪽 능선으로
  await page.keyboard.down('Shift');
  await page.waitForTimeout(4000);
  await page.keyboard.up('Shift');
  await page.keyboard.up('KeyD');
  const x = await gameEval<number>(page, 'g.G.me.pos.x'),
    y = await gameEval<number>(page, 'g.G.me.pos.y');
  expect(x).toBeGreaterThan(45);
  expect(x).toBeLessThan(79); // 능선(x 62~80) 마루를 넘지 못한다
  expect(y).toBeLessThan(10);
});

test('terrain tiles stream within the triangle budget and the gate follows the lock state', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => (window as any).__game.teleport(0, -150));
  await page.waitForFunction(() => (window as any).__game.G.chunks[0], undefined, {timeout: 20000});
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async () => {
    const T = await import('/js/render/terrain.js'),
      G = (window as any).__game.G;
    return {stats: T.terrainStats(), state: G.chunks[0].gate.grp.userData.state, calls: G.renderer.info.render.calls, tris: G.renderer.info.render.triangles};
  });
  expect(r.stats.tiles).toBeGreaterThan(0);
  expect(r.stats.tris).toBeLessThan(40000); // 근거리 지형 예산
  expect(r.stats.farTris).toBeLessThan(25000);
  expect(['far', 'next', 'ready']).toContain(r.state); // 잠긴 S1 문
  expect(r.tris).toBeLessThan(90000);
  await page.evaluate(() => (window as any).__game.unlockAll());
  await page.waitForTimeout(800);
  expect(await gameEval<string>(page, 'g.G.chunks[0].gate.grp.userData.state')).toBe('open');
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
