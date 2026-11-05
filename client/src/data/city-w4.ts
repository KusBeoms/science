// W5 상점 거리(상가 골목): 서쪽 주거·상업 구역(resi3) 첫 블록 x −334~−207, z 202~272 를 통째로 쓴다.
//   · 북쪽 줄(정면이 남쪽 'shopst' 보행로를 봄, z 216~230): 자동차 대리점 · 자전거 샵 · 옷가게 · 편의점 24
//   · 남쪽 줄(정면이 북쪽, z 246~260): 중고차·오토바이 · 펫샵 · 꽃집 · 빵집 · 전자제품점 · 서점
//   · 서쪽 안뜰(정면이 동쪽, x −314~−287): 약국 · 주유소 · 세차장 (x=−275 도로 쪽)
// 순수 데이터. 생성기(city-w3.ts)가 이 구획에 건물을 놓지 않도록 RESERVED 에 [−334,202,−207,272] 한 줄을 둔다.
import type {CityBuilding, CityRoad} from './city.js';
import type {PalName} from '../render/lowpoly/palette.js';

/** 상점 거리 구획 (RESERVED 줄과 같은 값) */
export const SHOP_BLOCK = [-334, 202, -207, 272] as const;
/** 상가 골목 보행로(동서). 양쪽 보도 띠 5u 는 진열대가 서는 앞마당 */
export const ROADS_W4: readonly CityRoad[] = [{id: 'shopst', x0: -266, z0: 238, x1: -209, z1: 238, w: 6, sidewalk: 5, car: false}];

type Spec = [id: string, purpose: NonNullable<CityBuilding['purpose']>, w: number, d: number, floors: number, wall: PalName, roof: PalName];
const N: Spec[] = [
  ['w4-auto', 'autoshop', 15, 14, 1, 'cloud', 'slate'],
  ['w4-bike', 'bikeshop', 12, 14, 1, 'bone', 'tileBlue'],
  ['w4-clothes', 'clothes', 11, 14, 2, 'clay', 'tileRed'],
  ['w4-mart', 'mart24', 10, 14, 1, 'plaster', 'steel'],
];
const S: Spec[] = [
  ['w4-used', 'usedcar', 12, 14, 1, 'ash', 'coal'],
  ['w4-pet', 'petshop', 8, 14, 1, 'bone', 'tileRed'],
  ['w4-florist', 'florist', 6.5, 14, 1, 'plaster', 'tileBlue'],
  ['w4-bakery', 'bakery', 7, 14, 1, 'clay', 'tileRed'],
  ['w4-electro', 'electro', 8, 14, 2, 'steel', 'slate'],
  ['w4-book', 'bookshop', 8, 14, 2, 'brick', 'slate'],
];
/** 한 줄로 이어 붙이기: x0 부터 gap 간격으로 */
function row(list: Spec[], face: 's' | 'n', zc: number, gap: number): CityBuilding[] {
  let x = -265;
  return list.map(([id, purpose, w, d, floors, wall, roof]) => {
    const cx = x + w / 2;
    x += w + gap;
    return {id, district: 'shopst', purpose, face, x: cx, z: zc, w, d, floors, style: 'shop' as const, wall, roof};
  });
}
const side = (id: string, purpose: NonNullable<CityBuilding['purpose']>, z: number, w: number, d: number, x: number, wall: PalName, roof: PalName): CityBuilding =>
  ({id, district: 'shopst', purpose, face: 'e', x, z, w, d, floors: 1, style: 'shop', wall, roof});
export const BUILDINGS_W4: readonly CityBuilding[] = [
  ...row(N, 's', 223, 1.5),
  ...row(S, 'n', 253, 1),
  side('w4-pharmacy', 'pharmacy', 215, 14, 10, -292, 'cloud', 'tileBlue'),
  side('w4-gas', 'gasstation', 236, 20, 12, -308, 'bone', 'tileRed'),
  side('w4-wash', 'carwash', 257, 14, 14, -300, 'steel', 'slate'),
];
