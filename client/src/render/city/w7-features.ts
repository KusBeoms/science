// W7 특색 시설 모델: 중앙 광장 분수·기념비 · 방사 대로 끝 광장 기둥 · 스타디움 주차장(주차 차·가로등) · 육상 트랙 투광등 · 원통형 저장 탱크 · 동쪽 공원 연못 분수 · 테니스 네트·울타리 · 축구 골대 · 아레나 광장 조명.
// 병합 메시용 solid/lit 조각(Placed)과 충돌 사각형을 만들어 돌려준다(건물처럼 칸 단위 병합은 w7.ts). 낮에 보이는 발광 재질은 없다 — 밤 전용 불은 lit 로만.
import {ACCENT, NEUTRAL, PAL, mix} from '../lowpoly/palette.js';
import {box, cone, cyl, frustum, panel, type Geo} from '../lowpoly/prim.js';
import {hash2} from '../lowpoly/rng.js';
import type {Inst, Placed} from '../lowpoly/merge.js';
import {RADIALS, W7_FEATURES as F, type Rect4} from '../../data/roads-w7.js';
import {COURTS, FIELDS} from './w7-ground.js';
import {ARENA_C} from './w7-flat.js';

export interface FeatureOut {
  solid: Placed[];
  lit: Placed[];
  blocks: Rect4[];
  lamps: Inst[];
}
const CAR_C = [PAL.red, PAL.blue, PAL.cloud, PAL.coal, PAL.amber, PAL.teal, PAL.stone, PAL.orange, PAL.violet];

