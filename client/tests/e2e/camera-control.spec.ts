import {test, expect, unexpected} from './fixtures';

test('vehicle camera waits two seconds after release, then returns yaw only even while stopped', async ({game}) => {
  const {page} = game; await game.open('?debug=1'); await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const C = await import('/js/systems/camera.js'), {G} = (window as any).__game;
    const saved = {drive: G.drive, yaw: G.yaw, pitch: G.pitch}, now = performance.now();
    const error = (yaw: number, target: number) => Math.abs(Math.atan2(Math.sin(target - yaw), Math.cos(target - yaw)));
    try {
      G.drive = {h: 0.7, v: 0}; G.yaw = 0.2; G.pitch = -0.4;
      C.updateFollowCamera(0, now);
      C.noteCameraInput(now);
      C.updateFollowCamera(0.05, now + 1999);
      const beforeDelay = G.yaw, initialError = error(G.yaw, G.drive.h + Math.PI);
      C.beginCameraInput('test-drag', now + 2000);
      C.updateFollowCamera(1, now + 5000);
      const whileHeld = G.yaw;
      C.endCameraInput('test-drag', now + 5000);
      C.updateFollowCamera(0.05, now + 6999);
      const beforeReleaseDelay = G.yaw;
      for (let i = 0; i < 90; i++) C.updateFollowCamera(1 / 60, now + 7000 + i * 1000 / 60);
      return {beforeDelay, whileHeld, beforeReleaseDelay, initialError, finalError: error(G.yaw, G.drive.h + Math.PI), pitch: G.pitch};
    } finally {
      G.drive = saved.drive; G.yaw = saved.yaw; G.pitch = saved.pitch;
      C.cancelCameraInput(); C.updateFollowCamera(0);
    }
  });
  expect(r.beforeDelay).toBeCloseTo(0.2, 10); expect(r.whileHeld).toBeCloseTo(0.2, 10);
  expect(r.beforeReleaseDelay).toBeCloseTo(0.2, 10); expect(r.finalError).toBeLessThan(r.initialError * 0.05);
  expect(r.pitch).toBe(-0.4); expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('mouse, pointer lock, touch pinch and wheel record real camera input and release held gestures', async ({game}) => {
  const {page} = game; await game.open('?debug=1'); await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const C = await import('/js/systems/camera.js'), {G} = (window as any).__game, cv = G.renderer.domElement;
    const saved = {started: G.started, yaw: G.yaw, pitch: G.pitch, dist: G.camDist};
    const lock = Object.getOwnPropertyDescriptor(document, 'pointerLockElement');
    const pointer = (type: string, id: number, pointerType: string, x: number, y: number) =>
      cv.dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true, pointerId: id, pointerType, clientX: x, clientY: y}));
    try {
      G.started = false; G.pitch = 0.2; C.cancelCameraInput(0);
      pointer('pointerdown', 41, 'mouse', 100, 200);
      pointer('pointermove', 41, 'mouse', 170, 40);
      const mouse = {held: C.cameraControlState().held, pitch: G.pitch, time: C.cameraControlState().lastInputAt};
      pointer('pointerup', 41, 'mouse', 170, 40);
      Object.defineProperty(document, 'pointerLockElement', {configurable: true, get: () => cv});
      const movement = new MouseEvent('mousemove');
      Object.defineProperties(movement, {movementX: {value: 20}, movementY: {value: -600}});
      document.dispatchEvent(movement);
      const lockedPitch = G.pitch;
      if (lock) Object.defineProperty(document, 'pointerLockElement', lock); else delete (document as any).pointerLockElement;
      G.camDist = 12;
      pointer('pointerdown', 51, 'touch', 100, 100); pointer('pointerdown', 52, 'touch', 180, 100);
      pointer('pointermove', 52, 'touch', 230, 80);
      const pinch = {held: C.cameraControlState().held, dist: G.camDist};
      pointer('pointercancel', 51, 'touch', 100, 100); pointer('pointercancel', 52, 'touch', 230, 80);
      G.started = true;
      const beforeWheel = G.camDist;
      window.dispatchEvent(new WheelEvent('wheel', {ctrlKey: true, deltaY: 20, cancelable: true}));
      return {mouse, lockedPitch, minPitch: C.CAMERA_PITCH_MIN, pinch, beforeWheel, afterWheel: G.camDist,
        heldAfter: C.cameraControlState().held, inputAt: C.cameraControlState().lastInputAt};
    } finally {
      if (lock) Object.defineProperty(document, 'pointerLockElement', lock); else delete (document as any).pointerLockElement;
      G.started = saved.started; G.yaw = saved.yaw; G.pitch = saved.pitch; G.camDist = saved.dist; C.cancelCameraInput();
    }
  });
  expect(r.mouse.held).toBe(1); expect(r.mouse.pitch).toBeLessThan(0); expect(r.mouse.time).toBeGreaterThan(0);
  expect(r.lockedPitch).toBeCloseTo(r.minPitch, 8); expect(r.pinch.held).toBe(2); expect(r.pinch.dist).toBeLessThan(12);
  expect(r.afterWheel).toBeGreaterThan(r.beforeWheel); expect(r.heldAfter).toBe(0); expect(r.inputAt).toBeGreaterThan(0);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('sky view reaches seventy five degrees without entering terrain and indoor camera ignores outdoor height', async ({game}) => {
  const {page} = game; await game.open('?debug=1'); await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const C = await import('/js/systems/camera.js'), H = await import('/js/core/heightmap.js');
    const {G} = (window as any).__game, T = (window as any).THREE;
    const saved = {drive: G.drive, inside: G.inside, yaw: G.yaw, pitch: G.pitch, dist: G.camDist, pos: G.me.pos.clone()};
    try {
      G.drive = null; G.inside = null; G.me.pos.set(0, 0, 0); G.yaw = 0; G.camDist = 11; G.pitch = C.CAMERA_PITCH_MIN;
      C.updateFollowCamera(0);
      const sky = {directionY: G.camera.getWorldDirection(new T.Vector3()).y, y: G.camera.position.y,
        clearance: G.camera.position.y - H.heightAt(G.camera.position.x, G.camera.position.z),
        radius: Math.hypot(G.camera.position.x - G.me.pos.x, G.camera.position.z - G.me.pos.z)};
      G.pitch = 0.45; C.updateFollowCamera(0);
      const positive = {z: G.camera.position.z, y: G.camera.position.y};
      G.inside = {}; G.me.pos.set(888, 0, -236); G.pitch = -0.8; C.updateFollowCamera(0);
      return {sky, positive, indoorY: G.camera.position.y, indoorDirectionY: G.camera.getWorldDirection(new T.Vector3()).y};
    } finally {
      G.drive = saved.drive; G.inside = saved.inside; G.yaw = saved.yaw; G.pitch = saved.pitch;
      G.camDist = saved.dist; G.me.pos.copy(saved.pos); C.cancelCameraInput(); C.updateFollowCamera(0);
    }
  });
  expect(r.sky.directionY).toBeGreaterThan(0.96); expect(r.sky.radius).toBeCloseTo(11, 5); expect(r.sky.clearance).toBeGreaterThanOrEqual(0.8);
  expect(r.positive.z).toBeCloseTo(Math.cos(0.45) * 11, 5); expect(r.positive.y).toBeCloseTo(1.8 + Math.sin(0.45) * 11, 5);
  expect(r.indoorY).toBeCloseTo(1.8, 5); expect(r.indoorDirectionY).toBeGreaterThan(0.7);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
