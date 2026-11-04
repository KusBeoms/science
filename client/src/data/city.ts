// 도시 허브 1차(W1) 배치 데이터: 도로·보도·광장·건물·랜드마크 (docs/WORLD.md 3장). 순수 데이터라 렌더(render/city/*)와 군중 경로(data/citygraph.ts)가 같이 쓴다.
// 좌표계: x 동(+), z 남(+). 사과 대로는 x=0 에서 정북(−z)으로 뻗는다. 기지(0,0)·상점·포탈 패드 좌표는 core/geometry.ts 그대로.
import type {PalName} from '../render/lowpoly/palette.js';

/** [x0, z0, x1, z1] */
export type CityRect = readonly [number, number, number, number];

/** 도로: 중심선 (x0,z0)→(x1,z1) (축에 평행) + 포장 폭 w. sidewalk 는 양옆 보도 폭, car 는 차도(아스팔트)인가 보행로인가 */
export interface CityRoad {
  id: string;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  w: number;
  sidewalk: number;
  car: boolean;
}
export const CITY_ROADS: readonly CityRoad[] = [
  {id: 'apple', x0: 0, z0: -50, x1: 0, z1: -150, w: 24, sidewalk: 3, car: true}, // 사과 대로: 광장 북변 → 도시 북단 → S1 문
  {id: 'harbor', x0: 0, z0: 50, x1: 0, z1: 150, w: 16, sidewalk: 3, car: true}, // 항구 가는 길(W2 에서 건물이 들어선다)
  {id: 'promenade', x0: 50, z0: 0, x1: 150, z1: 0, w: 10, sidewalk: 3, car: false}, // 상점가 보행 도로
  {id: 'alley', x0: -50, z0: 0, x1: -112, z1: 0, w: 8, sidewalk: 2, car: true}, // 암시장 골목
];

/** 광장·마당(보행 전용 포장 사각형). 중앙 광장은 한가운데 기지 부지(±22)를 품는다 */
export interface CityPlaza {
  id: string;
  rect: CityRect;
}
export const CITY_PLAZAS: readonly CityPlaza[] = [
  {id: 'central', rect: [-50, -50, 50, 50]},
  {id: 'clock-court', rect: [-36, -116.3, -15, -105.4]}, // 시계탑 앞마당
];

/** 보도 사각형 (도로 양옆 띠). 군중이 걷는 곳 */
export const CITY_SIDEWALKS: readonly CityRect[] = CITY_ROADS.flatMap(r => {
  const horiz = r.z0 === r.z1,
    lo = r.w / 2,
    hi = lo + r.sidewalk,
    [a0, a1] = horiz ? [Math.min(r.x0, r.x1), Math.max(r.x0, r.x1)] : [Math.min(r.z0, r.z1), Math.max(r.z0, r.z1)],
    c = horiz ? r.z0 : r.x0;
  const side = (s: number): CityRect => {
    const [p, q] = [c + s * lo, c + s * hi].sort((m, n) => m - n);
    return horiz ? [a0, p, a1, q] : [p, a0, q, a1];
  };
  return [side(-1), side(1)];
});

/** 건물 정면이 향하는 쪽 (n = −z 북, s = +z 남, e = +x 동, w = −x 서) */
export type Facing = 'n' | 's' | 'e' | 'w';
export type BuildingStyle = 'shop' | 'house' | 'office' | 'neon';
export type SignIcon = 'gem' | 'planet' | 'cube' | 'cone' | 'cross';
export interface CityBuilding {
  id: string;
  district: 'avenue' | 'shops' | 'alley';
  face: Facing;
  /** 발자국 중심 */
  x: number;
  z: number;
  /** 정면 폭 · 깊이 */
  w: number;
  d: number;
  floors: number;
  style: BuildingStyle;
  wall: PalName;
  roof: PalName;
  /** 상점 간판 도형 (글자 없음) */
  sign?: SignIcon;
}
/** 건물 발자국의 세계 좌표 사각형 */
export function footprint(b: CityBuilding): CityRect {
  const ew = b.face === 'e' || b.face === 'w',
    hx = (ew ? b.d : b.w) / 2,
    hz = (ew ? b.w : b.d) / 2;
  return [b.x - hx, b.z - hz, b.x + hx, b.z + hz];
}
/** 문 앞 1u 지점 (군중이 드나드는 노드) */
export function doorOf(b: CityBuilding) {
  const [x0, z0, x1, z1] = footprint(b);
  if (b.face === 'e') return {x: x1 + 1, z: b.z};
  if (b.face === 'w') return {x: x0 - 1, z: b.z};
  return b.face === 's' ? {x: b.x, z: z1 + 1} : {x: b.x, z: z0 - 1};
}

