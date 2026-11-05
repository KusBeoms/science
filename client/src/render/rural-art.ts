// 재사용 농촌·산악 소품. 좌표·충돌은 배치 담당에서 결정하며 모델 원점은 발밑이다.
import {PAL, mix} from './lowpoly/palette.js';
import {box, cyl, cone, ico, gable, taper} from './lowpoly/prim.js';
import {beam, ring} from './lowpoly/structure.js';
import {mergeGeometries} from './lowpoly/merge.js';
export function greenhouse() {
  const p = [box(10, 0.35, 18, PAL.stone), box(9.5, 3, 17.5, mix(PAL.glass, PAL.white, 0.6), 0, 0.35), gable(9.5, 2.6, 17.5, mix(PAL.glass, PAL.cloud, 0.6), 0, 3.35)];
  for (let z = -8; z <= 8; z += 4) for (const s of [-1, 1]) p.push(box(0.15, 3.2, 0.15, PAL.cloud, s * 4.8, 0.35, z), beam([s * 4.8, 3.55, z], [0, 6, z], 0.15, PAL.cloud));
  p.push(box(2, 2.8, 0.15, PAL.wood, 0, 0.35, 8.85));
  return mergeGeometries(p);
}
export function gazebo() {
  const p = [cyl(6, 0.5, PAL.stone, 0, 0, 0, 0, 8), cone(7, 3.2, PAL.tileRed, 0, 6, 0, Math.PI / 8, 8), cyl(0.18, 1.3, PAL.amber, 0, 9.2, 0, 0, 5)];
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; p.push(cyl(0.24, 5.5, PAL.wood, Math.cos(a) * 4.8, 0.5, Math.sin(a) * 4.8, 0, 5)); }
  return mergeGeometries(p);
}
export function scarecrow() {
  return mergeGeometries([box(0.2, 3.8, 0.2, PAL.wood), box(3.5, 0.15, 0.15, PAL.wood, 0, 2.7), box(0.9, 1.3, 0.5, PAL.blue, 0, 1.7), ico(0.5, 0, PAL.bone, 0, 3.6), cone(0.85, 0.8, PAL.amber, 0, 3.9, 0, 0, 6)]);
}
export function boardwalk(length = 16) {
  const p: any[] = [];
  for (let z = 0; z < length; z += 1) p.push(box(5, 0.18, 0.94, z % 3 ? PAL.wood : PAL.clay, 0, 0, z));
  for (let z = 0; z <= length; z += 4) for (const s of [-1, 1]) p.push(cyl(0.18, 3, PAL.wood, s * 2.1, -2.7, z, 0, 5));
  return mergeGeometries(p);
}
export function coastalRock(seed = 0) {
  return mergeGeometries([ico(2.1, 0, PAL.stone, 0, 0.6, 0, seed, 0.7), ico(1.2, 0, PAL.ash, 1.6, 0.2, 0.8, seed + 1, 0.8)]);
}
