// W7 평평한 곡선·띠 메시: 중앙 원형 광장(동심원·방사 줄무늬·모서리 잔디) · 방사 대로 4갈래(아스팔트·보도·점선·끝 광장) · 육상 트랙(붉은 타원·레인선·안쪽 잔디) · 동쪽 공원 연못 · 아레나 광장 동심원.
// 1u 칸 지면(layout.ts)에 곡선을 그리면 계단이 져서 삼각형이 폭증하므로, 지면 위 y≈0.06~0.1 에 얇은 정점색 판을 얹는다(지도 시점에서도 바르게 보인다). 칸(110u)마다 병합 메시 1개 → 컬링.
import {CENTER_CIRCLE, RADIALS, W7_FEATURES as F} from '../../data/roads-w7.js';
import {PAL, mix} from '../lowpoly/palette.js';
import {Buf} from '../overpass-buf.js';

export const TRK = {cx: (F.track[0] + F.track[2]) / 2, cz: (F.track[1] + F.track[3]) / 2, rx: 20.5, rz: 28.5};
export const POND_E = {cx: (F.eastPark[0] + F.eastPark[2]) / 2, cz: (F.eastPark[1] + F.eastPark[3]) / 2 - 1, rx: 12, rz: 8};
export const ARENA_C = {x: (F.arena[0] + F.arena[2]) / 2, z: (F.arena[1] + F.arena[3]) / 2};

const C = {
  paveA: PAL.paving,
  paveB: mix(PAL.paving, PAL.bone, 0.4),
  brick: mix(PAL.brick, PAL.paving, 0.45),
  white: mix(PAL.cloud, PAL.paving, 0.12),
  asph: PAL.asphalt,
  yel: mix(PAL.amber, PAL.asphalt, 0.2),
  lawn: mix(PAL.green, PAL.stone, 0.4),
  track: mix(PAL.tileRed, PAL.brick, 0.3),
  infield: mix(PAL.lime, PAL.green, 0.4),
  pond: mix(PAL.cyan, PAL.blue, 0.3),
  path: mix(PAL.bone, PAL.paving, 0.35),
};
const cellOf = (x: number, z: number) => Math.floor(x / 110) + ',' + Math.floor(z / 110);

type Ell = {cx: number; cz: number; rx: number; rz: number};
/** 타원(또는 원) 고리: 안 비율 q0, 바깥 비율 q1 (둘 다 rx·rz 에 대한 배율), 호 a0→a1 */
function ring(b: Buf, e: Ell, q0: number, q1: number, color: number, y: number, seg = 40, a0 = 0, a1 = Math.PI * 2) {
  for (let i = 0; i < seg; i++) {
    const s = a0 + ((a1 - a0) * i) / seg, t = a0 + ((a1 - a0) * (i + 1)) / seg,
      p = (q: number, a: number): [number, number, number] => [e.cx + Math.cos(a) * e.rx * q, y, e.cz + Math.sin(a) * e.rz * q];
    b.quad(p(q0, s), p(q1, s), p(q1, t), p(q0, t), color);
  }
}
/** 채운 타원 (q0=0 이면 부채꼴 삼각형 묶음) */
function disc(b: Buf, e: Ell, color: number, y: number, seg = 24) {
  for (let i = 0; i < seg; i++) {
    const s = (Math.PI * 2 * i) / seg, t = (Math.PI * 2 * (i + 1)) / seg;
    b.tri([e.cx, y, e.cz], [e.cx + Math.cos(t) * e.rx, y, e.cz + Math.sin(t) * e.rz], [e.cx + Math.cos(s) * e.rx, y, e.cz + Math.sin(s) * e.rz], color);
  }
}
/** 중심선 a→b, 반폭 hw 인 띠 */
function strip(b: Buf, ax: number, az: number, bx: number, bz: number, hw: number, color: number, y: number, off = 0) {
  const L = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / L, nz = (bx - ax) / L, o = off;
  b.quad([ax + nx * (o - hw), y, az + nz * (o - hw)], [bx + nx * (o - hw), y, bz + nz * (o - hw)], [bx + nx * (o + hw), y, bz + nz * (o + hw)], [ax + nx * (o + hw), y, az + nz * (o + hw)], color);
}

