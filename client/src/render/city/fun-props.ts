// W5 FUN 소품 도형 모음: 구역별 소품을 만드는 작은 빌더. 전부 prim 의 상자·기둥·콘을 이어 붙여 병합 메시 1~2개로 만든다.
// 로컬 원점은 바닥 중심. 빌더끼리 겹치는 건 Ctx(구역 컨텍스트)에 쌓아서 render/city/fun.ts 가 구역마다 한 번에 병합한다.
import {NEUTRAL, PAL, mix} from '../lowpoly/palette.js';
import {box, cone, cyl, ico, taper, wedge, wobble, type Geo} from '../lowpoly/prim.js';
import {keep, mergeGeometries, type Placed} from '../lowpoly/merge.js';
import type {Rect} from '../../data/city-w5.js';

/** 구역 컨텍스트: 낮에도 보이는 면(solid)·밤에만 켜지는 면(lit)·충돌 사각형·움직이는 메시 */
export interface Anim {
  mesh: any;
  fn: (T: number, m: any) => void;
}
export interface Ctx {
  solid: Placed[];
  lit: Placed[];
  blocks: Rect[];
  anims: Anim[];
}
export const newCtx = (): Ctx => ({solid: [], lit: [], blocks: [], anims: []});
export const put = (l: Placed[], g: Geo, x = 0, y = 0, z = 0, ry = 0, s = 1) => l.push({g, x, y, z, ry, s});
/** 중심 (x,z) 반폭 (hx,hz) 충돌 사각형 */
export const block = (c: Ctx, x: number, z: number, hx: number, hz = hx) => c.blocks.push([x - hx, z - hz, x + hx, z + hz]);

