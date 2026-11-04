// 지면 판정 (docs/WORLD.md 7.3): 걸을 수 있는 땅 = 도시 ∪ 해금된 섹터 사각형 ∪ 구역 사이 통로. 나머지는 허공(−Infinity).
// W0 는 높이가 전부 0 인 평지. 언덕·능선(W1)이 들어와도 이동·수배·비행 시스템은 이 함수들만 부르면 된다.
import {SECTORS} from '../data/sectors.js';
import {inSector} from './geometry.js';
import {locked} from './progress.js';

/** 도시 허브 반변 (한 변 300, 중심 (0,0)) */
export const CITY_HALF = 150;
/** 구역 사이 통로 폭 */
export const PASS_W = 40;
/** 통로가 양 끝 땅에 겹쳐 들어가는 길이 (이음매 틈 방지) */
const LAP = 1;
/** [x0, z0, x1, z1] 사각형 */
export type Rect = [number, number, number, number];

/** 가운데선 (ax,az)→(bx,bz) (축에 평행) 을 폭 PASS_W 로 두껍게 한 사각형 */
const strip = (ax: number, az: number, bx: number, bz: number): Rect => {
  const h = PASS_W / 2;
  return ax === bx
    ? [ax - h, Math.min(az, bz) - LAP, ax + h, Math.max(az, bz) + LAP]
    : [Math.min(ax, bx) - LAP, az - h, Math.max(ax, bx) + LAP, az + h];
};
/** 통로: 도시→S1, S1→S2, … S11→S12 순서 (WORLD 2.2 표의 "이전 구역 → 통로"). 문은 다음 구역의 입구 변에 닿는다 */
export const PASSES: Rect[] = [
  strip(0, -150, 0, -180),
  strip(80, -260, 150, -260),
  strip(270, -180, 270, -150),
  strip(270, 30, 270, 60),
  strip(270, 240, 270, 270),
  // 해협 V1 (S5 서안 ↔ S6 동안, 폭 140): 우주선이 구현되면 이 다리를 없애고 hovering() 일 때만 건너게 한다. 그 전엔 S6 문에 닿을 길이 없다
  strip(190, 350, 50, 350),
  strip(-110, 350, -140, 350),
  strip(-260, 270, -260, 240),
  strip(-270, 80, -270, 50),
  strip(-280, -130, -280, -160),
  strip(-270, -360, -270, -390),
  strip(-160, -500, -130, -500),
];
const inRect = (x: number, z: number, r: Rect) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];

/** 지면 높이. 걸을 수 있는 땅이 아니면(허공·잠긴 섹터) −Infinity */
export function groundH(x: number, z: number): number {
  const land =
    (Math.abs(x) <= CITY_HALF && Math.abs(z) <= CITY_HALF) ||
    PASSES.some(r => inRect(x, z, r)) ||
    SECTORS.some((_, i) => !locked(i) && inSector(x, z, i));
  return land ? 0 : -Infinity;
}
export const onGround = (x: number, z: number) => groundH(x, z) > -Infinity;

/** 한 걸음에 오를 수 있는 최대 높이 (이보다 높은 턱·절벽은 막힘) */
const STEP_UP = 1.4;
/** (x0,z0) 에서 높이 y0 인 몸이 (x1,z1) 로 걸어갈 수 있는가: 오르막 한계 검사 (허공으로 걸어 나가 떨어지는 것은 막지 않는다) */
export const walkable = (_x0: number, _z0: number, y0: number, x1: number, z1: number) => groundH(x1, z1) - y0 <= STEP_UP;

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
