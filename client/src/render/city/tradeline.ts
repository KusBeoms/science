// 거래의 선 (WORLD 3.5): 도시 외곽 경계를 따라 서는 금빛 낮은 기둥 띠. 도시 안은 안전지대라는 뜻이다. 바닥의 금빛 인레이는 layout.ts 의 surfaceAt.
// 북쪽 사과 대로(S1 로 가는 통로) 앞은 끊어 길을 연다.
import {cityApproach} from '../../data/bridge.js';
import {CITY_HALF} from '../../core/terrain.js';
import {ACCENT, NEUTRAL, mix, PAL} from '../lowpoly/palette.js';
import {box, type Geo} from '../lowpoly/prim.js';
import {mergePlaced, type Placed} from '../lowpoly/merge.js';

/** 선이 서는 위치(도시 가장자리에서 안쪽) · 기둥 간격 · 북쪽 개구 반폭 */
export const TRADE_EDGE = CITY_HALF - 1.5,
  POST_GAP = 12,
  GATE_HALF = 16;

export function tradeLine(): Geo {
  const gold = ACCENT.amber,
    cap = mix(gold, PAL.white, 0.5),
    list: Placed[] = [];
  const post = (x: number, z: number) => {
    list.push({g: box(0.7, 2.4, 0.7, NEUTRAL.coal), x, z}, {g: box(0.95, 0.35, 0.95, gold), x, y: 2.4, z}, {g: box(0.35, 0.35, 0.35, cap), x, y: 2.75, z});
  };
  const rail = (x0: number, z0: number, x1: number, z1: number) => {
    const w = Math.abs(x1 - x0) || 0.18,
      d = Math.abs(z1 - z0) || 0.18;
    list.push({g: box(w, 0.18, d, gold), x: (x0 + x1) / 2, y: 1.5, z: (z0 + z1) / 2});
  };
  const E = TRADE_EDGE;
  // 경계 z=E와 진입로 띠가 겹치는 구간의 양끝을 실제 곡선에서 구한다.
  const cross = cityApproach(100).filter(p => Math.abs(p.z - E) < p.w + 3);
  const south0 = Math.min(-GATE_HALF, ...cross.map(p => p.x - p.w - 3));
  const south1 = Math.max(GATE_HALF, ...cross.map(p => p.x + p.w + 3));
  for (let t = -E; t <= E + 0.01; t += POST_GAP) {
    const gap = Math.abs(t) < GATE_HALF;
    if (!gap) post(t, -E); // 북
    if (t < south0 || t > south1) post(t, E); // 남
    post(-E, t); // 서
    post(E, t); // 동
  }
  // 레일: 남·서·동은 통짜, 북은 사과 대로 개구에서 두 동강
  rail(-E, E, south0, E);
  rail(south1, E, E, E);
  rail(-E, -E, -GATE_HALF, -E);
  rail(GATE_HALF, -E, E, -E);
  rail(-E, -E, -E, E);
  rail(E, -E, E, E);
  return mergePlaced(list);
}
