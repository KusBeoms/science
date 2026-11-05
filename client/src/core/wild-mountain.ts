// 시골 섬 산 높이(순수 함수): 정상 PEAK 에서 뻗는 능선(SPINES) 여러 개의 최댓값 → 능선 사이가 접힌 계곡이 된다. 거친 결은 노이즈.
// 등산로(core/wild-trail.ts)는 노이즈 없는 mountainBase 의 경사를 따라 스위치백을 그린다.
import {fbm} from '../render/lowpoly/rng.js';
import {MOUNTAIN} from '../data/wild.js';
import {PEAK, SPINES} from '../data/wild-mountain.js';

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const SP = SPINES.map(s => {
  const dx = s.e[0] - PEAK[0],
    dz = s.e[1] - PEAK[1],
    len = Math.hypot(dx, dz);
  return {s, dx, dz, len, l2: len * len};
});
/** 산 전체를 덮는 바운딩 박스(이 밖은 0 — 빠른 거절) */
export const MT_BOX = (() => {
  let x0 = PEAK[0], x1 = PEAK[0], z0 = PEAK[1], z1 = PEAK[1];
  for (const k of SP) {
    x0 = Math.min(x0, k.s.e[0] - 110); x1 = Math.max(x1, k.s.e[0] + 110);
    z0 = Math.min(z0, k.s.e[1] - 110); z1 = Math.max(z1, k.s.e[1] + 110);
  }
  return {x0: x0 - 30, x1: x1 + 30, z0: z0 - 80, z1: z1 + 30};
})();

/** 노이즈 없는 산 높이 (능선 최댓값) */
export function mountainBase(x: number, z: number): number {
  if (x < MT_BOX.x0 || x > MT_BOX.x1 || z < MT_BOX.z0 || z > MT_BOX.z1) return 0;
  let h = 0;
  for (const k of SP) {
    const rx = x - PEAK[0],
      rz = z - PEAK[1],
      t = Math.max(0, Math.min(1, (rx * k.dx + rz * k.dz) / k.l2)),
      d = Math.hypot(rx - k.dx * t, rz - k.dz * t),
      hw = k.s.hw0 * (0.9 + 0.2 * t),
      axis = k.s.hEnd + (MOUNTAIN.h - k.s.hEnd) * Math.pow(1 - t, k.s.pow);
    if (d >= hw) continue;
    // 마루가 약간 평평한 단면(부드러운 곡선 + 직선을 반씩) → 비탈이 지나치게 가파르지 않다
    const v = axis * (1 - 0.5 * smooth(0.1 * hw, hw, d) - 0.5 * Math.min(1, Math.max(0, (d - 0.1 * hw) / (0.9 * hw))));
    if (v > h) h = v;
  }
  return h;
}
/** 노이즈를 더한 산 높이 */
export function mountainH(x: number, z: number): number {
  const b = mountainBase(x, z);
  if (b <= 0.2) return b;
  const n = (fbm(x * 0.045 + 3, z * 0.045 - 5, 3, 77) - 0.5) * 2;
  return b + n * Math.min(4, b * 0.08) * smooth(0, 18, b);
}
