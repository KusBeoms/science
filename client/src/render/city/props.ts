// 도시 소품 지오메트리: 가로등·나무·벤치·울타리·간판 도형. 전부 한 번 만들어 공유(keep)하고 InstancedMesh / 병합 메시로 그린다
import {ACCENT, CITY, NEUTRAL, PAL, mix} from '../lowpoly/palette.js';
import {box, cone, cyl, frustum, ico, prism, wobble, type Geo} from '../lowpoly/prim.js';
import {keep, mergeGeometries} from '../lowpoly/merge.js';
import type {SignIcon} from '../../data/city.js';

/** 가로등: 기둥은 로컬 원점, 팔이 +x 로 뻗는다. lit 은 밤에만 켜지는 전구 */
export function lampGeo(): {pole: Geo; bulb: Geo} {
  const pole = mergeGeometries([
    cyl(0.45, 0.6, NEUTRAL.coal, 0, 0, 0, 0, 6),
    cyl(0.16, 5.6, NEUTRAL.steel, 0, 0.6, 0, 0, 6),
    box(1.9, 0.14, 0.14, NEUTRAL.steel, 0.9, 5.5, 0),
    box(1.0, 0.3, 0.7, NEUTRAL.coal, 1.75, 5.5, 0),
  ]);
  const bulb = mergeGeometries([box(0.8, 0.1, 0.55, mix(PAL.amber, PAL.white, 0.5), 1.75, 5.4, 0)]);
  return {pole: keep(pole), bulb: keep(bulb)};
}

/** 둥근 가로수: 줄기 + 흔들린 이코스피어 수관 (56 tris) */
export function roundTreeGeo(): Geo {
  const crown = mergeGeometries([
    wobble(ico(1.9, 0, mix(PAL.green, PAL.lime, 0.25), -0.35, 3.7, 0, 0, 1.1), 0.2, 11),
    ico(1.4, 0, mix(PAL.green, PAL.lime, 0.38), 0.65, 4.4, 0.15),
  ]);
  return keep(mergeGeometries([cyl(0.3, 2.8, NEUTRAL.wood, 0, 0, 0, 0, 5), crown]));
}
/** 소나무: 줄기 + 콘 3단 (약 50 tris) */
export function pineGeo(): Geo {
  const leaf = mix(PAL.green, PAL.teal, 0.3);
  return keep(mergeGeometries([
    cyl(0.28, 1.8, NEUTRAL.wood, 0, 0, 0, 0, 5),
    cone(2.0, 2.6, leaf, 0, 1.4, 0, 0, 7),
    cone(1.5, 2.3, mix(leaf, PAL.white, 0.08), 0, 3.2, 0, 0, 7),
    cone(1.0, 2.0, mix(leaf, PAL.white, 0.16), 0, 4.9, 0, 0, 7),
  ]));
}

/** 벤치: 정면이 로컬 +z (60 tris) */
export function benchGeo(): Geo {
  return keep(mergeGeometries([
    box(2.4, 0.16, 0.7, NEUTRAL.wood, 0, 0.62, 0),
    box(2.4, 0.6, 0.12, NEUTRAL.wood, 0, 0.9, -0.3),
    box(0.14, 0.62, 0.62, NEUTRAL.steel, -1.0, 0, 0),
    box(0.14, 0.62, 0.62, NEUTRAL.steel, 1.0, 0, 0),
  ]));
}

/** 공사 울타리: 길이 len 을 줄무늬 판으로 덮는다 (z 방향으로 늘어섬) */
export function barrierGeo(len: number): Geo {
  const n = Math.round(len / 1.5),
    seg = len / n,
    parts: Geo[] = [];
  for (let i = 0; i < n; i++) parts.push(box(0.3, 1.0, seg - 0.08, i % 2 ? NEUTRAL.ink : ACCENT.amber, 0, 0.5, (i - (n - 1) / 2) * seg));
  parts.push(box(0.5, 1.6, 0.5, NEUTRAL.coal, 0, 0, -len / 2), box(0.5, 1.6, 0.5, NEUTRAL.coal, 0, 0, len / 2));
  return keep(mergeGeometries(parts));
}

/** 글자 없는 상점 간판: 막대 위에 얹는 도형 (높이 약 2.4) */
export function signEmblem(icon: SignIcon): Geo {
  const parts: Geo[] = [box(0.2, 1.0, 0.2, NEUTRAL.steel)];
  switch (icon) {
    case 'gem':
      parts.push(frustum(6, 0, 1.0, 1.0, ACCENT.cyan, 0, 1.0), cone(1.0, 0.9, mix(ACCENT.cyan, PAL.white, 0.35), 0, 2.0, 0, 0, 6));
      break;
    case 'planet':
      parts.push(ico(0.95, 1, ACCENT.orange, 0, 1.95), prism(12, 1.7, 0.1, CITY.awning, 0, 1.9));
      break;
    case 'cube':
      parts.push(box(1.4, 1.4, 1.4, ACCENT.lime, 0, 1.0, 0, Math.PI / 4));
      break;
    case 'cone':
      parts.push(cone(1.0, 2.1, ACCENT.pink, 0, 1.0, 0, 0, 7));
      break;
    case 'cross':
      parts.push(box(0.6, 2.0, 0.5, ACCENT.red, 0, 1.0), box(2.0, 0.6, 0.5, ACCENT.red, 0, 1.7));
      break;
  }
  return mergeGeometries(parts);
}
