// 시골 섬 도로망(순수 데이터·기하, W7 RURAL): 북쪽 꼭짓점 다리 끝(Z_FLARE)에서 곧은 간선(link)이 섬 동쪽 비탈을 따라 남하 → 큰 호수 순환로(ring).
// 갈래길: 산기슭 주차장(spur) · 북서 호수 마을(village) · 서쪽 농촌 마을(west). 높이 굽기(core/wild-height.ts)가 길을 평평하게 누르고, 렌더(render/wild-lake.ts)가 아스팔트 띠를 깐다.
// 길 높이 = 큰 호수 수면 + 1.8 (물에 안 잠기고 호숫가보다 살짝 높다). 끊기거나 막힌 곳 없이 한 줄로 이어진다.
import {LAKES, LAKE_ROAD_W} from './wild.js';
import {Z_FLARE} from './bridge.js';
import {BRIDGE_ENDS} from './outline.js';
import {lakeT} from '../core/lake-shape.js';
import {LOT} from './wild-mountain.js';

export interface RoadPt {
  x: number;
  z: number;
  y: number;
}
export interface RoadLine {
  id: string;
  pts: RoadPt[];
  closed: boolean;
  /** 폭 */
  w: number;
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
  return {id: 'ring', pts, closed: true, w: LAKE_ROAD_W};
}
const RING = ring();
/** 순환로에서 (x,z) 에 가장 가까운 점 */
function ringNear(x: number, z: number): RoadPt {
  let best = RING.pts[0], bd = 1e9;
  for (const p of RING.pts) {
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
const flat = (way: [number, number][], ramp = 0): RoadPt[] => way.map(([x, z], i) => ({x, z, y: ROAD_Y * (ramp ? Math.min(1, i / ramp) : 1)}));

/** 간선: 다리 끝 → 섬 동쪽 비탈(윤곽 안쪽 ≥ 75u)을 따라 곧게 남하 → 순환로 */
function trunk(): RoadLine {
  const way: [number, number][] = [[BRIDGE_ENDS.x, Z_FLARE], [78, 850], [100, 900], [125, 950], [150, 1000], [185, 1060], [215, 1120], [250, 1190], [275, 1260], [290, 1330], [293, 1400], [290, 1460]];
  const end = ringNear(300, 1530),
    pts = flat(way, 3.5);
  pts.push({x: end.x, z: end.z, y: ROAD_Y});
  return {id: 'link', pts, closed: false, w: LAKE_ROAD_W};
}
/** 산기슭 주차장 진입로: 순환로 북쪽 → 주차장 남변 */
function spur(): RoadLine {
  const a = ringNear(LOT.x, LOT.z + 60);
  return {id: 'spur', pts: [{x: a.x, z: a.z, y: ROAD_Y}, {x: LOT.x, z: LOT.z + LOT.d / 2 + 1, y: ROAD_Y}], closed: false, w: 7};
}
/** 호수 마을 길: 간선(150,1000) → 북서 호수 동쪽 둘레(마을 광장) */
const VILLAGE_END: [number, number] = [4, 1040];
function village(): RoadLine {
  return {id: 'village', pts: flat([[150, 1000], [112, 1016], [70, 1030], [34, 1038], VILLAGE_END]), closed: false, w: 6.5};
}
/** 서쪽 농촌 마을 길: 순환로 서쪽 → 서쪽 마을 광장 */
export const WEST_PLAZA: [number, number] = [-350, 1300];
function west(): RoadLine {
  const a = ringNear(-400, 1660);
  const pts = flat([[a.x, a.z], [-228, 1610], [-292, 1550], [-352, 1480], [-382, 1405], [-372, 1340], WEST_PLAZA]);
  return {id: 'west', pts, closed: false, w: 6.5};
}
/** 목장 농로: 서쪽 마을에서 교도소 서쪽을 우회해 목장 남·동쪽 농가 마당까지 연결한다. */
function farm(): RoadLine {
  return {id: 'farm', pts: flat([WEST_PLAZA, [-356, 1220], [-332, 1185], [-270, 1185], [-198, 1185], [-148, 1157], [-148, 1106]]), closed: false, w: 4};
}
/** 지형 굽기와 표시 메시가 같은 곡선을 사용한다. 끝점/교차점은 원래 제어점을 정확히 지난다. */
function curve(line: RoadLine): RoadLine {
  const pts = line.pts, n = pts.length, out: RoadPt[] = [];
  const at = (i: number) => pts[line.closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < (line.closed ? n : n - 1); i++) {
    const [a, b, c, d] = [at(i - 1), at(i), at(i + 1), at(i + 2)], steps = Math.max(1, Math.ceil(Math.hypot(c.x - b.x, c.z - b.z) / 3));
    for (let k = 0; k < steps; k++) {
      const t = k / steps, t2 = t * t, t3 = t2 * t;
      const f = (v0: number, v1: number, v2: number, v3: number) => 0.5 * (2 * v1 + (-v0 + v2) * t + (2 * v0 - 5 * v1 + 4 * v2 - v3) * t2 + (-v0 + 3 * v1 - 3 * v2 + v3) * t3);
      out.push({x: f(a.x, b.x, c.x, d.x), z: f(a.z, b.z, c.z, d.z), y: b.y + (c.y - b.y) * t});
    }
  }
  if (!line.closed) out.push(pts[n - 1]);
  return {...line, pts: out};
}
export const ROAD_LINES: RoadLine[] = [RING, trunk(), spur(), village(), west(), farm()].map(curve);
export const ROAD_W = LAKE_ROAD_W;
export const roadLine = (id: string) => ROAD_LINES.find(l => l.id === id)!;

const PAD = 40;
const BOX = ROAD_LINES.map(l => {
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
  for (const p of l.pts) {
    x0 = Math.min(x0, p.x); z0 = Math.min(z0, p.z); x1 = Math.max(x1, p.x); z1 = Math.max(z1, p.z);
  }
  return [x0 - PAD, z0 - PAD, x1 + PAD, z1 + PAD];
});
/** (x,z) 에서 가장 가까운 길 중심선까지 거리 d · 그 지점의 길 높이 y · 그 길의 반폭 hw. 길 근처가 아니면 d = 1e9 */
export function roadNear(x: number, z: number): {d: number; y: number; hw: number} {
  let bd = 1e9,
    by = 0,
    bw = LAKE_ROAD_W / 2;
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
        d = Math.hypot(x - (p.x + dx * t), z - (p.z + dz * t)) - L.w / 2; // 길 가장자리까지
      if (d < bd) {
        bd = d;
        by = p.y + (q.y - p.y) * t;
        bw = L.w / 2;
      }
    }
  }
  // d 는 중심선 거리로 되돌려 준다(기존 사용처 호환) — 위에서는 가장자리 기준으로 비교해 넓은 길이 우선되게 했다
  return {d: bd >= 1e8 ? 1e9 : bd + bw, y: by, hw: bw};
}
