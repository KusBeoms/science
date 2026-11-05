// 스위치백 등산로(순수 계산): 산기슭에서 남쪽 능선의 완만한 횡단을 반복해 정상까지 오른다.
// 높이는 산 형상을 따라 다듬고 실제 선분 길이로 경사를 제한한다.
// 굽기(core/wild-height.ts)가 trailNear 로 길을 평탄하게 누르고, 렌더(render/wild-mountain.ts)가 띠·난간을 깐다.
import {mountainBase} from './wild-mountain.js';
import {LOT, PEAK, SUMMIT_Y, TRAILHEAD} from '../data/wild-mountain.js';

export interface TrailPt {
  x: number;
  z: number;
  y: number;
}
const STEP = 3, TW = 2.4, TFADE = 6;
export const TRAIL_HW = TW;

/** 남쪽 능선을 오르는 고정 스위치백. 항상 정상에 도착하며 자기 교차나 마지막 지름길이 없다. */
function build(): TrailPt[] {
  const way: readonly (readonly [number, number])[] = [
    TRAILHEAD, [190, 1422], [68, 1430], [170, 1390], [18, 1382],
    [148, 1350], [0, 1332], [124, 1297], [18, 1270],
    [98, 1240], [44, 1215], PEAK,
  ];
  let p: number[][] = [];
  for (let i = 0; i < way.length - 1; i++) {
    const a = way[i], b = way[i + 1], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / STEP);
    for (let k = 0; k < n; k++) p.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  p.push([...PEAK]);
  // 코너만 부드럽게 한다. 시작/정상 좌표는 고정한다.
  for (let pass = 0; pass < 4; pass++) p = p.map((q, i) => i === 0 || i === p.length - 1 ? q : [(p[i - 1][0] + q[0] * 2 + p[i + 1][0]) / 4, (p[i - 1][1] + q[1] * 2 + p[i + 1][1]) / 4]);
  const n = p.length, dist = [0];
  for (let i = 1; i < n; i++) dist.push(dist[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  const total = dist[n - 1], grade = 0.23;
  const base = p.map(q => mountainBase(q[0], q[1]) * 0.95 + 1);
  const y = base.map((v, i) => {
    let sum = 0, count = 0;
    for (let k = Math.max(0, i - 4); k <= Math.min(n - 1, i + 4); k++) { sum += base[k]; count++; }
    const sm = sum / count, from = Math.min(1, dist[i] / 30), to = Math.min(1, (total - dist[i]) / 22);
    const h = LOT.y + (sm - LOT.y) * from;
    return Math.max(SUMMIT_Y - grade * (total - dist[i]), Math.min(LOT.y + grade * dist[i], h + (SUMMIT_Y - h) * (1 - to)));
  });
  y[0] = LOT.y; y[n - 1] = SUMMIT_Y;
  // 실제 선분 길이에 비례해 경사를 제한한다. 양 끝 고정과 정상 높이가 양립한다.
  for (let i = 1; i < n; i++) {
    const lim = grade * (dist[i] - dist[i - 1]);
    y[i] = Math.max(y[i - 1] - lim, Math.min(y[i - 1] + lim, y[i]));
  }
  y[n - 1] = SUMMIT_Y;
  for (let i = n - 2; i >= 0; i--) {
    const lim = grade * (dist[i + 1] - dist[i]);
    y[i] = Math.max(y[i + 1] - lim, Math.min(y[i + 1] + lim, y[i]));
  }
  return p.map((q, i) => ({x: q[0], z: q[1], y: y[i]}));
}
export const TRAIL: TrailPt[] = build();

const BOX = (() => {
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
  for (const q of TRAIL) {
    x0 = Math.min(x0, q.x); z0 = Math.min(z0, q.z); x1 = Math.max(x1, q.x); z1 = Math.max(z1, q.z);
  }
  return [x0 - TFADE - 2, z0 - TFADE - 2, x1 + TFADE + 2, z1 + TFADE + 2];
})();
/** (x,z) 에서 등산로 중심선까지 거리와 그 지점의 길 높이. 가까이 없으면 d = 1e9 */
export function trailNear(x: number, z: number): {d: number; y: number} {
  if (x < BOX[0] || x > BOX[2] || z < BOX[1] || z > BOX[3]) return {d: 1e9, y: 0};
  let bd = 1e9, by = 0;
  for (let k = 0; k < TRAIL.length - 1; k++) {
    const p = TRAIL[k], q = TRAIL[k + 1];
    if (Math.abs(p.x - x) > TFADE + 4 && Math.abs(q.x - x) > TFADE + 4 && (p.x - x) * (q.x - x) > 0) continue;
    if (Math.abs(p.z - z) > TFADE + 4 && Math.abs(q.z - z) > TFADE + 4 && (p.z - z) * (q.z - z) > 0) continue;
    const dx = q.x - p.x, dz = q.z - p.z,
      t = Math.max(0, Math.min(1, ((x - p.x) * dx + (z - p.z) * dz) / (dx * dx + dz * dz || 1))),
      d = Math.hypot(x - (p.x + dx * t), z - (p.z + dz * t));
    if (d < bd) {
      bd = d;
      by = p.y + (q.y - p.y) * t;
    }
  }
  return {d: bd, y: by};
}
export const TRAIL_FADE = TFADE;
