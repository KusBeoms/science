// 시골 섬 지형 색(W7 RURAL): 면 중심 (cx,cz) · 평균 높이 y · 경사 slope 로 색을 정한다. render/terrain.ts 의 wildColor 가 이 함수를 부른다.
// 호수 바닥·물가 모래, 도로, 등산로, 밭 단 바닥, 산(숲 바닥 → 바위 → 정상 돌), 해안 모래 반도와 바위 띠, 초지.
import {SEA_Y} from '../data/world-map.js';
import {DESERT, LAKES} from '../data/wild.js';
import {WILD_POLY, BRIDGE_ENDS} from '../data/outline.js';
import {roadNear} from '../data/wild-road.js';
import {parcelNear} from '../data/wild-fields.js';
import {mountainBase} from '../core/wild-mountain.js';
import {trailNear, TRAIL_HW} from '../core/wild-trail.js';
import {beachMask, cliffMask, smoothstep as smooth} from '../core/wild-base.js';
import {lakeT} from '../core/lake-shape.js';
import {PAL, mix} from './lowpoly/palette.js';
import {hash2} from './lowpoly/rng.js';

const SANDY = mix(PAL.bone, PAL.amber, 0.3),
  DUNE = mix(SANDY, PAL.orange, 0.2),
  WET_SAND = mix(SANDY, PAL.clay, 0.35),
  MEADOW = mix(mix(PAL.green, PAL.lime, 0.3), PAL.ink, 0.16),
  MEADOW2 = mix(PAL.green, PAL.ink, 0.12),
  FOREST = mix(PAL.green, PAL.ink, 0.45),
  FOREST_HI = mix(PAL.green, PAL.teal, 0.25),
  ROCK = mix(PAL.stone, PAL.clay, 0.2),
  SUMMIT = mix(PAL.ash, PAL.bone, 0.4),
  FARMBASE = mix(mix(PAL.green, PAL.lime, 0.3), PAL.clay, 0.32),
  MUD = mix(PAL.clay, PAL.slate, 0.45),
  DEEP_BED = mix(PAL.slate, PAL.teal, 0.35),
  PEBBLE = mix(SANDY, PAL.stone, 0.35),
  VERGE = mix(PAL.clay, PAL.stone, 0.5),
  TRAIL = mix(PAL.bone, PAL.clay, 0.3);

/** 호수 바닥·물가 색(호수 근처가 아니면 null): 깊을수록 모래 → 진흙 → 어두운 청회색, 수면 위 0.9u 는 젖은 자갈, 그 위 2u 는 풀과 섞인 모래 */
function lakeColor(cx: number, cz: number, y: number): {c: number; w: number} | null {
  for (const L of LAKES) {
    if (Math.abs(cx - L.x) > L.rx * 1.5 || Math.abs(cz - L.z) > L.rx * 1.5) continue;
    if (lakeT(L, cx, cz) > 1.4) continue;
    const dep = L.level - y;
    if (dep > 0.3) return {c: mix(mix(SANDY, MUD, smooth(0.3, 4, dep)), DEEP_BED, smooth(4, 13, dep)), w: 1};
    if (dep > -0.9) return {c: PEBBLE, w: 1};
    if (dep > -2.6) return {c: SANDY, w: 0.7 * (1 - (-dep - 0.9) / 1.7)};
  }
  return null;
}

export function wildTint(cx: number, cz: number, y: number, slope: number): number {
  const lk = lakeColor(cx, cz, y);
  if (lk && lk.w >= 1) return lk.c;
  if (!lk && y < SEA_Y - 1.5) return mix(PAL.slate, PAL.teal, 0.4);
  const rd = roadNear(cx, cz);
  if (rd.d < rd.hw + 1.6) return mix(mix(PAL.asphalt, PAL.stone, 0.45), VERGE, smooth(rd.hw - 1, rd.hw + 1.6, rd.d));
  const tr = trailNear(cx, cz);
  if (tr.d < TRAIL_HW + 1.2) return mix(TRAIL, MEADOW2, smooth(TRAIL_HW - 0.5, TRAIL_HW + 1.2, tr.d));
  // 해안: 해변 모래 반도(동쪽·남동쪽) / 바위 띠
  const beach = beachMask(cx, cz, DESERT.x0, DESERT.z0),
    dc = WILD_POLY.dist(cx, cz, 14, 70),
    cliff = dc > 0 && dc < 44 ? cliffMask(cx, cz, beach, BRIDGE_ENDS.x, BRIDGE_ENDS.wild) : 0;
  const n = hash2(Math.floor(cx / 5), Math.floor(cz / 5), 3);
  if (!lk && y < SEA_Y + 1.1) return mix(SANDY, WET_SAND, 0.4 + 0.3 * n);
  let c = MEADOW;
  if (hash2(Math.floor(cx / 7), Math.floor(cz / 7), 9) < 0.3) c = mix(c, MEADOW2, 0.7);
  const pn = parcelNear(cx, cz);
  if (pn && pn.w > 0.2) c = mix(c, FARMBASE, pn.w);
  // 모래 반도: 바닷가에서 안쪽으로 번지는 모래(반도 가지는 통째로)
  const sandW = beach * (1 - smooth(44, 72, dc + (n - 0.5) * 26));
  if (sandW > 0) c = mix(c, n < 0.5 ? SANDY : DUNE, Math.min(1, sandW * 1.4));
  // 산: 숲 바닥 → 높을수록 바위 → 정상 돌
  const mb = mountainBase(cx, cz);
  if (mb > 4) {
    let m = mix(FOREST, FOREST_HI, n * 0.5);
    m = mix(m, ROCK, smooth(50, 76, y) * 0.5);
    m = mix(m, SUMMIT, smooth(80, 88, y) * 0.25);
    c = mix(c, m, smooth(4, 14, mb));
  }
  if (lk) c = mix(c, lk.c, lk.w);
  c = mix(c, PAL.stone, smooth(0.65, 1.1, slope) * 0.55);
  if (cliff > 0.1) c = mix(c, mix(PAL.stone, PAL.slate, n * 0.4), Math.min(1, cliff) * (0.5 + 0.5 * smooth(0.12, 0.45, slope)) * smooth(2, 12, dc) * (1 - smooth(26, 40, dc)));
  return c;
}
