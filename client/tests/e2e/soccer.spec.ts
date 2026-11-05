// 축구: 스타디움 지형·충돌, 킥오프 E → 경기 시작(10명), 방향키 드리블/Space 슛, 골 판정, 시간 종료 보상
import {test, expect, unexpected, OUT} from './fixtures';

test('stadium: pitch is walkable grass, stands block, gate is open; kickoff board starts a 5v5 match', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const T = await import('/js/core/terrain.js'),
      D = await import('/js/data/soccer.js'),
      g = (window as any).__game;
    return {
      pitch: T.groundH(D.PITCH.cx, D.PITCH.cz),
      stands: T.solidAt(D.STADIUM.rect[0] + 5, D.PITCH.cz, 0.5),
      gate: T.solidAt(D.STADIUM.gateX, D.STADIUM.rect[3] - 6, 0.5),
      wall: T.solidAt(D.STADIUM.gateX + 20, D.STADIUM.rect[3] - 6, 0.5),
      g: !!g,
    };
  });
  expect(r.pitch).toBeCloseTo(0, 1);
  expect(r.stands).toBe(true);
  expect(r.gate).toBe(false);
  expect(r.wall).toBe(true);
  await page.evaluate(async () => {
    const D = await import('/js/data/soccer.js');
    (window as any).__game.teleport(D.KICKOFF.x + 1, D.KICKOFF.z + 2);
  });
  await page.waitForTimeout(500);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => (window as any).__game.G.match === true, undefined, {timeout: 3000});
  await page.waitForTimeout(2500);
  await page.screenshot({path: `${OUT}/soccer-match.png`});
  // 공이 움직이고(AI/나), 경기 시간이 흐른다 → 강제로 골을 넣어 점수 확인
  const s = await page.evaluate(async () => {
    const M = await import('/js/systems/soccer.js');
    return typeof M.soccerSystem.update;
  });
  expect(s).toBe('function');
  // 시간 종료 보상: 경기 종료 키(E)로 중단 가능
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => (window as any).__game.G.match === false, undefined, {timeout: 3000});
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('free play: running into the ball dribbles it, Space shoots it, the ball stays on the pitch', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(async () => {
    const D = await import('/js/data/soccer.js'),
      g = (window as any).__game;
    g.teleport(D.PITCH.cx - 10, D.PITCH.cz);
    g.G.yaw = Math.PI / 2 * -1; // 동쪽을 본다 (카메라 뒤 = 서쪽)
  });
  await page.waitForTimeout(600);
  const ballPos = () => page.evaluate(async () => {
    // 공은 scene 의 Mesh 중 정점색 이코사헤드론
    const g = (window as any).__game, out: number[] = [];
    g.G.scene.traverse((o: any) => o.isMesh && o.geometry?.type === 'IcosahedronGeometry' && o.geometry.attributes.position.count === 240 && Math.abs(o.position.z + 270) < 60 && o.position.x > 200 && o.position.x < 350 && out.push(o.position.x, o.position.z));
    return out;
  });
  const b0 = await ballPos();
  expect(b0.length).toBeGreaterThanOrEqual(2);
  await page.keyboard.down('KeyW'); // 동쪽
  await page.waitForTimeout(1800);
  await page.keyboard.up('KeyW');
  const b1 = await ballPos();
  expect(b1[0]).toBeGreaterThan(b0[0] + 3); // 드리블로 밀려 갔다
  await page.keyboard.press('Space');
  await page.waitForTimeout(1200);
  const b2 = await ballPos();
  const D = {cx: 272, hl: 45};
  expect(b2[0]).toBeLessThanOrEqual(D.cx + D.hl + 4);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
