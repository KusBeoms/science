// Rural model front (+z), collision body, porch, ramp and interior door share one world frame.
import {addSolid, groundH, solidAt} from '../core/terrain.js';
import {addDeck} from '../core/deck.js';
import {waterAt} from '../core/water.js';
import {registerRuralInterior} from '../data/interiors.js';
import type {RuralEntry, RuralPoint} from '../data/rural-entries.js';
import {PAL} from './lowpoly/palette.js';
import {box} from './lowpoly/prim.js';
import type {Placed} from './lowpoly/merge.js';
import {walkway} from './rural-models.js';

export interface RuralBody {
  id: string; x: number; y: number; z: number; w: number; d: number; ry: number;
  model: string; group?: RuralEntry['group']; doorU?: number; front?: number; porchHeight?: number;
}
const frame = (s: RuralBody, u: number, v: number) => ({x: s.x + u * Math.cos(s.ry) + v * Math.sin(s.ry), z: s.z - u * Math.sin(s.ry) + v * Math.cos(s.ry)});
/** Thin AABB rows follow rotated walls; the empty bounding-box corners cannot trap the door path. */
export function ruralBodySolid(s: RuralBody) {
  const p = [[-s.w / 2, -s.d / 2], [s.w / 2, -s.d / 2], [s.w / 2, s.d / 2], [-s.w / 2, s.d / 2]].map(([u, v]) => frame(s, u, v));
  const z0 = Math.min(...p.map(q => q.z)), z1 = Math.max(...p.map(q => q.z));
  for (let z = z0; z < z1; z += 0.4) {
    const end = Math.min(z + 0.4, z1), zz = (z + end) / 2, xs: number[] = [];
    for (let i = 0; i < 4; i++) {
      const a = p[i], b = p[(i + 1) % 4];
      if ((a.z <= zz && b.z > zz) || (b.z <= zz && a.z > zz)) xs.push(a.x + (b.x - a.x) * (zz - a.z) / (b.z - a.z));
    }
    if (xs.length >= 2) addSolid(Math.min(...xs), z, Math.max(...xs), end);
  }
}
/** Returns a registered accepted house and adds only its outdoor entrance (rooms stay lazy). */
export function ruralEntry(parts: Placed[], s: RuralBody): RuralEntry | null {
  const u = s.doorU || 0, front = s.front ?? s.d / 2 + 1.2, d = frame(s, u, front);
  const y = Math.max(s.y + (s.porchHeight ?? 0.3), groundH(d.x, d.z) + 0.04);
  const door: RuralPoint = {...d, y};
  let landing: RuralPoint | null = null;
  // Test the entire ramp corridor, including player radius, before accepting a landing.
  for (const length of [3.5, 4.5, 6, 8, 10, 12, 14, 16]) {
    for (const offset of [0, -1.5, 1.5, -3, 3]) {
      const q = frame(s, u + offset, front + length), gy = groundH(q.x, q.z), water = waterAt(q.x, q.z);
      if (!Number.isFinite(gy) || water && gy < water.y || Math.abs(y - gy) > length * 0.65) continue;
      let ok = true;
      for (let i = 0; i <= 24; i++) {
        const t = i / 24, x = door.x + (q.x - door.x) * t, z = door.z + (q.z - door.z) * t;
        const h = y + (gy + 0.06 - y) * t;
        if (solidAt(x, z, 0.52, h)) { ok = false; break; }
      }
      if (ok) { landing = {...q, y: gy + 0.06}; break; }
    }
    if (landing) break;
  }
  if (!landing) return null;
  const wall = frame(s, u, s.d / 2 + 0.02), porchLen = Math.hypot(door.x - wall.x, door.z - wall.z);
  parts.push({g: box(2.2, 0.22, porchLen, PAL.wood), x: (door.x + wall.x) / 2, y: y - 0.22, z: (door.z + wall.z) / 2, ry: s.ry});
  addDeck({id: s.id + '-porch', ax: wall.x, az: wall.z, bx: door.x, bz: door.z, hw: 1.1, h0: y, h1: y});
  const len = Math.hypot(door.x - landing.x, door.z - landing.z);
  parts.push({g: walkway(2.2, len, y - landing.y), x: (door.x + landing.x) / 2, y: landing.y - 0.22,
    z: (door.z + landing.z) / 2, ry: Math.atan2(door.x - landing.x, door.z - landing.z)});
  addDeck({id: s.id + '-entry', ax: landing.x, az: landing.z, bx: door.x, bz: door.z, hw: 1.1, h0: landing.y, h1: y});
  // The shared endpoint can project 1e-14 past both deck lengths. A tiny visible threshold makes it interior.
  const nx = Math.sin(s.ry), nz = Math.cos(s.ry);
  parts.push({g: box(2.2, 0.08, 0.1, PAL.wood), x: door.x, y: y - 0.08, z: door.z, ry: s.ry});
  addDeck({id: s.id + '-threshold', ax: door.x - nx * 0.05, az: door.z - nz * 0.05,
    bx: door.x + nx * 0.05, bz: door.z + nz * 0.05, hw: 1.1, h0: y, h1: y});
  const site: RuralEntry = {...s, group: s.group || 'rural-house', door, landing};
  registerRuralInterior(site);
  return site;
}
