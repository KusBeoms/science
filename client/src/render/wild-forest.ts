// 시골 섬 숲(W7 RURAL): 산 비탈을 덮는 빽빽한 침엽수 + 평야의 군락 + 해안 숲 띠. 밭·도로·등산로·개울·호수·주차장·마을은 비운다.
// landscapeForest(근거리 100u 칸 / 원거리 300u 칸 LOD) 로 묶는다.
import {groundH, solidAt} from '../core/terrain.js';
import {lakeT} from '../core/lake-shape.js';
import {mountainBase} from '../core/wild-mountain.js';
import {trailNear} from '../core/wild-trail.js';
import {beachMask, segDist, smoothstep as smooth} from '../core/wild-base.js';
import {DESERT, JAIL, LAKES, COUNTRY, WILD_RECT} from '../data/wild.js';
import {WILD_POLY} from '../data/outline.js';
import {LOT, STREAMS, STREAM_W} from '../data/wild-mountain.js';
import {roadNear} from '../data/wild-road.js';
import {inParcel, SITES} from '../data/wild-fields.js';
import {ruralEntryKeepOut} from '../data/rural-entries.js';
import {PAL, mix} from './lowpoly/palette.js';
import {cone} from './lowpoly/prim.js';
import {fbm, hash2} from './lowpoly/rng.js';
import type {Inst} from './lowpoly/merge.js';
import {landscapeForest} from './landscape-batch.js';
import {pineGeo, roundTreeGeo} from './city/props.js';

const STEP = 9;
export interface Forest {
  group: any;
  pines: number;
  trees: number;
}
export function buildForest(): Forest {
  const pines: Inst[] = [], trees: Inst[] = [];
  for (let gx = WILD_RECT[0]; gx < WILD_RECT[2]; gx += STEP)
    for (let gz = WILD_RECT[1]; gz < WILD_RECT[3]; gz += STEP) {
      const x = gx + (hash2(gx, gz, 5) - 0.5) * (STEP - 1),
        z = gz + (hash2(gx, gz, 6) - 0.5) * (STEP - 1);
      if (!WILD_POLY.inside(x, z)) continue;
      const dc = WILD_POLY.dist(x, z, 14, 60),
        y = groundH(x, z);
      if (dc < 7 || !Number.isFinite(y) || y < -0.8 || y > 76) continue;
      const mb = mountainBase(x, z),
        beach = beachMask(x, z, DESERT.x0, DESERT.z0);
      // 밀도: 산 비탈 빽빽 · 낮은 평야는 군락(저주파 노이즈) · 해안 숲 띠
      let dens = mb > 10 ? 0.86 : mb > 4 ? 0.55 : 0.15 + 0.6 * smooth(0.46, 0.62, fbm(x * 0.011 + 40, z * 0.011 - 20, 3, 55));
      if (mb <= 4 && dc < 46) dens = Math.max(dens, 0.55 * (1 - smooth(14, 50, dc)));
      dens *= 1 - 0.92 * beach;
      if (hash2(gx, gz, 7) > dens) continue;
      if (ruralEntryKeepOut(x, z, 2.5) || inParcel(x, z, 3) || solidAt(x, z, 2) || roadNear(x, z).d < roadNear(x, z).hw + 3.5 || trailNear(x, z).d < 4.5) continue;
      if (LAKES.some(L => y < L.level + 1.6 && lakeT(L, x, z) < 1.2)) continue;
      if (Math.hypot(x - LOT.x, z - LOT.z) < 34 || (x > JAIL.flat[0] - 4 && x < JAIL.flat[2] + 4 && z > JAIL.flat[1] - 4 && z < JAIL.flat[3] + 4)) continue;
      if (x > COUNTRY[0] - 4 && x < COUNTRY[2] + 4 && z > COUNTRY[1] - 4 && z < COUNTRY[3] + 4) continue;
      if (SITES.some(s => Math.hypot(x - s.x, z - s.z) < s.r * 0.9 && hash2(gx, gz, 8) < 0.8)) continue;
      if (STREAMS.some(s => s.pts.some((p, i) => i < s.pts.length - 1 && segDist(x, z, p[0], p[1], s.pts[i + 1][0], s.pts[i + 1][1]) < STREAM_W + 3))) continue;
      const it: Inst = {x, y, z, ry: hash2(gx, gz, 9) * 6, s: 1.35 + hash2(gx, gz, 4) * 0.85 + (mb > 10 ? 0.2 : 0)};
      (hash2(gx, gz, 3) < (mb > 10 ? (y > 55 ? 0.65 : 0.35) : 0.3) ? pines : trees).push(it);
    }
  const group = new THREE.Group();
  group.name = 'wild-forest';
  const far = (c: number) => cone(2.3, 4.5, c, 0, 0, 0, 0, 5);
  group.add(landscapeForest(pineGeo(), far(mix(PAL.green, PAL.teal, 0.3)), pines, 'wild-pines'), landscapeForest(roundTreeGeo(), far(PAL.green), trees, 'wild-trees'));
  return {group, pines: pines.length, trees: trees.length};
}
