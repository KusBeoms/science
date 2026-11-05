// Detail selection shares the W7 biome/road/lake/parcel data, independently of lighting colors.
import {GX0, GZ0, NX, NZ, STEP, REG_CITY, REG_WILD, gridOf, terrainNormal} from '../core/heightmap.js';
import {CITY_HALF, SEA_Y} from '../data/world-map.js';
import {beachW} from '../core/belt-height.js';
import {mroadNear, MROAD_W} from '../data/mountain-road.js';
import {roadNear} from '../data/wild-road.js';
import {LAKES, DESERT} from '../data/wild.js';
import {parcelNear} from '../data/wild-fields.js';
import {lakeT} from '../core/lake-shape.js';
import {beachMask, smoothstep as smooth} from '../core/wild-base.js';
import {fbm} from './lowpoly/rng.js';
type Detail = [number, number, number];
// A common natural repeat period prevents UV phase warping when indexed biome tags interpolate.
const PERIOD = 6, NONE: Detail = [0, PERIOD, 0];
let cached: Float32Array | null = null;
const MASK_WIDTH = Math.ceil(NX / 2), MASK_HEIGHT = Math.ceil(NZ / 2);
export const TERRAIN_DETAIL_MASK_BYTES = MASK_WIDTH * MASK_HEIGHT * 4;
let mask: any = null;
function choose(reg: number, x: number, z: number, y: number): Detail {
  if (y < SEA_Y + 0.12 || (reg !== REG_CITY && reg !== REG_WILD)) return NONE;
  if (reg === REG_CITY && Math.max(Math.abs(x), Math.abs(z)) <= CITY_HALF) return NONE;
  const ny = terrainNormal(x, z)[1], slope = Math.sqrt(Math.max(0, 1 - ny * ny));
  if (reg === REG_CITY) {
    const road = mroadNear(x, z).d;
    if (road < MROAD_W / 2) return [9, PERIOD, 0.55];
    if (road < MROAD_W / 2 + 2.8) return [6, PERIOD, 0.55];
    if (beachW(x, z) > 0.5 || y < SEA_Y + 1.5) return [5, PERIOD, 0.55];
    // Same irregular snow/rock thresholds as belt-color.ts; snow itself stays smooth.
    const noise = fbm(x * 0.03 + 11, z * 0.03 - 5, 3, 27),
      snowLine = 58 + 60 * (noise - 0.5), rockLine = 26 + 32 * (noise - 0.5),
      snow = smooth(snowLine, snowLine + 12, y),
      rock = Math.max(smooth(rockLine, rockLine + 22, y), smooth(0.5, 0.82, slope));
    const strength = 0.6 * (1 - snow);
    if (strength < 0.01) return NONE;
    if (rock > 0.4) return [7, PERIOD, strength];
    return [Math.max(Math.abs(x), Math.abs(z)) < CITY_HALF + 85 ? 2 : y > 12 ? 1 : 0, PERIOD, strength];
  }
  for (const lake of LAKES) {
    if (Math.abs(x - lake.x) > lake.rx * 1.6 || Math.abs(z - lake.z) > Math.max(lake.rx, lake.rz) * 1.6) continue;
    if (lakeT(lake, x, z) > 1.4) continue;
    if (y < lake.level + 0.12) return NONE;
    if (y < lake.level + 1.2) return [6, PERIOD, 0.6];
    if (y < lake.level + 2.6) return [5, PERIOD, 0.55];
  }
  const road = roadNear(x, z);
  if (road.d < road.hw + 0.2) return [9, PERIOD, 0.55];
  if (road.d < road.hw + 2.8) return [6, PERIOD, 0.55];
  if (y < SEA_Y + 1.4 || beachMask(x, z, DESERT.x0, DESERT.z0) > 0.5 && y < 16) return [5, PERIOD, 0.55];
  if (slope > 0.7 || y > 65) return [7, PERIOD, 0.6];
  if ((parcelNear(x, z)?.w || 0) > 0.2) return [4, PERIOD, 0.55];
  return [y > 14 ? 1 : 3, PERIOD, 0.6];
}
function at(i: number, j: number): Detail {
  if (!cached) cached = new Float32Array(NX * NZ * 3).fill(NaN);
  const index = j * NX + i, o = index * 3;
  if (Number.isNaN(cached[o])) {
    const {h, reg} = gridOf(), value = choose(reg[index], GX0 + i * STEP, GZ0 + j * STEP, h[index]);
    cached.set(value, o);
  }
  return [cached[o], cached[o + 1], cached[o + 2]];
}
/** Discrete 5u style IDs: four neighboring grid samples occupy one RGBA texel. ID255 disables detail.
 * NPOT/nearest/no-mip is valid in WebGL1 and cannot interpolate unrelated material IDs. */
export function terrainDetailMask() {
  if (!mask) {
    const data = new Uint8Array(TERRAIN_DETAIL_MASK_BYTES).fill(255);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const style = at(i, j), index = ((j >> 1) * MASK_WIDTH + (i >> 1)) * 4 + (i & 1) + 2 * (j & 1);
      data[index] = style[2] > 0 ? Math.round(style[0]) : 255;
    }
    mask = new THREE.DataTexture(data, MASK_WIDTH, MASK_HEIGHT, THREE.RGBAFormat, THREE.UnsignedByteType);
    mask.name = 'terrain-detail-ids';
    mask.encoding = THREE.LinearEncoding;
    mask.wrapS = mask.wrapT = THREE.ClampToEdgeWrapping;
    mask.magFilter = mask.minFilter = THREE.NearestFilter;
    mask.generateMipmaps = false; mask.flipY = false; mask.unpackAlignment = 1;
    mask.userData = {...mask.userData, keep: true}; mask.needsUpdate = true;
  }
  return {texture: mask, width: MASK_WIDTH, height: MASK_HEIGHT, bytes: TERRAIN_DETAIL_MASK_BYTES,
    x0: GX0, z0: GZ0, step: STEP, columns: NX, rows: NZ};
}
/** All terrain vertices use sentinel16; only contrast interpolates across the biome/LOD boundary. */
export function terrainDetail(x: number, z: number): Detail {
  const u = Math.max(0, Math.min(NX - 1.000001, (x - GX0) / STEP)),
    v = Math.max(0, Math.min(NZ - 1.000001, (z - GZ0) / STEP)),
    i = Math.floor(u), j = Math.floor(v), fx = u - i, fz = v - j,
    a = at(i, j)[2];
  if (fx < 1e-7 && fz < 1e-7) return [16, PERIOD, a];
  const strength = (a * (1 - fx) + at(i + 1, j)[2] * fx) * (1 - fz)
    + (at(i, j + 1)[2] * (1 - fx) + at(i + 1, j + 1)[2] * fx) * fz;
  return [16, PERIOD, strength];
}
