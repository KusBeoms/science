// 지면 판정 (docs/WORLD.md 7.3): 걸을 수 있는 땅 = 도시 ∪ 해금된 섹터 사각형 ∪ 구역 사이 통로. 나머지는 허공(−Infinity).
// 높이는 core/heightmap.ts 가 부팅 때 구운 격자에서 보간한다. 이동·수배·비행 시스템은 이 함수들만 부르면 된다.
import {SECTORS} from '../data/sectors.js';
import {CITY_HALF, PASSES, PASS_W, type Rect} from '../data/world-map.js';
import {inSector} from './geometry.js';
import {heightAt} from './heightmap.js';
import {locked} from './progress.js';

export {CITY_HALF, PASSES, PASS_W};
export type {Rect};
const inRect = (x: number, z: number, r: Rect) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];

/** 지면 높이. 걸을 수 있는 땅이 아니면(허공·잠긴 섹터) −Infinity */
export function groundH(x: number, z: number): number {
  const land =
    (Math.abs(x) <= CITY_HALF && Math.abs(z) <= CITY_HALF) ||
    PASSES.some(r => inRect(x, z, r)) ||
    SECTORS.some((_, i) => !locked(i) && inSector(x, z, i));
  return land ? heightAt(x, z) : -Infinity;
}
export const onGround = (x: number, z: number) => groundH(x, z) > -Infinity;

/** 걸어 오를 수 있는 최대 경사 (rise/run, 1 = 45°) 와 수치 오차 여유 */
const MAX_SLOPE = 0.9,
  SLACK = 0.05;
/** (x0,z0) 에서 높이 y0 인 몸이 (x1,z1) 로 걸어갈 수 있는가: 너무 가파른 오르막(능선 비탈)은 막힘 (허공으로 걸어 나가 떨어지는 것은 막지 않는다) */
export const walkable = (x0: number, z0: number, y0: number, x1: number, z1: number) =>
  groundH(x1, z1) - y0 <= SLACK + MAX_SLOPE * Math.hypot(x1 - x0, z1 - z0);

// 건물·큰 소품 충돌체: 16u 해시 격자의 AABB
const CELL = 16;
interface Solid {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}
const grid = new Map<string, Solid[]>();
export function addSolid(x0: number, z0: number, x1: number, z1: number) {
  const s = {x0, z0, x1, z1};
  for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++)
    for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) {
      const k = i + ',' + j;
      (grid.get(k) || grid.set(k, []).get(k)!).push(s);
    }
}
/** 반지름 r 인 원이 등록된 충돌체와 겹치는가 */
export function solidAt(x: number, z: number, r: number) {
  for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++)
    for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++)
      for (const s of grid.get(i + ',' + j) || []) {
        const dx = x - Math.max(s.x0, Math.min(x, s.x1)),
          dz = z - Math.max(s.z0, Math.min(z, s.z1));
        if (dx * dx + dz * dz < r * r) return true;
      }
  return false;
}
