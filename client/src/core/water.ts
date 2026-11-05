// 물 판정 (바다 + 호수). 렌더(render/water.ts)·차량 파손(systems/vehicle-damage.ts)·수영/낚시가 같이 쓴다.
// 물 덩어리는 registerWater 로 등록한다: inside(x,z) 로 대략적인 범위를 주고, 수면 높이 level 보다 지면이 낮은 곳이 실제 물이다.
// 바다는 기본 등록: 지면이 SEA_Y 보다 낮은 땅(허공 −Infinity 는 제외 = 낭떠러지는 물이 아니다).
import {SEA_Y} from '../data/world-map.js';
import {groundH} from './terrain.js';
import {LAKES} from '../data/wild.js';
import {lakeT} from './lake-shape.js';

export interface WaterBody {
  id: string;
  /** 수면 높이 */
  level: number;
  /** 이 덩어리가 차지할 수 있는 범위(대략) — 지면 높이 판정은 waterAt 이 한다 */
  inside: (x: number, z: number) => boolean;
}
export interface WaterHit {
  id: string;
  /** 수면 y */
  y: number;
  /** 수심 = 수면 − 지면 (>0) */
  depth: number;
}
const bodies: WaterBody[] = [];
export const registerWater = (b: WaterBody) => {
  const i = bodies.findIndex(o => o.id === b.id);
  if (i >= 0) bodies[i] = b;
  else bodies.push(b);
};
export const waterBodies = (): readonly WaterBody[] => bodies;

/** (x,z) 가 물속(지면이 수면 아래)이면 수면 정보, 아니면 null. 호수 우선, 그다음 바다 */
export function waterAt(x: number, z: number): WaterHit | null {
  const g = groundH(x, z);
  if (g === -Infinity) return null;
  for (const b of bodies) if (g < b.level && b.inside(x, z)) return {id: b.id, y: b.level, depth: b.level - g};
  return g < SEA_Y ? {id: 'sea', y: SEA_Y, depth: SEA_Y - g} : null;
}
/** 몸(발 y)이 물에 잠겨 있는 깊이 (0 = 안 잠김) */
export const submerged = (x: number, z: number, footY: number) => {
  const w = waterAt(x, z);
  return w ? Math.max(0, w.y - footY) : 0;
};

// 호수 등록: 수면 높이는 호수마다 다르다(data/wild.ts LAKES.level). inside 는 물가 굴곡을 넉넉히 덮는 범위(실제 물은 지면<level 인 곳).
for (const L of LAKES) registerWater({id: L.id, level: L.level, inside: (x, z) => lakeT(L, x, z) < 1.4});
/** 호수 id 로 등록 정보 찾기 */
export const lakeById = (id: string) => LAKES.find(L => L.id === id);
