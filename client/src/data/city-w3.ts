// 도시 3차(W3): 신도심. 원도심(±150) 바깥 ~ ±335 까지 5배 가까이 넓힌 영역 — 순환 도로 2겹, 문화·레저·주거·해변 구역, 축구장(스타디움), 랜드마크 5곳.
// 건물은 순환 도로 양옆에 구역별 용도 표에 따라 결정적으로(시드 고정) 채운다. 순수 데이터 — 렌더/충돌/군중이 data/city.ts 를 거쳐 쓴다.
import type {PalName} from '../render/lowpoly/palette.js';
import {mulberry32} from '../render/lowpoly/rng.js';
import type {CityBuilding, CityLandmark, CityPlaza, CityRoad, Facing, SignIcon} from './city.js';
import type {Purpose} from './interiors.js';
import {ROADS_W4_RESERVED} from './roads-w4.js';
import {W7_RESERVED} from './roads-w7.js';

const road = (id: string, x0: number, z0: number, x1: number, z1: number, w: number, car = true): CityRoad => ({id, x0, z0, x1, z1, w, sidewalk: 3, car});
export const ROADS_W3: readonly CityRoad[] = [
  road('apple-n', 0, -150, 0, -335, 24),
  road('east-ave', 150, 0, 335, 0, 14),
  road('west-ave', -138, 0, -335, 0, 14),
  road('harbor-s', 0, 148, 0, 335, 16),
  // 순환 1 (±200)
  road('r1-e', 200, -335, 200, 335, 12),
  road('r1-w', -200, -335, -200, 335, 12),
  road('r1-n', -335, -200, 335, -200, 12),
  road('r1-s', -335, 200, 335, 200, 12),
  // 순환 2 (±275, 스타디움·공원·테마파크 구역은 비운다)
  road('r2-e', 275, -200, 275, 275, 12),
  road('r2-w1', -275, -200, -275, -108, 12),
  road('r2-w2', -275, 78, -275, 275, 12),
  road('r2-n', -200, -275, 200, -275, 12),
  road('r2-s', -335, 275, 335, 275, 12),
];
export const PLAZAS_W3: readonly CityPlaza[] = [
  {id: 'stadium-court', rect: [232, -206, 308, -194]},
  {id: 'museum-sq', rect: [208, -118, 252, -76]},
  {id: 'park-walk', rect: [-326, -326, -218, -214]},
];

/** 예약 구역: 생성기가 건물을 놓지 않는 곳 (스타디움·공원·테마파크·수족관·광장) */
export const RESERVED: readonly (readonly [number, number, number, number])[] = [
  [206, -334, 334, -206], // 스타디움
  [-332, -332, -214, -208], // 중앙 공원
  [-332, -108, -214, 78], // 테마파크
  [244, 284, 300, 334], // 수족관
  [-30, -300, 30, -150], // (사과 대로 둘레는 길)
  [208, -118, 252, -76],
  [-334, 202, -207, 272], // W5 SHOPS: 상점 거리 (data/city-w4.ts)
  ...ROADS_W4_RESERVED, // W5 ROADS: 입체교차로·고가 (data/roads-w4.ts)
  // W5 FUN 구획 (data/city-w5.ts PARCELS)
  [-190, 306, -24, 334], // 해변
  [24, 306, 190, 334], // 항구
  [210, 108, 266, 186], // 문화 광장
  [210, 210, 266, 266], // 레저
  [-268, 286, -210, 334], // 주거 놀이터·텃밭
  // W6 DOWNTOWN 구획 (data/city-w6.ts W6_PARCELS)
  [88, -264, 190, -210], // 금융 지구
  [88, -190, 190, -160], // 본사 구역
  [-190, -264, -104, -216], // 북서 업무 지구
  [-190, -190, -56, -152], // 아파트 단지 A
  [-190, 126, -48, 190], // 아파트 단지 B
  [-190, 80, -144, 114], // 빌라촌 서
  [38, 152, 190, 190], // 주상복합·빌라촌 동
  ...W7_RESERVED, // W7 CITY_DENSITY 특색 시설 구획 (data/roads-w7.ts W7_FEATURES)
];

const wc: PalName[] = ['plaster', 'bone', 'brick', 'ash', 'cloud', 'clay', 'stone', 'steel'],
  rc: PalName[] = ['slate', 'tileBlue', 'tileRed', 'steel', 'coal'],
  ICONS: SignIcon[] = ['gem', 'planet', 'cube', 'cone', 'cross'];

