// Follow camera and real camera-input timing. Vehicle movement never owns manual yaw/pitch.
import {G, paused} from '../core/runtime.js';
import {EYE_Y} from '../core/scale.js';
import {heightAt} from '../core/heightmap.js';
import {vehicleTransitionActive} from './vehicle-transition.js';
export const CAMERA_PITCH_MIN = -Math.PI * 5 / 12, CAMERA_PITCH_MAX = 1.35;
export const CAMERA_RETURN_DELAY_MS = 2000;
const held = new Set<number | string>();
let lastInputAt = performance.now(), lastDrive: any = null;
export function noteCameraInput(now = performance.now()) { lastInputAt = now; }
export function beginCameraInput(id: number | string, now = performance.now()) { held.add(id); noteCameraInput(now); }
export function endCameraInput(id: number | string, now = performance.now()) { if (held.delete(id)) noteCameraInput(now); }
export function cancelCameraInput(now = performance.now()) { held.clear(); noteCameraInput(now); }
export function cameraControlState() {
  return {lastInputAt, held: held.size, delayMs: CAMERA_RETURN_DELAY_MS};
}
/** Called before cineCamera(); the cutscene remains the final camera owner.
 * now is optional monotonic milliseconds for deterministic checks; normal frames pass only raw seconds. */
export function updateFollowCamera(raw: number, now = performance.now()) {
  if (!G.me || !G.camera) return;
  const dt = Number.isFinite(raw) ? Math.max(0, raw) : 0;
  if (G.drive !== lastDrive) { lastDrive = G.drive; noteCameraInput(now); }
  if (G.drive && !G.inside && !G.cine && !paused() && !vehicleTransitionActive()
    && !held.size && now - lastInputAt >= CAMERA_RETURN_DELAY_MS && Number.isFinite(G.drive.h)) {
    const target = G.drive.h + Math.PI,
      delta = Math.atan2(Math.sin(target - G.yaw), Math.cos(target - G.yaw));
    G.yaw += delta * (1 - Math.exp(-2.6 * dt)); // yaw only, including a parked or reversing car
  }
  if (!G.started) G.yaw += dt * 0.12;
  const pitch = Math.max(CAMERA_PITCH_MIN, Math.min(CAMERA_PITCH_MAX, Number.isFinite(G.pitch) ? G.pitch : 0.45)),
    distance = Math.max(0.1, Number.isFinite(G.camDist) ? G.camDist : 11),
    eyeY = G.me.pos.y + EYE_Y, horizontal = pitch < 0 ? distance : Math.cos(pitch) * distance,
    x = G.me.pos.x + Math.sin(G.yaw) * horizontal,
    z = G.me.pos.z + Math.cos(G.yaw) * horizontal;
  // Rooms are virtual spaces: an unrelated mountain at their world coordinates is not their floor.
  const floorY = G.inside ? 0.8 : heightAt(x, z) + 0.8,
    y = Math.max(eyeY + (pitch < 0 ? 0 : Math.sin(pitch) * distance), floorY);
  G.camera.position.set(x, y, z);
  if (pitch < 0) {
    // Keep eye-height orbit, then look up independently: sky views never push the camera underground.
    G.camera.lookAt(G.me.pos.x, y + Math.tan(-pitch) * horizontal, G.me.pos.z);
  } else G.camera.lookAt(G.me.pos.x, eyeY, G.me.pos.z);
}
