// 들어갈 수 있는 건물: 모든 도시 건물 + 큰 랜드마크 5곳. 용도(purpose)는 구역·양식으로 정하고, 방 크기는 건물 발자국을 따른다.
import {CITY_BUILDINGS, CITY_LANDMARKS, doorOf, type CityBuilding} from './city.js';
import {PAL, type PalName} from '../render/lowpoly/palette.js';

export type Purpose =
  | 'shop' | 'house' | 'office' | 'arcade' | 'stall' | 'terminal' | 'lab'
  | 'dealer' | 'tuning' | 'garage' | 'clock' | 'hangar' | 'observatory' | 'castle' | 'tower';
export const PURPOSE_INFO: Record<Purpose, {icon: string; name: string; floor: number; wall: number}> = {
  shop: {icon: '🏪', name: '가게', floor: PAL.bone, wall: PAL.plaster},
  house: {icon: '🏠', name: '집', floor: PAL.wood, wall: PAL.plaster},
  office: {icon: '🏢', name: '사무실', floor: PAL.ash, wall: PAL.cloud},
  arcade: {icon: '🎮', name: '오락실', floor: PAL.ink, wall: PAL.slate},
  stall: {icon: '🕶️', name: '암시장 노점', floor: PAL.coal, wall: PAL.steel},
  terminal: {icon: '🧳', name: '터미널 창고', floor: PAL.stone, wall: PAL.fog},
  lab: {icon: '🔬', name: '연구실', floor: PAL.cloud, wall: PAL.white},
  dealer: {icon: '🚗', name: '자동차 딜러', floor: PAL.cloud, wall: PAL.fog},
  tuning: {icon: '🛠️', name: '튜닝샵', floor: PAL.coal, wall: PAL.slate},
  garage: {icon: '🅿️', name: '차고·등록소', floor: PAL.stone, wall: PAL.ash},
  clock: {icon: '🕰️', name: '시계탑', floor: PAL.wood, wall: PAL.bone},
  hangar: {icon: '🚀', name: '격납고', floor: PAL.steel, wall: PAL.ash},
  observatory: {icon: '🔭', name: '천문대', floor: PAL.slate, wall: PAL.ink},
  castle: {icon: '🏰', name: '성', floor: PAL.stone, wall: PAL.ash},
  tower: {icon: '🗼', name: '관제탑', floor: PAL.steel, wall: PAL.cloud},
};
export interface Enterable {
  id: string;
  purpose: Purpose;
  /** 문 앞(건물 밖) 좌표 */
  door: {x: number; z: number};
  /** 방 크기 */
  w: number;
  d: number;
  wallH: number;
  /** 색 변주용 값 */
  seed: number;
}
const hashId = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
export function purposeOf(b: CityBuilding): Purpose {
  const SPECIAL: Record<string, Purpose> = {'gr-0': 'dealer', 'gr-1': 'tuning', 'gr-2': 'garage'};
  if (SPECIAL[b.id]) return SPECIAL[b.id];
  switch (b.district) {
    case 'avenue': return b.style === 'shop' ? 'shop' : b.style === 'office' ? 'office' : 'house';
    case 'shops': return 'shop';
    case 'alley': return 'arcade';
    case 'market': return 'stall';
    case 'port': return 'terminal';
    case 'science': return 'lab';
    case 'resi': return 'house';
    default: return 'office';
  }
}
const LM: Record<string, {purpose: Purpose; w: number; d: number; dz: number}> = {
  clock: {purpose: 'clock', w: 11, d: 11, dz: 1},
  tower: {purpose: 'tower', w: 11, d: 11, dz: 1},
  hangar: {purpose: 'hangar', w: 34, d: 24, dz: 1},
  dome: {purpose: 'observatory', w: 22, d: 22, dz: 1},
  castle: {purpose: 'castle', w: 26, d: 26, dz: 1},
};
export const ENTERABLES: readonly Enterable[] = [
  ...CITY_BUILDINGS.map((b): Enterable => ({
    id: b.id, purpose: purposeOf(b), door: doorOf(b), w: Math.max(9, Math.min(b.w, 22)), d: Math.max(9, Math.min(b.d, 20)),
    wallH: 5 + 2 * (b.floors - 1), seed: hashId(b.id),
  })),
  ...CITY_LANDMARKS.filter(l => LM[l.kind]).map((l): Enterable => {
    const c = LM[l.kind],
      ext = (l.d ?? 2 * l.r) / 2;
    return {id: l.id, purpose: c.purpose, door: {x: l.x, z: l.z + ext + c.dz}, w: c.w, d: c.d, wallH: 7, seed: hashId(l.id)};
  }),
];
export type {PalName};
