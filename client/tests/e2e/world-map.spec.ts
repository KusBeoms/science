// Independent map UX checks. Real UI gestures exercise the product controllers; no game code is replaced.
import {test, expect, unexpected, OUT} from './fixtures';
import type {Page} from '@playwright/test';

const snapshot = (page: Page) => page.evaluate(async () => (await import('/js/game/world-map.js')).worldMapState());
const phase = async (page: Page, value: string) => {
  await expect.poll(async () => (await snapshot(page)).phase, {timeout: 6000}).toBe(value);
};
async function frames(page: Page, count = 6) {
  await page.evaluate(n => new Promise<void>(resolve => {
    const next = () => --n <= 0 ? resolve() : requestAnimationFrame(next);
    requestAnimationFrame(next);
  }), count);
}
async function start(page: Page, open: (query?: string) => Promise<void>) {
  await open('?debug=1');
  await page.click('#mstart');
}
async function openMap(page: Page) {
  await page.keyboard.press('KeyM');
  await phase(page, 'open');
  await expect(page.locator('#wm-canvas')).toBeVisible();
  await expect.poll(async () => !!(await snapshot(page)).view).toBe(true);
}
function worldAt(view: any, x: number, y: number) {
  return {x: view.centerX + (x - view.width / 2) / view.scale,
    z: view.centerZ + (y - view.height / 2) / view.scale};
}
async function canvasBox(page: Page) {
  const b = await page.locator('#wm-canvas').boundingBox();
  expect(b).not.toBeNull();
  return b!;
}
function noErrors(game: any) { expect(unexpected(game.problems).pageerrors).toEqual([]); }

test('M raises a landscape phone, paints player/facilities, and closes with no map RAF left behind', async ({game}) => {
  const {page} = game;
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await start(page, game.open);
  await page.keyboard.press('KeyM');
  await expect(page.locator('#world-map')).toHaveAttribute('role', 'dialog');
  const opening = await snapshot(page);
  expect(['opening', 'open']).toContain(opening.phase);
  if (opening.phase === 'opening') {
    const motion = await page.locator('.wm-phone').evaluate(el => getComputedStyle(el).animationName);
    expect(motion).not.toBe('none');
  }
  await phase(page, 'open');
  const s = await snapshot(page), b = await canvasBox(page);
  expect(b.width).toBeGreaterThan(b.height);
  expect(s.rafActive).toBe(true);
  expect(s.drawCount).toBeGreaterThan(0);
  expect(s.view.markers.some((m: any) => m.id === 'stadium')).toBe(true);
  const player = await page.evaluate(() => {
    const {G} = (window as any).__game;
    return {x: G.me.pos.x, z: G.me.pos.z};
  });
  expect(Math.hypot(s.view.player.x - player.x, s.view.player.z - player.z)).toBeLessThan(.05);
  await page.locator('#wm-search').fill('경기장');
  await page.locator('#wm-places button[data-place-id="stadium"]').click();
  await expect(page.locator('#wm-detail')).toContainText('경기장');
  await expect.poll(async () => (await snapshot(page)).selected?.id ?? (await snapshot(page)).selected).toBe('stadium');
  await page.screenshot({path: `${OUT}/world-map-desktop.png`});
  await page.keyboard.press('Escape');
  await phase(page, 'closed');
  const closed = await snapshot(page);
  expect(closed.rafActive).toBe(false);
  await frames(page, 10);
  expect((await snapshot(page)).drawCount).toBe(closed.drawCount);
  await expect(page.locator('#world-map')).not.toBeVisible();
  noErrors(game);
});

