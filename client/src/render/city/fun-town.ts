// W5 FUN: 문화 거리 광장(동) · 레저 구역(남동) · 주거 놀이터와 텃밭(남서).
import {NEUTRAL, PAL, mix} from '../lowpoly/palette.js';
import {box, cone, cyl, ico, taper} from '../lowpoly/prim.js';
import {lowMat, mergeGeometries} from '../lowpoly/merge.js';
import {SLIDE, SWING, swingPose} from '../../data/city-w5.js';
import {
  block, climbWall, foodTruck, gardenBed, hoop, lampBulb, put, skateRamps, slideSet, stall, swingSeat, swingSet, type Ctx,
} from './fun-props.js';

export function buildCulture(c: Ctx) {
  // 벽화 담장 (남쪽을 본다): 바탕 + 해·산·물결·별 도형
  const g = [box(46, 6, 0.7, mix(PAL.cloud, PAL.bone, 0.5), 0, 0, 0), box(46.4, 0.4, 1.1, PAL.slate, 0, 6, 0)];
  g.push(ico(2.2, 1, PAL.yellow, -14, 3.6, 0.5, 0, 0.9), taper(9, 0.2, 0.3, 0.2, 4.4, PAL.teal, -4, 0.4, 0.45), taper(8, 0.2, 0.3, 0.2, 3.4, PAL.blue, 3, 0.4, 0.45), taper(10, 0.2, 0.3, 0.2, 5, PAL.violet, 11, 0.4, 0.5));
  for (let i = 0; i < 12; i++) g.push(box(2.2, 0.5, 0.16, [PAL.cyan, PAL.blue][i % 2], -21 + i * 2.2, 0.6, 0.45), ico(0.35, 0, PAL.white, -20 + (i * 3.7) % 40, 4.9 + (i % 3) * 0.3, 0.45));
  g.push(box(5, 3, 0.2, PAL.red, 18, 1.4, 0.45), box(3, 3, 0.2, PAL.orange, 20.5, 2.2, 0.5), ico(1.0, 0, PAL.pink, 18.5, 4.6, 0.5));
  put(c.solid, mergeGeometries(g), 238, 0, 110.5);
  block(c, 238, 110.5, 23, 0.6);
  // 거리 공연 무대 + 스피커 + 악사
  put(c.solid, mergeGeometries([
    box(9, 0.8, 6.4, PAL.wood, 0, 0, 0), box(9.4, 3.6, 0.5, PAL.violet, 0, 0.8, -3), box(1.4, 2, 1.4, NEUTRAL.coal, -3.6, 0.8, 1.6), box(1.4, 2, 1.4, NEUTRAL.coal, 3.6, 0.8, 1.6),
    box(0.9, 1.4, 0.6, PAL.red, 0, 0.8, 0), ico(0.45, 0, PAL.bone, 0, 2.5, 0), box(0.2, 1.3, 0.7, PAL.amber, 0.9, 1.3, 0.3), cone(0.55, 0.6, PAL.orange, 0, 2.9, 0, 0, 6),
  ]), 222, 0, 129);
  block(c, 222, 129, 4.6, 3.3);
  put(c.lit, box(9, 0.25, 0.25, PAL.magenta, 0, 4.5, -2.7), 222, 0, 129);
  // 떠오르는 음표 3개
  const note = mergeGeometries([box(0.35, 0.35, 0.2, PAL.yellow, 0, 0, 0), box(0.1, 1.0, 0.2, PAL.yellow, 0.2, 0.3, 0), box(0.5, 0.18, 0.2, PAL.yellow, 0.4, 1.1, 0)]);
  for (let k = 0; k < 3; k++) {
    const mesh = new THREE.Mesh(note.clone(), lowMat());
    c.anims.push({mesh, fn: (T, m) => {
      const u = (T * 0.35 + k / 3) % 1;
      m.position.set(222 + 2 + Math.sin(u * 6 + k) * 1.2 + k, 3 + u * 5, 130 + k * 0.6);
      m.scale.setScalar(Math.sin(u * Math.PI));
    }});
  }
  // 벼룩시장 천막 2줄 × 4 (가운데가 통로)
  const awn = [[PAL.red, PAL.white], [PAL.blue, PAL.yellow], [PAL.green, PAL.white], [PAL.orange, PAL.cyan]];
  for (let i = 0; i < 4; i++) {
    stall(c, 232, 140 + i * 12, awn[i][0], awn[i][1], Math.PI / 2);
    stall(c, 244, 140 + i * 12, awn[(i + 2) % 4][0], awn[(i + 2) % 4][1], -Math.PI / 2);
  }
  // 푸드트럭 3대 (서빙 창이 서쪽 = 광장 쪽)
  foodTruck(c, 262, 132, PAL.orange, -Math.PI / 2);
  foodTruck(c, 262, 150, PAL.teal, -Math.PI / 2);
  foodTruck(c, 262, 168, PAL.pink, -Math.PI / 2);
  // 야시장 등
  for (const [x, z] of [[214, 112], [262, 112], [214, 150], [250, 184], [214, 184], [250, 112]]) lampBulb(c, x, z, 5.4, PAL.orange);
}

