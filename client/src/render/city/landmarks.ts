// 랜드마크 지오메트리 (WORLD 3.2): L1 시계탑(48u) · L2 오러리 분수 · L3 암시장 입구 아치. 로컬 원점은 중심의 지면
import {ACCENT, CITY, NEUTRAL, PAL, mix} from '../lowpoly/palette.js';
import {box, cone, cyl, frustum, ico, panel, prism, taper, type Geo} from '../lowpoly/prim.js';
import {mergePlaced, type Placed} from '../lowpoly/merge.js';

export interface Landmark {
  solid: Geo;
  lit: Geo;
}
const parts = (list: Geo[]): Placed[] => list.map(g => ({g}));

/** 시계탑: 석조 기단 → 탑신 → 시계방 → 청색 피라미드 지붕. 시계판 4면은 밤에 켜진다 */
export function clockTower(): Landmark {
  const stone = mix(PAL.bone, PAL.stone, 0.3),
    solid: Placed[] = parts([
      box(11, 1.2, 11, NEUTRAL.stone),
      taper(10, 10, 8, 8, 12, stone, 0, 1.2),
      box(8.8, 0.8, 8.8, NEUTRAL.stone, 0, 13.2),
      box(7.2, 20, 7.2, mix(stone, PAL.white, 0.15), 0, 14),
      box(8.4, 0.7, 8.4, NEUTRAL.stone, 0, 34),
      box(9.2, 8.6, 9.2, mix(stone, PAL.bone, 0.4), 0, 34.7),
      box(10.2, 0.8, 10.2, NEUTRAL.stone, 0, 43.3),
      taper(9.4, 9.4, 0, 0, 3.2, CITY.tileBlue, 0, 44.1),
      cone(0.35, 1.6, ACCENT.amber, 0, 46.4, 0, 0, 6),
    ]),
    lit: Placed[] = [];
  for (const [k, ry] of [0, Math.PI / 2, Math.PI, -Math.PI / 2].entries()) {
    // 시계판: 흰 판 + 시침·분침 (떠 있는 얇은 판이라 면에서 0.1 띄운다)
    const hand = k % 2 ? 0.6 : 2.4;
    solid.push(
      {g: panel(6.6, 6.6, PAL.cloud, 0, 39, 4.72), ry},
      {g: box(0.45, 2.6, 0.2, NEUTRAL.ink, 0, 39, 4.72), ry},
      {g: box(hand, 0.45, 0.2, NEUTRAL.ink, hand / 2, 39, 4.72), ry}
    );
    lit.push({g: panel(6.2, 6.2, mix(ACCENT.amber, PAL.white, 0.45), 0, 39, 4.85), ry});
  }
  // 모서리 첨탑
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) solid.push({g: cone(0.55, 2.2, CITY.tileBlue, 0, 0, 0, 0, 5), x: sx * 4.9, y: 43.3, z: sz * 4.9});
  return {solid: mergePlaced(solid), lit: mergePlaced(lit)};
}

/** 오러리 분수: 고정부(받침·물·기둥·태양)와 도는 부분(행성 셋 + 가는 팔) */
export function orrery(): {still: Geo; spin: Geo} {
  const still = mergePlaced(parts([
    prism(14, 5.6, 0.5, NEUTRAL.ash),
    prism(14, 5.0, 0.9, NEUTRAL.stone),
    prism(14, 4.5, 0.95, mix(ACCENT.cyan, PAL.white, 0.15)),
    cyl(0.35, 3.4, NEUTRAL.steel, 0, 0.9),
    frustum(8, 0.9, 0.5, 0.6, NEUTRAL.coal, 0, 4.2),
    ico(0.95, 1, ACCENT.amber, 0, 5.1),
  ]));
  const planet = (r: number, d: number, a: number, c: number): Placed[] => [
    {g: box(d, 0.1, 0.1, NEUTRAL.steel, d / 2, 5.1, 0), ry: -a},
    {g: ico(r, 1, c, d, 5.1), ry: -a},
  ];
  const spin = mergePlaced([...planet(0.45, 2.3, 0, ACCENT.blue), ...planet(0.6, 3.3, 2.2, ACCENT.orange), ...planet(0.35, 4.1, 4.3, ACCENT.pink)]);
  return {still, spin};
}

/** 암시장 입구 아치(L3): 검정·금빛 기둥 둘 + 가로보 + 꼭대기 보석. z 로 12u 벌어져 골목(x 방향)을 건너 선다. 네온띠는 밤에 켜진다 */
export function marketArch(): Landmark {
  const gold = ACCENT.amber,
    solid = parts([
      box(2.2, 9.2, 2.2, NEUTRAL.coal, 0, 0, -6.8),
      box(2.2, 9.2, 2.2, NEUTRAL.coal, 0, 0, 6.8),
      box(2.8, 0.7, 2.8, gold, 0, 0, -6.8),
      box(2.8, 0.7, 2.8, gold, 0, 0, 6.8),
      box(2.8, 0.5, 2.8, gold, 0, 9.2, -6.8),
      box(2.8, 0.5, 2.8, gold, 0, 9.2, 6.8),
      box(2.2, 1.6, 12.6, NEUTRAL.coal, 0, 8.0, 0),
      box(3.0, 0.5, 16.2, gold, 0, 9.6, 0),
      frustum(6, 0, 1.0, 1.0, ACCENT.cyan, 0, 10.1),
      cone(1.0, 0.9, mix(ACCENT.cyan, PAL.white, 0.35), 0, 11.1, 0, 0, 6),
      // 낮에는 어두운 네온띠(밤엔 lit 이 감싼다)
      box(0.3, 0.3, 12.0, mix(ACCENT.magenta, NEUTRAL.ink, 0.45), 1.2, 8.5, 0),
      box(0.3, 0.3, 12.0, mix(ACCENT.magenta, NEUTRAL.ink, 0.45), -1.2, 8.5, 0),
    ]),
    lit = parts([
      box(0.4, 0.4, 12.1, ACCENT.magenta, 1.2, 8.45, 0),
      box(0.4, 0.4, 12.1, ACCENT.magenta, -1.2, 8.45, 0),
      box(0.25, 8.6, 0.25, ACCENT.cyan, 0, 0.6, -5.55),
      box(0.25, 8.6, 0.25, ACCENT.cyan, 0, 0.6, 5.55),
    ]);
  return {solid: mergePlaced(solid), lit: mergePlaced(lit)};
}
