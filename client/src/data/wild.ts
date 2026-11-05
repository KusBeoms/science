// 남부 야생지(도시 남쪽 다리 건너): 평야·시골·호수·사막·등산 가능한 산·교도소. 순수 데이터 — 높이 굽기(core/heightmap.ts), 색(render/terrain.ts), 장식(render/wild.ts), 교도소(systems/jail.ts)가 같이 쓴다.
import {BRIDGE_ENDS, WILD_DZ, WILD_POLY} from './outline.js';
import {SEABED_HW} from './bridge.js';
export type R4 = readonly [number, number, number, number];
/** 야생지 땅은 사각형이 아니라 data/outline.ts 의 WILD_POLY(시골 사진 윤곽). WILD_RECT = 그 bbox (장식 흩뿌리기 범위용 — 안/밖은 inWild) */
export const WILD_RECT: R4 = [Math.floor(WILD_POLY.x0), Math.floor(WILD_POLY.z0), Math.ceil(WILD_POLY.x1), Math.ceil(WILD_POLY.z1)];
export const inWild = (x: number, z: number) => WILD_POLY.inside(x, z);
/** 다리 밑 해협 바닥 띠(W6 BRIDGE, data/bridge.ts): 두 땅 사이 바다 바닥(−12)이 깔리는 사각형. 상판은 core/deck.ts 데크가 따로 맡는다 */
export const WILD_BRIDGE: R4 = [BRIDGE_ENDS.x - SEABED_HW, BRIDGE_ENDS.city - 10, BRIDGE_ENDS.x + SEABED_HW, BRIDGE_ENDS.wild + 40];
/** 야생지 내용 좌표는 옛 값 + WILD_DZ (W6: 윤곽 안에 들어가도록 남쪽으로 옮김) */
const D = WILD_DZ;
export const MOUNTAIN = {x: 0, z: 1110 + D, r: 200, h: 90};
/** 호수: 타원(rx,rz 반지름, rot 회전) · 수면 높이 level(바다 SEA_Y 와 독립) · 가장 깊은 곳 depth. r = 평균 반지름(동물·장식 배치용) */
export interface Lake {
  id: string;
  x: number;
  z: number;
  rx: number;
  rz: number;
  rot: number;
  level: number;
  depth: number;
  r: number;
}
export const LAKES: Lake[] = [
  // 큰 호수: 산(MOUNTAIN)과 남쪽 산맥 사이 분지, 동서로 길쭉
  {id: 'grand', x: 90, z: 1425 + D, rx: 235, rz: 105, rot: -0.12, level: -1.2, depth: 16, r: 170},
  // 시골 옆 작은 연못
  {id: 'pond', x: -60, z: 805 + D, rx: 62, rz: 44, rot: 0.5, level: -1.0, depth: 6, r: 53},
];
/** 호수 둘레를 두르는 산줄기(선분 a→b, 반폭 hw, 높이 h). 큰 호수 분지의 서·남·동쪽 벽 */
export interface Range {
  a: readonly [number, number];
  b: readonly [number, number];
  hw: number;
  h: number;
}
export const RANGES: Range[] = [
  {a: [-330, 1270 + D], b: [-300, 1600 + D], hw: 95, h: 58},
  {a: [-380, 1640 + D], b: [380, 1620 + D], hw: 100, h: 74},
  {a: [445, 1580 + D], b: [440, 1120 + D], hw: 85, h: 60},
];
/** 호숫가 길: 큰 호수 둘레 순환로 + 다리 끝(BRIDGE_ENDS)에서 이어지는 길. 폭 W, 길 높이는 호수 수면 + 1.8 */
export const LAKE_ROAD_W = 9;
/** 사막: x > DESERT.x0 이고 z > DESERT.z0 인 쪽, 가장자리는 부드럽게 섞인다 */
export const DESERT = {x0: 230, z0: 1330};
/** 시골(농지·마을) */
export const COUNTRY: R4 = [-250, 940, -70, 1180];
/** 교도소: 담장 사각형, 감방 위치, 헐거운 벽돌, 담장 틈, 출소 지점 */
export const JAIL = {
  rect: [-235, 1025 + D, -165, 1095 + D] as R4,
  flat: [-252, 1008 + D, -150, 1112 + D] as R4,
  cell: {x: -210, z: 1047 + D},
  /** 감방 서쪽 벽의 헐거운 벽돌 (E) */
  brick: {x: -215.2, z: 1047.5 + D},
  gap: {x0: -232.5, x1: -228.5, z: 1025 + D},
  release: {x: -200, z: 1018 + D},
};
export const SUMMIT = {x: MOUNTAIN.x, z: MOUNTAIN.z};