type District = 'north' | 'culture' | 'beach' | 'amuse' | 'resi3' | 'park' | 'stadium' | 'leisure';
export function districtAt(x: number, z: number): District {
  if (x > 200 && z < -200) return 'stadium';
  if (x > 200 && z > 200) return 'leisure';
  if (x < -200 && z > 200) return 'resi3';
  if (x < -200 && z < -200) return 'park';
  if (Math.abs(x) > Math.abs(z)) return x > 0 ? 'culture' : 'amuse';
  return z > 0 ? 'beach' : 'north';
}
interface Spec {
  style: CityBuilding['style'];
  floors: [number, number];
  w: [number, number];
  d: [number, number];
}
const SPEC: Partial<Record<Purpose, Spec>> = {
  shop: {style: 'shop', floors: [1, 2], w: [12, 18], d: [14, 20]},
  restaurant: {style: 'shop', floors: [1, 2], w: [12, 18], d: [14, 20]},
  cafe: {style: 'shop', floors: [1, 1], w: [10, 14], d: [12, 16]},
  office: {style: 'office', floors: [3, 9], w: [14, 22], d: [16, 22]},
  bank: {style: 'office', floors: [2, 3], w: [14, 18], d: [16, 20]},
  mall: {style: 'shop', floors: [2, 3], w: [24, 32], d: [20, 26]},
  hotel: {style: 'office', floors: [5, 10], w: [16, 22], d: [16, 22]},
  apartment: {style: 'office', floors: [4, 8], w: [16, 22], d: [16, 20]},
  house: {style: 'house', floors: [1, 2], w: [11, 15], d: [12, 16]},
  school: {style: 'office', floors: [2, 3], w: [26, 32], d: [18, 22]},
  hospital: {style: 'office', floors: [4, 6], w: [22, 28], d: [18, 22]},
  cinema: {style: 'neon', floors: [2, 3], w: [22, 28], d: [20, 24]},
  karaoke: {style: 'neon', floors: [2, 4], w: [14, 20], d: [14, 18]},
  bowling: {style: 'neon', floors: [1, 2], w: [22, 28], d: [18, 22]},
  arcade: {style: 'neon', floors: [1, 2], w: [14, 20], d: [14, 18]},
  gym: {style: 'office', floors: [1, 2], w: [16, 22], d: [16, 20]},
  library: {style: 'office', floors: [2, 3], w: [20, 26], d: [18, 22]},
  museum: {style: 'office', floors: [2, 3], w: [28, 36], d: [22, 26]},
  pool: {style: 'office', floors: [1, 2], w: [20, 26], d: [18, 22]},
};
const TABLE: Record<District, Purpose[]> = {
  north: ['office', 'office', 'mall', 'bank', 'hotel', 'cafe', 'office', 'restaurant'],
  culture: ['cinema', 'library', 'museum', 'cafe', 'shop', 'restaurant', 'cinema', 'cafe'],
  beach: ['hotel', 'restaurant', 'shop', 'cafe', 'hotel', 'restaurant', 'pool', 'shop'],
  amuse: ['karaoke', 'bowling', 'arcade', 'karaoke', 'cafe', 'gym', 'karaoke', 'arcade'],
  resi3: ['apartment', 'apartment', 'school', 'hospital', 'house', 'shop', 'apartment', 'house'],
  park: ['gym', 'cafe', 'pool', 'house', 'library', 'cafe', 'house', 'gym'],
  stadium: ['gym', 'shop', 'cafe', 'restaurant', 'shop', 'office', 'cafe', 'gym'],
  leisure: ['hotel', 'pool', 'restaurant', 'shop', 'arcade', 'hotel', 'cafe', 'restaurant'],
};

type Rect4 = readonly [number, number, number, number];
const FACE_RECT = (x: number, z: number, w: number, d: number, f: Facing): Rect4 => {
  const ew = f === 'e' || f === 'w',
    hx = (ew ? d : w) / 2,
    hz = (ew ? w : d) / 2;
  return [x - hx, z - hz, x + hx, z + hz];
};
const hit = (a: Rect4, b: Rect4, m = 0) => a[0] < b[2] + m && a[2] > b[0] - m && a[1] < b[3] + m && a[3] > b[1] - m;
const roadRect = (r: CityRoad): Rect4 => {
  const h = r.w / 2 + r.sidewalk;
  return r.z0 === r.z1 ? [Math.min(r.x0, r.x1), r.z0 - h, Math.max(r.x0, r.x1), r.z0 + h] : [r.x0 - h, Math.min(r.z0, r.z1), r.x0 + h, Math.max(r.z0, r.z1)];
};

