// 시골 섬 건물·소품 모델(W7 RURAL). 원점은 발밑 중앙, 정면(문)은 로컬 +z. 전부 병합 지오메트리 — 한 번 만들어 공유한다.
import {PAL, NEUTRAL, ACCENT, mix} from './lowpoly/palette.js';
import {box, cone, cyl, gable, ico, type Geo} from './lowpoly/prim.js';
import {mergeGeometries, mergePlaced, type Placed} from './lowpoly/merge.js';
import {markSurface} from './surface-detail.js';

const parts = (l: Geo[]): Placed[] => l.map(g => ({g}));
const m = (l: Geo[]): Geo => mergePlaced(parts(l));

/** 단독주택 9×7: 지붕 색 = roof, 굴뚝 + 문 + 창문 둘 + 작은 베란다 */
export function cottage(roof: number, wall: number = PAL.plaster): Geo {
  return m([
    box(9, 4.6, 7, wall), gable(10, 3, 8, roof, 0, 4.6), box(1.4, 2.8, 0.15, PAL.wood, 0, 0, 3.6),
    box(1.6, 1.4, 0.1, PAL.glass, -2.7, 1.6, 3.6), box(1.6, 1.4, 0.1, PAL.glass, 2.7, 1.6, 3.6), box(0.6, 2, 0.6, PAL.brick, 2, 5.5, -1.5),
    box(3, 0.3, 1.4, PAL.wood, 0, 0, 4.1),
  ]);
}
/** 작은 농가 7×6 (빨간 지붕, 참조의 농가) */
export function smallHouse(roof: number): Geo {
  return m([box(7, 3.6, 6, PAL.plaster), gable(8, 2.6, 7, roof, 0, 3.6), box(1.2, 2.4, 0.15, PAL.wood, 0.8, 0, 3.05), box(1.4, 1.2, 0.1, PAL.glass, -2, 1.4, 3.05), box(0.5, 1.6, 0.5, PAL.brick, -2, 4.4, -1)]);
}
/** 헛간 14×10 */
export function barn(): Geo {
  return m([
    box(14, 7, 10, PAL.brick), box(15, 0.5, 11, PAL.cloud, 0, 7), markSurface(gable(15, 4, 11, PAL.slate, 0, 7.4),11,3,.65), box(4, 5, 0.4, PAL.cloud, 0, 0, 5.1),
    box(0.5, 5.2, 0.4, PAL.cloud, -2.1, 0, 5.2), box(0.5, 5.2, 0.4, PAL.cloud, 2.1, 0, 5.2),
  ]);
}
/** 창고 20×10: 낮은 회색 지붕의 긴 건물 */
export function warehouse(): Geo {
  return m([box(20, 4.4, 10, mix(PAL.ash, PAL.bone, 0.4)), gable(21, 2.4, 11, PAL.steel, 0, 4.4), box(5, 3.6, 0.3, PAL.slate, -5, 0, 5.1), box(5, 3.6, 0.3, PAL.slate, 5, 0, 5.1)]);
}
export function silo(): Geo {
  return m([markSurface(cyl(2.6, 11, NEUTRAL.ash, 0, 0, 0, 0, 10),13,3,.55), cone(2.9, 3, PAL.tileRed, 0, 11, 0, 0, 10)]);
}
export function hut(): Geo {
  return m([box(9, 4.4, 7, PAL.wood), gable(10, 3, 8, PAL.slate, 0, 4.4), box(1.4, 3, 0.3, PAL.coal, 0, 0, 3.6), box(1.8, 1.4, 0.3, PAL.glass, -3, 1.6, 3.6)]);
}
/** 산장(등산로 입구): 통나무 2층 + 넓은 처마 지붕 + 테라스 */
export function lodge(): Geo {
  return m([
    box(14, 4, 9, PAL.wood), box(11, 3.4, 8, mix(PAL.wood, PAL.clay, 0.4), 0, 4), gable(16, 4.2, 11, PAL.tileRed, 0, 7.4),
    box(2, 3, 0.3, PAL.coal, 0, 0, 4.6), box(2.4, 1.6, 0.2, PAL.glass, -4, 1.4, 4.55), box(2.4, 1.6, 0.2, PAL.glass, 4, 1.4, 4.55),
    box(2.2, 1.6, 0.2, PAL.glass, -3, 4.8, 4.05), box(2.2, 1.6, 0.2, PAL.glass, 3, 4.8, 4.05),
    box(14, 0.4, 3.4, mix(PAL.wood, PAL.bone, 0.4), 0, 0, 6.2), box(0.35, 2.2, 0.35, PAL.wood, -6.6, 0, 7.6), box(0.35, 2.2, 0.35, PAL.wood, 6.6, 0, 7.6),
    box(1, 3, 1, PAL.brick, 4, 8, -2),
  ]);
}
/** 풍차(날개는 따로) */
export function windmill(): {still: Geo; blades: Geo} {
  const bl: Geo[] = [];
  for (let k = 0; k < 4; k++) {
    const g = new THREE.BoxGeometry(1.6, 9, 0.2).toNonIndexed();
    g.translate(0, 4.8, 0);
    g.rotateZ((k * Math.PI) / 2);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(0.9), 3));
    g.computeVertexNormals();
    bl.push(g);
  }
  return {
    still: m([box(7, 1, 7, NEUTRAL.stone), box(5, 12, 5, PAL.plaster, 0, 1), box(6, 0.8, 6, PAL.tileRed, 0, 13), cone(3.4, 3, PAL.tileRed, 0, 13.8, 0, 0, 4)]),
    blades: m(bl),
  };
}
/** 마을 우물 */
export function well(): Geo {
  return m([cyl(1.5, 1.1, PAL.stone, 0, 0, 0, 0, 8), cyl(1.1, 0.2, PAL.cyan, 0, 1.0, 0, 0, 8), box(0.25, 2.6, 0.25, PAL.wood, -1.4, 0, 0), box(0.25, 2.6, 0.25, PAL.wood, 1.4, 0, 0), gable(3.6, 1.2, 2.4, PAL.tileRed, 0, 2.6)]);
}
export function haystack(): Geo {
  return m([cyl(1.4, 1.8, PAL.amber, 0, 0, 0, 0, 7), cone(1.5, 1.2, mix(PAL.amber, PAL.orange, 0.2), 0, 1.8, 0, 0, 7)]);
}
/** 작은 돛 없는 보트(6u) */
export function boat(): Geo {
  return m([box(2.6, 0.8, 6, PAL.red), box(2.1, 0.3, 5.2, PAL.bone, 0, 0.8), box(0.2, 3.2, 0.2, PAL.wood, 0, 0.8, -0.5), box(1.6, 1.6, 0.1, PAL.white, 0.8, 1.6, -0.5)]);
}
/** 안내 푯말 */
export function signpost(): Geo {
  return m([box(0.25, 2.6, 0.25, PAL.wood), box(1.8, 0.7, 0.18, PAL.bone, 0.5, 1.7, 0.1), box(1.6, 0.6, 0.18, PAL.amber, -0.4, 0.9, -0.1)]);
}
/** 등산로 입구 문(통나무 기둥 2 + 가로보 + 작은 지붕) — 사이는 열려 있다 */
export function trailGate(): Geo {
  return m([box(0.7, 5, 0.7, PAL.wood, -3.2), box(0.7, 5, 0.7, PAL.wood, 3.2), box(8.6, 0.6, 0.8, PAL.wood, 0, 4.6), gable(9.4, 1.4, 1.8, PAL.slate, 0, 5.2), box(1.6, 0.8, 0.1, PAL.amber, 0, 3.6, 0.45)]);
}
/** 간이 휴게 정자(등산로 중간): 4기둥 + 사각 지붕 + 벤치 */
export function shelter(): Geo {
  const p: Geo[] = [box(5, 0.3, 5, PAL.stone), box(5.8, 0.5, 5.8, PAL.tileRed, 0, 3.4), gable(5.8, 1.5, 5.8, PAL.tileRed, 0, 3.9), box(3.4, 0.4, 0.8, PAL.wood, 0, 0.7, -1.7)];
  for (const sx of [-2.1, 2.1]) for (const sz of [-2.1, 2.1]) p.push(box(0.3, 3.2, 0.3, PAL.wood, sx, 0.3, sz));
  return m(p);
}
export function tallTree(color = ACCENT.green): Geo {
  return mergeGeometries([cyl(0.3, 3, NEUTRAL.wood, 0, 0, 0, 0, 5), ico(2.2, 0, color, 0, 4.4, 0)]);
}
/** 바닷가 야자: 굽은 줄기 + 잎 6장(납작한 원뿔) */
export function palm(): Geo {
  const p: Geo[] = [cyl(0.32, 2.4, mix(PAL.clay, PAL.bone, 0.4), 0, 0, 0, 0, 5), cyl(0.28, 2.4, mix(PAL.clay, PAL.bone, 0.4), 0.4, 2.3, 0, 0, 5), cyl(0.24, 2.2, mix(PAL.clay, PAL.bone, 0.4), 0.9, 4.5, 0, 0, 5)];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    p.push(cone(0.9, 4.2, k % 2 ? PAL.green : PAL.lime, 0.9 + Math.cos(a) * 1.9, 6.4, Math.sin(a) * 1.9, -a, 4));
  }
  return mergeGeometries(p);
}
export function beachUmbrella(c: number): Geo {
  return m([cyl(0.1, 2.8, PAL.white, 0, 0, 0, 0, 4), cone(1.8, 0.7, c, 0, 2.4, 0, 0, 6), box(1.6, 0.1, 0.7, PAL.bone, 2, 0, 0)]);
}
export function dockPost(): Geo {
  return box(0.4, 3.2, 0.4, NEUTRAL.coal);
}

/** 양 끝 상면 높이에 정확히 맞는 선착장/전망대 연결 널판. 로컬 -z → +z 방향으로 rise 만큼 변한다. */
export function walkway(width: number, length: number, rise: number): Geo {
  const g = box(width, 0.22, length, PAL.wood), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + (p.getZ(i) / length + 0.5) * rise);
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}
