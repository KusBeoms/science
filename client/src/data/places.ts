// 지도·택시용 장소 목록과 부동산 매물. 순수 데이터 (좌표는 모두 걸어서 닿는 땅 위).
import {CITY_BUILDINGS, CITY_LANDMARKS, doorOf} from './city.js';
import {ENTERABLES, PURPOSE_INFO, purposeOf, type Purpose} from './interiors.js';
import {JAIL} from './wild.js';
import {BRIDGE_ENDS} from './outline.js';
import {KICKOFF, STADIUM} from './soccer.js';
import {SHOP_PLACES} from './shops2.js';
import {W6_LISTED} from './city-w6.js';

export interface Place {
  id: string;
  icon: string;
  name: string;
  x: number;
  z: number;
}
const door = (id: string) => ENTERABLES.find(e => e.id === id)!.door;
const bd = (id: string) => doorOf(CITY_BUILDINGS.find(b => b.id === id)!);
export const PLACES: readonly Place[] = [
  {id: 'base', icon: '🏠', name: '내 기지', x: 0, z: 17},
  {id: 'plaza', icon: '⛲', name: '중앙 광장', x: 0, z: 46},
  {id: 'port', icon: '🚀', name: '우주항', x: 0, z: 130},
  {id: 'market', icon: '🕶️', name: '암시장', x: -75, z: 0},
  {id: 'hangar', icon: '🔧', name: '정비소 · 딜러', x: 110, z: -66},
  {id: 'stadium', icon: '⚽', name: '축구 경기장', x: STADIUM.gateX, z: STADIUM.rect[3] + 3},
  {id: 'museum', icon: '🖼️', name: '박물관', ...bd('cu-museum')},
  {id: 'cinema', icon: '🎬', name: '영화관', ...bd('cu-cinema')},
  {id: 'hall', icon: '🏛️', name: '시청', ...bd('no-hall')},
  {id: 'mall', icon: '🛍️', name: '쇼핑몰', ...bd('no-mall')},
  {id: 'ferris', icon: '🎡', name: '대관람차', x: -262, z: 14},
  {id: 'aqua', icon: '🐠', name: '수족관', ...door('L10')},
  {id: 'light', icon: '🔦', name: '등대', ...door('L12')},
  {id: 'tv', icon: '📡', name: '전망 타워', ...door('L11')},
  {id: 'beach', icon: '🏖️', name: '해변', x: 0, z: 346},
  // W5 FUN: 구역별 즐길 거리 (data/city-w5.ts · fun-spots.ts)
  {id: 'park', icon: '🌳', name: '중앙 공원', x: -244, z: -262},
  {id: 'theme', icon: '🎢', name: '테마파크', x: -226, z: -16},
  {id: 'seaside', icon: '🏄', name: '해수욕장', x: -100, z: 331},
  {id: 'harbor', icon: '⚓', name: '항구', x: 60, z: 320},
  {id: 'nightmkt', icon: '🌮', name: '야시장 광장', x: 238, z: 176},
  {id: 'leisure', icon: '🏀', name: '레저 광장', x: 222, z: 236},
  {id: 'playground', icon: '🛝', name: '놀이터', x: -246, z: 298},
  {id: 'bridge', icon: '🌉', name: '남쪽 다리', x: BRIDGE_ENDS.x, z: 366},
  {id: 'plains', icon: '🌾', name: '평야', x: 120, z: 930},
  {id: 'farm', icon: '🚜', name: '시골 마을', x: -170, z: 1010},
  {id: 'lake', icon: '🏞️', name: '호수', x: 70, z: 1040},
  {id: 'desert', icon: '🏜️', name: '사막', x: 400, z: 1560},
  {id: 'mount', icon: '⛰️', name: '등산로 입구', x: 0, z: 1125},
  {id: 'prison', icon: '⛓️', name: '교도소', x: JAIL.release.x, z: JAIL.release.z},
  {id: 'shopst', icon: '🛍️', name: '상가 골목', x: -238, z: 238}, // W5 SHOPS
  {id: 'finance', icon: '🏙️', name: '금융 지구', x: 140, z: -205}, // W6 DOWNTOWN (순환로 r1-n 보도)
  {id: 'aptcx', icon: '🏘️', name: '아파트 단지', x: -119, z: 149}, // W6 DOWNTOWN (단지 B 중앙 보행로)
  ...SHOP_PLACES,
];
export const placeNameAt = (x: number, z: number) => {
  let best = PLACES[0],
    bd2 = 1e9;
  for (const p of PLACES) {
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bd2) [best, bd2] = [p, d];
  }
  return best;
};

/** 부동산 매물: 용도가 장사·여가·숙박인 건물 중 일정 간격으로 고른 것 */
export interface Listing {
  id: string;
  purpose: Purpose;
  price: number;
  /** 분당 수익 */
  income: number;
  x: number;
  z: number;
}
const BASE: Partial<Record<Purpose, number>> = {
  shop: 4000, cafe: 3000, restaurant: 5000, hotel: 30000, apartment: 18000, mall: 40000, cinema: 35000, karaoke: 12000, bowling: 15000,
  arcade: 8000, gym: 10000, pool: 12000, office: 20000, bank: 30000, library: 9000, museum: 50000, house: 6000, school: 25000, hospital: 45000, concert: 45000,
  hq: 80000, exchange: 120000,
};
const mkListing = (b: (typeof CITY_BUILDINGS)[number], cap = 1e9): Listing => {
  const p = purposeOf(b),
    price = Math.round((BASE[p]! * Math.min(cap, 0.6 + (b.w * b.d * b.floors) / 600)) / 500) * 500,
    d = doorOf(b);
  return {id: b.id, purpose: p, price, income: Math.max(1, Math.round(price * 0.012)), x: d.x, z: d.z};
};
/** W6 DOWNTOWN 대표 매물(본사·거래소·아파트 동·주상복합·빌라)은 고층이라 면적 배율을 8 로 막아 가격을 고른다 */
export const LISTINGS: readonly Listing[] = [
  ...CITY_BUILDINGS.filter(b => !b.id.startsWith('w6-') && BASE[purposeOf(b)]).filter((_, i) => i % 3 === 0).map(b => mkListing(b)),
  ...W6_LISTED.map(id => CITY_BUILDINGS.find(b => b.id === id)!).filter(b => BASE[purposeOf(b)]).map(b => mkListing(b, 8)),
];
export const listingName = (l: Listing) => `${PURPOSE_INFO[l.purpose].icon} ${PURPOSE_INFO[l.purpose].name}`;
void CITY_LANDMARKS;
void KICKOFF;