/** 손으로 놓는 큰 건물 (예약 구역 밖에서 도로 쪽을 본다) */
const manual: CityBuilding[] = [
  {id: 'cu-museum', district: 'culture', purpose: 'museum', face: 'w', x: 232, z: -97, w: 38, d: 26, floors: 3, style: 'office', wall: 'bone', roof: 'tileBlue', sign: 'planet'},
  {id: 'cu-cinema', district: 'culture', purpose: 'cinema', face: 'w', x: 230, z: -40, w: 30, d: 24, floors: 3, style: 'neon', wall: 'stone', roof: 'slate'},
  /* W5 ROADS: 동쪽 입체교차로 고가를 비우려 z 28→50 */ {id: 'cu-hall', district: 'culture', purpose: 'concert', face: 'w', x: 232, z: 50, w: 36, d: 28, floors: 3, style: 'office', wall: 'plaster', roof: 'tileRed', sign: 'gem'},
  {id: 'cu-lib', district: 'culture', purpose: 'library', face: 'w', x: 230, z: 90, w: 26, d: 22, floors: 3, style: 'office', wall: 'clay', roof: 'slate'},
  {id: 'no-hall', district: 'north', purpose: 'cityhall', face: 's', x: 60, z: -236, w: 40, d: 26, floors: 4, style: 'office', wall: 'cloud', roof: 'tileBlue', sign: 'cube'},
  {id: 'no-mall', district: 'north', purpose: 'mall', face: 's', x: -80, z: -236, w: 40, d: 26, floors: 3, style: 'shop', wall: 'plaster', roof: 'slate', sign: 'gem'},
];

function generate(): CityBuilding[] {
  const out: CityBuilding[] = [...manual],
    rnd = mulberry32(900),
    rects: Rect4[] = manual.map(b => FACE_RECT(b.x, b.z, b.w, b.d, b.face)),
    roadRects = ROADS_W3.map(roadRect);
  let n = 0;
  for (const r of ROADS_W3) {
    const vert = r.x0 === r.x1,
      a0 = Math.min(vert ? r.z0 : r.x0, vert ? r.z1 : r.x1),
      a1 = Math.max(vert ? r.z0 : r.x0, vert ? r.z1 : r.x1);
    for (const side of [-1, 1]) {
      let a = a0 + 12;
      while (a < a1 - 12) {
        // 용도 → 규격
        const x0 = vert ? r.x0 : a,
          z0 = vert ? a : r.z0,
          dist = districtAt(vert ? r.x0 + side * 25 : a, vert ? a : r.z0 + side * 25),
          pur = TABLE[dist][Math.floor(rnd() * 8)],
          sp = SPEC[pur]!,
          w = Math.round(sp.w[0] + rnd() * (sp.w[1] - sp.w[0])),
          d = Math.round(sp.d[0] + rnd() * (sp.d[1] - sp.d[0])),
          floors = sp.floors[0] + Math.floor(rnd() * (sp.floors[1] - sp.floors[0] + 1)),
          off = r.w / 2 + r.sidewalk + 1.2 + d / 2,
          face: Facing = vert ? (side > 0 ? 'w' : 'e') : side > 0 ? 'n' : 's',
          cx = vert ? x0 + side * off : a + w / 2,
          cz = vert ? a + w / 2 : z0 + side * off;
        a += w + 3;
        const fp = FACE_RECT(cx, cz, w, d, face);
        // 원도심 안·땅 밖·예약·도로·다른 건물과 겹치면 건너뛴다
        if (Math.max(Math.abs(fp[0]), Math.abs(fp[2]), Math.abs(fp[1]), Math.abs(fp[3])) > 328) continue;
        if (fp[0] > -152 && fp[2] < 152 && fp[1] > -152 && fp[3] < 152) continue;
        if (RESERVED.some(q => hit(fp, q as Rect4)) || roadRects.some(q => hit(fp, q, 1.5)) || rects.some(q => hit(fp, q, 2))) continue;
        if (fp[0] < 152 && fp[2] > -152 && fp[1] < 152 && fp[3] > -152) continue; // 원도심 건물과 겹침
        rects.push(fp);
        out.push({
          id: `w3-${n++}`,
          district: dist,
          purpose: pur,
          face,
          x: cx,
          z: cz,
          w,
          d,
          floors,
          style: sp.style,
          wall: wc[Math.floor(rnd() * wc.length)],
          roof: rc[Math.floor(rnd() * rc.length)],
          sign: sp.style === 'shop' ? ICONS[Math.floor(rnd() * 5)] : undefined,
        });
      }
    }
  }
  return out;
}
export const BUILDINGS_W3: readonly CityBuilding[] = generate();

export const LANDMARKS_W3: readonly CityLandmark[] = [
  {id: 'L8', kind: 'stadium', x: 270, z: -270, h: 24, r: 65, w: 128, d: 128},
  {id: 'L9', kind: 'ferris', x: -274, z: -16, h: 52, r: 24, w: 50, d: 12},
  {id: 'L10', kind: 'aquarium', x: 272, z: 308, h: 26, r: 24, w: 48, d: 40},
  {id: 'L11', kind: 'tvtower', x: -150, z: -255, h: 90, r: 6, w: 12, d: 12},
  {id: 'L12', kind: 'lighthouse', x: 322, z: 322, h: 46, r: 5, w: 11, d: 11},
];
