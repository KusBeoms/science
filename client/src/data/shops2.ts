// W5 상점 거리 데이터: 가게별 품목·탈것·펫·옷 색·망토/가방, 날짜/시간 기반 결정적 특가·한정 재고.
// 규칙(효과 적용·결제)은 game/shops2.ts · game/rides.ts · game/pets.ts · game/clothes.ts.
import {BUILDINGS_W4} from './city-w4.js';
import {doorOf} from './city.js';
import {PURPOSE_INFO, type Purpose} from './interiors.js';

export type ShopPurpose = 'clothes' | 'autoshop' | 'bikeshop' | 'mart24' | 'florist' | 'petshop' | 'electro' | 'bookshop' | 'bakery' | 'pharmacy' | 'gasstation' | 'carwash' | 'usedcar';
export const SHOP_PURPOSES: readonly ShopPurpose[] = ['clothes', 'autoshop', 'bikeshop', 'mart24', 'florist', 'petshop', 'electro', 'bookshop', 'bakery', 'pharmacy', 'gasstation', 'carwash', 'usedcar'];
export const isShop = (p: Purpose): p is ShopPurpose => (SHOP_PURPOSES as readonly string[]).includes(p);

/** 품목 하나. run = 효과 종류(game/shops2.ts 가 처리), a/b = 효과 인자, ltd = 하루 한정 재고 수 */
export interface ShopItem {
  id: string;
  icon: string;
  name: string;
  price: number;
  run: 'stam' | 'speed' | 'endure' | 'heal' | 'lotto' | 'flower' | 'book' | 'gadget' | 'fuel' | 'repair' | 'wash' | 'snackbox';
  a?: number;
  b?: number;
  ltd?: number;
}
/** 일반 가게 품목 (옷·대리점·자전거·펫·중고차는 전용 화면) */
export const ITEMS: Partial<Record<ShopPurpose, ShopItem[]>> = {
  mart24: [
    {id: 'choco', icon: '🍫', name: '초코바', price: 40, run: 'stam', a: 25},
    {id: 'soda', icon: '🥤', name: '탄산음료', price: 70, run: 'speed', a: 1.2, b: 30},
    {id: 'bento', icon: '🍙', name: '도시락', price: 120, run: 'stam', a: 60},
    {id: 'ramen', icon: '🍜', name: '컵라면', price: 90, run: 'stam', a: 45},
    {id: 'ice', icon: '🍦', name: '아이스크림', price: 60, run: 'speed', a: 1.1, b: 40},
    {id: 'energy', icon: '⚡', name: '에너지 드링크', price: 200, run: 'endure', a: 45},
    {id: 'lotto', icon: '🎟️', name: '복권', price: 100, run: 'lotto'},
    {id: 'combo', icon: '🧺', name: '간식 세트', price: 260, run: 'snackbox', ltd: 3},
  ],
  bakery: [
    {id: 'croissant', icon: '🥐', name: '크루아상', price: 80, run: 'stam', a: 35},
    {id: 'bread', icon: '🍞', name: '식빵', price: 60, run: 'stam', a: 30},
    {id: 'donut', icon: '🍩', name: '도넛', price: 70, run: 'speed', a: 1.12, b: 30},
    {id: 'bagel', icon: '🥯', name: '베이글', price: 90, run: 'stam', a: 45},
    {id: 'cake', icon: '🎂', name: '케이크', price: 400, run: 'heal', ltd: 4},
    {id: 'cookie', icon: '🍪', name: '쿠키', price: 50, run: 'speed', a: 1.1, b: 25},
  ],
  pharmacy: [
    {id: 'pill', icon: '💊', name: '영양제', price: 150, run: 'endure', a: 60},
    {id: 'vitamin', icon: '🧃', name: '비타민 음료', price: 100, run: 'speed', a: 1.15, b: 45},
    {id: 'patch', icon: '🩹', name: '반창고', price: 40, run: 'stam', a: 20},
    {id: 'tonic', icon: '🧪', name: '회복 물약', price: 300, run: 'heal'},
    {id: 'mask', icon: '😷', name: '마스크 한 통', price: 60, run: 'stam', a: 15},
  ],
  florist: [
    {id: 'tulip', icon: '🌷', name: '튤립', price: 60, run: 'flower', a: 1},
    {id: 'rose', icon: '🌹', name: '장미', price: 120, run: 'flower', a: 1.2},
    {id: 'sunflower', icon: '🌻', name: '해바라기', price: 90, run: 'flower', a: 1.1},
    {id: 'hyacinth', icon: '🪻', name: '히아신스', price: 100, run: 'flower', a: 1.1},
    {id: 'bouquet', icon: '💐', name: '꽃다발', price: 350, run: 'flower', a: 1.4, ltd: 5},
    {id: 'cactus', icon: '🌵', name: '선인장 화분', price: 150, run: 'flower', a: 1.05},
  ],
  electro: [
    {id: 'headphone', icon: '🎧', name: '헤드폰', price: 900, run: 'gadget', a: 0.03, ltd: 3},
    {id: 'watch', icon: '⌚', name: '스마트워치', price: 1400, run: 'gadget', a: 0.03, ltd: 3},
    {id: 'shoeled', icon: '💡', name: 'LED 신발끈', price: 1800, run: 'gadget', a: 0.03, ltd: 2},
    {id: 'drone', icon: '🛸', name: '미니 드론', price: 3200, run: 'gadget', a: 0.04, ltd: 2},
    {id: 'battery', icon: '🔋', name: '보조 배터리', price: 250, run: 'endure', a: 50},
    {id: 'game', icon: '🎮', name: '휴대 게임기', price: 500, run: 'speed', a: 1.15, b: 60},
  ],
  bookshop: [
    {id: 'bk-star', icon: '🔭', name: '별자리 도감', price: 300, run: 'book', a: 1},
    {id: 'bk-atom', icon: '⚛️', name: '원자 이야기', price: 300, run: 'book', a: 2},
    {id: 'bk-life', icon: '🧬', name: '생명의 비밀', price: 300, run: 'book', a: 3},
    {id: 'bk-earth', icon: '🌋', name: '지구와 화산', price: 300, run: 'book', a: 4},
    {id: 'bk-chem', icon: '🧪', name: '반응의 세계', price: 300, run: 'book', a: 5},
    {id: 'bk-space', icon: '🚀', name: '우주선 설계', price: 300, run: 'book', a: 6},
  ],
  gasstation: [
    {id: 'fuel', icon: '⛽', name: '가득 주유', price: 30, run: 'fuel'},
    {id: 'repair', icon: '🔧', name: '차 정비', price: 120, run: 'repair'},
    {id: 'choco2', icon: '🍫', name: '초코바', price: 45, run: 'stam', a: 25},
    {id: 'soda2', icon: '🥤', name: '탄산음료', price: 80, run: 'speed', a: 1.2, b: 30},
  ],
  carwash: [
    {id: 'wash', icon: '🫧', name: '기본 세차', price: 40, run: 'wash', a: 1},
    {id: 'wash2', icon: '✨', name: '프리미엄 세차 + 왁스', price: 150, run: 'wash', a: 2},
  ],
};

