// 도시 허브 2차(W2) 건물: 암시장 골목 노점 · 정비소 창고 · 우주항 창고 · 과학관 연구동 · 주거 지구 가짜 주택 (docs/WORLD.md 3.1).
// 데이터 형식은 data/city.ts 의 CityBuilding 그대로라 렌더(render/city)·군중·충돌이 W1 건물과 같은 길을 탄다.
import type {PalName} from '../render/lowpoly/palette.js';
import type {CityBuilding, SignIcon} from './city.js';

const ICONS: SignIcon[] = ['gem', 'planet', 'cube', 'cone', 'cross'],
  WALLS: PalName[] = ['plaster', 'bone', 'brick', 'ash', 'clay', 'stone'];
const pick = <T>(a: readonly T[], k: number) => a[((k % a.length) + a.length) % a.length];

/** 암시장 노점 28개: 위·아래 골목(z=±30) 양쪽 둘레에 7개씩, 골목을 보고 선다. 낮에도 어두운 천막 색, 밤엔 창이 켜진다 */
const MARKET_X = [-62, -71, -80, -89, -98, -107, -116];
const MARKET_ROWS: {z: number; face: 'n' | 's'}[] = [
  {z: -36.4, face: 's'},
  {z: -23.6, face: 'n'},
  {z: 23.6, face: 's'},
  {z: 36.4, face: 'n'},
];
const market = MARKET_ROWS.flatMap((row, r) =>
  MARKET_X.map((x, k): CityBuilding => ({
    id: `mk-${r}${k}`,
    district: 'market',
    face: row.face,
    x,
    z: row.z,
    w: 7,
    d: 6,
    floors: 1,
    style: 'neon',
    wall: pick<PalName>(['steel', 'ash', 'stone', 'coal'], k + r),
    roof: pick<PalName>(['slate', 'coal', 'tileBlue'], k * 2 + r),
    sign: pick(ICONS, k + r * 2),
  }))
);

/** 정비소: 시험로(z=−70) 남쪽 정비 창고 3동 (문은 시험로를 본다) */
const garage = [90, 110, 130].map((x, k): CityBuilding => ({
  id: `gr-${k}`,
  district: 'garage',
  face: 'n',
  x,
  z: -57,
  w: 14,
  d: 8,
  floors: 1,
  style: 'office',
  wall: pick<PalName>(['steel', 'stone', 'ash'], k),
  roof: 'slate',
}));

/** 우주항: 항구 도로 양옆 창고 6동 (도로를 본다) */
const port = [-1, 1].flatMap(sgn =>
  [66, 84, 102].map((z, k): CityBuilding => ({
    id: `pt-${sgn < 0 ? 'w' : 'e'}${k}`,
    district: 'port',
    face: sgn < 0 ? 'e' : 'w',
    x: sgn * 19,
    z,
    w: 16,
    d: 14,
    floors: 1 + ((k + (sgn < 0 ? 1 : 0)) % 2),
    style: 'office',
    wall: pick<PalName>(['steel', 'ash', 'stone', 'bone'], k + (sgn < 0 ? 2 : 0)),
    roof: pick<PalName>(['slate', 'steel', 'tileBlue'], k),
  }))
);

/** 과학관 구역: 돔 앞뜰 둘레 연구동 8동 */
const SCI: {x: number; z: number; face: 'n' | 's' | 'e' | 'w'}[] = [
  {x: 62, z: 80, face: 'e'},
  {x: 62, z: 106, face: 'e'},
  {x: 62, z: 130, face: 'e'},
  {x: 138, z: 80, face: 'w'},
  {x: 138, z: 106, face: 'w'},
  {x: 138, z: 130, face: 'w'},
  {x: 100, z: 142, face: 'n'},
  {x: 112, z: 142, face: 'n'},
];
const science = SCI.map((s, k): CityBuilding => ({
  id: `sc-${k}`,
  district: 'science',
  face: s.face,
  x: s.x,
  z: s.z,
  w: k > 5 ? 10 : 16,
  d: 10,
  floors: 1 + (k % 2),
  style: 'office',
  wall: pick<PalName>(['bone', 'plaster', 'cloud', 'ash'], k),
  roof: pick<PalName>(['tileBlue', 'steel', 'slate'], k),
  sign: k % 2 ? undefined : pick(ICONS, k),
}));

/** 주거 지구: 도로(z=100) 양옆 집 4채씩 — 가짜 주택 8채 (W4 에서 일부가 집 부지 P1~P3 이 된다) */
const resi = [-1, 1].flatMap(sgn =>
  [-64, -82, -100, -118].map((x, k): CityBuilding => ({
    id: `rs-${sgn < 0 ? 'n' : 's'}${k}`,
    district: 'resi',
    face: sgn < 0 ? 's' : 'n',
    x,
    z: 100 + sgn * 14,
    w: 11,
    d: 12,
    floors: 1 + ((k + (sgn < 0 ? 0 : 1)) % 2),
    style: 'house',
    wall: pick(WALLS, k * 2 + (sgn < 0 ? 0 : 3)),
    roof: pick<PalName>(['tileRed', 'tileBlue', 'clay'], k + (sgn < 0 ? 0 : 1)),
  }))
);

export const BUILDINGS_W2: readonly CityBuilding[] = [...market, ...garage, ...port, ...science, ...resi];