/** 두 점을 잇는 가는 상자(레일·밧줄·사다리). off 는 진행 방향의 옆(로컬 x) 이동 */
export function beam(a: readonly number[], b: readonly number[], w: number, h: number, color: number, off = 0): Geo {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz) || 0.01;
  const g = new THREE.BoxGeometry(w, h, len).toNonIndexed();
  g.translate(off, 0, 0);
  g.rotateX(-Math.atan2(dy, Math.hypot(dx, dz)));
  g.rotateY(Math.atan2(dx, dz));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  const n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([(color >> 16) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
/** 기울인 상자(야자잎 등): 원점에서 +z 로 len 만큼 뻗다가 droop 만큼 처진다 */
export function frond(len: number, w: number, color: number, droop: number, spin: number, x: number, y: number, z: number): Geo {
  const g = box(w, 0.12, len, color, 0, 0, len / 2);
  g.rotateX(droop);
  g.rotateY(spin);
  g.translate(x, y, z);
  return g;
}

// ── 나무 (인스턴싱용 공유 도형)
export const palmGeo = (): Geo => {
  const parts: Geo[] = [cyl(0.38, 2.8, NEUTRAL.wood, 0, 0, 0, 0, 6), cyl(0.3, 2.6, mix(NEUTRAL.wood, PAL.bone, 0.2), 0.25, 2.8, 0, 0, 6), cyl(0.25, 1.8, NEUTRAL.wood, 0.5, 5.4, 0, 0, 6)];
  for (let k = 0; k < 6; k++) parts.push(frond(3.4, 1.0, k % 2 ? PAL.green : mix(PAL.green, PAL.lime, 0.4), 0.55, (k / 6) * Math.PI * 2, 0.5, 7.1, 0));
  parts.push(ico(0.45, 0, PAL.clay, 0.5, 6.9, 0.2));
  return keep(mergeGeometries(parts));
};
export const cherryGeo = (): Geo => {
  const c = mix(PAL.pink, PAL.white, 0.25);
  return keep(mergeGeometries([
    cyl(0.3, 2.6, NEUTRAL.wood, 0, 0, 0, 0, 5),
    wobble(ico(1.9, 1, c, 0, 3.7, 0, 0, 0.85), 0.25, 21),
    wobble(ico(1.3, 0, mix(c, PAL.magenta, 0.2), 1.1, 3.2, 0.6), 0.2, 22),
    wobble(ico(1.2, 0, mix(c, PAL.white, 0.3), -1.0, 3.0, -0.5), 0.2, 23),
  ]));
};
export const ginkgoGeo = (): Geo =>
  keep(mergeGeometries([
    cyl(0.28, 3.2, NEUTRAL.wood, 0, 0, 0, 0, 5),
    cone(1.8, 4.4, mix(PAL.yellow, PAL.amber, 0.3), 0, 2.4, 0, 0, 7),
    wobble(ico(1.1, 0, mix(PAL.yellow, PAL.lime, 0.2), 0, 5.4, 0), 0.2, 31),
  ]));

// ── 해변·항구
export function parasol(c: Ctx, x: number, z: number, color: number, ry = 0) {
  const g = mergeGeometries([cyl(0.1, 3, NEUTRAL.cloud, 0, 0, 0, 0, 5), cone(2.4, 0.9, color, 0, 2.5, 0, 0, 8), cone(0.5, 0.4, PAL.white, 0, 3.3, 0, 0, 5)]);
  put(c.solid, g, x, 0, z, ry);
  put(c.solid, box(1.2, 0.08, 2.4, mix(color, PAL.white, 0.5), 0, 0, 0, 0), x + 1.2, 0.02, z + 1.4, ry);
}
export function lounge(c: Ctx, x: number, z: number, color: number) {
  put(c.solid, mergeGeometries([box(1.5, 0.45, 3.1, PAL.cloud, 0, 0.35, 0), box(1.5, 0.4, 1.3, color, 0, 0.8, -1.6), box(0.1, 0.4, 3.1, NEUTRAL.steel, -0.7, 0, 0), box(0.1, 0.4, 3.1, NEUTRAL.steel, 0.7, 0, 0)]), x, 0, z);
}
export function lifeguard(c: Ctx, x: number, z: number) {
  const g = mergeGeometries([
    ...[[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]].map(([a, b]) => box(0.3, 3.2, 0.3, PAL.cloud, a, 0, b)),
    box(3.6, 0.3, 3.6, PAL.wood, 0, 3.2, 0), box(3.2, 2.2, 3.2, PAL.red, 0, 3.5, 0), taper(4.2, 4.2, 0.5, 0.5, 1.3, PAL.cloud, 0, 5.7, 0),
    box(1.4, 1.0, 0.1, PAL.glass, 0, 4.1, 1.62), beam([0, 0, 2.2], [0, 3.2, 1.5], 0.3, 0.12, PAL.wood),
  ]);
  put(c.solid, g, x, 0, z);
  block(c, x, z, 2);
}
export function sandcastle(c: Ctx, x: number, z: number) {
  const sand = mix(PAL.bone, PAL.amber, 0.35);
  put(c.solid, mergeGeometries([
    box(4.2, 1.4, 4.2, sand, 0, 0, 0), ...[[-2, -2], [2, -2], [-2, 2], [2, 2]].map(([a, b]) => cyl(0.7, 2.3, mix(sand, PAL.white, 0.1), a, 0, b, 0, 7)),
    ...[[-2, -2], [2, -2], [-2, 2], [2, 2]].map(([a, b]) => cone(0.8, 0.9, PAL.red, a, 2.3, b, 0, 7)),
    box(1.6, 2.2, 1.6, sand, 0, 1.4, 0), cone(1.1, 1.2, PAL.red, 0, 3.6, 0, 0, 7),
  ]), x, 0, z);
  block(c, x, z, 3);
}
export function volleyNet(c: Ctx, x: number, z: number) {
  put(c.solid, mergeGeometries([
    box(0.25, 2.8, 0.25, NEUTRAL.steel, -4.5, 0, 0), box(0.25, 2.8, 0.25, NEUTRAL.steel, 4.5, 0, 0),
    box(9, 0.9, 0.06, PAL.cloud, 0, 1.7, 0), box(9, 0.12, 0.12, PAL.red, 0, 2.65, 0),
  ]), x, 0, z);
}
export function surfRack(c: Ctx, x: number, z: number) {
  const cols = [PAL.red, PAL.cyan, PAL.yellow, PAL.lime, PAL.pink];
  const parts: Geo[] = [box(0.2, 1.6, 0.2, PAL.wood, -3, 0, 0), box(0.2, 1.6, 0.2, PAL.wood, 3, 0, 0), box(6.4, 0.18, 0.18, PAL.wood, 0, 1.6, 0)];
  cols.forEach((col, i) => parts.push(taper(0.8, 0.12, 0.2, 0.12, 3.4, col, -2.4 + i * 1.2, 0.2, 0.5 + i * 0.05).rotateX(0)));
  put(c.solid, mergeGeometries(parts), x, 0, z);
}
export function beachBar(c: Ctx, x: number, z: number) {
  put(c.solid, mergeGeometries([
    box(7, 1.2, 3, PAL.wood, 0, 0, 0), ...[-3.2, 3.2].map(a => cyl(0.18, 3.4, PAL.wood, a, 0, -1.4, 0, 5)),
    cone(5.6, 1.8, mix(PAL.amber, PAL.bone, 0.3), 0, 3.3, 0, 0, 8), box(6, 0.12, 2.4, PAL.cloud, 0, 1.2, 0.1),
  ]), x, 0, z);
  put(c.lit, mergeGeometries([box(5, 0.2, 0.2, PAL.yellow, 0, 3.1, 1.9), box(0.5, 0.5, 0.1, PAL.cyan, 0, 1.6, 1.52)]), x, 0, z);
  block(c, x, z, 3.5, 1.6);
}
export function container(c: Ctx, x: number, z: number, h: number, color: number, ry = 0) {
  const parts: Geo[] = [];
  for (let i = 0; i < h; i++) {
    const col = i ? mix(color, PAL.white, 0.12 * i) : color;
    parts.push(box(10, 2.55, 2.5, col, 0, i * 2.6, 0), box(10.05, 0.12, 2.55, mix(col, PAL.ink, 0.4), 0, i * 2.6 + 1.2, 0));
    for (let k = -4; k <= 4; k += 2) parts.push(box(0.12, 2.3, 2.6, mix(col, PAL.ink, 0.25), k, i * 2.6 + 0.12, 0));
  }
  put(c.solid, mergeGeometries(parts), x, 0, z, ry);
  c.blocks.push(ry ? [x - 1.3, z - 5.1, x + 1.3, z + 5.1] : [x - 5.1, z - 1.3, x + 5.1, z + 1.3]);
}
/** 항만 크레인: 다리 4 + 보 + 바다 쪽(+z) 붐 */
export function gantry(c: Ctx, x: number, z: number) {
  const col = PAL.amber, g: Geo[] = [];
  for (const a of [-5, 5]) for (const b of [-4, 4]) g.push(box(1.1, 22, 1.1, col, a, 0, b), beam([a, 0, b * 1.3], [a, 9, b], 0.3, 0.3, NEUTRAL.steel));
  g.push(box(13, 1.6, 10.5, col, 0, 22, 0), box(2.2, 1.4, 44, PAL.orange, 0, 23, 12), box(3, 2.2, 3, NEUTRAL.coal, 0, 23.6, 22), cyl(0.12, 12, NEUTRAL.steel, 0, 11, 22, 0, 5), box(1.8, 1.0, 1.8, PAL.red, 0, 10.4, 22));
  put(c.solid, mergeGeometries(g), x, 0, z);
  put(c.lit, mergeGeometries([box(0.8, 0.8, 0.8, PAL.red, 0, 25, 33), box(0.8, 0.8, 0.8, PAL.red, 0, 25, -4)]), x, 0, z);
  for (const a of [-5, 5]) for (const b of [-4, 4]) block(c, x + a, z + b, 0.8);
}
export function yachtGeo(color: number): Geo {
  return mergeGeometries([
    box(3.6, 1.2, 8.4, PAL.white, 0, -0.3, 0), taper(3.6, 3, 0.3, 0.3, 1.2, PAL.white, 0, -0.3, 5.5).rotateX(0), box(3.7, 0.18, 8.5, color, 0, 0.55, 0),
    box(2.6, 1.0, 3.4, PAL.cloud, 0, 0.9, -1.2), box(2.5, 0.5, 0.1, PAL.glass, 0, 1.3, 0.55), cyl(0.12, 9, NEUTRAL.steel, 0, 0.9, 1.4, 0, 5),
    taper(0.12, 5, 0.12, 0.3, 7.6, color, 0, 1.6, 1.4 - 2.4).rotateX(0),
  ]);
}

// ── 문화 거리
export function stall(c: Ctx, x: number, z: number, c1: number, c2: number, ry = 0) {
  const parts: Geo[] = [
    ...[[-2.7, -1.7], [2.7, -1.7], [-2.7, 1.7], [2.7, 1.7]].map(([a, b]) => cyl(0.12, 3, NEUTRAL.wood, a, 0, b, 0, 5)),
    taper(6.2, 4.4, 5.4, 3.6, 0.9, c1, 0, 3, 0), box(6.3, 0.45, 0.1, c2, 0, 2.6, 2.25), box(5, 0.9, 2, PAL.wood, 0, 0, -0.3),
  ];
  const goods = [PAL.red, PAL.cyan, PAL.yellow, PAL.lime, PAL.violet, PAL.orange];
  for (let i = 0; i < 6; i++) parts.push(box(0.6, 0.5 + (i % 3) * 0.2, 0.6, goods[(i + (x | 0)) % 6], -2 + i * 0.8, 0.9, -0.3));
  put(c.solid, mergeGeometries(parts), x, 0, z, ry);
  put(c.lit, box(5.6, 0.14, 0.14, PAL.yellow, 0, 2.5, 0.2), x, 0, z, ry);
  c.blocks.push(ry ? [x - 2.4, z - 3.2, x + 2.4, z + 3.2] : [x - 3.2, z - 2.4, x + 3.2, z + 2.4]);
}
/** 푸드트럭: 서빙 창이 로컬 +z 쪽 */
export function foodTruck(c: Ctx, x: number, z: number, color: number, ry: number) {
  const parts: Geo[] = [
    box(9, 3.3, 3.6, color, 0, 0.7, 0), box(2.6, 2.3, 3.6, mix(color, PAL.white, 0.3), 4.6, 0.7, 0), box(0.1, 1.0, 2.2, PAL.glass, 5.9, 1.9, 0),
    box(5, 1.1, 0.4, NEUTRAL.coal, -0.4, 4.0, 1.4), taper(5.4, 1.6, 5.4, 0.6, 0.9, PAL.cloud, -0.4, 2.9, 2.2), box(0.8, 1.2, 0.8, NEUTRAL.steel, -3, 4, -1),
    ...[[-3, 1.9], [3, 1.9], [-3, -1.9], [3, -1.9]].map(([a, b]) => cyl(0.7, 0.5, NEUTRAL.ink, a, 0, b, 0, 8)),
  ];
  put(c.solid, mergeGeometries(parts), x, 0, z, ry);
  put(c.lit, mergeGeometries([box(4.2, 1.1, 0.12, PAL.yellow, -0.4, 1.9, 1.84), box(5.2, 0.16, 0.16, PAL.red, -0.4, 3.9, 2.2)]), x, 0, z, ry);
  c.blocks.push(Math.abs(Math.sin(ry)) > 0.5 ? [x - 2, z - 4.8, x + 2, z + 4.8] : [x - 4.8, z - 2, x + 4.8, z + 2]);
}

// ── 놀이·레저
export function hoop(c: Ctx, x: number, z: number, dir: number) {
  put(c.solid, mergeGeometries([
    cyl(0.15, 3.6, NEUTRAL.steel, 0, 0, 0, 0, 6), box(0.15, 1.1, 1.7, PAL.white, dir * 0.6, 3.0, 0), box(0.5, 0.06, 0.5, PAL.orange, dir * 1.2, 3.1, 0),
    box(0.08, 0.5, 0.5, PAL.cloud, dir * 1.2, 2.6, 0),
  ]), x, 0, z);
  block(c, x, z, 0.4);
}
export function skateRamps(c: Ctx, cx: number, cz: number) {
  const g: Geo[] = [];
  g.push(wedge(10, 2.2, 5, PAL.stone, -9, 0, -8), wedge(10, 2.2, 5, PAL.stone, 9, 0, -8), wedge(10, 2.2, 5, PAL.stone, 0, 0, 9, Math.PI));
  g.push(box(7, 1.1, 5, PAL.ash, 0, 0, 0), wedge(5, 1.1, 3, PAL.ash, 0, 0, 4.2, Math.PI), box(0.15, 0.9, 6, NEUTRAL.steel, 8, 0.3, 4), box(0.2, 0.3, 6, PAL.red, 8, 1.2, 4));
  put(c.solid, mergeGeometries(g), cx, 0.02, cz);
  c.blocks.push([cx - 14, cz - 10.8, cx + 14, cz - 5.2], [cx - 3.5, cz - 2.5, cx + 3.5, cz + 2.5]);
}
export function climbWall(c: Ctx, x: number, z: number) {
  const parts: Geo[] = [box(14, 11, 1.4, mix(PAL.slate, PAL.violet, 0.3), 0, 0, 0), box(15, 0.6, 2.2, PAL.steel, 0, 11, 0)];
  const cols = [PAL.red, PAL.yellow, PAL.lime, PAL.cyan, PAL.pink, PAL.orange];
  for (let i = 0; i < 26; i++) parts.push(box(0.7, 0.45, 0.5, cols[i % 6], -6 + ((i * 37) % 120) / 10, 0.8 + ((i * 53) % 95) / 10, -0.95));
  put(c.solid, mergeGeometries(parts), x, 0, z);
  put(c.lit, box(14, 0.2, 0.2, PAL.cyan, 0, 11.4, -0.8), x, 0, z);
  block(c, x, z, 7.2, 0.9);
}
export function swingSet(c: Ctx, x: number, z: number, h: number) {
  const g: Geo[] = [];
  for (const s of [-1, 1]) for (const d of [-1, 1]) g.push(beam([s * 4.2, 0, d * 2.6], [s * 3.6, h, 0], 0.28, 0.28, PAL.red));
  g.push(box(8.8, 0.35, 0.35, PAL.red, 0, h - 0.1, 0));
  put(c.solid, mergeGeometries(g), x, 0, z);
}
export function swingSeat(color: number): Geo {
  return mergeGeometries([box(1.5, 0.2, 0.7, color, 0, 0, 0), box(0.06, 4.2, 0.06, NEUTRAL.steel, -0.6, 0.1, 0), box(0.06, 4.2, 0.06, NEUTRAL.steel, 0.6, 0.1, 0)]);
}
export function slideSet(c: Ctx, x: number, z: number, h: number, len: number) {
  const g: Geo[] = [
    box(2.4, 0.3, 2.4, PAL.yellow, 0, h - 0.3, -1.2), ...[[-1.1, -2.2], [1.1, -2.2]].map(([a, b]) => box(0.25, h, 0.25, PAL.blue, a, 0, b)),
    beam([0, h - 0.1, 0], [0, 0.15, len], 2.0, 0.2, PAL.red), beam([-1.05, h + 0.5, 0], [-1.05, 0.7, len], 0.14, 0.8, PAL.orange), beam([1.05, h + 0.5, 0], [1.05, 0.7, len], 0.14, 0.8, PAL.orange),
    beam([-0.8, 0, -3.1], [-0.8, h, -2.2], 0.12, 0.12, NEUTRAL.steel), beam([0.8, 0, -3.1], [0.8, h, -2.2], 0.12, 0.12, NEUTRAL.steel),
  ];
  put(c.solid, mergeGeometries(g), x, 0, z);
  block(c, x, z - 1.5, 1.6, 1.8);
}
export function gardenBed(c: Ctx, x: number, z: number, hue: number, w = 7) {
  const parts: Geo[] = [box(w, 0.7, 2.2, PAL.wood, 0, 0, 0), box(w - 0.4, 0.2, 1.8, mix(PAL.clay, PAL.ink, 0.4), 0, 0.7, 0)];
  const cols = [[PAL.green, PAL.red], [PAL.lime, PAL.orange], [PAL.green, PAL.yellow], [PAL.teal, PAL.pink]][hue % 4];
  for (let i = 0; i < w - 1; i++) parts.push(ico(0.5, 0, cols[i % 2], -w / 2 + 0.9 + i * 1.0, 1.15, (i % 2 ? 0.35 : -0.35), 0, 0.9));
  put(c.solid, mergeGeometries(parts), x, 0, z);
  block(c, x, z, w / 2, 1.1);
}
export function frameArch(c: Ctx, x: number, z: number, span: number, h: number, color: number, ry = 0) {
  put(c.solid, mergeGeometries([box(1.6, h, 1.6, color, 0, 0, -span / 2), box(1.6, h, 1.6, color, 0, 0, span / 2), box(2, 1.6, span + 3, mix(color, PAL.white, 0.2), 0, h, 0), ico(1.4, 0, PAL.yellow, 0, h + 2.4, 0)]), x, 0, z, ry);
  put(c.lit, mergeGeometries([box(0.5, 0.5, span, PAL.yellow, 0.6, h - 0.1, 0), ico(0.9, 0, PAL.yellow, 0, h + 2.4, 0)]), x, 0, z, ry);
  block(c, x, z - span / 2, 1), block(c, x, z + span / 2, 1);
}
export const lampBulb = (c: Ctx, x: number, z: number, h = 5.2, color: number = PAL.amber) => {
  put(c.solid, cyl(0.12, h, NEUTRAL.steel, 0, 0, 0, 0, 5), x, 0, z);
  put(c.lit, ico(0.42, 0, mix(color, PAL.white, 0.5), 0, h, 0), x, 0, z);
};
