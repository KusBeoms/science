// 배치 단계 설정표: 건물 양식별 대지·건물 치수(SCALE.md 2-2), 용도별 기본 밀도·녹지율 목표, 소품 자산 점유.
import type {BuildingStyle, ZoneSource, ZoneUse} from '../data/city-schema.js';

export interface StyleCfg {
  /** 도로를 따라 대지 한 칸의 폭(전면, m)과 깊이 */
  pitch: number; depth: number;
  /** 대지 앞 경계에서 건물 앞면까지(앞뜰·주차 영역), 옆·뒤 여유 */
  front: number; side: number; rear: number;
  w: [number, number]; d: [number, number];
  /** 층수 후보와 가중치 */
  floors: number[]; fw: number[];
  floorH: number;
  door: {w: number; h: number};
  /** 대지 안 주차: none | forecourt(상점 앞) | lot(단지/공공) */
  park: 'none' | 'forecourt' | 'lot';
  /** 필요한 최소 실내 면적(m², 벽 두께 제외 후): 방 최소 크기에서 역산 */
  minInterior: number;
}
export const STYLE_CFG: Record<BuildingStyle, StyleCfg> = {
  house: {pitch: 16, depth: 26, front: 6, side: 2, rear: 4, w: [8, 12], d: [7, 10], floors: [1, 2, 3], fw: [4, 5, 1.5], floorH: 3.0, door: {w: 1.0, h: 2.1}, park: 'none', minInterior: 32},
  shop: {pitch: 14, depth: 24, front: 3, side: 1.5, rear: 3, w: [9, 12], d: [11, 16], floors: [1, 2, 3], fw: [4, 4, 1.5], floorH: 4.2, door: {w: 1.8, h: 2.4}, park: 'forecourt', minInterior: 70},
  apartment: {pitch: 60, depth: 46, front: 15, side: 4, rear: 4, w: [24, 40], d: [13, 15], floors: [5, 8, 12], fw: [3, 4, 2], floorH: 3.0, door: {w: 2.0, h: 2.4}, park: 'lot', minInterior: 150},
  office: {pitch: 28, depth: 34, front: 6, side: 3, rear: 4, w: [16, 24], d: [14, 20], floors: [4, 7, 12], fw: [3, 4, 2], floorH: 3.8, door: {w: 2.0, h: 2.4}, park: 'forecourt', minInterior: 120},
  highrise: {pitch: 44, depth: 48, front: 8, side: 5, rear: 5, w: [24, 36], d: [20, 30], floors: [15, 25, 38], fw: [3, 4, 2], floorH: 3.8, door: {w: 2.0, h: 2.4}, park: 'none', minInterior: 300},
  civic: {pitch: 40, depth: 38, front: 14, side: 5, rear: 5, w: [24, 34], d: [18, 26], floors: [2, 3, 4], fw: [3, 4, 2], floorH: 3.8, door: {w: 2.0, h: 2.4}, park: 'lot', minInterior: 200},
  barn: {pitch: 36, depth: 40, front: 8, side: 4, rear: 4, w: [18, 30], d: [14, 22], floors: [1], fw: [1], floorH: 5.0, door: {w: 2.0, h: 2.4}, park: 'forecourt', minInterior: 150},
  lodge: {pitch: 28, depth: 36, front: 8, side: 4, rear: 5, w: [9, 13], d: [8, 11], floors: [1, 2], fw: [4, 3], floorH: 3.0, door: {w: 1.0, h: 2.1}, park: 'none', minInterior: 36},
  landmark: {pitch: 44, depth: 44, front: 10, side: 5, rear: 5, w: [24, 34], d: [20, 28], floors: [2, 3], fw: [1, 1], floorH: 3.8, door: {w: 2.0, h: 2.4}, park: 'lot', minInterior: 200},
};
/** 용도별 기본 건물 밀도(필지에 건물이 설 확률) */
export const USE_DENSITY: Record<ZoneUse, number> = {residential: 0.8, commercial: 0.9, office: 0.85, industrial: 0.7, civic: 0.6, park: 0, nature: 0, farm: 0.3, water: 0};
export const BUILDABLE: ReadonlySet<ZoneUse> = new Set(['residential', 'commercial', 'office', 'industrial', 'civic', 'farm']);
export const densityOf = (z: ZoneSource): number => z.density ?? USE_DENSITY[z.use];
/** 구역에서 쓸 기본 양식. zone.style 이 있으면 그것. 농지는 필지마다 헛간/주택이 섞인다(buildings.ts) */
export function zoneStyle(z: ZoneSource): BuildingStyle | null {
  if (!BUILDABLE.has(z.use)) return null;
  if (z.style) return z.style;
  const d = densityOf(z);
  switch (z.use) {
    case 'residential': return d >= 0.75 ? 'house' : 'house';
    case 'commercial': return 'shop';
    case 'office': return d >= 0.75 ? 'highrise' : 'office';
    case 'industrial': return 'barn';
    case 'civic': return 'civic';
    default: return 'lodge';
  }
}
/** 구역 녹지율 목표(표면적 기준, 도로·건물·물 제외한 수관 투영 비율). 값 = [하한, 목표, 상한] */
export const COVERAGE: Record<string, [number, number, number]> = {
  highrise: [0.10, 0.125, 0.15], office: [0.15, 0.18, 0.22], commercial: [0.15, 0.175, 0.20], shop: [0.15, 0.175, 0.20],
  apartment: [0.28, 0.30, 0.34], house: [0.38, 0.40, 0.45], residential: [0.38, 0.40, 0.45],
  civic: [0.20, 0.25, 0.30], industrial: [0.08, 0.10, 0.14], farm: [0.08, 0.12, 0.16], lodge: [0.08, 0.12, 0.16], barn: [0.08, 0.10, 0.14],
  park: [0.70, 0.76, 0.90], nature: [0.70, 0.80, 0.92],
};
/** 소품·나무의 점유(충돌·간격 검사용). r = 반경(m), h = 높이, 벤치는 직사각형 */
export interface Foot { r: number; h: number; hw?: number; hd?: number; asset: string; yOff?: number }
export const FOOT: Record<string, Foot> = {
  lamp: {r: 0.3, h: 7, asset: 'lamp.street'},
  'tree.round': {r: 0.35, h: 6, asset: 'tree.round'},
  'tree.pine': {r: 0.32, h: 7, asset: 'tree.pine'},
  bench: {r: 1.25, hw: 1.2, hd: 0.35, h: 1, asset: 'bench.wood'},
  sign: {r: 0.15, h: 2.8, asset: 'sign.road'},
  signal: {r: 0.25, h: 5.6, asset: 'signal.pole'},
  bin: {r: 0.34, h: 0.9, asset: 'bin.street'},
  bollard: {r: 0.16, h: 0.9, asset: 'bollard.short'},
  shrub: {r: 0.5, h: 1, asset: 'shrub.round'},
};
/** 수종: 수관 반경 범위(m), 가중치. 소품 자산 id 와 연결 */
export const SPECIES: Record<string, {asset: string; crown: [number, number]; trunk: number; h: number}> = {
  round: {asset: 'tree.round', crown: [2.4, 3.8], trunk: 0.35, h: 6.5},
  pine: {asset: 'tree.pine', crown: [1.8, 2.6], trunk: 0.32, h: 8},
};
export const WALLS = ['plaster', 'brick', 'stone', 'bone', 'clay'] as const;
export const ROOFS = ['tileRed', 'slate', 'coal'] as const;
export const TALL_WALLS = ['steel', 'slate', 'stone', 'bone'] as const;
