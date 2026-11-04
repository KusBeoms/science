import {test, expect, unexpected, canvasColors, OUT} from './fixtures';

test('menu loads without errors, game renders and survives 12s of play', async ({game}) => {
  const {page, problems} = game;
  await game.open();
  await expect(page.locator('#menu')).toBeVisible();
  await page.screenshot({path: `${OUT}/smoke-menu.png`});

  await page.click('#mstart');
  await expect(page.locator('#menu')).not.toHaveClass(/on/);
  await page.waitForTimeout(1000);
  expect(await canvasColors(page)).toBeGreaterThan(8);
  await page.screenshot({path: `${OUT}/smoke-start.png`});

  const keys = ['KeyW', 'KeyD', 'KeyS', 'KeyA'];
  for (let i = 0; i < 12; i++) {
    const k = keys[i % 4];
    await page.keyboard.down(k);
    if (i % 3 === 0) await page.keyboard.down('Shift');
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);
    await page.keyboard.up('Shift');
    await page.keyboard.up(k);
  }
  expect(await canvasColors(page)).toBeGreaterThan(8);
  await page.screenshot({path: `${OUT}/smoke-played.png`});
  const u = unexpected(problems);
  expect(u.pageerrors).toEqual([]);
  expect(u.console).toEqual([]);
  expect(u.failed).toEqual([]);
});

test('frame rate baseline is recorded (rAF count over 3s)', async ({game}) => {
  await game.open();
  await game.page.click('#mstart');
  await game.page.waitForTimeout(1000);
  const fps = await game.page.evaluate(
    () =>
      new Promise<number>(res => {
        let n = 0;
        const t0 = performance.now();
        const tick = () => {
          n++;
          if (performance.now() - t0 < 3000) requestAnimationFrame(tick);
          else res((n * 1000) / (performance.now() - t0));
        };
        requestAnimationFrame(tick);
      }),
  );
  console.log(`FPS_BASELINE ${fps.toFixed(1)} (headless SwiftShader, 1024x640)`);
  expect(fps).toBeGreaterThan(1);
});
