// 도구(스위트 아님): GROUND=1 로만 돈다. 시가지 지면 메시 삼각형 수 출력
import {test} from './fixtures';
test.skip(!process.env.GROUND, 'tool');
test('ground tris', async ({game}) => {
  const {page} = game;
  if (process.env.NOW7) await page.addInitScript(() => ((window as any).__noW7 = true));
  await game.open('?debug=1');
  const r = await page.evaluate(async () => {
    const L = await import('/js/render/city/layout.js');
    const t0 = performance.now(), g = L.groundGeometry();
    return {tris: g.attributes.position.count / 3, ms: Math.round(performance.now() - t0)};
  });
  console.log(JSON.stringify(r));
});
