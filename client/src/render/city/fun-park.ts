// W5 FUN: 중앙 공원(북서)과 테마파크(서). 정적 소품은 Ctx 에 쌓고, 돌거나 움직이는 것(오리·회전목마·코스터·범퍼카)은 anims 로 돌려준다.
import {NEUTRAL, PAL, mix} from '../lowpoly/palette.js';
import {box, cone, cyl, frustum, ico, taper} from '../lowpoly/prim.js';
import {lowMat, mergeGeometries} from '../lowpoly/merge.js';
import {
  BIKE, BUMPER, BUMPER_N, CAROUSEL, COASTER, DUCKS, POND, THEME_GATE, bumperPose, carouselAngle, coasterAt, duckPos, rideOvr,
} from '../../data/city-w5.js';
import {beam, block, frameArch, lampBulb, put, type Ctx} from './fun-props.js';

const mk = (c: Ctx, geo: any, fn: (T: number, m: any) => void) => {
  const mesh = new THREE.Mesh(geo, lowMat());
  c.anims.push({mesh, fn});
  return mesh;
};

export function buildPark(c: Ctx) {
  // 연못: 둘레를 막고(오리만 헤엄친다) 가운데 섬에 분수
  for (let z = -22; z < 22; z += 3) {
    const zz = z + 1.5, hx = Math.sqrt(Math.max(0, 21 * 21 - zz * zz));
    if (hx > 1) block(c, POND.x, POND.z + zz, hx, 1.6);
  }
  put(c.solid, mergeGeometries([
    cyl(3.6, 0.7, PAL.stone, 0, 0, 0, 0, 10), cyl(2.6, 1.1, PAL.cyan, 0, 0.7, 0, 0, 10), cyl(1.1, 2.2, PAL.stone, 0, 0.7, 0, 0, 8),
    cyl(2.0, 0.5, PAL.cyan, 0, 2.6, 0, 0, 10), cone(0.7, 2.6, mix(PAL.cyan, PAL.white, 0.5), 0, 3.0, 0, 0, 6),
  ]), POND.x, 0, POND.z);
  // 연못 가장자리 바위·갈대
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + 0.2;
    put(c.solid, ico(0.8 + (k % 3) * 0.3, 0, k % 2 ? PAL.stone : PAL.ash, 0, 0.2, 0, 0, 0.7), POND.x + Math.cos(a) * 21.6, 0, POND.z + Math.sin(a) * 21.6);
    if (k % 3 === 0) put(c.solid, mergeGeometries([cyl(0.08, 2.2, PAL.lime, 0, 0, 0, 0, 4), cyl(0.08, 1.8, PAL.green, 0.3, 0, 0.2, 0, 4), cyl(0.2, 0.7, PAL.wood, 0.1, 1.9, 0.1, 0, 5)]), POND.x + Math.cos(a) * 20.3, 0, POND.z + Math.sin(a) * 20.3);
  }
  // 오리
  const duck = mergeGeometries([ico(0.55, 0, PAL.yellow, 0, 0.35, 0, 0, 0.8), ico(0.32, 0, PAL.yellow, 0, 0.95, 0.4), box(0.3, 0.12, 0.3, PAL.orange, 0, 0.85, 0.75)]);
  DUCKS.forEach((_, i) => {
    const m = mk(c, duck.clone(), (T, mm) => {
      const p = duckPos(i, T);
      mm.position.set(p.x, -0.02 + Math.sin(T * 2 + i) * 0.04, p.z);
      mm.rotation.y = p.ry;
    });
    m.scale.setScalar(1.4);
  });
  // 자전거 대여소 (연못 동쪽 길 가장자리)
  const bx = POND.x + BIKE.rm + 3.5;
  put(c.solid, box(0.2, 1.4, 5, PAL.steel, 0, 0, 0), bx, 0, POND.z);
  for (const dz of [-1.6, 0, 1.6]) {
    put(c.solid, mergeGeometries([
      box(0.18, 0.9, 0.9, NEUTRAL.coal, 0, 0, -0.9), box(0.18, 0.9, 0.9, NEUTRAL.coal, 0, 0, 0.9), beam([0, 0.55, -0.9], [0, 0.9, 0.5], 0.1, 0.1, [PAL.red, PAL.cyan, PAL.lime][Math.round(dz / 1.6) + 1]), box(0.06, 0.1, 0.5, NEUTRAL.coal, 0, 1.35, 0.7),
    ]), bx - 0.6, 0, POND.z + dz);
  }
  put(c.solid, mergeGeometries([box(0.2, 3, 0.2, PAL.wood, 0, 0, 0), ico(0.7, 0, PAL.cyan, 0, 3.3, 0), box(1.4, 0.2, 0.1, PAL.amber, 0, 3.0, 0.1)]), bx + 0.5, 0, POND.z - 3);
  // 야외 체스: 돌 탁자 2 + 큰 말
  for (const [x, z] of [[-238, -240], [-228, -246]]) {
    const g = [cyl(0.5, 1.0, PAL.stone, 0, 0, 0, 0, 6), box(2.6, 0.25, 2.6, PAL.bone, 0, 1.0, 0)];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) g.push(box(0.6, 0.06, 0.6, NEUTRAL.coal, -0.9 + i * 0.6, 1.25, -0.9 + j * 0.6));
    g.push(cyl(0.18, 0.7, PAL.cloud, -0.3, 1.3, -0.3, 0, 5), ico(0.2, 0, PAL.cloud, -0.3, 2.1, -0.3), cyl(0.18, 0.9, NEUTRAL.ink, 0.3, 1.3, 0.3, 0, 5), box(0.3, 0.3, 0.3, NEUTRAL.ink, 0.3, 2.2, 0.3));
    for (const s of [[-2.2, 0], [2.2, 0]]) g.push(cyl(0.45, 0.7, PAL.wood, s[0], 0, s[1], 0, 6));
    put(c.solid, mergeGeometries(g), x, 0, z);
    block(c, x, z, 1.6);
  }
  // 소풍 돗자리
  for (const [x, z, col] of [[-304, -226, PAL.red], [-318, -300, PAL.blue], [-292, -218, PAL.yellow]] as const) {
    const g = [box(4.4, 0.08, 4.4, col, 0, 0, 0)];
    for (let i = 0; i < 4; i++) g.push(box(4.4, 0.1, 0.55, PAL.white, 0, 0, -1.65 + i * 1.1));
    g.push(box(1.0, 0.7, 0.8, PAL.wood, 0.9, 0.08, 0.4), box(1.0, 0.1, 0.8, PAL.cloud, 0.9, 0.78, 0.4), ico(0.45, 0, PAL.green, -1.0, 0.45, -0.5));
    put(c.solid, mergeGeometries(g), x, 0, z);
  }
  // 둘레 길 가로등 (밤에 켜짐)
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    lampBulb(c, POND.x + Math.cos(a) * 33.2, POND.z + Math.sin(a) * 33.2, 4.6, PAL.amber);
  }
}

