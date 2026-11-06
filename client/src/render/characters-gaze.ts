// Only move the two pupils: body/head rotations, accessories and NPC poses remain independent.
export const CHARACTER_GAZE = Object.freeze({maxX: 0.055, maxY: 0.065, response: 12, eyeY: 0.08, eyeZ: 0.85});
const cameraLocal = new THREE.Vector3();
const clamp = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v));

/** Track the final render camera in head-local coordinates. No per-frame objects are created.
 * Parent-transformed cameras and characters are supported. dt is elapsed time in seconds. */
export function updateCharacterGaze(character: any, camera: any, dt: number) {
  const head = character?.userData?.head, eyes = character?.userData?.gazeEyes;
  if (!head?.isObject3D || !eyes?.isObject3D || !camera?.getWorldPosition) return;
  head.updateWorldMatrix(true, false);
  camera.getWorldPosition(cameraLocal);
  head.worldToLocal(cameraLocal);
  const dx = cameraLocal.x, dy = cameraLocal.y - CHARACTER_GAZE.eyeY, dz = cameraLocal.z - CHARACTER_GAZE.eyeZ;
  let targetX = 0, targetY = 0;
  if (Number.isFinite(dx) && Number.isFinite(dy) && Number.isFinite(dz) && Math.hypot(dx, dy, dz) > 1e-6) {
    // abs(dz) keeps rear views finite without flipping the eyes or turning the head.
    targetX = clamp(dx / Math.max(0.6, Math.abs(dz)), 1) * CHARACTER_GAZE.maxX;
    targetY = clamp(dy / Math.max(0.6, Math.hypot(dx, dz)), 1) * CHARACTER_GAZE.maxY;
  }
  const alpha = 1 - Math.exp(-CHARACTER_GAZE.response * (Number.isFinite(dt) ? Math.max(0, dt) : 0)),
    x = Number.isFinite(eyes.position.x) ? eyes.position.x : 0,
    y = Number.isFinite(eyes.position.y) ? eyes.position.y : 0;
  eyes.position.x = clamp(x + (targetX - x) * alpha, CHARACTER_GAZE.maxX);
  eyes.position.y = clamp(y + (targetY - y) * alpha, CHARACTER_GAZE.maxY);
}
