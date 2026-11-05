// 호수 모양: 정규화 거리 lakeT (1 = 물가). 타원에 낮은 주파수 굴곡을 섞어 물가를 구불구불하게 한다.
// 높이 굽기(core/wild-height.ts)·호숫가 길(data/wild-road.ts)·물 판정(core/water.ts)·색(render/terrain.ts)이 같이 쓴다. 순환 import 를 피하려고 따로 둠.
import {fbm} from '../render/lowpoly/rng.js';
import {LAKES, type Lake} from '../data/wild.js';

const LK = LAKES.map((L, i) => ({L, c: Math.cos(L.rot), s: Math.sin(L.rot), seed: 500 + i * 17}));

export function lakeT(L: Lake, x: number, z: number): number {
  const k = LK.find(o => o.L === L) || LK[0],
    dx = x - L.x,
    dz = z - L.z,
    u = dx * k.c + dz * k.s,
    v = -dx * k.s + dz * k.c,
    t = Math.hypot(u / L.rx, v / L.rz);
  if (t > 1.8) return t;
  const w = 0.55 * (fbm(x * 0.009 + k.seed, z * 0.009, 3, k.seed) - 0.5) + 0.3 * (fbm(x * 0.03, z * 0.03 + k.seed, 2, k.seed + 3) - 0.5);
  return t / (1 + w);
}
