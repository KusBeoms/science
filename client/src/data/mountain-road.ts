// 산악 도로 (W7 CITY_SURROUND): 시가지 동쪽 끝(도로 r1-n 의 끝, (335,-200))에서 동쪽 반도 정상의 천문대까지 굽이쳐 오르는 포장도로. 참조 이미지(Snowy Mountain Island Cityscape)의 동쪽 반도 도로.
// 순수 데이터·기하: 높이 굽기(core/belt-height.ts)가 도로 주변을 평탄화하고, 렌더(render/city-mountain.ts)가 노면·가드레일을 깐다.
// 노면 높이는 거리에 따라 0 → OBS.y 로 완만히(최대 경사 ≈ 0.13) 올라간다. 차가 오를 수 있다.

export interface MPt {
  x: number;
  z: number;
  y: number;
  /** 도로 시작에서부터의 누적 길이 */
  s: number;
}

/** 노면 폭(차 2대) · 보도/갓길 포함 폭 · 지형이 도로 높이로 완전히 눌리는 반폭 */
export const MROAD_W = 9,
  MROAD_SHOULDER = 12,
  MROAD_FLAT = 6;
/** 정상 천문대 광장 (반지름 r 의 평지 원) */
export const OBS = {x: 888, z: -236, y: 64, r: 26};

/** 굽이 제어점 (x,z) — 시가지 끝에서 반도 능선 남사면을 지그재그로 오른다 */
const CTRL: [number, number][] = [
  [300, -200], [335, -200], [392, -194], [450, -206], [505, -238], [548, -270], [600, -278], [648, -252],
  [668, -208], [650, -168], [606, -150], [592, -122], [630, -96], [690, -100], [736, -130], [748, -176],
  [790, -206], [840, -200], [872, -222], [OBS.x - 18, OBS.z + 2],
];

/** Catmull-Rom 으로 부드럽게 이은 뒤 ~4u 간격으로 다시 뽑는다 */
function build(): MPt[] {
  const pts: {x: number; z: number}[] = [];
  const n = CTRL.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = CTRL[Math.max(0, i - 1)],
      p1 = CTRL[i],
      p2 = CTRL[i + 1],
      p3 = CTRL[Math.min(n - 1, i + 2)],
      len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]),
      m = Math.max(2, Math.ceil(len / 4));
    for (let k = 0; k < m; k++) {
      const t = k / m,
        t2 = t * t,
        t3 = t2 * t,
        f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push({x: f(p0[0], p1[0], p2[0], p3[0]), z: f(p0[1], p1[1], p2[1], p3[1])});
    }
  }
  pts.push({x: CTRL[n - 1][0], z: CTRL[n - 1][1]});
  const out: MPt[] = [];
  let s = 0;
  pts.forEach((p, i) => {
    if (i) s += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z);
    out.push({x: p.x, z: p.z, y: 0, s});
  });
  const L = s;
  // 시작 평지(도시 도로와 같은 높이)에서 매끈하게 올라 정상에서 다시 평평하게
  for (const p of out) {
    const t = Math.min(1, Math.max(0, (p.s - 30) / (L - 30)));
    p.y = OBS.y * (t * t * (3 - 2 * t) * 0.5 + t * 0.5);
  }
  return out;
}
export const MOUNTAIN_ROAD: MPt[] = build();
export const MROAD_LEN = MOUNTAIN_ROAD[MOUNTAIN_ROAD.length - 1].s;

const PAD = 80;
let bx0 = 1e9, bz0 = 1e9, bx1 = -1e9, bz1 = -1e9;
for (const p of MOUNTAIN_ROAD) {
  bx0 = Math.min(bx0, p.x); bz0 = Math.min(bz0, p.z); bx1 = Math.max(bx1, p.x); bz1 = Math.max(bz1, p.z);
}
bx0 -= PAD; bz0 -= PAD; bx1 += PAD; bz1 += PAD;

/** (x,z) 에서 가장 가까운 도로 중심선까지 거리 d 와 그 지점의 도로 높이 y. 도로에서 멀면 d = 1e9 */
export function mroadNear(x: number, z: number): {d: number; y: number} {
  if (x < bx0 || x > bx1 || z < bz0 || z > bz1) return {d: 1e9, y: 0};
  let bd = 1e9, by = 0;
  const P = MOUNTAIN_ROAD;
  for (let k = 0; k < P.length - 1; k++) {
    const p = P[k], q = P[k + 1],
      dx = q.x - p.x, dz = q.z - p.z,
      t = Math.max(0, Math.min(1, ((x - p.x) * dx + (z - p.z) * dz) / (dx * dx + dz * dz || 1))),
      d = Math.hypot(x - (p.x + dx * t), z - (p.z + dz * t));
    if (d < bd) {
      bd = d;
      by = p.y + (q.y - p.y) * t;
    }
  }
  return {d: bd, y: by};
}