export function featureParts(): FeatureOut {
  const solid: Placed[] = [],
    lit: Placed[] = [],
    blocks: Rect4[] = [],
    lamps: Inst[] = [],
    S = (g: Geo, x = 0, z = 0) => solid.push({g, x, z}),
    L = (g: Geo, x = 0, z = 0) => lit.push({g, x, z});

  // ── 중앙 원형 광장 남쪽 분수·기념비 (오러리와 마주 보는 자리). 낮은 수반 + 3단 받침 + 오벨리스크 + 금빛 끝
  {
    const x = 0, z = 35.5;
    S(cyl(4.6, 0.7, NEUTRAL.stone, 0, 0, 0, 0, 12), x, z);
    S(cyl(4.0, 0.5, mix(PAL.cyan, PAL.blue, 0.3), 0, 0.7, 0, 0, 12), x, z);
    S(box(3.2, 0.7, 3.2, NEUTRAL.bone, 0, 0.7), x, z);
    S(box(2.4, 0.7, 2.4, NEUTRAL.ash, 0, 1.4), x, z);
    S(frustum(4, 1.1, 0.5, 11, NEUTRAL.cloud, 0, 2.1, 0, Math.PI / 4), x, z);
    S(cone(0.55, 1.4, ACCENT.amber, 0, 13.1, 0, 0, 4), x, z);
    L(box(0.5, 0.5, 0.5, ACCENT.yellow, 0, 14.0), x, z);
    for (let k = 0; k < 4; k++) S(cyl(0.18, 2.2, mix(PAL.cyan, PAL.white, 0.5), Math.cos(k * 1.571 + 0.78) * 2.4, 0.7, Math.sin(k * 1.571 + 0.78) * 2.4, 0, 5), x, z); // 분수 물줄기
    blocks.push([x - 3.4, z - 3.4, x + 3.4, z + 3.4]);
  }
  // ── 방사 대로 끝 광장: 낮은 화단 + 가운데 기둥
  for (const r of RADIALS) {
    S(cyl(1.9, 0.5, mix(PAL.green, PAL.stone, 0.4), 0, 0, 0, 0, 8), r.x1, r.z1);
    S(cyl(0.45, 3.6, NEUTRAL.cloud, 0, 0.5, 0, 0, 6), r.x1, r.z1);
    S(cone(0.8, 1, PAL.red, 0, 4.1, 0, 0, 6), r.x1, r.z1);
    blocks.push([r.x1 - 0.7, r.z1 - 0.7, r.x1 + 0.7, r.z1 + 0.7]);
  }
  // ── 스타디움 주차장: 주차 차 + 투광 가로등 6
  {
    const [x0, z0] = F.parking;
    for (const rowZ of [7.5, 28.5, 42.5]) for (let k = 0; k < 17; k++) {
      if (hash2(k, rowZ, 21) > 0.58) continue;
      const x = x0 + 1.5 + 1.5 + k * 3 + 0.0, z = z0 + rowZ + (hash2(k, rowZ, 22) - 0.5) * 1.6,
        c = CAR_C[Math.floor(hash2(k, rowZ, 23) * CAR_C.length)];
      S(box(1.8, 0.75, 3.7, c, 0, 0.12), x, z);
      S(box(1.5, 0.6, 1.8, PAL.glass, 0, 0.87, -0.1), x, z);
      blocks.push([x - 0.95, z - 1.9, x + 0.95, z + 1.9]);
    }
    for (const [lx, lz] of [[x0 + 2, z0 + 18], [x0 + 27, z0 + 18], [x0 + 52, z0 + 18], [x0 + 2, z0 + 54], [x0 + 27, z0 + 54], [x0 + 52, z0 + 54]]) lamps.push({x: lx, y: 0, z: lz, ry: 0});
  }
  // ── 육상 트랙: 투광등 4 + 안쪽 잔디 가운데 작은 스탠드(심판석)
  {
    const cx = (F.track[0] + F.track[2]) / 2, cz = (F.track[1] + F.track[3]) / 2;
    for (const [dx, dz] of [[-21, -29], [21, -29], [-21, 29], [21, 29]]) {
      const x = cx + dx * 1.02, z = cz + dz * 1.02 > F.track[3] - 1.2 ? F.track[3] - 1.4 : cz + dz * 1.02;
      S(box(0.5, 15, 0.5, NEUTRAL.steel), x, z);
      S(box(2.6, 1.0, 0.8, NEUTRAL.coal, 0, 15), x, z);
      L(box(2.3, 0.4, 0.5, ACCENT.yellow, 0, 15.2, 0.35), x, z);
      blocks.push([x - 0.3, z - 0.3, x + 0.3, z + 0.3]);
    }
    S(box(8, 0.5, 2.4, PAL.cloud, 0, 0.6), cx, cz - 3);
    S(box(8, 0.5, 2.4, PAL.red, 0, 1.4, -0.6), cx, cz - 3);
    S(box(8, 0.3, 3.4, PAL.blue, 0, 3.4, -0.6), cx, cz - 3);
    for (const s of [-1, 1]) S(box(0.3, 3.4, 0.3, NEUTRAL.steel, s * 3.8, 0, 0.5), cx, cz - 3);
    blocks.push([cx - 4, cz - 4.3, cx + 4, cz - 1.7]);
  }
  // ── 원통형 저장 탱크 3 + 배관 + 사다리
  {
    const tanks: [number, number, number][] = [[298, -108, 6.8], [318, -108, 6.8], [308, -92, 6.2]];
    for (const [x, z, r] of tanks) {
      S(cyl(r, 9.6, mix(PAL.cloud, PAL.stone, 0.18), 0, 0, 0, 0, 12), x, z);
      S(cyl(r + 0.12, 0.7, PAL.red, 0, 2.6, 0, 0, 12), x, z);
      S(cyl(r + 0.12, 0.7, PAL.red, 0, 7, 0, 0, 12), x, z);
      S(cone(r + 0.2, 1.8, mix(NEUTRAL.ash, PAL.cloud, 0.4), 0, 9.6, 0, 0, 12), x, z);
      S(box(0.5, 10, 0.4, NEUTRAL.steel, r + 0.2, 0, 0), x, z);
      L(box(0.6, 0.6, 0.6, ACCENT.red, 0, 11.5), x, z);
      blocks.push([x - r * 0.86, z - r * 0.86, x + r * 0.86, z + r * 0.86]);
    }
    S(box(20, 0.5, 0.5, NEUTRAL.steel, 0, 1.0), 308, -108);
    S(box(0.5, 0.5, 16, NEUTRAL.steel, 0, 1.0), 308, -100);
    S(box(40, 0.3, 1.2, NEUTRAL.stone, 0, 0.05), 309, -118); // 배관 받침대
  }
  // ── 동쪽 공원: 연못 가운데 작은 분수 + 연못 둘레 낮은 돌 테두리(충돌)
  {
    const cx = (F.eastPark[0] + F.eastPark[2]) / 2, cz = (F.eastPark[1] + F.eastPark[3]) / 2 - 1;
    S(cyl(1.4, 0.6, NEUTRAL.stone, 0, 0, 0, 0, 8), cx, cz);
    S(cone(0.5, 2.6, mix(PAL.cyan, PAL.white, 0.5), 0, 0.6, 0, 0, 6), cx, cz);
    blocks.push([cx - 9.6, cz - 6.2, cx + 9.6, cz + 6.2]);
  }
  // ── 테니스 6면: 네트(x 가운데, z 방향) + 기둥 + 울타리(낮은 판) — 출입은 가운데 통로
  for (const c of COURTS) {
    const mx = (c[0] + c[2]) / 2, mz = (c[1] + c[3]) / 2;
    S(box(0.1, 1.0, 9.8, PAL.cloud, 0, 0.2), mx, mz);
    for (const s of [-1, 1]) S(box(0.2, 1.2, 0.2, NEUTRAL.steel, 0, 0, s * 4.9), mx, mz);
    for (const s of [-1, 1]) S(box(21, 1.6, 0.12, mix(PAL.green, PAL.coal, 0.5), 0, 0, s * 6.2), mx, mz);
  }
  // ── 축구장 2면: 골대 (가로 40u 의 양 끝, z 가운데)
  for (const f of FIELDS) {
    const mz = (f[1] + f[3]) / 2;
    for (const s of [0, 1]) {
      const x = s ? f[2] - 0.6 : f[0] + 0.6;
      S(box(0.2, 2.2, 0.2, PAL.white, 0, 0, -3), x, mz);
      S(box(0.2, 2.2, 0.2, PAL.white, 0, 0, 3), x, mz);
      S(box(0.2, 0.2, 6.2, PAL.white, 0, 2.1), x, mz);
      S(panel(6, 2.1, mix(PAL.cloud, PAL.stone, 0.4), s ? 1.4 : -1.4, 1.05, 0, Math.PI / 2), x, mz);
    }
  }
  // ── 아레나 광장: 둘레 가로등 8
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.39;
    lamps.push({x: ARENA_C.x + Math.cos(a) * 20.2, y: 0, z: ARENA_C.z + Math.sin(a) * 20.2, ry: -a + Math.PI});
  }
  return {solid, lit, blocks, lamps};
}