test('natural wheel/drag pan and anchored zoom never move the game camera or held movement', async ({game}) => {
  const {page} = game;
  await start(page, game.open);
  await page.evaluate(() => {
    const {G} = (window as any).__game;
    G.joy.x = .8; G.runHeld = true; G.jumpHeld = true;
  });
  await page.keyboard.down('KeyW');
  await openMap(page);
  const before = await page.evaluate(() => {
    const {G} = (window as any).__game;
    return {x: G.me.pos.x, y: G.me.pos.y, z: G.me.pos.z, yaw: G.yaw, pitch: G.pitch, distance: G.camDist,
      w: !!G.keys.KeyW, joy: {...G.joy}, jump: G.jumpHeld, run: G.runHeld};
  });
  expect(before.w || before.jump || before.run).toBe(false);
  expect(before.joy).toEqual({x: 0, y: 0});
  await page.keyboard.up('KeyW');
  await page.locator('#wm-zoom-in').click();
  await page.locator('#wm-zoom-in').click();
  let s = (await snapshot(page)).view;
  const b = await canvasBox(page), cx = b.x + b.width * .5, cy = b.y + b.height * .5;
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(72, 120);
  await expect.poll(async () => (await snapshot(page)).view.centerZ).toBeGreaterThan(s.centerZ);
  let next = (await snapshot(page)).view;
  expect(next.centerX).toBeGreaterThan(s.centerX);
  s = next;
  await page.mouse.move(cx - 30, cy - 15);
  await page.mouse.down();
  await page.mouse.move(cx + 35, cy + 25, {steps: 8});
  await page.mouse.up();
  next = (await snapshot(page)).view;
  expect(next.centerX).toBeLessThan(s.centerX);
  expect(next.centerZ).toBeLessThan(s.centerZ);
  // The world point under an off-centre wheel cursor must remain fixed during zoom.
  const px = .64, py = .39, anchor = worldAt(next, next.width * px, next.height * py);
  await page.mouse.move(b.x + b.width * px, b.y + b.height * py);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -170);
  await page.keyboard.up('Control');
  await expect.poll(async () => (await snapshot(page)).view.scale).toBeGreaterThan(next.scale);
  s = (await snapshot(page)).view;
  const actual = worldAt(s, s.width * px, s.height * py);
  expect(Math.hypot(actual.x - anchor.x, actual.z - anchor.z) * s.scale).toBeLessThan(2);
  await frames(page);
  const after = await page.evaluate(() => {
    const {G} = (window as any).__game;
    return {x: G.me.pos.x, y: G.me.pos.y, z: G.me.pos.z, yaw: G.yaw, pitch: G.pitch, distance: G.camDist};
  });
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(.01);
  expect(after.yaw).toBeCloseTo(before.yaw, 6);
  expect(after.pitch).toBeCloseTo(before.pitch, 6);
  expect(after.distance).toBeCloseTo(before.distance, 6);
  await page.keyboard.press('KeyM');
  await phase(page, 'closed');
  noErrors(game);
});

test('closing during the raise animation and rapid reopening leaves one live view; typing M does not close search', async ({game}) => {
  const {page} = game;
  await start(page, game.open);
  await page.keyboard.press('KeyM');
  await page.keyboard.press('Escape');
  await page.keyboard.press('KeyM');
  await phase(page, 'open');
  await expect(page.locator('#world-map')).toHaveCount(1);
  await expect(page.locator('#wm-canvas')).toHaveCount(1);
  const a = await snapshot(page);
  await frames(page, 10);
  const b = await snapshot(page);
  expect(b.rafActive).toBe(true);
  expect(b.drawCount).toBeGreaterThan(a.drawCount);
  await page.locator('#wm-search').focus();
  await page.keyboard.press('KeyM');
  expect((await snapshot(page)).phase).toBe('open');
  await expect(page.locator('#wm-search')).toHaveValue('m');
  // Buttons are not text editors: M must still close after operating a map control.
  await page.locator('#wm-fit').focus();
  await page.keyboard.press('KeyM');
  await phase(page, 'closed');
  const stopped = await snapshot(page);
  await frames(page, 8);
  expect((await snapshot(page)).drawCount).toBe(stopped.drawCount);
  await page.keyboard.press('KeyP');
  await expect(page.locator('#phone')).toHaveClass(/on/);
  await page.locator('[data-act="app:map"]').click();
  await phase(page, 'open');
  await expect(page.locator('#phone')).not.toHaveClass(/on/);
  await expect(page.locator('#wm-canvas')).toHaveCount(1);
  noErrors(game);
});

