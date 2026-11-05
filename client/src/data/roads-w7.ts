// 도시 7차(W7 CITY_DENSITY): 시가지(±335)를 참조 이미지처럼 빽빽하게 — 방사형 대로·중앙 원형 광장·구획 예약·특색 시설 좌표.
// 순수 데이터(렌더/충돌/군중이 함께 읽는다). 건물은 data/city-w7.ts 가 이 파일의 예약 구역을 피해 대로변을 채운다.
// 이 파일은 city-w3.ts(RESERVED)가 읽으므로 다른 data 파일을 import 하지 않는다(타입만).
import type {CityPlaza, CityRoad} from './city.js';

export type Rect4 = readonly [number, number, number, number];

/** 중앙 원형 광장: 중심 (0,0) 반지름 48 — 정사각 광장(±50) 안에 내접한다. 기지 부지·오러리·기존 4개 축 도로는 그대로 */
export const CENTER_CIRCLE = {x: 0, z: 0, r: 48, inner: 30};

/** 방사 대로(대각선): 중앙 원에서 45° 로 뻗는다. 양옆 보도 sw. 끝에는 작은 원형 광장(ENDS) */
export interface Radial {
  id: string;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  w: number;
  sw: number;
}
export const RADIALS: readonly Radial[] = [
  {id: 'rad-ne', x0: 34, z0: -34, x1: 70, z1: -70, w: 12, sw: 2.5},
  {id: 'rad-se', x0: 34, z0: 34, x1: 70, z1: 70, w: 12, sw: 2.5},
  {id: 'rad-sw', x0: -34, z0: 34, x1: -70, z1: 70, w: 12, sw: 2.5},
  {id: 'rad-nw', x0: -34, z0: -34, x1: -62, z1: -62, w: 12, sw: 2.5},
];
/** 방사 대로 끝의 작은 원형 광장 (중심·반지름) — 중앙에 나무·기념물 */
export const RADIAL_ENDS: readonly {x: number; z: number; r: number}[] = [];

/** 새 골목(축에 평행한 도로). 신도심 생성기(city-w7.ts)가 양옆을 채운다 */
const st = (id: string, x0: number, z0: number, x1: number, z1: number, w = 7, sw = 2.5, car = true): CityRoad => ({id, x0, z0, x1, z1, w, sidewalk: sw, car});
export const ROADS_W7: readonly CityRoad[] = [];
export const PLAZAS_W7: readonly CityPlaza[] = [];

/** 특색 시설 구획 (건물 생성기가 비켜 가고, render/city/w7-*.ts 가 그린다) */
export const W7_FEATURES = {
  track: [287, -190, 331, -128] as Rect4, // 육상 트랙(붉은 타원 + 초록 안쪽 잔디)
  parking: [211, -189, 265, -124] as Rect4, // 스타디움 주차장
  tanks: [287, -122, 331, -64] as Rect4, // 원통형 저장 탱크 + 설비 건물
  eastPark: [287, -58, 331, -14] as Rect4, // 동쪽 공원(연못·산책로)
  courts: [287, 14, 331, 62] as Rect4, // 테니스 코트
  fields: [287, 68, 331, 150] as Rect4, // 축구장 2면
  arena: [92, 214, 136, 262] as Rect4, // 남쪽 원형 아레나
} as const;

/** RESERVED 에 펼쳐 넣는다: 시설 구획 */
export const W7_RESERVED: readonly Rect4[] = Object.values(W7_FEATURES);
