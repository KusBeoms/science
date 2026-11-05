// W5 FUN: 구역별 즐길 거리 — 자리마다 닿을 수 있는가, 미니게임·탑승·뽑기·먹이·간식 동작, 구역 스크린샷, 렌더 예산
import {test, expect, unexpected, OUT} from './fixtures';

const boot = async (game: any) => {
  await game.open('?debug=1');
  await game.page.click('#mstart');
  await game.page.waitForTimeout(800);
};

test('every fun spot can be reached on foot and is the picked target there', async ({game}) => {
  await boot(game);
  const bad = await game.page.evaluate(async () => {
    const D = await import('/js/data/fun-spots.js'),
      T = await import('/js/core/terrain.js'),
      I = await import('/js/game/interactables.js'),
      g = (window as any).__game,
      out: string[] = [];
    for (const sp of D.FUN_SPOTS) {
      const r = sp.r ?? 4.5;
      let ok = false;
      for (let k = 0; k < 40 && !ok; k++) {
        const a = k * 0.7, rr = (k % 4) * r * 0.22 + 0.4, x = sp.x + Math.cos(a) * rr, z = sp.z + Math.sin(a) * rr;
        if (T.groundH(x, z) === -Infinity || T.solidAt(x, z, 0.5)) continue;
        g.G.me.pos.set(x, T.groundH(x, z), z);
        const t = I.findTarget(g.G.me);
        ok = !!t && t.kind === 'fun' && t.id === sp.id;
      }
      if (!ok) out.push(sp.id);
    }
    return out;
  });
  expect(bad).toEqual([]);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('timing mini-game pays coins; claw machine, ducks, snack and wall climb work', async ({game}) => {
  const {page} = game;
  await boot(game);
  const r = await page.evaluate(async () => {
    const F = await import('/js/game/fun.js'),
      I = await import('/js/game/interactables.js'),
      S = (await import('/js/core/state.js')).S,
      g = (window as any).__game,
      out: any = {},
      sleep = (ms: number) => new Promise(r => setTimeout(r, ms)),
      near = async (id: string, dx = 0, dz = 1.5) => {
        const D = await import('/js/data/fun-spots.js'),
          sp = D.spotById(id);
        g.teleport(sp.x + dx, sp.z + dz);
        await sleep(250);
        const t = I.findTarget(g.G.me);
        return {sp, it: I.interactableOf('fun'), t};
      };
    g.giveMoney(200);
    // 3점슛: 막대가 가운데에 올 때 E 3번
    let n = await near('l-hoops');
    const c0 = S.cr;
    n.it.act(n.t, 'e');
    out.started = F.funState().play;
    for (let k = 0; k < 1500 && F.funState().play === 'timing'; k++) {
      if (Math.abs(F.meter() - 0.5) < 0.06) {
        n.it.act(n.t, 'e');
        await sleep(450);
      }
      await sleep(8);
    }
    out.hoopGain = S.cr - c0;
    out.hoopEnded = F.funState().play === null;
    // 뽑기
    n = await near('t-claw');
    const c1 = S.cr;
    n.it.act(n.t, 'e');
    out.clawDelta = S.cr - c1;
    out.clawCount = S.coins['fun:t-claw'];
    // 오리 먹이: 두 번째는 쿨다운
    n = await near('p-ducks', 2, 0);
    n.it.act(n.t, 'e');
    const d1 = S.coins['fun:p-ducks'];
    n.it.act(n.t, 'e');
    out.ducks = [d1, S.coins['fun:p-ducks']];
    // 간식: 스태미나 가득
    n = await near('t-candy');
    g.G.stam = 5;
    n.it.act(n.t, 'e');
    out.stam = g.G.stam;
    // 클라이밍: 9번 연타 → +9
    n = await near('l-climb');
    const c2 = S.cr;
    for (let k = 0; k < 9; k++) n.it.act(n.t, 'e');
    out.climb = S.cr - c2;
    return out;
  });
  expect(r.started).toBe('timing');
  expect(r.hoopEnded).toBe(true);
  expect(r.hoopGain).toBeGreaterThanOrEqual(15);
  expect(r.clawDelta).toBeGreaterThanOrEqual(-10);
  expect(r.clawCount).toBe(1);
  expect(r.ducks).toEqual([1, 1]);
  expect(r.stam).toBe(100);
  expect(r.climb).toBe(9);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('rides carry the player: carousel moves, roller coaster lifts and returns to the station', async ({game}) => {
  const {page} = game;
  await boot(game);
  const r = await page.evaluate(async () => {
    const F = await import('/js/game/fun.js'),
      I = await import('/js/game/interactables.js'),
      D = await import('/js/data/fun-spots.js'),
      g = (window as any).__game,
      out: any = {},
      sleep = (ms: number) => new Promise(r => setTimeout(r, ms)),
      board = async (id: string) => {
        const sp = D.spotById(id);
        g.teleport(sp.x, sp.z + 1);
        await sleep(250);
        const t = I.findTarget(g.G.me);
        I.interactableOf('fun').act(t, 'e');
        return sp;
      };
    let sp = await board('t-carousel');
    await sleep(500);
    const a = {x: g.G.me.pos.x, z: g.G.me.pos.z};
    await sleep(1400);
    out.carouselRiding = F.funState().riding;
    out.carouselMoved = Math.hypot(g.G.me.pos.x - a.x, g.G.me.pos.z - a.z);
    I.interactableOf('fun').act(I.findTarget(g.G.me), 'e'); // 다시 E = 내리기
    await sleep(200);
    out.carouselDone = F.funState().riding === null && g.G.sit === null;
    sp = await board('t-coaster');
    let maxY = 0;
    for (let k = 0; k < 40; k++) {
      await sleep(100);
      maxY = Math.max(maxY, g.G.me.pos.y);
    }
    out.coasterMaxY = maxY;
    I.interactableOf('fun').act(I.findTarget(g.G.me), 'e');
    await sleep(300);
    out.coasterBack = Math.hypot(g.G.me.pos.x - sp.exit.x, g.G.me.pos.z - sp.exit.z) < 0.5 && g.G.me.pos.y < 1;
    return out;
  });
  expect(r.carouselRiding).toBe('t-carousel');
  expect(r.carouselMoved).toBeGreaterThan(0.4);
  expect(r.carouselDone).toBe(true);
  expect(r.coasterMaxY).toBeGreaterThan(3);
  expect(r.coasterBack).toBe(true);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('zone screenshots and render budget (fun group stays a modest share of triangles)', async ({game}) => {
  const {page} = game;
  await boot(game);
  const spots: [string, number, number][] = [
    ['fun-park', -250, -262], ['fun-theme', -245, -45], ['fun-beach', -100, 318], ['fun-port', 86, 318],
    ['fun-culture', 238, 150], ['fun-leisure', 229, 236], ['fun-resi', -248, 296],
  ];
  const rows: string[] = [];
  for (const [name, x, z] of spots) {
    await page.evaluate(([x, z]) => (window as any).__game.teleport(x, z), [x, z]);
    await page.waitForTimeout(1200);
    await page.screenshot({path: `${OUT}/${name}.png`});
    const r = await page.evaluate(async () => {
      const g = (window as any).__game,
        fun = g.G.scene.getObjectByName('fun'),
        tris = () => new Promise<number>(res => requestAnimationFrame(() => requestAnimationFrame(() => res(g.G.renderer.info.render.triangles))));
      const all = await tris();
      fun.visible = false;
      const without = await tris();
      fun.visible = true;
      return {all, fun: all - without};
    });
    rows.push(`${name} total ${r.all} fun ${r.fun}`);
    expect(r.fun).toBeLessThan(60000);
  }
  console.log(rows.join('\n'));
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