/** 탈것 (자전거 샵 + 오토바이는 중고차점). mul = 걷기 대비 이동 배율 */
export interface Ride {
  id: string;
  icon: string;
  name: string;
  price: number;
  mul: number;
  color: number;
  shop: 'bikeshop' | 'usedcar';
}
export const RIDES: readonly Ride[] = [
  {id: 'scooter', icon: '🛴', name: '킥보드', price: 500, mul: 1.5, color: 0xf08a3a, shop: 'bikeshop'},
  {id: 'bike', icon: '🚲', name: '자전거', price: 1500, mul: 1.9, color: 0x4a82e8, shop: 'bikeshop'},
  {id: 'mtb', icon: '🚵', name: '산악자전거', price: 4000, mul: 2.15, color: 0x4cb860, shop: 'bikeshop'},
  {id: 'ebike', icon: '⚡', name: '전기 자전거', price: 9000, mul: 2.6, color: 0xcc4ac0, shop: 'bikeshop'},
  {id: 'unicycle', icon: '🎪', name: '외발자전거', price: 700, mul: 1.3, color: 0xf3e04a, shop: 'bikeshop'},
  {id: 'moto', icon: '🏍️', name: '오토바이', price: 15000, mul: 3.1, color: 0xe5483f, shop: 'usedcar'},
];
export const rideOf = (id: string) => RIDES.find(r => r.id === id);

