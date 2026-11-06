// Safe transitions back to walking: test the final collision layer and a short escape path.
import {groundH, solidAt, walkable} from './terrain.js';
import {waterAt} from './water.js';
export interface ExitPoint {x: number; y: number; z: number;}
export const EXIT_RADIUS = 0.5; // slightly more room than the walking body's 0.42u
function floorAt(x: number, z: number, fromY: number): ExitPoint | null {
  const y = groundH(x, z, fromY), water = waterAt(x, z);
  if (!Number.isFinite(y) || Math.abs(y - fromY) > 2.5 || solidAt(x, z, EXIT_RADIUS, y) || water && y < water.y - 0.15) return null;
  return {x, y, z};
}
/** A free point alone can still be a sealed pocket. Require 1.4u of connected walking space. */
export function walkingExit(x: number, z: number, fromY: number): ExitPoint | null {
  const p = floorAt(x, z, fromY);
  if (!p) return null;
  for (let k = 0; k < 16; k++) {
    const a = k * Math.PI / 8;
    let prev = p, clear = true;
    for (let step = 1; step <= 4; step++) {
      const q = floorAt(p.x + Math.cos(a) * step * 0.35, p.z + Math.sin(a) * step * 0.35, prev.y);
      if (!q || !walkable(prev.x, prev.z, prev.y, q.x, q.z)) { clear = false; break; }
      prev = q;
    }
    if (clear) return p;
  }
  return null;
}
/** Preserve a clear original doorway; otherwise choose the closest nearby usable standing point. */
export function nearbyExit(anchor: ExitPoint, maxRadius = 7): ExitPoint | null {
  const direct = walkingExit(anchor.x, anchor.z, anchor.y);
  if (direct) return direct;
  for (let r = 0.75; r <= maxRadius; r += 0.75) for (let k = 0; k < 24; k++) {
    const a = k * Math.PI / 12, p = walkingExit(anchor.x + Math.cos(a) * r, anchor.z + Math.sin(a) * r, anchor.y);
    if (p) return p;
  }
  return null;
}
