// 지도·택시용 장소 목록과 부동산 매물. 순수 데이터 (좌표는 모두 걸어서 닿는 땅 위).
import {CITY_BUILDINGS, CITY_LANDMARKS, doorOf} from './city.js';
import {ENTERABLES, PURPOSE_INFO, purposeOf, type Purpose} from './interiors.js';
import {JAIL} from './wild.js';
import {KICKOFF, STADIUM} from './soccer.js';

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
  {id: 'bridge', icon: '🌉', name: '남쪽 다리', x: 300, z: 345},
  {id: 'plains', icon: '🌾', name: '평야', x: 280, z: 760},
  {id: 'farm', icon: '🚜', name: '시골 마을', x: -200, z: 800},
  {id: 'lake', icon: '🏞️', name: '호수', x: 70, z: 840},
  {id: 'desert', icon: '🏜️', name: '사막', x: 280, z: 990},
  {id: 'mount', icon: '⛰️', name: '등산로 입구', x: 0, z: 925},
  {id: 'prison', icon: '⛓️', name: '교도소', x: JAIL.release.x, z: JAIL.release.z},
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
};
export const LISTINGS: readonly Listing[] = CITY_BUILDINGS.filter(b => BASE[purposeOf(b)]).filter((_, i) => i % 3 === 0).map(b => {
  const p = purposeOf(b),
    price = Math.round(((BASE[p]! * (0.6 + (b.w * b.d * b.floors) / 600)) / 500)) * 500,
    d = doorOf(b);
  return {id: b.id, purpose: p, price, income: Math.max(1, Math.round(price * 0.012)), x: d.x, z: d.z};
});
export const listingName = (l: Listing) => `${PURPOSE_INFO[l.purpose].icon} ${PURPOSE_INFO[l.purpose].name}`;
void CITY_LANDMARKS;
void KICKOFF;
