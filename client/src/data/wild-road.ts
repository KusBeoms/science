// 호숫가 길(순수 데이터·기하): 큰 호수 둘레 순환로 + 도시 다리 끝(BRIDGE_ENDS)에서 이어지는 길. 높이 굽기(core/wild-height.ts)가 길을 평평하게 누르고,
// 렌더(render/wild-lake.ts)가 아스팔트 띠를 깐다. 길 높이 = 호수 수면 + 1.8 (물에 안 잠기고 호숫가보다 살짝 높다).
import {LAKES, LAKE_ROAD_W} from './wild.js';
import {BRIDGE_ENDS} from './outline.js';
import {Z_FLARE} from './bridge.js';
import {lakeT} from '../core/lake-shape.js';

export interface RoadPt {
  x: number;
  z: number;
  y: number;
}
export interface RoadLine {
  id: string;
  pts: RoadPt[];
  closed: boolean;
}
const GRAND = LAKES[0],
  ROAD_Y = GRAND.level + 1.8,
  OFFSET = 20; // 호수 경계에서 길 중심까지(바깥쪽)

function ring(): RoadLine {
  const n = 120,
    c = Math.cos(GRAND.rot),
    s = Math.sin(GRAND.rot),
    rad: number[] = [],
    dirs: number[][] = [];
  // 각도마다 중심에서 바깥으로 훑어 실제 물가(lakeT=1)를 찾고 OFFSET 만큼 더 나간 반지름을 잡는다
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2,
      ux = Math.cos(a) * GRAND.rx,
      uz = Math.sin(a) * GRAND.rz,
      l = Math.hypot(ux, uz),
      dx = (ux * c - uz * s) / l,
      dz = (ux * s + uz * c) / l;
    let r = 20;
    while (r < 600 && lakeT(GRAND, GRAND.x + dx * r, GRAND.z + dz * r) < 1) r += 2;
    rad.push(r);
    dirs.push([dx, dz]);
  }
  // 이웃 최대값으로 오목한 곳을 메우고 평균으로 부드럽게 (길이 물가를 가로지르지 않게)
  const mx = rad.map((_, k) => Math.max(...[-3, -2, -1, 0, 1, 2, 3].map(o => rad[(k + o + n) % n]))),
    sm = mx.map((_, k) => [-2, -1, 0, 1, 2].reduce((a, o) => a + mx[(k + o + n) % n], 0) / 5 + OFFSET);
  const pts: RoadPt[] = sm.map((r, k) => ({x: GRAND.x + dirs[k][0] * r, z: GRAND.z + dirs[k][1] * r, y: ROAD_Y}));
  return {id: 'ring', pts, closed: true};
}
const RING = ring();

function connector(): RoadLine {
  // 북쪽 곶(다리 끝)에서 산(MOUNTAIN) 동쪽 비탈을 돌아 호수 순환로로 — 윤곽 안쪽 30u 이상
  const way: [number, number][] = [[BRIDGE_ENDS.x, Z_FLARE], [68, 818], [100, 880], [145, 945], [190, 1015], [235, 1115], [265, 1215], [292, 1330], [284, 1450]];
  // 순환로에서 마지막 길목에 가장 가까운 점으로 잇는다
  const last = way[way.length - 1];
  let best = RING.pts[0],
    bd = 1e9;
  for (const p of RING.pts) {
    const d = Math.hypot(p.x - last[0], p.z - last[1]);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  const pts: RoadPt[] = way.map(([x, z], i) => ({x, z, y: ROAD_Y * Math.min(1, i / 3.5)}));
  pts.push({x: best.x, z: best.z, y: ROAD_Y});
  return {id: 'link', pts, closed: false};
}
export const ROAD_LINES: RoadLine[] = [RING, connector()];
export const ROAD_W = LAKE_ROAD_W;

const PAD = 40;
const BOX = ROAD_LINES.map(l => {
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
  for (const p of l.pts) {
    x0 = Math.min(x0, p.x); z0 = Math.min(z0, p.z); x1 = Math.max(x1, p.x); z1 = Math.max(z1, p.z);
  }
  return [x0 - PAD, z0 - PAD, x1 + PAD, z1 + PAD];
});
/** (x,z) 에서 가장 가까운 길 중심선까지 거리와 그 지점의 길 높이. 길 근처가 아니면 d = 1e9 */
export function roadNear(x: number, z: number): {d: number; y: number} {
  let bd = 1e9,
    by = 0;
  for (let li = 0; li < ROAD_LINES.length; li++) {
    const b = BOX[li];
    if (x < b[0] || x > b[2] || z < b[1] || z > b[3]) continue;
    const L = ROAD_LINES[li],
      n = L.pts.length,
      m = L.closed ? n : n - 1;
    for (let k = 0; k < m; k++) {
      const p = L.pts[k],
        q = L.pts[(k + 1) % n],
        dx = q.x - p.x,
        dz = q.z - p.z,
        t = Math.max(0, Math.min(1, ((x - p.x) * dx + (z - p.z) * dz) / (dx * dx + dz * dz || 1))),
        d = Math.hypot(x - (p.x + dx * t), z - (p.z + dz * t));
      if (d < bd) {
        bd = d;
        by = p.y + (q.y - p.y) * t;
      }
    }
  }
  return {d: bd, y: by};
}