// 사과 대로: 앞면(정면 선)이 x=±16, 슬롯 9개 × 10.89u (z −51 ~ −149). 서쪽 5번 슬롯은 시계탑(L1) 자리
const AV_SLOT = 98 / 9,
  AV_FRONT = 16,
  AV_STYLE: BuildingStyle[] = ['house', 'office', 'shop', 'house', 'office', 'house', 'shop', 'office', 'house'],
  AV_WALL: PalName[] = ['plaster', 'brick', 'bone', 'ash', 'plaster', 'clay', 'brick', 'stone', 'bone'],
  AV_ROOF: PalName[] = ['tileRed', 'slate', 'tileBlue', 'tileRed', 'steel', 'tileBlue', 'slate', 'coal', 'tileRed'],
  AV_DEPTH = [14, 16, 13, 15, 16, 14, 15, 16, 13],
  AV_SIGN: SignIcon[] = ['gem', 'planet', 'cube', 'cone', 'cross'];
export const CITY_SLOT_CLOCK = 5;
export const CITY_BUILDINGS: readonly CityBuilding[] = [
  ...[-1, 1].flatMap(sgn =>
    AV_STYLE.flatMap((style, k): CityBuilding[] => {
      const west = sgn < 0,
        j = (k + (west ? 4 : 0)) % 9, // 두 줄이 같은 모양으로 마주 보지 않게 어긋나게 고른다
        d = AV_DEPTH[(k + (west ? 3 : 0)) % 9];
      if (west && k === CITY_SLOT_CLOCK) return [];
      return [{
        id: `av-${west ? 'w' : 'e'}${k}`,
        district: 'avenue',
        face: west ? 'e' : 'w', // 서쪽 줄 건물의 정면은 동쪽(대로)을 본다
        x: sgn * (AV_FRONT + d / 2),
        z: -51 - (k + 0.5) * AV_SLOT,
        w: 9.4 + (k % 3) * 0.3,
        d,
        floors: style === 'shop' ? 1 : 2,
        style,
        wall: AV_WALL[j],
        roof: AV_ROOF[(k + (west ? 2 : 0)) % 9],
        sign: style === 'shop' ? AV_SIGN[k % 5] : undefined,
      }];
    })
  ),
  // 상점가: 보행 도로 양옆 4채씩 (정면 선 z=±9, 깊이 16)
  ...[-1, 1].flatMap(sgn =>
    [65, 87, 109, 131].map((x, k): CityBuilding => ({
      id: `sh-${sgn < 0 ? 'n' : 's'}${k}`,
      district: 'shops',
      face: sgn < 0 ? 's' : 'n',
      x,
      z: sgn * (9 + 8),
      w: 19 + (k % 2),
      d: 16,
      floors: 1 + ((k + (sgn < 0 ? 0 : 1)) % 2),
      style: 'shop',
      wall: (['plaster', 'bone', 'brick', 'ash'] as PalName[])[(k + (sgn < 0 ? 0 : 2)) % 4],
      roof: 'slate',
      sign: AV_SIGN[(k + (sgn < 0 ? 0 : 2)) % 5],
    }))
  ),
  // 암시장 골목 입구: 아치 서쪽 양옆 2채씩 (정면 선 z=±6.5, 깊이 14)
  ...[-1, 1].flatMap(sgn =>
    [-74, -98].map((x, k): CityBuilding => ({
      id: `al-${sgn < 0 ? 'n' : 's'}${k}`,
      district: 'alley',
      face: sgn < 0 ? 's' : 'n',
      x,
      z: sgn * (6.5 + 7),
      w: 20,
      d: 14,
      floors: 2,
      style: 'neon',
      wall: k === 0 ? 'coal' : 'slate',
      roof: 'ink',
    }))
  ),
];

/** 랜드마크 (WORLD 3.2). 높이 h, 충돌 반폭 r */
export interface CityLandmark {
  id: 'L1' | 'L2' | 'L3';
  kind: 'clock' | 'orrery' | 'arch';
  x: number;
  z: number;
  h: number;
  r: number;
}
export const CITY_LANDMARKS: readonly CityLandmark[] = [
  {id: 'L1', kind: 'clock', x: -30, z: -110.9, h: 48, r: 5},
  {id: 'L2', kind: 'orrery', x: 0, z: -40, h: 6, r: 4.5},
  {id: 'L3', kind: 'arch', x: -60, z: 0, h: 12, r: 7},
];
