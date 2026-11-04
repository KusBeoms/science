// 랜드마크 지오메트리 2차 (WORLD 3.2): L4 관제탑 · L5 대형 격납고 · L6 천문대 돔 · L7 성. 로컬 원점은 중심의 바닥(성은 언덕 위 y 는 index.ts 가 올린다)
import {ACCENT, CITY, NEUTRAL, PAL, mix} from '../lowpoly/palette.js';
import {box, cone, cyl, frustum, ico, panel, prism, taper, type Geo} from '../lowpoly/prim.js';
import {mergePlaced, type Placed} from '../lowpoly/merge.js';
import type {Landmark} from './landmarks.js';

const parts = (list: Geo[]): Placed[] => list.map(g => ({g}));
const GLASS = mix(PAL.glass, PAL.slate, 0.35),
  GLASS_LIT = mix(ACCENT.amber, PAL.white, 0.45);

/** 관제탑(36u): 콘크리트 기둥 → 유리 관제실 → 안테나. 유리 띠는 밤에 켜진다 */
export function controlTower(): Landmark {
  const solid = parts([
    box(9, 1.2, 9, NEUTRAL.stone),
    taper(6, 6, 4, 4, 24, NEUTRAL.cloud, 0, 1.2),
    frustum(8, 3.4, 5.6, 2.4, NEUTRAL.steel, 0, 25.2),
    cyl(5.6, 4.2, GLASS, 0, 27.6, 0, 0, 8),
    frustum(8, 6.2, 0.6, 1.8, NEUTRAL.coal, 0, 31.8),
    cyl(0.18, 2.6, NEUTRAL.steel, 0, 33.6, 0, 0, 5),
    cone(0.5, 0.7, ACCENT.red, 0, 36, 0, 0, 5),
    box(0.9, 0.9, 0.9, ACCENT.red, 5.0, 25, 0),
  ]);
  const lit = parts([cyl(5.7, 3.6, GLASS_LIT, 0, 27.9, 0, 0, 8), box(0.5, 0.5, 0.5, ACCENT.red, 0, 36.4, 0)]);
  return {solid: mergePlaced(solid), lit: mergePlaced(lit)};
}

/** 대형 격납고(26u, 44×32): 판금 벽 + 완만한 지붕 + 서쪽(−x) 정면의 큰 문. 문 위 호박색 경고등이 밤에 켜진다 */
export function hangar(): Landmark {
  const wall = mix(NEUTRAL.steel, NEUTRAL.ash, 0.35),
    solid = parts([
      box(44, 17, 32, wall),
      box(44.8, 0.8, 32.8, NEUTRAL.stone),
      taper(44.6, 32.6, 40, 18, 9, NEUTRAL.slate, 0, 17),
      box(0.5, 13, 20, NEUTRAL.coal, -22.1, 0, 0),
      box(0.7, 0.9, 20.8, ACCENT.amber, -22.2, 13, 0),
      box(0.7, 13, 0.9, ACCENT.amber, -22.2, 0, -10.4),
      box(0.7, 13, 0.9, ACCENT.amber, -22.2, 0, 10.4),
      box(4, 3, 4, NEUTRAL.stone, 12, 26, 6),
      cyl(0.3, 4, NEUTRAL.steel, 12, 29, 6, 0, 5),
    ]);
  const lit = parts([box(0.5, 0.6, 18, GLASS_LIT, -22.4, 14.2, 0)]);
  return {solid: mergePlaced(solid), lit: mergePlaced(lit)};
}

/** 천문대 돔(22u): 8각 기단 위에 흰 반구, 앞(−z)쪽으로 관측 슬릿. 슬릿은 밤에 푸르게 켜진다 */
export function observatory(): Landmark {
  const solid = parts([
    prism(12, 15, 1.2, NEUTRAL.stone),
    prism(12, 14, 4.2, mix(NEUTRAL.cloud, NEUTRAL.bone, 0.4), 0, 1.2),
    ico(14, 2, mix(PAL.white, PAL.cloud, 0.5), 0, 5.4, 0, 0, 0.9),
    box(3.2, 11, 0.8, NEUTRAL.ink, 0, 6, -12.2),
    box(5.4, 0.6, 3.4, NEUTRAL.steel, 0, 5.4, -13.5),
    cyl(0.2, 3.6, NEUTRAL.steel, 0, 18.8, 0, 0, 5),
  ]);
  const lit = parts([box(2.2, 10.4, 0.5, mix(ACCENT.cyan, PAL.white, 0.3), 0, 6.3, -12.5)]);
  return {solid: mergePlaced(solid), lit: mergePlaced(lit)};
}

/** 성(30u, 28×28): 둘레 성벽 + 모서리 원통 탑 4 + 중앙 천수각. 정문은 남쪽(+z)이라 도시 광장을 본다. 창은 밤에 켜진다 */
export function castle(): Landmark {
  const stone = mix(NEUTRAL.ash, NEUTRAL.bone, 0.4),
    solid: Placed[] = parts([
      box(26, 9, 26, stone, 0, 0, 0),
      box(26.6, 1, 26.6, NEUTRAL.stone, 0, 9, 0),
      box(11, 18, 11, mix(stone, PAL.white, 0.15), 0, 9, 0),
      box(12, 1, 12, NEUTRAL.stone, 0, 27, 0),
      taper(11, 11, 0, 0, 5, CITY.tileBlue, 0, 28),
      cone(0.3, 1.8, ACCENT.red, 0, 33, 0, 0, 5),
      box(5.2, 7.2, 1.2, NEUTRAL.coal, 0, 0, 13.2),
      box(6.4, 0.8, 1.6, NEUTRAL.stone, 0, 7.2, 13.2),
    ]),
    lit: Placed[] = [];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x = sx * 13,
        z = sz * 13;
      solid.push(
        {g: cyl(3.2, 20, stone, 0, 0, 0, 0, 8), x, z},
        {g: cyl(3.7, 1.2, NEUTRAL.stone, 0, 0, 0, 0, 8), x, y: 20, z},
        {g: cone(3.9, 5.6, CITY.tileRed, 0, 0, 0, 0, 8), x, y: 21.2, z}
      );
      lit.push({g: box(0.9, 2.2, 0.5, GLASS_LIT, 0, 0, 0), x, y: 12, z: z + sz * 3.1});
    }
  lit.push({g: box(1.4, 3, 0.5, GLASS_LIT, 0, 0, 0), x: 0, y: 17, z: 5.7}, {g: box(1.4, 3, 0.5, GLASS_LIT, 0, 0, 0), x: 0, y: 17, z: -5.7});
  return {solid: mergePlaced(solid), lit: mergePlaced(lit)};
}
