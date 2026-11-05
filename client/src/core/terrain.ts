// 지면 판정 (docs/design/WORLD.md 7.3, W6): 걸을 수 있는 땅 = 도시 외곽선 ∪ 야생지 외곽선 ∪ 다리 ∪ 해금된 섹터(섬) 사각형. 나머지는 허공(−Infinity).
// 높이는 core/heightmap.ts 가 부팅 때 구운 격자에서 보간한다. 이동·수배·비행 시스템은 이 함수들만 부르면 된다.
import {SECTORS} from '../data/sectors.js';
import {CITY_HALF, PASSES, PASS_W, type Rect} from '../data/world-map.js';
import {CITY_POLY, WILD_POLY} from '../data/outline.js';
import {WILD_BRIDGE} from '../data/wild.js';
import {inSector} from './geometry.js';
import {deckAt} from './deck.js';
import {heightAt} from './heightmap.js';
import {locked} from './progress.js';

export {CITY_HALF, PASSES, PASS_W};
export type {Rect};
const inRect = (x: number, z: number, r: Rect) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];

/** 지면 높이. 걸을 수 있는 땅이 아니면(허공·잠긴 섹터) −Infinity */
/** 건물 내부 방: 켜져 있는 동안 지면은 방 안의 평지(y=0)뿐이고, 벽·가구는 solidAt 이 막는다 (game/interior.ts) */
interface Room {
  rect: Rect;
  solids: Rect[];
}
let room: Room | null = null;
export const setRoom = (r: Room | null) => (room = r);
/** y(몸의 발 높이)를 주면 core/deck.ts 의 고가 상판·램프도 밟는다: y ≥ 데크 − 허용치면 데크 높이, 아니면 아래 지면 */
export function groundH(x: number, z: number, y?: number): number {
  if (room) return inRect(x, z, room.rect) ? 0 : -Infinity;
  const g = baseH(x, z);
  if (y === undefined) return g;
  const d = deckAt(x, z, y);
  return d !== undefined && d > g ? d : g;
}
function baseH(x: number, z: number): number {
  const land =
    (Math.abs(x) <= CITY_HALF && Math.abs(z) <= CITY_HALF) ||
    CITY_POLY.inside(x, z) ||
    WILD_POLY.inside(x, z) ||
    inRect(x, z, WILD_BRIDGE as unknown as Rect) ||
    SECTORS.some((_, i) => !locked(i) && inSector(x, z, i));
  return land ? heightAt(x, z) : -Infinity;
}
export const onGround = (x: number, z: number) => groundH(x, z) > -Infinity;

/** 걸어 오를 수 있는 최대 경사 (rise/run, 1 = 45°) 와 수치 오차 여유 */
const MAX_SLOPE = 0.9,
  SLACK = 0.05;
/** (x0,z0) 에서 높이 y0 인 몸이 (x1,z1) 로 걸어갈 수 있는가: 너무 가파른 오르막(능선 비탈)은 막힘 (허공으로 걸어 나가 떨어지는 것은 막지 않는다) */
export const walkable = (x0: number, z0: number, y0: number, x1: number, z1: number) =>
  groundH(x1, z1, y0) - y0 <= SLACK + MAX_SLOPE * Math.hypot(x1 - x0, z1 - z0);

// 건물·큰 소품 충돌체: 16u 해시 격자의 AABB
const CELL = 16;
export interface Solid {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** 높이 층(선택): y(발 높이)가 주어진 질의는 y ∈ [lo − 허용치, hi) 일 때만 막는다. up=true 는 고가 층 전용(난간 등) — y 없는 질의는 무시 */
  lo?: number;
  hi?: number;
  up?: boolean;
}
const grid = new Map<string, Solid[]>();
export function addSolid(x0: number, z0: number, x1: number, z1: number, lo?: number, hi?: number, up?: boolean) {
  const s: Solid = {x0, z0, x1, z1};
  if (up) s.up = true;
  if (lo !== undefined) s.lo = lo;
  if (hi !== undefined) s.hi = hi;
  for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++)
    for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) {
      const k = i + ',' + j;
      (grid.get(k) || grid.set(k, []).get(k)!).push(s);
    }
}
/** 움직이는 충돌체(세워 둔 차): 등록·제거할 수 있는 AABB 집합 */
const dyn = new Set<Solid>();
export const addDynSolid = (x0: number, z0: number, x1: number, z1: number): Solid => {
  const s = {x0, z0, x1, z1};
  dyn.add(s);
  return s;
};
export const dropDynSolid = (s: Solid | null) => s && dyn.delete(s);
/** 높이 층 판정: y 없으면 지상(lo 없는 것)만, y 있으면 [lo−허용치, hi) */
const layerOk = (s: Solid, y?: number) =>
  y === undefined ? !s.up : y >= (s.lo ?? -Infinity) - 1.4 && y < (s.hi ?? Infinity);
const hitBox = (s: Solid, x: number, z: number, r: number, y?: number) => {
  if (!layerOk(s, y)) return false;
  const dx = x - Math.max(s.x0, Math.min(x, s.x1)),
    dz = z - Math.max(s.z0, Math.min(z, s.z1));
  return dx * dx + dz * dz < r * r;
};
/** 반지름 r 인 원이 등록된 충돌체와 겹치는가 */
export function solidAt(x: number, z: number, r: number, y?: number) {
  if (room) {
    const [a, b, c, d] = room.rect;
    if (x - r < a || x + r > c || z - r < b || z + r > d) return true;
    return room.solids.some(s => x + r > s[0] && x - r < s[2] && z + r > s[1] && z - r < s[3]);
  }
  for (const d of dyn) if (hitBox(d, x, z, r, y)) return true;
  for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++)
    for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++)
      for (const s of grid.get(i + ',' + j) || []) {
        if (!layerOk(s, y)) continue;
        const dx = x - Math.max(s.x0, Math.min(x, s.x1)),
          dz = z - Math.max(s.z0, Math.min(z, s.z1));
        if (dx * dx + dz * dz < r * r) return true;
      }
  return false;
}
