// 시골 섬 해안 장식(W7 RURAL): 동쪽 모래 반도의 야자·파라솔·해초 덤불, 바위 해안(절벽 띠)의 큰 바위, 바다에 서 있는 바위. 병합 Placed + 야자 인스턴스.
import {groundH} from '../core/terrain.js';
import {beachMask, cliffMask} from '../core/wild-base.js';
import {DESERT, WILD_RECT} from '../data/wild.js';
import {BRIDGE_ENDS, WILD_POLY} from '../data/outline.js';
import {roadNear} from '../data/wild-road.js';
import {PAL, mix} from './lowpoly/palette.js';
import {cone} from './lowpoly/prim.js';
import {hash2} from './lowpoly/rng.js';
import type {Inst, Placed} from './lowpoly/merge.js';
import {coastalRock} from './rural-art.js';
import {beachUmbrella, palm} from './rural-models.js';

export interface CoastBuild {
  parts: Placed[];
  palms: Inst[];
}
export function buildCoast(): CoastBuild {
  const parts: Placed[] = [], palms: Inst[] = [];
  const tuft = cone(0.9, 1.8, mix(PAL.lime, PAL.bone, 0.3), 0, 0, 0, 0, 5);
  const umb = [PAL.red, PAL.blue, PAL.amber, PAL.teal].map(c => beachUmbrella(c));
  let n = 0;
  for (let x = WILD_RECT[0]; x < WILD_RECT[2]; x += 8)
    for (let z = WILD_RECT[1]; z < WILD_RECT[3]; z += 8) {
      const px = x + hash2(x, z, 21) * 7, pz = z + hash2(x, z, 22) * 7;
      if (!WILD_POLY.inside(px, pz)) continue;
      const beach = beachMask(px, pz, DESERT.x0, DESERT.z0), dc = WILD_POLY.dist(px, pz, 14, 60), y = groundH(px, pz);
      if (!Number.isFinite(y)) continue;
      if (beach > 0.5 && dc > 8 && dc < 70 && y > 0.3) {
        const r = hash2(x, z, 23);
        if (roadNear(px, pz).d < 14) continue;
        if (r < 0.11) palms.push({x: px, y, z: pz, s: 1 + hash2(x, z, 24) * 0.5, ry: hash2(x, z, 25) * 6});
        else if (r < 0.19) parts.push({g: tuft, x: px, y, z: pz, s: 0.8 + hash2(x, z, 26), ry: x});
        else if (r < 0.205 && dc > 14 && dc < 34 && y > 0.5) parts.push({g: umb[n++ % 4], x: px, y, z: pz, ry: hash2(x, z, 27) * 6});
      }
      // 바위 해안: 절벽 띠 위·아래의 큰 바위
      const cm = cliffMask(px, pz, beach, BRIDGE_ENDS.x, BRIDGE_ENDS.wild);
      if (cm > 0.35 && dc > 2 && dc < 34 && hash2(x, z, 28) < 0.3 * cm && y > -4.2) parts.push({g: coastalRock(x + z), x: px, y: y - 0.6, z: pz, s: 1.1 + hash2(x, z, 29) * 1.9, ry: x});
      // 얕은 바다의 바위
      if (dc <= 2 && dc > -7 && y < -3.6 && y > -9 && hash2(x, z, 30) < 0.09) parts.push({g: coastalRock(x), x: px, y: -4.9, z: pz, s: 1.2 + hash2(x, z, 31) * 1.6, ry: z});
    }
  return {parts, palms};
}
export {palm};