export function buildLeisure(c: Ctx) {
  hoop(c, 216, 223, 1);
  hoop(c, 242, 223, -1);
  skateRamps(c, 229, 250);
  // 수영장: 가장자리 + 다이빙대 + 레인 줄
  put(c.solid, mergeGeometries([
    box(18, 0.5, 0.8, PAL.cloud, 0, 0, 0), box(18, 0.5, 0.8, PAL.cloud, 0, 0, 18), box(0.8, 0.5, 18, PAL.cloud, 0, 0, 9), box(0.8, 0.5, 18, PAL.cloud, 18, 0, 9),
    box(1.6, 1.0, 1.6, PAL.steel, 9, 0, 17.6), box(1.2, 0.18, 5.2, PAL.cyan, 9, 1.1, 14.6), box(0.06, 1.1, 0.06, NEUTRAL.steel, 0.5, 0, 17),
  ]), 247, 0, 214.5);
  put(c.solid, mergeGeometries([0, 1, 2, 3].map(i => box(14, 0.12, 0.12, i % 2 ? PAL.red : PAL.white, 0, 0.1, 3 + i * 3.4))), 249, 0, 214.5);
  c.blocks.push([249.2, 215.2, 262.8, 230.8]);
  climbWall(c, 258, 242);
  // 퍼팅 그린: 깃대 + 컵
  put(c.solid, mergeGeometries([cyl(0.06, 3.2, PAL.cloud, 0, 0, 0, 0, 4), box(1.2, 0.8, 0.05, PAL.red, 0.6, 2.3, 0), cyl(0.28, 0.06, NEUTRAL.ink, 1.2, 0, 0.8, 0, 6)]), 261, 0, 257);
  // 투광등
  for (const [x, z] of [[213, 212], [245, 212], [213, 235], [245, 235], [213, 264], [245, 264]]) lampBulb(c, x, z, 7, PAL.white);
}

export function buildResi(c: Ctx) {
  const {x: sx, z: sz} = SWING;
  swingSet(c, sx, sz, SWING.h);
  for (const k of [0, 1]) {
    const seat = swingSeat(k ? PAL.yellow : PAL.cyan);
    seat.translate(0, -SWING.L, 0);
    const mesh = new THREE.Mesh(seat, lowMat());
    c.anims.push({mesh, fn: (T, m) => {
      const p = swingPose(T, k);
      m.position.set(p.x, SWING.h, sz);
      m.rotation.x = -Math.asin(Math.min(1, (p.z - sz) / SWING.L));
    }});
  }
  slideSet(c, SLIDE.x, SLIDE.z, SLIDE.h, SLIDE.len);
  // 모래밭 · 시소 · 스프링 말
  put(c.solid, mergeGeometries([
    box(7, 0.5, 0.5, PAL.wood, 0, 0, -3), box(7, 0.5, 0.5, PAL.wood, 0, 0, 3), box(0.5, 0.5, 6, PAL.wood, -3.25, 0, 0), box(0.5, 0.5, 6, PAL.wood, 3.25, 0, 0),
    ico(0.5, 0, PAL.red, -1, 0.4, 0, 0, 0.7), taper(0.9, 0.9, 0.5, 0.5, 0.9, PAL.blue, 1.2, 0.2, 1),
  ]), -258, 0, 306);
  put(c.solid, mergeGeometries([taper(0.6, 0.6, 0.2, 0.2, 1.1, PAL.stone, 0, 0, 0), box(0.5, 0.2, 5.4, PAL.orange, 0, 1.1, 0).rotateX(0.18), box(0.3, 0.5, 0.3, PAL.red, 0, 1.2, -2.5), box(0.3, 0.5, 0.3, PAL.red, 0, 1.5, 2.5)]), -248, 0, 313);
  block(c, -252, 290, 4.6, 0.4);
  // 텃밭 4판 + 허수아비
  gardenBed(c, -255, 320, 0);
  gardenBed(c, -255, 327, 1);
  gardenBed(c, -231, 320, 2);
  gardenBed(c, -231, 327, 3);
  put(c.solid, mergeGeometries([cyl(0.1, 3.2, PAL.wood, 0, 0, 0, 0, 5), box(2.4, 0.15, 0.15, PAL.wood, 0, 2.2, 0), ico(0.5, 0, PAL.bone, 0, 3.5, 0), cone(0.9, 0.7, PAL.clay, 0, 3.9, 0, 0, 7), box(0.8, 1.2, 0.4, PAL.blue, 0, 1.2, 0)]), -243, 0, 330);
  // 고양이 방석 + 개집
  put(c.solid, mergeGeometries([
    box(1.6, 0.22, 1.6, PAL.red, 0, 0, 0), ico(0.45, 0, PAL.orange, 0, 0.55, 0, 0, 0.8), ico(0.28, 0, PAL.orange, 0.35, 0.95, 0.1), cone(0.1, 0.24, PAL.orange, 0.5, 1.15, 0.1, 0, 4), cone(0.1, 0.24, PAL.orange, 0.2, 1.15, 0.1, 0, 4),
    box(0.1, 0.1, 0.8, PAL.orange, -0.5, 0.45, -0.1),
  ]), -224, 0, 306);
  put(c.solid, mergeGeometries([box(2.4, 1.6, 2.4, PAL.red, 0, 0, 0), taper(3, 3, 0.2, 0.2, 1.2, PAL.slate, 0, 1.6, 0), box(0.9, 1.0, 0.1, NEUTRAL.ink, 0, 0, 1.22)]), -222, 0, 324);
  block(c, -222, 324, 1.4);
  for (const [x, z] of [[-264, 288], [-212, 288], [-264, 332], [-212, 332]]) lampBulb(c, x, z, 5, PAL.yellow);
}
