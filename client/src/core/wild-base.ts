// 시골 섬 기본 지형(순수 함수): 완만한 구릉 평야. 밭 둔덕·마을 평지·도로 평탄화가 이 높이를 기준으로 삼는다.
import {fbm} from '../render/lowpoly/rng.js';

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** 노이즈가 섞인 평야 높이: 대략 −0.8 ~ 5 (큰 호수 수면 −1.2 보다 높은 구릉) */
export function plainsH(x: number, z: number): number {
  const n = (fbm(x * 0.006 + 31, z * 0.006 - 17, 3, 911) - 0.5) * 2,
    m = (fbm(x * 0.02 + 11, z * 0.02 - 7, 4, 321) - 0.5) * 2;
  return 2.2 + 2.6 * n + 0.5 * m;
}
/** 선분 a→b 까지의 거리 */
export function segDist(x: number, z: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax,
    dz = bz - az,
    t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
}

/** 모래 반도(해변) 영향 0~1: 동쪽·남동쪽 바닷가 (data/wild.ts DESERT 기준, 경계는 부드럽게) */
export function beachMask(x: number, z: number, x0: number, z0: number): number {
  return smoothstep(x0 - 110, x0 - 20, x) * smoothstep(z0 - 40, z0 + 10, z);
}
/** 해안 절벽(바위 띠) 마스크 0~1: 노이즈로 해안 일부만. 다리 어귀(북쪽 곶)·해변은 제외 */
export function cliffMask(x: number, z: number, beach: number, bx: number, bz: number): number {
  const cn = fbm(x * 0.011 + 5, z * 0.011 + 9, 2, 404);
  return smoothstep(0.5, 0.6, cn) * (1 - beach) * smoothstep(120, 200, Math.hypot(x - bx, z - bz));
}
