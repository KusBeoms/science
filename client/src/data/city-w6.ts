// W6 DOWNTOWN: 도심(금융 지구 스카이라인·본사·거래소) + 아파트 단지 2곳 + 주상복합 + 저층 빌라촌. 순수 데이터(수동 CityBuilding + 단지 생성 함수).
// 구획은 data/city-w3.ts RESERVED 에 한 줄씩 올려 신도심 생성기가 비켜 가게 했다(구획 값 = W6_PARCELS). 외형은 render/city/highrise.ts, 단지 소품은 render/city/downtown.ts.
// 사과 시선 축: 기지(0,17)에서 정북 ±8° 안 · 고도 8° 이상 하늘은 가리지 않는다 — 고층은 모두 |x| ≥ 58 쪽에 있다(tests/e2e/downtown.spec.ts 가 계산으로 확인).
import type {PalName} from '../render/lowpoly/palette.js';
import type {CityBuilding, CityPlaza, CityRoad, Facing, HrSpec} from './city.js';
import type {Purpose} from './interiors.js';

export type Rect4 = readonly [number, number, number, number];
/** 구획: RESERVED 줄과 같은 값 */
export const W6_PARCELS = {
  finE: [88, -264, 190, -210], // 금융 지구 (북동): 뒷줄 초고층 + 앞줄 은행·거래소·호텔
  hqBand: [88, -190, 190, -160], // 본사 구역: 순환로 r1-n 남쪽
  finW: [-190, -264, -104, -216], // 업무 지구 (북서)
  aptA: [-190, -190, -56, -152], // 아파트 단지 A (북서 안쪽)
  aptB: [-190, 126, -48, 190], // 아파트 단지 B (남서)
  villaW: [-190, 80, -144, 114], // 빌라촌 서
  se: [38, 152, 190, 190], // 주상복합 + 빌라촌 동(남동)
} as const satisfies Record<string, Rect4>;

const floorsOf = (H: number, fh = 3.6) => Math.max(2, Math.round(H / fh));
interface HrIn {
  id: string;
  district: string;
  purpose: Purpose;
  face: Facing;
  x: number;
  z: number;
  w: number;
  d: number;
  hr: HrSpec;
  wall?: PalName;
  roof?: PalName;
}
const hr = (o: HrIn): CityBuilding => ({
  id: o.id,
  district: o.district,
  purpose: o.purpose,
  face: o.face,
  x: o.x,
  z: o.z,
  w: o.w,
  d: o.d,
  floors: floorsOf(o.hr.H, o.hr.kind === 'slab' ? 3 : 3.6),
  style: 'office',
  wall: o.wall ?? o.hr.tint,
  roof: o.roof ?? 'steel',
  hr: o.hr,
});

// ─────────── 금융 지구 (북동, 뒷줄 z −250 · 앞줄 z −220)
const FIN_E: CityBuilding[] = [
  hr({id: 'w6-fin-crown', district: 'finance', purpose: 'hq', face: 's', x: 104, z: -250, w: 24, d: 24, hr: {kind: 'crown', H: 200, tint: 'blue', logo: 0, heli: true}}),
  hr({id: 'w6-fin-twin', district: 'finance', purpose: 'office', face: 's', x: 144, z: -250, w: 40, d: 22, hr: {kind: 'twin', H: 165, tint: 'cyan', logo: 3}}),
  hr({id: 'w6-fin-glass', district: 'finance', purpose: 'hq', face: 's', x: 176, z: -250, w: 20, d: 22, hr: {kind: 'glass', H: 125, tint: 'teal', logo: 4}}),
  hr({id: 'w6-fin-bank', district: 'finance', purpose: 'bank', face: 's', x: 104, z: -220, w: 26, d: 14, hr: {kind: 'exchange', H: 20, tint: 'cloud'}}),
  hr({id: 'w6-fin-exch', district: 'finance', purpose: 'exchange', face: 's', x: 140, z: -220, w: 28, d: 14, hr: {kind: 'exchange', H: 24, tint: 'bone'}}),
  hr({id: 'w6-fin-hotel', district: 'finance', purpose: 'hotel', face: 's', x: 170, z: -220, w: 18, d: 14, hr: {kind: 'glass', H: 72, tint: 'violet', logo: 2}}),
];
// 본사 구역 (순환로 r1-n 남쪽, 정면이 북쪽 길을 본다)
const HQ_BAND: CityBuilding[] = [
  hr({id: 'w6-hq-step', district: 'finance', purpose: 'hq', face: 'n', x: 104, z: -175, w: 28, d: 26, hr: {kind: 'stepped', H: 118, tint: 'steel', logo: 1}}),
  hr({id: 'w6-hq-glass', district: 'finance', purpose: 'hq', face: 'n', x: 142, z: -175, w: 30, d: 26, hr: {kind: 'glass', H: 148, tint: 'blue', logo: 2, heli: true}}),
  hr({id: 'w6-hq-off', district: 'finance', purpose: 'office', face: 'n', x: 176, z: -175, w: 22, d: 26, hr: {kind: 'crown', H: 104, tint: 'teal', logo: 0}}),
];
// 업무 지구 (북서, 전망 타워 L11 둘레)
const FIN_W: CityBuilding[] = [
  hr({id: 'w6-fw-step', district: 'finance', purpose: 'hq', face: 's', x: -176, z: -240, w: 24, d: 24, hr: {kind: 'stepped', H: 132, tint: 'slate', logo: 4}}),
  hr({id: 'w6-fw-glass', district: 'finance', purpose: 'office', face: 's', x: -122, z: -240, w: 24, d: 22, hr: {kind: 'glass', H: 100, tint: 'cyan', logo: 3}}),
];

