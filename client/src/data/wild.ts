// 남부 야생지(시골 섬, W7 RURAL 재구성): 참조 'Pastoral Island Mountain and Lakes Map' 배치.
// 북쪽 꼭짓점에서 다리 → 곧은 간선(동쪽 비탈) → 큰 호수 순환로, 가운데 비대칭 산(능선·계곡·스위치백 등산로·정상 정자), 북서 작은 호수 마을,
// 서쪽 계단식 논밭 모자이크, 동쪽 모래 반도. 순수 데이터 — 높이 굽기(core/wild-height.ts)·색(render/wild-color.ts)·장식(render/wild*.ts, rural-*.ts)·교도소(systems/jail.ts)가 같이 쓴다.
import {BRIDGE_ENDS, WILD_POLY} from './outline.js';
import {SEABED_HW} from './bridge.js';
export type R4 = readonly [number, number, number, number];
/** 야생지 땅은 사각형이 아니라 data/outline.ts 의 WILD_POLY(시골 사진 윤곽). WILD_RECT = 그 bbox (장식 흩뿌리기 범위용 — 안/밖은 inWild) */
export const WILD_RECT: R4 = [Math.floor(WILD_POLY.x0), Math.floor(WILD_POLY.z0), Math.ceil(WILD_POLY.x1), Math.ceil(WILD_POLY.z1)];
export const inWild = (x: number, z: number) => WILD_POLY.inside(x, z);
/** 다리 밑 해협 바닥 띠(W6 BRIDGE, data/bridge.ts): 두 땅 사이 바다 바닥(−12)이 깔리는 사각형. 상판은 core/deck.ts 데크가 따로 맡는다 */
export const WILD_BRIDGE: R4 = [BRIDGE_ENDS.x - SEABED_HW, BRIDGE_ENDS.city - 10, BRIDGE_ENDS.x + SEABED_HW, BRIDGE_ENDS.wild + 40];

/** 산: (x,z) = 정상(SUMMIT), h = 정상 높이, r = 능선 포함 발자국 반경(동물·지도용 대략값). 모양은 data/wild-mountain.ts 의 능선들 */
export const MOUNTAIN = {x: 56, z: 1190, r: 250, h: 90};
export const SUMMIT = {x: MOUNTAIN.x, z: MOUNTAIN.z};

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
  // 남쪽 큰 타원 호수: 순환 도로·벚꽃·갈대·산책로
  {id: 'grand', x: 85, z: 1662, rx: 243, rz: 112, rot: -0.05, level: -1.2, depth: 16, r: 170},
  // 북서 작은 둥근 호수: 선착장 + 둘레 마을
  {id: 'pond', x: -85, z: 1035, rx: 66, rz: 56, rot: 0.3, level: -1.0, depth: 6, r: 58},
];
/** 호숫가 길 폭(큰 호수 순환로·간선). 갈래길은 data/wild-road.ts 의 줄마다 폭이 다르다 */
export const LAKE_ROAD_W = 9;

/** 동쪽 모래 반도(해변): x > x0 이고 z > z0 인 쪽의 바닷가가 모래·야자·해안 바위 */
export const DESERT = {x0: 440, z0: 1400};
/** 목장(소·농가 마당): 서쪽 농지 한가운데의 풀밭 구역. 이 안은 밭을 깔지 않는다 */
export const COUNTRY: R4 = [-330, 1060, -190, 1170];

/** 교도소: 담장 사각형, 감방 위치, 헐거운 벽돌, 담장 틈, 출소 지점 (서쪽 농지 한가운데 — 좌표는 W6 그대로) */
export const JAIL = {
  rect: [-235, 1225, -165, 1295] as R4,
  flat: [-252, 1208, -150, 1312] as R4,
  cell: {x: -210, z: 1247},
  /** 감방 서쪽 벽의 헐거운 벽돌 (E) */
  brick: {x: -215.2, z: 1247.5},
  gap: {x0: -232.5, x1: -228.5, z: 1225},
  release: {x: -200, z: 1218},
};
