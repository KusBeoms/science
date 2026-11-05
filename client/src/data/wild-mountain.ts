// 시골 섬 산(W7 RURAL): 정상에서 여러 능선이 뻗고 사이에 계곡·개울이 있는 비대칭 산. 순수 데이터.
// 높이 식은 core/wild-mountain.ts, 스위치백 등산로는 core/wild-trail.ts, 장식은 render/wild-mountain.ts.
import {MOUNTAIN} from './wild.js';

export type P2 = readonly [number, number];
/** 능선(정상 P 에서 e 로 뻗는 캡슐): hEnd = 끝 높이, hw0 = 정상 쪽 반폭(아래로 갈수록 넓어진다), pow = 높이가 낮아지는 곡선 */
export interface Spine {
  id: string;
  e: P2;
  hEnd: number;
  hw0: number;
  pow: number;
}
export const PEAK: P2 = [MOUNTAIN.x, MOUNTAIN.z];
export const SPINES: Spine[] = [
  {id: 'south', e: [30, 1470], hEnd: 14, hw0: 95, pow: 1.25},
  {id: 'southeast', e: [200, 1398], hEnd: 14, hw0: 80, pow: 1.3},
  {id: 'west', e: [-135, 1330], hEnd: 16, hw0: 85, pow: 1.3},
  {id: 'southwest', e: [-70, 1425], hEnd: 20, hw0: 78, pow: 1.2},
  {id: 'east', e: [182, 1255], hEnd: 24, hw0: 66, pow: 1.1},
  {id: 'north', e: [72, 1122], hEnd: 26, hw0: 66, pow: 1.0},
];
/** 정상 평지(정자)의 높이와 반지름 */
export const SUMMIT_Y = 86,
  SUMMIT_FLAT = 8;

/** 산기슭 주차장(축 정렬 사각형, 길 높이) · 등산로 입구 · 산장 */
export const LOT = {x: 214, z: 1470, w: 44, d: 26, y: 0.6};
export const TRAILHEAD: P2 = [LOT.x - 22, LOT.z - 16];
export const LODGE = {x: 172, z: 1452, ry: 0.2};
/** 개울: 산 계곡에서 시작해 호수로 흘러드는 폴리라인(폭 STREAM_W). 지면을 파고 파란 띠를 깐다 */
export const STREAM_W = 2.8;
export const STREAMS: {id: string; pts: P2[]}[] = [
  {id: 'west', pts: [[-95, 1262], [-150, 1318], [-205, 1360], [-240, 1410], [-232, 1465], [-196, 1510], [-150, 1548], [-118, 1588]]},
  {id: 'east', pts: [[104, 1262], [128, 1320], [140, 1380], [132, 1436], [122, 1490], [114, 1540]]},
  {id: 'north', pts: [[60, 1130], [40, 1090], [-4, 1062], [-30, 1052]]},
];