export function buildTheme(c: Ctx) {
  // 입구 아치
  frameArch(c, THEME_GATE.x, THEME_GATE.z, 24, 8, PAL.magenta);
  // 회전목마
  const {x: cx, z: cz} = CAROUSEL;
  put(c.solid, cyl(9.2, 0.25, PAL.amber, 0, 0, 0, 0, 14), cx, 0, cz);
  const top: any[] = [cyl(8.5, 0.55, mix(PAL.pink, PAL.white, 0.35), 0, 0.25, 0, 0, 14), cyl(0.9, 6.6, PAL.amber, 0, 0.8, 0, 0, 8),
    frustum(14, 8.8, 1.0, 2.4, PAL.red, 0, 6.2, 0), cone(1.0, 1.2, PAL.yellow, 0, 8.6, 0, 0, 6), cyl(8.9, 0.35, PAL.white, 0, 6.0, 0, 0, 14)];
  for (let k = 0; k < CAROUSEL.n; k++) {
    const a = (k / CAROUSEL.n) * Math.PI * 2, x = Math.cos(a) * CAROUSEL.horse, z = Math.sin(a) * CAROUSEL.horse, hy = atan(a), col = [PAL.white, PAL.pink, PAL.cyan, PAL.yellow][k % 4];
    top.push(cyl(0.1, 5.2, PAL.amber, x, 0.8, z, 0, 5));
    top.push(...horse(x, 1.3, z, hy, col));
  }
  mk(c, mergeGeometries(top), (T, m) => (m.rotation.y = carouselAngle(T))).position.set(cx, 0, cz);
  c.blocks.push([cx - 8, cz - 8, cx + 8, cz + 8]);
  put(c.lit, mergeGeometries(Array.from({length: 14}, (_, k) => ico(0.35, 0, PAL.yellow, Math.cos((k / 14) * 6.283) * 8.8, 5.8, Math.sin((k / 14) * 6.283) * 8.8))), cx, 0, cz);

  // 롤러코스터: 레일 2줄 + 침목 + 기둥
  const N = 64, rail = PAL.red, tie = PAL.slate;
  const trk: any[] = [];
  for (let i = 0; i < N; i++) {
    const a = coasterAt(i / N), b = coasterAt((i + 1) / N);
    for (const off of [-0.75, 0.75]) trk.push(beam([a.x, a.y, a.z], [b.x, b.y, b.z], 0.28, 0.28, rail, off));
    trk.push(beam([a.x, a.y - 0.25, a.z], [a.x, a.y - 0.25, a.z + 0.01], 2.0, 0.14, tie));
    if (i % 3 === 0) trk.push(cyl(0.28, Math.max(0.5, a.y - 0.2), PAL.stone, a.x, 0, a.z, 0, 6));
  }
  put(c.solid, mergeGeometries(trk), 0, 0, 0);
  put(c.lit, mergeGeometries(Array.from({length: 16}, (_, i) => { const p = coasterAt(i / 16); return ico(0.4, 0, PAL.yellow, p.x, p.y + 0.5, p.z); })), 0, 0, 0);
  // 탑승장 지붕
  put(c.solid, mergeGeometries([box(5, 0.3, 8, PAL.cloud, 0, 3.5, 0), box(0.3, 3.5, 0.3, PAL.steel, -2.2, 0, -3.5), box(0.3, 3.5, 0.3, PAL.steel, -2.2, 0, 3.5), box(5.2, 0.8, 8.2, PAL.blue, 0, 3.8, 0), box(0.1, 0.4, 7, PAL.yellow, -2.4, 3.9, 0)]), COASTER.x + COASTER.rx + 5, 0, COASTER.z);
  const cart = mergeGeometries([box(1.8, 0.7, 2.3, PAL.yellow, 0, 0, 0), box(1.8, 0.8, 0.3, PAL.orange, 0, 0.7, -1.0), box(0.2, 0.6, 2.3, PAL.red, -0.9, 0.7, 0), box(0.2, 0.6, 2.3, PAL.red, 0.9, 0.7, 0)]);
  for (let k = 0; k < 3; k++) {
    mk(c, cart.clone(), (T, m) => {
      const u = (rideOvr.coaster ?? (T / COASTER.lap)) - k * 0.016;
      const p = coasterAt(((u % 1) + 1) % 1);
      m.position.set(p.x, p.y + 0.2, p.z);
      m.rotation.y = p.ry;
    });
  }
  // 범퍼카 경기장
  const [x0, z0, x1, z1] = BUMPER, w = x1 - x0, d = z1 - z0;
  put(c.solid, mergeGeometries([box(w, 1.1, 0.7, PAL.red, w / 2, 0, 0), box(w, 1.1, 0.7, PAL.red, w / 2, 0, d), box(0.7, 1.1, d, PAL.red, 0, 0, d / 2), box(0.7, 1.1, d, PAL.red, w, 0, d / 2),
    ...[[0, 0], [w, 0], [0, d], [w, d]].map(([a, b]) => cyl(0.3, 6.5, NEUTRAL.steel, a, 0, b, 0, 6)), box(w, 0.25, 0.25, PAL.cloud, w / 2, 6.3, 0), box(w, 0.25, 0.25, PAL.cloud, w / 2, 6.3, d)]), x0, 0, z0);
  c.blocks.push([x0 - 0.4, z0 - 0.4, x1 + 0.4, z0 + 0.4], [x0 - 0.4, z1 - 0.4, x1 + 0.4, z1 + 0.4], [x0 - 0.4, z0, x0 + 0.4, z1], [x1 - 0.4, z0, x1 + 0.4, z1]);
  put(c.lit, mergeGeometries(Array.from({length: 7}, (_, i) => box(0.5, 0.5, 0.5, i % 2 ? PAL.cyan : PAL.pink, i * (w / 6), 6.4, 0.2))), x0, 0, z0);
  const colors = [PAL.cyan, PAL.pink, PAL.lime, PAL.orange, PAL.violet];
  for (let i = 0; i < BUMPER_N; i++) {
    const car = mergeGeometries([cyl(1.25, 0.6, colors[i], 0, 0.1, 0, 0, 8), cyl(0.9, 0.5, PAL.white, 0, 0.7, 0, 0, 8), box(0.1, 3.2, 0.1, NEUTRAL.steel, -0.5, 0.9, 0), box(1.0, 0.7, 1.0, NEUTRAL.coal, 0.2, 1.1, 0)]);
    mk(c, car, (T, m) => {
      const p = bumperPose(i, T);
      m.position.set(p.x, 0, p.z);
      m.rotation.y = p.ry;
    });
  }
  // 두더지 망치 / 뽑기 / 솜사탕 (게임 골목 x≈-318)
  put(c.solid, mergeGeometries([box(3.4, 0.5, 3.4, PAL.red, 0, 0, 0), box(0.5, 9.5, 0.5, PAL.cloud, 0, 0.5, -1.2), ico(0.9, 0, PAL.yellow, 0, 10.4, -1.2), box(1.0, 0.4, 0.4, PAL.amber, 0, 8.6, -1.0),
    ...[1, 2, 3, 4, 5].map(i => box(0.2, 0.3, 0.2, [PAL.green, PAL.lime, PAL.yellow, PAL.orange, PAL.red][i - 1], 0.45, i * 1.5, -1.2)), box(0.5, 0.4, 2.6, PAL.wood, 1.6, 0.5, 0.5)]), -318, 0, 20);
  block(c, -318, 20, 1.8);
  put(c.solid, mergeGeometries([box(3.4, 1.4, 3, PAL.violet, 0, 0, 0), box(3.4, 3.2, 3, mix(PAL.cyan, PAL.white, 0.4), 0, 1.4, 0), box(3.6, 0.5, 3.2, PAL.violet, 0, 4.6, 0),
    ico(0.6, 0, PAL.pink, -0.8, 1.8, 0.3), ico(0.6, 0, PAL.yellow, 0.7, 1.8, -0.3), ico(0.6, 0, PAL.orange, 0, 1.8, 0.9), box(0.1, 1.0, 0.1, NEUTRAL.steel, 0, 3.4, 0), box(0.8, 0.2, 0.8, NEUTRAL.steel, 0, 3.3, 0)]), -318, 0, 38);
  put(c.lit, box(3.2, 0.3, 0.2, PAL.yellow, 0, 4.7, 1.55), -318, 0, 38);
  block(c, -318, 38, 1.9);
  put(c.solid, mergeGeometries([box(2.6, 1.3, 1.8, PAL.cloud, 0, 0.5, 0), cyl(0.15, 3.4, PAL.wood, 0, 0.5, 0, 0, 5), cone(2.4, 1.1, PAL.pink, 0, 3.4, 0, 0, 8), ico(0.55, 0, mix(PAL.pink, PAL.white, 0.4), -0.7, 1.9, 0), ico(0.55, 0, mix(PAL.cyan, PAL.white, 0.4), 0.6, 1.9, 0.2), cyl(0.5, 0.3, NEUTRAL.ink, -1, 0, 1, 0, 6), cyl(0.5, 0.3, NEUTRAL.ink, 1, 0, 1, 0, 6)]), -318, 0, 56);
  block(c, -318, 56, 1.5);
  // 산책로 가로등
  for (let z = -100; z <= 72; z += 14) if (Math.abs(z) > 14 && !(z > 12 && z < 56)) lampBulb(c, -218.5, z, 5, PAL.pink);
}
const atan = (a: number) => Math.atan2(-Math.sin(a), Math.cos(a));
function horse(x: number, y: number, z: number, ry: number, col: number) {
  const fx = Math.sin(ry), fz = Math.cos(ry);
  return [
    box(0.9, 1.0, 2.1, col, x, y, z, ry),
    taper(0.5, 0.6, 0.4, 0.4, 1.1, col, x + fx * 0.9, y + 0.7, z + fz * 0.9, ry),
    box(0.45, 0.5, 0.8, mix(col, PAL.ink, 0.15), x + fx * 1.25, y + 1.3, z + fz * 1.25, ry),
    box(0.15, 0.8, 0.5, PAL.magenta, x - fx * 1.1, y + 0.2, z - fz * 1.1, ry),
    box(0.6, 0.2, 0.7, PAL.red, x, y + 1.0, z, ry),
  ];
}
