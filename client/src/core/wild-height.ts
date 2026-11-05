// 남부 야생지 높이: 평야 + 시골 구릉 + 사막 사구 + 등산 가능한 산 + 산줄기 + 호수 분지 + 호숫가 길 + 교도소 평지.
// core/heightmap.ts 가 부팅 때 격자에 굽는다. 호수 모양(lakeT)은 core/water.ts 의 inside 판정도 같이 쓴다.
import {fbm} from '../render/lowpoly/rng.js';
import {DESERT, JAIL, LAKE_ROAD_W, LAKES, MOUNTAIN, RANGES} from '../data/wild.js';
import {BRIDGE_ENDS, WILD_DZ} from '../data/outline.js';
import {roadNear} from '../data/wild-road.js';
import {lakeT} from './lake-shape.js';
export {lakeT};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const LK = LAKES.map(L => ({L}));

/** 선분 a→b 까지의 거리 */
function segDist(x: number, z: number, a: readonly [number, number], b: readonly [number, number]): number {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}

export function wildH(x: number, z: number): number {
  const n = (fbm(x * 0.02 + 11, z * 0.02 - 7, 4, 321) - 0.5) * 2;
  let h = n * 1.3;
  const M = MOUNTAIN,
    t = Math.hypot(x - M.x, z - M.z) / M.r;
  if (t < 1) {
    const prof = 1 - smooth(0, 1, t);
    h += M.h * prof + 3 * prof * (fbm(x * 0.035, z * 0.035, 3, 77) - 0.5) * 2;
  }
  if (z > 1100 + WILD_DZ)
    for (const R of RANGES) {
      const d = segDist(x, z, R.a, R.b) / R.hw;
      if (d < 1) h += R.h * Math.pow(1 - smooth(0, 1, d), 1.15) * (0.8 + 0.5 * fbm(x * 0.03 + 5, z * 0.03 - 9, 3, 131)) + 2.5 * (1 - d) * (fbm(x * 0.07, z * 0.07, 2, 61) - 0.5);
    }
  const dw = smooth(DESERT.x0 - 30, DESERT.x0 + 30, x) * smooth(DESERT.z0 - 30, DESERT.z0 + 30, z);
  h += dw * (4 * Math.sin(x * 0.05 + z * 0.03) + 2.5 * Math.sin(z * 0.07 - x * 0.02) + 2);
  const j = JAIL.flat,
    jd = Math.max(j[0] - x, x - j[2], j[1] - z, z - j[3], 0);
  h *= smooth(0, 22, jd); // 교도소 둘레는 평지
  h *= smooth(0, 55, Math.hypot(x - BRIDGE_ENDS.x, z - BRIDGE_ENDS.wild - 8)); // 다리 끝(북안 곶)도 평지
  // 호수: 바닥 모양(가장자리 1 에서 수면, 안쪽으로 완만하게 깊어짐)을 지면에 섞는다
  for (const k of LK) {
    const L = k.L;
    if (Math.abs(x - L.x) > L.rx * 2 || Math.abs(z - L.z) > L.rx * 2) continue;
    const lt = lakeT(L, x, z);
    if (lt >= 1.7) continue;
    const bed = L.level - L.depth * Math.pow(Math.max(0, 1 - lt * lt), 0.85),
      w = 1 - smooth(0.88, 1.7, lt);
    h += (bed - h) * w;
  }
  // 호숫가 길: 길 폭 안은 완전 평지, 바깥 24u 동안 완만히 원래 지형으로
  const r = roadNear(x, z);
  if (r.d < LAKE_ROAD_W / 2 + 28) h += (r.y - h) * (1 - smooth(LAKE_ROAD_W / 2 + 2, LAKE_ROAD_W / 2 + 28, r.d));
  return h;
}