/** 펫 (펫샵). ltd = 하루 한정 */
export interface PetType {
  id: string;
  icon: string;
  name: string;
  price: number;
  color: number;
  accent: number;
  kind: 'dog' | 'cat' | 'rabbit' | 'hamster' | 'bird' | 'dragon' | 'robot';
  ltd?: number;
}
export const PETS: readonly PetType[] = [
  {id: 'hamster', icon: '🐹', name: '햄스터', price: 300, color: 0xe8c07a, accent: 0xffffff, kind: 'hamster'},
  {id: 'rabbit', icon: '🐰', name: '토끼', price: 600, color: 0xf2f2f2, accent: 0xf08cb4, kind: 'rabbit'},
  {id: 'dog', icon: '🐶', name: '강아지', price: 800, color: 0xc88a4a, accent: 0x6b4226, kind: 'dog'},
  {id: 'cat', icon: '🐱', name: '고양이', price: 800, color: 0x808899, accent: 0xf08cb4, kind: 'cat'},
  {id: 'chick', icon: '🐥', name: '병아리', price: 400, color: 0xf3e04a, accent: 0xf08a3a, kind: 'bird'},
  {id: 'robot', icon: '🤖', name: '로봇 강아지', price: 6000, color: 0xcfd6e6, accent: 0x45c8e8, kind: 'robot', ltd: 2},
  {id: 'dragon', icon: '🐲', name: '아기 용', price: 25000, color: 0x4cb860, accent: 0xf5b73a, kind: 'dragon', ltd: 1},
];
export const petOf = (id: string) => PETS.find(p => p.id === id);

/** 옷가게: 색 견본 12 · 등 장식 */
export const COLORS: readonly number[] = [0xe5483f, 0xf08a3a, 0xf3e04a, 0x4cb860, 0x2fb5a0, 0x4a82e8, 0x8b62dc, 0xcc4ac0, 0xf08cb4, 0xf2f2f2, 0x8a93a8, 0x1c1c24];
export const COLOR_COST = {shirt: 100, pants: 100, hat: 60};
export interface BackItem {
  id: number;
  icon: string;
  name: string;
  price: number;
  color: number;
}
/** 등 장식 (0 = 없음). 색은 기본색 */
export const BACKS: readonly BackItem[] = [
  {id: 0, icon: '∅', name: '없음', price: 0, color: 0},
  {id: 1, icon: '🦸', name: '망토', price: 600, color: 0xe5483f},
  {id: 2, icon: '🎒', name: '책가방', price: 400, color: 0x4a82e8},
  {id: 3, icon: '🪽', name: '천사 날개', price: 3000, color: 0xf2f2f2},
  {id: 4, icon: '🚀', name: '로켓 팩', price: 6000, color: 0xcfd6e6},
  {id: 5, icon: '🦋', name: '나비 날개', price: 2500, color: 0xcc4ac0},
];

/** 서점 책 6권 완성 보너스 */
export const BOOK_BONUS = 3000;
/** 복권: [확률 누적, 당첨금] */
export const LOTTO: readonly [number, number][] = [[0.7, 0], [0.9, 150], [0.98, 600], [1, 5000]];

// ---- 날짜/시간 기반 결정적 회전 ----
export const dayKey = () => Math.floor(Date.now() / 86400000);
export const hourKey = () => Math.floor(Date.now() / 3600000);
export const hashStr = (s: string): number => [...s].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 7);
/** 그날의 특가(−25%)와 이 시간의 반짝 세일(−10%) 인덱스 */
export const dealDay = (shop: string, len: number) => (len ? hashStr(shop + ':' + dayKey()) % len : -1);
export const dealHour = (shop: string, len: number) => (len ? hashStr(shop + '@' + hourKey()) % len : -1);
export function priceTag(shop: string, len: number, i: number, price: number): {price: number; tag: '🔥' | '⏰' | ''} {
  if (i === dealDay(shop, len)) return {price: Math.max(1, Math.round(price * 0.75)), tag: '🔥'};
  if (i === dealHour(shop, len)) return {price: Math.max(1, Math.round(price * 0.9)), tag: '⏰'};
  return {price, tag: ''};
}
/** 하루 한정 재고: 품목 id 와 날짜로 정한 판매 가능 수량 (이미 판 수는 game/shops2.ts 가 S.coins 에 센다) */
export const stockOf = (id: string, ltd: number) => Math.max(1, ltd - (hashStr(id + dayKey()) % 2));

/** 가게 건물 → 폰 지도/택시 장소 */
export const SHOP_PLACES = BUILDINGS_W4.map(b => ({id: 'sp-' + b.id.slice(3), icon: PURPOSE_INFO[b.purpose!].icon, name: PURPOSE_INFO[b.purpose!].name, ...doorOf(b)}));
