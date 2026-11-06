// 온사이트 건물 셸 계획 (W8 INTERIOR): BuildingSource + 대지 높이 → 벽 두께·층고·문·창 위치. 외관(shell.ts)과 실내(interior-onsite.ts)가 같은 계획을 쓴다.
// 좌표: 건물 로컬(발자국 중심이 원점, 회전 전, 정면 +z, y=0 이 대지 높이). 월드 배치는 Placement 의 (x,y,z,rot) 로 한다.
// 벽 로컬 프레임: 벽 두께 중앙이 원점, u = 벽을 따라(가로), v = 바깥쪽 법선(+), y = 위. 4면의 변환은 sideFrame 이 준다.
import type {BuildingSource} from '../../data/city-schema.js';
import {SCALE} from '../../data/city-schema.js';
import {hash2} from '../lowpoly/rng.js';

export type Side = 's' | 'n' | 'e' | 'w';
export interface SideFrame {
  /** 벽 로컬 원점의 건물 로컬 좌표 */
  px: number; pz: number;
  /** three rotation.y (라디안): 벽 로컬 → 건물 로컬 */
  ry: number;
  /** 벽 길이(모서리 겹침 제외) */
  len: number;
}
export interface WinSlot {
  side: Side;
  /** 벽 로컬 가로 중심 */
  u: number;
  w: number; h: number;
  /** 바닥(floorTop)에서 창 아래까지 */
  sill: number;
  /** 밤에 바깥에서 불이 켜진 것으로 보이는가(실내가 안 올라온 먼 건물용) */
  lit: boolean;
}
export interface DoorPlan {
  side: Side;
  u: number;
  w: number; h: number;
  /** 문 개구 중심(벽 두께 중앙)의 건물 로컬 좌표 */
  x: number; z: number;
  /** 바깥 법선(건물 로컬) */
  nx: number; nz: number;
}
export interface ShellPlan {
  w: number; d: number;
  /** 외벽 두께 · 슬라브 두께 */
  t: number; slab: number;
  floors: number;
  /** 1층 층고(바닥~바닥) · 위층 층고 */
  fh0: number; fhU: number;
  /** 지붕 슬라브 윗면 높이 */
  H: number;
  /** 대지 아래로 내리는 기초 깊이(비탈에서 틈을 가린다) */
  skirt: number;
  /** 마감 바닥 윗면(건물 로컬 y) = 걷는 높이 */
  floorTop: number;
  /** 1층 천장 아랫면 */
  ceil: number;
  door: DoorPlan;
  windows: WinSlot[];
  /** 가게형 전면(큰 쇼윈도·차양) */
  shopFront: boolean;
  house: boolean;
  seed: number;
}
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function sideFrame(side: Side, w: number, d: number, t: number): SideFrame {
  switch (side) {
    case 's': return {px: 0, pz: d / 2 - t / 2, ry: 0, len: w};
    case 'n': return {px: 0, pz: -(d / 2 - t / 2), ry: Math.PI, len: w};
    case 'e': return {px: w / 2 - t / 2, pz: 0, ry: Math.PI / 2, len: d - 2 * t};
    default: return {px: -(w / 2 - t / 2), pz: 0, ry: -Math.PI / 2, len: d - 2 * t};
  }
}
/** 벽 로컬 (u, v) → 건물 로컬 (x, z) */
export function wallToLocal(f: SideFrame, u: number, v: number): {x: number; z: number} {
  const c = Math.cos(f.ry), s = Math.sin(f.ry);
  return {x: f.px + u * c + v * s, z: f.pz - u * s + v * c};
}
/** 건물 로컬 (x, z) → 벽 로컬 u (가로 좌표) */
export const localToU = (f: SideFrame, x: number, z: number): number => (x - f.px) * Math.cos(f.ry) - (z - f.pz) * Math.sin(f.ry);
export const normalOf = (side: Side): [number, number] => (side === 's' ? [0, 1] : side === 'n' ? [0, -1] : side === 'e' ? [1, 0] : [-1, 0]);
export const SIDES: Side[] = ['s', 'n', 'e', 'w'];

/** 한 벽의 1층 창 위치(문 구간은 비운다) */
function windowsOn(side: Side, len: number, door: DoorPlan | null, front: boolean, seed: number): WinSlot[] {
  const big = front && door !== null,
    ww = big ? 2.4 : SCALE.door.w + 0.2, // 일반 창 1.2
    wh = big ? 1.9 : 1.2,
    sill = big ? 0.5 : 0.9,
    pitch = big ? 3.6 : 3.2,
    n = Math.max(0, Math.min(3, Math.floor((len - 1.8 + (pitch - ww)) / pitch))),
    span = (n - 1) * pitch,
    out: WinSlot[] = [];
  for (let k = 0; k < n; k++) {
    const u = -span / 2 + k * pitch;
    if (door && Math.abs(u - door.u) < ww / 2 + door.w / 2 + 0.45) continue;
    if (Math.abs(u) + ww / 2 > len / 2 - 0.5) continue;
    out.push({side, u, w: ww, h: wh, sill, lit: hash2(seed, out.length + side.charCodeAt(0), 21) < 0.7});
  }
  return out;
}

export function planShell(src: BuildingSource, groundY: number): ShellPlan {
  const def = src.interior,
    w = Math.max(3, src.w), d = Math.max(3, src.d),
    t = clamp(def.wallThick ?? SCALE.wallThick, 0.2, 0.5),
    slab = clamp(def.slab ?? 0.4, 0.2, 0.5),
    floors = Math.max(1, Math.round(src.floors)),
    fh0 = Math.max(SCALE.ceilingMin + slab + 0.1, def.floorH || SCALE.floorH[src.style as keyof typeof SCALE.floorH] || 3),
    fhU = src.style === 'shop' ? 3.2 : fh0,
    step = clamp(def.floorY !== undefined ? def.floorY - groundY : 0.05, 0, 0.6),
    seed = [...src.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const dd = def.door,
    side: Side = dd.facing,
    f = sideFrame(side, w, d, t),
    dw = clamp(dd.w || SCALE.door.w, SCALE.door.wMin, SCALE.door.wMax),
    dh = clamp(dd.h || SCALE.door.h, SCALE.door.hMin, fh0 - slab - 0.4),
    du = clamp(localToU(f, dd.x, dd.z), -f.len / 2 + dw / 2 + 0.5, f.len / 2 - dw / 2 - 0.5),
    dpos = wallToLocal(f, du, 0),
    [nx, nz] = normalOf(side),
    door: DoorPlan = {side, u: du, w: dw, h: dh, x: dpos.x, z: dpos.z, nx, nz};
  const windows: WinSlot[] = [];
  for (const s of SIDES) windows.push(...windowsOn(s, sideFrame(s, w, d, t).len, s === side ? door : null, s === side, seed));
  return {
    w, d, t, slab, floors, fh0, fhU, H: fh0 + (floors - 1) * fhU, skirt: 1.2, floorTop: step, ceil: fh0 - slab,
    door, windows, shopFront: src.style === 'shop', house: src.style === 'house' || src.style === 'lodge' || src.style === 'barn', seed,
  };
}