test('current location uses the outdoor return point indoors and the actual car while driving', async ({game}) => {
  const {page} = game;
  await start(page, game.open);
  const door = await page.evaluate(async () => {
    const B = await import('/js/game/interior.js'), E = await import('/js/data/interiors.js');
    const i = E.ENTERABLES.findIndex(e => e.rural?.group === 'mountain-lodge');
    B.enterBuilding(i);
    return {...E.ENTERABLES[i].door};
  });
  await openMap(page);
  await page.locator('#wm-recenter').click();
  let s = (await snapshot(page)).view;
  expect(s.player.inside).toBe(true);
  expect(Math.hypot(s.player.x - door.x, s.player.z - door.z)).toBeLessThan(.05);
  expect(Math.hypot(s.centerX - door.x, s.centerZ - door.z)).toBeLessThan(.05);
  await page.keyboard.press('Escape');
  await phase(page, 'closed');
  const car = await page.evaluate(async () => {
    const B = await import('/js/game/interior.js'), V = await import('/js/systems/vehicle.js'), W = await import('/js/game/world-map.js');
    const {G} = (window as any).__game;
    B.leaveBuilding(true);
    const v = V.spawnVeh({t: 'sedan', x: 0, z: 260, own: -1});
    V.enterVeh(v);
    // Pause before another driving tick: a stale avatar coordinate must not override actual car x/z.
    v.x = 12; v.z = 252;
    W.openWorldMap();
    return {x: v.x, z: v.z};
  });
  await phase(page, 'open');
  await page.locator('#wm-recenter').click();
  s = (await snapshot(page)).view;
  expect(s.player.driving).toBe(true);
  expect(Math.hypot(s.player.x - car.x, s.player.z - car.z)).toBeLessThan(.05);
  expect(Math.hypot(s.centerX - car.x, s.centerZ - car.z)).toBeLessThan(.05);
  noErrors(game);
});

test('mobile layout, reduced motion and two-touch anchored pinch survive resize and close cleanly', async ({game}) => {
  const {page} = game;
  await page.setViewportSize({width: 390, height: 844});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await start(page, game.open);
  await page.locator('#mapBtn').click();
  await phase(page, 'open');
  const b = await canvasBox(page), before = (await snapshot(page)).view;
  expect(b.width).toBeGreaterThan(b.height);
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(391);
  const mobile = await page.locator('#world-map').evaluate(el => ({
    animations: el.getAnimations({subtree: true}).filter(a => a.playState === 'running').length,
    touchAction: getComputedStyle(el.querySelector('canvas')!).touchAction,
  }));
  expect(mobile.animations).toBe(0);
  expect(mobile.touchAction).toBe('none');
  const px = .58, py = .44, anchor = worldAt(before, before.width * px, before.height * py);
  const mid = {x: b.x + b.width * px, y: b.y + b.height * py};
  await page.locator('#wm-canvas').evaluate((canvas, p) => {
    const send = (type: string, id: number, x: number) => canvas.dispatchEvent(new PointerEvent(type, {
      pointerId: id, pointerType: 'touch', isPrimary: id === 201, clientX: x, clientY: p.y,
      buttons: type === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true,
    }));
    send('pointerdown', 201, p.x - 35); send('pointerdown', 202, p.x + 35);
    send('pointermove', 201, p.x - 57); send('pointermove', 202, p.x + 57);
    send('pointerup', 201, p.x - 57); send('pointerup', 202, p.x + 57);
  }, mid);
  const after = (await snapshot(page)).view, actual = worldAt(after, after.width * px, after.height * py);
  expect(after.scale).toBeGreaterThan(before.scale * 1.2);
  expect(Math.hypot(actual.x - anchor.x, actual.z - anchor.z) * after.scale).toBeLessThan(2);
  expect(after.dragging).toBeFalsy();
  await page.screenshot({path: `${OUT}/world-map-mobile.png`});
  await page.setViewportSize({width: 844, height: 390});
  await expect.poll(async () => (await snapshot(page)).view.width).toBeGreaterThan(before.width);
  const resized = await snapshot(page), box = await canvasBox(page);
  expect(resized.view.width).toBeGreaterThan(0);
  expect(resized.view.height).toBeGreaterThan(0);
  expect(box.x + box.width).toBeLessThanOrEqual(845);
  expect(box.y + box.height).toBeLessThanOrEqual(391);
  expect(Math.hypot(resized.view.centerX - after.centerX, resized.view.centerZ - after.centerZ)).toBeLessThan(.1);
  await page.locator('#wm-close').click();
  await phase(page, 'closed');
  const stopped = await snapshot(page);
  await frames(page);
  expect((await snapshot(page)).drawCount).toBe(stopped.drawCount);
  expect(stopped.rafActive).toBe(false);
  noErrors(game);
});
