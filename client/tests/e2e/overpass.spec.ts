// W5 ROADS 입체교차로: 데크 계층(램프 오르기·상판 위 주행·밑 통과·옆으로 떨어지기), 고가 층 충돌체, 걸어서 오르기
import {test, expect, unexpected} from './fixtures';

test('deck layer: ramp foot climbs, underpass stays low, side edge drops', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const T = await import('/js/core/terrain.js'),
      D = await import('/js/core/deck.js');
    const h = T.groundH;
    return {
      foot: h(165, 16, 0), // 램프 발치: 높이<허용치라 올라탄다
      under: [h(200, 16, 0), h(200, 16, 1.5)], // 상판 밑 지상 도로
      top: [h(200, 16, 6.2), h(200, 16, 5.2)], // 상판 위
      mid: h(174, 16, 0), // 램프 중턱 밑을 걸으면 지면(둑이 막는다)
      side: [h(200, 23, 6.2), h(200, 9, 6.2)], // 상판 옆으로 벗어나면 지면
      none: h(200, 16), // y 없으면 기존 동작
      list: D.deckList().filter((d: any) => /^(ev|hv|av)-/.test(d.id)).length, // 고가(ev/hv/av) 데크만 (금문교 br-·마리나·선착장 데크 제외)
      railUp: [T.solidAt(200, 20.8, 0.5, 6.2), T.solidAt(200, 20.8, 0.5, 0), T.solidAt(200, 20.8, 0.5)],
      pier: [T.solidAt(220, 16, 0.3, 0), T.solidAt(220, 16, 0.3, 6.2), T.solidAt(220, 16, 0.3)],
    };
  });
  expect(r.list).toBe(12);
  expect(r.foot).toBeGreaterThan(0.3);
  expect(r.foot).toBeLessThan(1.5);
  expect(r.under).toEqual([0, 0]);
  expect(r.top[0]).toBeCloseTo(6.2, 1);
  expect(r.top[1]).toBeCloseTo(6.2, 1);
  expect(r.mid).toBe(0);
  expect(r.side).toEqual([0, 0]);
  expect(r.none).toBe(0);
  expect(r.railUp).toEqual([true, false, false]); // 난간은 고가 층에서만
  expect(r.pier).toEqual([true, false, true]); // 기둥은 지상에서만
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('cars: one climbs the ramp and runs over the deck while another crosses underneath', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const V = await import('/js/systems/vehicle.js'),
      T = await import('/js/core/terrain.js');
    const up = V.spawnVeh({t: 'sedan', x: 156, z: 16, h: Math.PI / 2}), // +x 로
      under = V.spawnVeh({t: 'sedan', x: 200, z: 60, h: Math.PI}); // −z 로 (상판 밑을 가로지른다)
    for (const v of [up, under]) {
      T.dropDynSolid(v.solid); // 자기 충돌체는 뗀다 (경찰차와 같은 방식)
      v.solid = null;
    }
    let maxY = 0,
      bumps = 0,
      underMaxY = 0,
      crossed = false;
    const where: number[][] = [];
    for (let i = 0; i < 60 * 5; i++) {
      const b1 = V.stepVehicle(up, 1, 0, false, 1 / 60),
        b2 = V.stepVehicle(under, 1, 0, false, 1 / 60);
      bumps += +b1 + +b2;
      if (b1 || b2) where.push([+up.x.toFixed(1), +up.y.toFixed(1), +under.x.toFixed(1), +under.z.toFixed(1)]);
      maxY = Math.max(maxY, up.y);
      underMaxY = Math.max(underMaxY, under.y);
      if (up.x > 190 && up.x < 210 && Math.abs(under.z - 16) < 3 && Math.abs(under.x - 200) < 3) crossed = true;
    }
    return {where, maxY, upX: up.x, upY: up.y, bumps, underMaxY, underZ: under.z, crossed};
  });
  expect(r.maxY).toBeGreaterThan(5.5);
  expect(r.upX).toBeGreaterThan(215); // 상판을 지나 내리막까지 간다
  expect(r.underMaxY).toBeLessThan(0.3);
  expect(r.underZ).toBeLessThan(-20);
  expect(r.crossed).toBe(true); // 둘은 같은 평면 위치를 지나지만 부딪히지 않는다
  expect(r.where).toEqual([]);
  expect(r.bumps).toBe(0);
});

test('on foot: walk up the ramp onto the deck', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.teleport(150, 16);
    g.G.yaw = 0;
  });
  await page.keyboard.down('KeyD'); // 동쪽
  await page.keyboard.down('Shift');
  let maxY = 0;
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(250);
    maxY = Math.max(maxY, await page.evaluate(() => (window as any).__game.G.me.pos.y));
  }
  await page.keyboard.up('Shift');
  await page.keyboard.up('KeyD');
  expect(maxY).toBeGreaterThan(5.5); // 램프를 걸어 올라 상판 높이(6.2)에 선다
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
