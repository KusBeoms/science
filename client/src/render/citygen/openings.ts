// 벽 개구 빌더 (W8 INTERIOR): 개구(문·창)가 뚫린 벽을 상자 조각으로 만든다 — 개구 사이 기둥 구간, 개구 아래 창턱벽, 개구 위 상인방벽.
// 벽 로컬 프레임: u = 벽을 따라(−len/2..len/2), y = 위(0 이 벽 띠의 바닥), 두께 t 의 중앙이 v=0, 바깥 법선이 +v. 건물 배치는 shell.ts 가 한다.
import {box, type Geo} from '../lowpoly/prim.js';

export interface Hole {
  u0: number; u1: number;
  /** 벽 띠 바닥 기준 개구 아래·위 높이 (문은 y0=0) */
  y0: number; y1: number;
}
/** 개구들을 비운 벽 조각들(벽 길이 len, 띠 높이 H, 두께 t). 개구는 서로 겹치지 않아야 한다 */
export function wallPieces(len: number, H: number, t: number, holes: readonly Hole[], color: number): Geo[] {
  const out: Geo[] = [],
    hs = [...holes].sort((a, b) => a.u0 - b.u0);
  let cur = -len / 2;
  const seg = (a: number, b: number) => b - a > 0.01 && out.push(box(b - a, H, t, color, (a + b) / 2, 0, 0));
  for (const h of hs) {
    seg(cur, h.u0);
    const w = h.u1 - h.u0, m = (h.u0 + h.u1) / 2;
    if (h.y0 > 0.01) out.push(box(w, h.y0, t, color, m, 0, 0)); // 창턱벽
    if (h.y1 < H - 0.01) out.push(box(w, H - h.y1, t, color, m, h.y1, 0)); // 상인방벽
    cur = h.u1;
  }
  seg(cur, len / 2);
  return out;
}
/** 개구 둘레 문틀: 좌우 문설주 + 상인방 띠(바깥 면에서 4cm 튀어나옴). 문 전용 */
export function doorFrame(h: Hole, t: number, color: number, bar = 0.1): Geo[] {
  const m = (h.u0 + h.u1) / 2, w = h.u1 - h.u0, v = t / 2 + 0.02, ht = h.y1 - h.y0;
  return [
    box(bar, ht + bar, 0.08, color, h.u0 - bar / 2, h.y0, v),
    box(bar, ht + bar, 0.08, color, h.u1 + bar / 2, h.y0, v),
    box(w + 2 * bar, bar, 0.08, color, m, h.y1, v),
  ];
}