// ─────────── 아파트 단지: 슬랩 동 여러 채(15~30층) + 놀이터·주차장·정문(render/city/downtown.ts)
export interface Complex {
  id: string;
  gate: {x: number; z: number; face: Facing};
  playground: Rect4;
  parking: Rect4[];
}
const SLAB_WALL: PalName[] = ['plaster', 'cloud', 'bone', 'fog'];
function slab(id: string, face: Facing, x: number, z: number, floors: number, k: number): CityBuilding {
  return hr({
    id, district: 'apt', purpose: 'apartment', face, x, z, w: 24, d: 11, wall: SLAB_WALL[k % 4], roof: 'slate',
    hr: {kind: 'slab', H: floors * 3, tint: SLAB_WALL[k % 4], logo: k % 3},
  });
}
const APT_A: CityBuilding[] = [-172, -138, -104, -70].map((x, k) => slab(`w6-apta${k}`, 'n', x, -178, [18, 26, 30, 22][k], k));
const APT_B: CityBuilding[] = [
  ...[-170, -136, -102].map((x, k) => slab(`w6-aptb${k}`, 's', x, 134, [15, 24, 28][k], k)),
  ...[-170, -136, -102].map((x, k) => slab(`w6-aptb${k + 3}`, 'n', x, 164, [20, 16, 26][k], k + 1)),
];
export const COMPLEXES: readonly Complex[] = [
  {id: 'apt-a', gate: {x: -121, z: -188, face: 'n'}, playground: [-64, -172, -52, -160], parking: [[-184, -169, -126, -162], [-116, -169, -78, -162]]},
  {id: 'apt-b', gate: {x: -119, z: 189, face: 's'}, playground: [-78, 128, -52, 158], parking: [[-184, 173, -125, 187], [-113, 173, -80, 187]]},
];

// ─────────── 주상복합 + 빌라촌
const MIXED: CityBuilding[] = [
  hr({id: 'w6-mix0', district: 'mixed', purpose: 'apartment', face: 's', x: 126, z: 170, w: 38, d: 28, hr: {kind: 'mixed', H: 132, tint: 'steel', logo: 1}}),
  hr({id: 'w6-mix1', district: 'mixed', purpose: 'apartment', face: 's', x: 168, z: 170, w: 38, d: 28, hr: {kind: 'mixed', H: 112, tint: 'blue', logo: 2}}),
];
const VWALL: PalName[] = ['plaster', 'bone', 'clay', 'brick', 'cloud', 'ash'];
const VROOF: PalName[] = ['tileRed', 'tileBlue', 'slate', 'tileRed'];
function villas(tag: string, xs: number[], zN: number, zS: number): CityBuilding[] {
  return [
    ...xs.map((x, k): CityBuilding => ({id: `w6-v${tag}n${k}`, district: 'villa', purpose: 'house', face: 's', x, z: zN, w: 16, d: 12, floors: 3, style: 'house', wall: VWALL[(k + 1) % 6], roof: VROOF[k % 4]})),
    ...xs.map((x, k): CityBuilding => ({id: `w6-v${tag}s${k}`, district: 'villa', purpose: 'house', face: 'n', x, z: zS, w: 16, d: 12, floors: 3, style: 'house', wall: VWALL[(k + 3) % 6], roof: VROOF[(k + 2) % 4]})),
  ];
}
const VILLAS: CityBuilding[] = [...villas('e', [48, 68, 88], 162, 178), ...villas('w', [-178, -158], 90, 106)];

export const BUILDINGS_W6: readonly CityBuilding[] = [...FIN_E, ...HQ_BAND, ...FIN_W, ...APT_A, ...APT_B, ...MIXED, ...VILLAS];

/** 단지 안 보행로·골목 (car:false) */
const lane = (id: string, x0: number, z0: number, x1: number, z1: number, w: number, sidewalk = 1): CityRoad => ({id, x0, z0, x1, z1, w, sidewalk, car: false});
export const ROADS_W6: readonly CityRoad[] = [
  lane('fin-walk', 90, -233, 188, -233, 6),
  lane('apt-b-lane', -184, 149, -52, 149, 6),
  lane('apt-b-gate', -119, 152, -119, 190, 6, 0),
  lane('apt-a-gate', -121, -190, -121, -162, 6, 0),
  lane('villa-e-lane', 40, 170, 98, 170, 4, 0),
  lane('villa-w-lane', -188, 98, -148, 98, 4, 0),
];
/** 포장 마당(바닥만): 타워 발치 광장·주차장·정문·상가 앞 */
export const PLAZAS_W6: readonly CityPlaza[] = [
  {id: 'fin-plaza-n', rect: [88, -264, 190, -234]},
  {id: 'fin-plaza-s', rect: [88, -232, 190, -211]},
  {id: 'hq-plaza', rect: [88, -190, 190, -160]},
  {id: 'finw-plaza', rect: [-190, -262, -104, -216]},
  {id: 'mix-plaza', rect: [105, 156, 190, 191]},
  {id: 'villa-e-yard', rect: [40, 156, 98, 184]},
  {id: 'villa-w-yard', rect: [-188, 84, -148, 112]},
  ...COMPLEXES.flatMap(c => c.parking.map((r, i) => ({id: `${c.id}-park${i}`, rect: r}))),
  {id: 'apt-a-yard', rect: [-186, -184, -58, -170]},
  {id: 'apt-b-yard', rect: [-184, 128, -80, 170]},
];
/** 휴대폰 부동산에 올릴 대표 매물 */
export const W6_LISTED = ['w6-fin-crown', 'w6-fin-twin', 'w6-fin-bank', 'w6-fin-exch', 'w6-fin-hotel', 'w6-hq-glass', 'w6-fw-step', 'w6-apta2', 'w6-aptb1', 'w6-mix0', 'w6-mix1', 'w6-ven0'] as const;
