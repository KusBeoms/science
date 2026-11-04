import {test, OUT} from './fixtures';
test('dbg', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.waitForTimeout(2500);
  await page.evaluate(async () => {
    const C = await import('/js/systems/crowd.js');
    const g = (window as any).__game;
    const ps = C.crowdApi.positions();
    const p = ps.sort((a: any, b: any) => (b.x - a.x))[0];
    g.teleport(p.x - 3, p.z + 1);
    g.G.yaw = -1.57; g.G.pitch = 0.15; g.G.camDist = 6;
    g.G.carry.push({id: 0, z: 0, k: 0, st: 1});
  });
  await page.waitForTimeout(500);
  await page.screenshot({path: `${OUT}/crowd-close.png`});
  await page.waitForTimeout(400);
  await page.screenshot({path: `${OUT}/crowd-close2.png`});
});
