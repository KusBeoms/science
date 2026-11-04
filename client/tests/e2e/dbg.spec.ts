import {test} from './fixtures';
test('fps', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.waitForTimeout(2000);
  for (let i = 0; i < 3; i++) {
    const r = await page.evaluate(() => new Promise<number>(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 5000 ? requestAnimationFrame(f) : res(n / 5); }; f(); }));
    console.log('FPS', r.toFixed(1));
  }
});
