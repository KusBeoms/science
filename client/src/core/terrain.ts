// 지면 판정 (docs/design/WORLD.md 7.3, W6): 걸을 수 있는 땅 = 도시 외곽선 ∪ 야생지 외곽선 ∪ 다리 ∪ 해금된 섹터(섬) 사각형. 나머지는 허공(−Infinity).
// 높이는 core/heightmap.ts 가 부팅 때 구운 격자에서 보간한다. 이동·수배·비행 시스템은 이 함수들만 부르면 된다.
import {SECTORS} from '../data/sectors.js';
import {CITY_HALF, PASSES, PASS_W, type Rect} from '../data/world-map.js';
import {CITY_POLY, WILD_POLY} from '../data/outline.js';
import {WILD_BRIDGE} from '../data/wild.js';
import {inSector} from './geometry.js';
import {deckAt} from './deck.js';
import {hitAny} from './solids.js';
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

// 건물·큰 소품 충돌체: 저장·해시 격자·소유자 API 는 core/solids.ts (W8 P2-a). 기존 이름은 그대로 re-export 한다.
export {
  addSolid, addSolidOBB, removeSolid, removeSolidsByOwner, replaceSolids, solidsOwnedBy, solidOwners, solidCount, solidCellEntries, solidCellCount,
  addDynSolid, dropDynSolid, dynSolidCount, dynCellEntries, dynHitLinear,
} from './solids.js';
export type {Solid, SolidSpec} from './solids.js';

/** 반지름 r 인 원이 등록된 충돌체와 겹치는가 */
export function solidAt(x: number, z: number, r: number, y?: number) {
  if (room) {
    const [a, b, c, d] = room.rect;
    if (x - r < a || x + r > c || z - r < b || z + r > d) return true;
    return room.solids.some(s => x + r > s[0] && x - r < s[2] && z + r > s[1] && z - r < s[3]);
  }
  return hitAny(x, z, r, y);
}
