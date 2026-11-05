// 도시 4차(W5 ROADS): 입체교차로·고가도로 데이터. 순수 데이터 — 데크(고가 상판·램프)는 core/deck.ts 에 등록되고(render/overpass.ts),
// 지상 연결 도로(slip)·횡단보도는 render/overpass.ts / render/crosswalks.ts 가 그린다.
// 구조: 길 옆에 나란한 고가 한 줄 — 램프(오르막) → 평평한 상판(교차 도로 위) → 램프(내리막). 램프 발치는 지상 연결로(slip)가 길과 잇는다.
import type {Deck} from '../core/deck.js';

/** 상판 윗면 높이 (밑 통행 여유 ≈ H − 상판 두께 0.9 ≈ 5.3) */
export const DECK_H = 6.2;
/** 상판 반폭 (폭 10) */
export const DECK_HW = 5;
const RAMP = 24;

export interface Viaduct {
  id: string;
  /** 진행 축과 중심선 좌표: axis 'x' 면 z=at 에서 x 방향으로 a0→a1 */
  axis: 'x' | 'z';
  at: number;
  a0: number;
  a1: number;
  /** 이어 붙일 길의 중심 좌표(at 과 같은 축 값)와 차도 반폭 */
  roadAt: number;
  rh: number;
}

/** 고가 한 줄: 길이 a0→a1, 양 끝 RAMP 길이는 램프 */
export const VIADUCTS: readonly Viaduct[] = [
  // 동쪽 입체: 대로(east-ave) 남·북 옆으로 순환로 r1-e(x=200)를 넘는 고가 한 쌍
  {id: 'ev-s', axis: 'x', at: 16, a0: 162, a1: 238, roadAt: 0, rh: 7},
  {id: 'ev-n', axis: 'x', at: -16, a0: 162, a1: 238, roadAt: 0, rh: 7},
  // 남쪽 입체: 항구 대로(harbor-s, x=0) 동쪽 옆으로 순환로 r1-s(z=200)를 넘는 고가
  {id: 'hv-e', axis: 'z', at: 20, a0: 162, a1: 238, roadAt: 0, rh: 8},
  // 북쪽 고가: 사과 대로(apple-n, x=0) 동쪽 옆으로 순환로 r1-n(z=−200)·r2-n(z=−275)을 잇달아 넘는 긴 고가
  {id: 'av-e', axis: 'z', at: 24, a0: -316, a1: -166, roadAt: 0, rh: 12},
];

const pt = (v: Viaduct, a: number, off = 0): [number, number] => (v.axis === 'x' ? [a, v.at + off] : [v.at + off, a]);

/** 한 고가를 램프-상판-램프 데크 3개로 나눈다 (a0<a1 이든 a0>a1 이든 같은 방식) */
export function decksOf(v: Viaduct): Deck[] {
  const dir = Math.sign(v.a1 - v.a0) || 1,
    p1 = v.a0 + dir * RAMP,
    p2 = v.a1 - dir * RAMP,
    mk = (suffix: string, s: number, e: number, h0: number, h1: number): Deck => {
      const [ax, az] = pt(v, s),
        [bx, bz] = pt(v, e);
      return {id: `${v.id}-${suffix}`, ax, az, bx, bz, hw: DECK_HW, h0, h1};
    };
  return [mk('up', v.a0, p1, 0, DECK_H), mk('top', p1, p2, DECK_H, DECK_H), mk('down', p2, v.a1, DECK_H, 0)];
}
export const ALL_DECKS: readonly Deck[] = VIADUCTS.flatMap(decksOf);

/** 지상 연결로: 램프 발치에서 길(차도) 가장자리까지 비스듬히 잇는 아스팔트 띠 (렌더 전용) */
export interface Slip {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  hw: number;
}
export function slipsOf(v: Viaduct): Slip[] {
  const side = Math.sign(v.at - v.roadAt),
    endOff = v.roadAt + side * (v.rh - 1) - v.at,
    out: Slip[] = [];
  for (const [a, dir] of [[v.a0, -1], [v.a1, 1]] as const) {
    const [ax, az] = pt(v, a),
      [bx, bz] = pt(v, a + dir * 10, endOff);
    out.push({ax, az, bx, bz, hw: 4.5});
  }
  return out;
}

/** 생성기가 건물을 비울 곳 (city-w3 RESERVED 에 펼쳐 넣는다) */
export const ROADS_W4_RESERVED: readonly (readonly [number, number, number, number])[] = [
  [150, 9, 262, 26], // 동쪽 입체 남쪽 고가
  [150, -26, 262, -9], // 동쪽 입체 북쪽 고가
  [11, 150, 30, 262], // 남쪽 입체 고가
  [12, -322, 34, -152], // 북쪽 고가
];