export function buildFlat(): any {
  const grp = new THREE.Group();
  grp.name = 'w7-flat';
  const cells = new Map<string, Buf>(),
    at = (x: number, z: number) => cells.get(cellOf(x, z)) || cells.set(cellOf(x, z), new Buf()).get(cellOf(x, z))!;
  // ── 중앙 원형 광장: 동심원 + 8 방사선 + 네 모서리 잔디
  {
    const b = at(0, 0), e: Ell = {cx: 0, cz: 0, rx: 1, rz: 1}, R = CENTER_CIRCLE.r;
    for (const [r0, r1, c] of [[24, 27.4, C.paveB], [27.4, 28.6, C.white], [28.6, 33, C.paveA], [33, 35, C.brick], [35, 39.5, C.paveA], [39.5, 43.8, C.paveB], [43.8, 46.2, C.brick], [46.2, R, C.white]] as [number, number, number][])
      ring(b, e, r0, r1, c, 0.07, 48);
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      strip(b, Math.cos(a) * 24.5, Math.sin(a) * 24.5, Math.cos(a) * 44, Math.sin(a) * 44, 0.45, C.white, 0.09);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x0 = Math.min(sx * 34, sx * 50), x1 = Math.max(sx * 34, sx * 50), z0 = Math.min(sz * 34, sz * 50), z1 = Math.max(sz * 34, sz * 50);
      b.quad([x0, 0.06, z0], [x1, 0.06, z0], [x1, 0.06, z1], [x0, 0.06, z1], C.lawn);
    }
  }
  // ── 방사 대로: 보도 + 아스팔트 + 중앙 점선 + 끝 광장 원판
  for (const rd of RADIALS) {
    const b = at((rd.x0 + rd.x1) / 2, (rd.z0 + rd.z1) / 2), L = Math.hypot(rd.x1 - rd.x0, rd.z1 - rd.z0), ux = (rd.x1 - rd.x0) / L, uz = (rd.z1 - rd.z0) / L,
      hw = rd.w / 2, sw = rd.sw;
    strip(b, rd.x0, rd.z0, rd.x1, rd.z1, hw + sw, C.paveA, 0.08);
    strip(b, rd.x0, rd.z0, rd.x1, rd.z1, hw, C.asph, 0.1);
    for (let t = 2; t < L - 8; t += 4) strip(b, rd.x0 + ux * t, rd.z0 + uz * t, rd.x0 + ux * (t + 2), rd.z0 + uz * (t + 2), 0.22, C.yel, 0.12);
    const end = {cx: rd.x1, cz: rd.z1, rx: hw + sw, rz: hw + sw};
    disc(b, end, C.paveA, 0.09, 20);
    disc(b, {...end, rx: 3.6, rz: 3.6}, C.brick, 0.11, 16);
  }
  // ── 육상 트랙: 바깥 포장 → 붉은 레인 → 레인선 3 → 안쪽 흰 띠 → 잔디
  {
    const b = at(TRK.cx, TRK.cz), e = TRK;
    ring(b, e, 1, 1.16, C.paveA, 0.06, 40);
    ring(b, e, 0.62, 1, C.track, 0.07, 40);
    for (const q of [0.72, 0.82, 0.92]) ring(b, e, q - 0.008, q + 0.008, C.white, 0.09, 40);
    ring(b, e, 0.58, 0.62, C.white, 0.09, 40);
    disc(b, {...e, rx: e.rx * 0.58, rz: e.rz * 0.58}, C.infield, 0.08, 32);
    strip(b, e.cx, e.cz - e.rz * 0.5, e.cx, e.cz + e.rz * 0.5, 0.3, C.white, 0.1);
  }
  // ── 동쪽 공원 연못 + 둘레 길
  {
    const b = at(POND_E.cx, POND_E.cz);
    ring(b, POND_E, 1, 1.22, C.path, 0.06, 28);
    disc(b, POND_E, C.pond, 0.07, 28);
  }
  // ── 아레나 광장 동심원
  {
    const b = at(ARENA_C.x, ARENA_C.z), e: Ell = {cx: ARENA_C.x, cz: ARENA_C.z, rx: 1, rz: 1};
    for (const [r0, r1, c] of [[17, 19, C.paveB], [19, 20.4, C.paveA], [20.4, 21, C.white]] as [number, number, number][]) ring(b, e, r0, r1, c, 0.07, 36);
    disc(b, {...e, rx: 17, rz: 17}, C.paveA, 0.065, 28);
  }
  const mat = new THREE.MeshLambertMaterial({vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2});
  cells.forEach(b => grp.add(new THREE.Mesh(b.geo(), mat)));
  return grp;
}
