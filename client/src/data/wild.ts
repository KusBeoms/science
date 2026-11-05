// 남부 야생지(도시 남쪽 다리 건너): 평야·시골·호수·사막·등산 가능한 산·교도소. 순수 데이터 — 높이 굽기(core/heightmap.ts), 색(render/terrain.ts), 장식(render/wild.ts), 교도소(systems/jail.ts)가 같이 쓴다.
export type R4 = readonly [number, number, number, number];
/** 야생지 땅 사각형, 도시에서 오는 다리(폭 40) */
export const WILD_RECT: R4 = [-340, 700, 340, 1280];
export const WILD_BRIDGE: R4 = [280, 330, 320, 705];
export const MOUNTAIN = {x: 0, z: 1110, r: 200, h: 90};
export const LAKES = [
  {x: 130, z: 840, r: 82, depth: 11},
  {x: -30, z: 1010, r: 42, depth: 8},
];
/** 사막: x > DESERT.x0 이고 z > DESERT.z0 인 쪽, 가장자리는 부드럽게 섞인다 */
export const DESERT = {x0: 175, z0: 880};
/** 시골(농지·마을) */
export const COUNTRY: R4 = [-338, 716, -70, 980];
/** 교도소: 담장 사각형, 감방 위치, 헐거운 벽돌, 담장 틈, 출소 지점 */
export const JAIL = {
  rect: [-235, 1025, -165, 1095] as R4,
  flat: [-252, 1008, -150, 1112] as R4,
  cell: {x: -210, z: 1047},
  /** 감방 서쪽 벽의 헐거운 벽돌 (E) */
  brick: {x: -215.2, z: 1047.5},
  gap: {x0: -232.5, x1: -228.5, z: 1025},
  release: {x: -200, z: 1018},
};
export const SUMMIT = {x: MOUNTAIN.x, z: MOUNTAIN.z};
