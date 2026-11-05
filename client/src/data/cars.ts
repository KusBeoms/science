// 자동차 15종 + 튜닝·차고·등록 가격표. 차 앞쪽 = 로컬 +z. 속도 단위 u/s (플레이어 걷기 ≈ 9, 뛰기 ≈ 15)
export type CarShape = 'kart' | 'cart' | 'hatch' | 'sedan' | 'taxi' | 'buggy' | 'pickup' | 'suv' | 'van' | 'police' | 'bus' | 'sport' | 'limo' | 'super' | 'rocket';
export interface CarType {
  id: CarShape;
  name: string;
  icon: string;
  price: number;
  /** 최고 속도 · 가속 · 회전(핸들링, rad/s) */
  vmax: number;
  acc: number;
  turn: number;
  /** 차체 길이·폭·높이(바퀴 포함) */
  len: number;
  wid: number;
  hgt: number;
  color: number;
  /** 길에 세워 둔 차로 나오는 비중 (0 이면 안 나옴) */
  spawn: number;
}
export const CARS: readonly CarType[] = [
  {id: 'kart', name: '고카트', icon: '🛞', price: 400, vmax: 17, acc: 14, turn: 2.8, len: 3.2, wid: 2, hgt: 1.3, color: 0xe5483f, spawn: 3},
  {id: 'cart', name: '골프 카트', icon: '🛺', price: 900, vmax: 15, acc: 10, turn: 2.2, len: 3.6, wid: 2, hgt: 2.3, color: 0xe8dcc4, spawn: 3},
  {id: 'hatch', name: '해치백', icon: '🚗', price: 2200, vmax: 28, acc: 14, turn: 2.0, len: 4.2, wid: 2.1, hgt: 2, color: 0x4a82e8, spawn: 5},
  {id: 'sedan', name: '세단', icon: '🚙', price: 4000, vmax: 32, acc: 15, turn: 1.8, len: 5, wid: 2.2, hgt: 2, color: 0x808899, spawn: 5},
  {id: 'taxi', name: '택시', icon: '🚕', price: 5000, vmax: 33, acc: 15, turn: 1.8, len: 5, wid: 2.2, hgt: 2.4, color: 0xf3e04a, spawn: 3},
  {id: 'buggy', name: '버기', icon: '🏜️', price: 7500, vmax: 34, acc: 18, turn: 2.5, len: 3.8, wid: 2.4, hgt: 2.2, color: 0xf08a3a, spawn: 2},
  {id: 'pickup', name: '픽업트럭', icon: '🛻', price: 11000, vmax: 33, acc: 14, turn: 1.7, len: 5.6, wid: 2.4, hgt: 2.5, color: 0x4cb860, spawn: 3},
  {id: 'suv', name: 'SUV', icon: '🚙', price: 16000, vmax: 36, acc: 15, turn: 1.7, len: 5.2, wid: 2.4, hgt: 2.8, color: 0x3f6fa8, spawn: 3},
  {id: 'van', name: '밴', icon: '🚐', price: 21000, vmax: 30, acc: 12, turn: 1.5, len: 5.6, wid: 2.4, hgt: 3.1, color: 0xe4e8ef, spawn: 2},
  {id: 'police', name: '순찰차', icon: '🚓', price: 34000, vmax: 44, acc: 19, turn: 2.0, len: 5, wid: 2.2, hgt: 2.3, color: 0x262a36, spawn: 1},
  {id: 'bus', name: '버스', icon: '🚌', price: 48000, vmax: 26, acc: 8, turn: 1.1, len: 9, wid: 2.7, hgt: 3.6, color: 0xe0a53a, spawn: 1},
  {id: 'sport', name: '스포츠카', icon: '🏎️', price: 85000, vmax: 52, acc: 24, turn: 2.2, len: 4.6, wid: 2.3, hgt: 1.7, color: 0xcc4ac0, spawn: 1},
  {id: 'limo', name: '리무진', icon: '🚘', price: 130000, vmax: 40, acc: 12, turn: 1.2, len: 8, wid: 2.3, hgt: 2.1, color: 0x14161f, spawn: 1},
  {id: 'super', name: '슈퍼카', icon: '🏁', price: 240000, vmax: 66, acc: 30, turn: 2.3, len: 4.7, wid: 2.4, hgt: 1.5, color: 0xf5b73a, spawn: 0},
  {id: 'rocket', name: '로켓카', icon: '🚀', price: 520000, vmax: 84, acc: 38, turn: 2.0, len: 5.6, wid: 2.2, hgt: 1.9, color: 0xffffff, spawn: 0},
];
export const carOf = (id: string) => CARS.find(c => c.id === id) || CARS[0];

/** 차고(보관 칸 수 늘리기): 처음엔 길거리 1대만. 레벨마다 가격·칸 */
export const GARAGE_LV = [
  {slots: 1, price: 0, name: '길거리 주차'},
  {slots: 4, price: 6000, name: '소형 차고'},
  {slots: 8, price: 40000, name: '중형 차고'},
  {slots: 15, price: 220000, name: '대형 차고 (15대)'},
];
/** 차고 입구에서 꺼낸 차가 놓이는 곳 (정비소 시험로) */
export const GARAGE_OUT = {x: 130, z: -70, h: Math.PI / 2};
export const GARAGE_NEAR = 60; // 이 거리 안에서만 차를 차고에 넣을 수 있다

export const PAINTS = [0xe5483f, 0xf08a3a, 0xf3e04a, 0x4cb860, 0x4a82e8, 0x8b62dc, 0xf08cb4, 0xe4e8ef, 0x262a36, 0xf5b73a];
export const TUNE = [
  {key: 'eng', name: '엔진', icon: '⚙️', max: 3, base: 0.18, eff: '최고 속도 +8%'},
  {key: 'tire', name: '타이어', icon: '🛞', max: 3, base: 0.12, eff: '핸들링 +10%'},
  {key: 'neon', name: '언더글로', icon: '💡', max: 1, base: 0.1, eff: '밤길 네온'},
] as const;
export type TuneKey = (typeof TUNE)[number]['key'];
export const tuneCost = (price: number, key: TuneKey, lv: number) => Math.round(Math.max(250, price * TUNE.find(t => t.key === key)!.base * (lv + 1)));
export const REG_COST = (price: number) => Math.round(Math.max(150, price * 0.1)); // 등록 수수료
export const OWN_COST = (price: number) => Math.round(Math.max(300, price * 0.25)); // 훔친 차를 내 차로 만드는 값 (도색·번호판 교체)
export const SELL_BACK = 0.5;
