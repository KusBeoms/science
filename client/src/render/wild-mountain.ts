// 시골 섬 산 장식(W7 RURAL): 꼬불꼬불 스위치백 등산로(띠 + 난간 말뚝) · 입구 문 · 산기슭 주차장(차량·칸막이선) · 산장 · 중간 휴게 정자 · 정상 정자·깃발 · 능선 바위 · 개울 띠.
// 병합 Placed 와 인스턴스 목록을 돌려주면 rural-landscape.ts 가 칸 병합/LOD 로 묶는다.
import {groundH, addSolid} from '../core/terrain.js';
import {addDeck} from '../core/deck.js';
import {TRAIL} from '../core/wild-trail.js';
import {mountainBase} from '../core/wild-mountain.js';
import {LOT, LODGE, PEAK, STREAMS, STREAM_W, SUMMIT_FLAT} from '../data/wild-mountain.js';
import {PAL, NEUTRAL, mix} from './lowpoly/palette.js';
import {box, cyl} from './lowpoly/prim.js';
import {hash2} from './lowpoly/rng.js';
import {mergeGeometries, type Placed, type Inst} from './lowpoly/merge.js';
import {terrainRibbon, type PathPoint} from './landscape-surface.js';
import {gazebo, coastalRock} from './rural-art.js';
import {lodge, shelter, signpost, trailGate, walkway} from './rural-models.js';
import {ruralBodySolid, ruralEntry} from './rural-entry.js';
import {worldPart} from './rural-fields.js';

const TRAIL_C = mix(PAL.bone, PAL.clay, 0.3),
  WATER = mix(mix(PAL.blue, PAL.teal, 0.3), PAL.slate, 0.3);

export interface MountainBuild {
  parts: Placed[];
  paths: Placed[];
  posts: Inst[];
  lamps: Inst[];
  trailLength: number;
  lodgeY: number;
}
function car(color: number) {
  return mergeGeometries([box(4.4, 0.9, 2, color, 0, 0.3), box(2.4, 0.9, 1.8, mix(color, PAL.white, 0.25), -0.2, 1.2), box(2.5, 0.5, 1.9, PAL.glass, -0.2, 1.3), box(4.5, 0.25, 2.05, NEUTRAL.coal, 0, 0.1)]);
}
/** 폴리라인을 Catmull-Rom 으로 step 간격 재샘플 */
function smoothLine(pts: readonly (readonly [number, number])[], step: number): PathPoint[] {
  const out: PathPoint[] = [], n = pts.length, at = (i: number) => pts[Math.min(n - 1, Math.max(0, i))];
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)], k = Math.max(1, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let s = 0; s < k; s++) {
      const t = s / k, t2 = t * t, t3 = t2 * t, f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[n - 1]);
  return out;
}

export function buildMountain(): MountainBuild {
  const parts: Placed[] = [], paths: Placed[] = [], posts: Inst[] = [], lamps: Inst[] = [];
  // 등산로: 중심선 띠(지면보다 살짝 위) + 한쪽 가장자리 난간 말뚝
  const tp: PathPoint[] = TRAIL.map(p => [p.x, p.z] as PathPoint);
  paths.push(worldPart(terrainRibbon(tp, 2.7, TRAIL_C, 0.3), tp[0][0], tp[0][1]));
  for (let i = 4; i < TRAIL.length - 4; i += 3) {
    const a = TRAIL[i - 1], b = TRAIL[i + 1], l = Math.hypot(b.x - a.x, b.z - a.z) || 1, side = 1;
    const x = TRAIL[i].x - ((b.z - a.z) / l) * 1.9 * side, z = TRAIL[i].z + ((b.x - a.x) / l) * 1.9 * side;
    posts.push({x, y: groundH(x, z), z, s: 1, ry: 0});
  }
  // 입구 문(길 방향에 직각) + 푯말
  const g0 = TRAIL[0], g1 = TRAIL[4];
  parts.push({g: trailGate(), x: g0.x, y: groundH(g0.x, g0.z), z: g0.z, ry: Math.atan2(g1.x - g0.x, g1.z - g0.z)});
  parts.push({g: signpost(), x: g0.x + 4, y: groundH(g0.x + 4, g0.z + 2), z: g0.z + 2, ry: -0.6});
  // 주차장: 아스팔트 판 + 흰 칸막이선 + 세워 둔 차(충돌체) + 가로등
  parts.push({g: box(LOT.w, 0.3, LOT.d, PAL.asphalt), x: LOT.x, y: LOT.y - 0.2, z: LOT.z});
  for (let k = -3; k <= 3; k++) parts.push({g: box(0.18, 0.05, 6, PAL.white), x: LOT.x + k * 5.6, y: LOT.y + 0.12, z: LOT.z - 6.5});
  const cols = [PAL.red, PAL.blue, PAL.white, PAL.amber];
  [-2.5, -0.5, 1.5, 2.5].forEach((k, i) => {
    const cx = LOT.x + k * 5.6, cz = LOT.z - 6.5;
    parts.push({g: car(cols[i]), x: cx, y: LOT.y + 0.1, z: cz, ry: Math.PI / 2});
    addSolid(cx - 1.2, cz - 2.4, cx + 1.2, cz + 2.4);
  });
  for (const [lx, lz] of [[-20, -11], [20, -11], [-20, 11], [20, 11]]) lamps.push({x: LOT.x + lx, y: LOT.y, z: LOT.z + lz});
  // 산장
  const foundationHeights = [[-7.25, -4.75], [7.25, -4.75], [-7.25, 4.75], [7.25, 4.75]].map(([u, v]) =>
    groundH(LODGE.x + u * Math.cos(LODGE.ry) + v * Math.sin(LODGE.ry), LODGE.z - u * Math.sin(LODGE.ry) + v * Math.cos(LODGE.ry)));
  const ly = Math.max(groundH(LODGE.x, LODGE.z), ...foundationHeights) + 0.06, baseY = Math.min(...foundationHeights) - 0.2;
  parts.push({g: box(14.5, ly - baseY, 9.5, PAL.stone), x: LODGE.x, y: baseY, z: LODGE.z, ry: LODGE.ry}, {g: lodge(), x: LODGE.x, y: ly, z: LODGE.z, ry: LODGE.ry});
  const cabin = {id: 'rural-mountain-lodge', group: 'mountain-lodge' as const, model: 'lodge',
    x: LODGE.x, y: ly, z: LODGE.z, w: 14, d: 9, ry: LODGE.ry, front: 8.1, porchHeight: 0.4};
  ruralBodySolid(cabin);
  ruralEntry(parts, cabin);
  lamps.push({x: LODGE.x + 5, y: ly, z: LODGE.z + 8});
  // 길에서 짧은 연결 데크로 진입하는 중간 전망 쉼터. 기초·널판·보행 높이를 공유한다.
  for (const f of [0.34, 0.68]) {
    const i = Math.floor(TRAIL.length * f), a = TRAIL[i - 1], b = TRAIL[i + 1], l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const tx = TRAIL[i].x, tz = TRAIL[i].z;
    const x = tx + (b.z - a.z) / l * 5.5, z = tz - (b.x - a.x) / l * 5.5;
    const y = Math.max(groundH(x, z), groundH(tx, tz)) + 0.12;
    const hs = [[-2.7, -2.7], [2.7, -2.7], [-2.7, 2.7], [2.7, 2.7]].map(([dx, dz]) => groundH(x + dx, z + dz));
    const base = Math.min(...hs, y) - 0.25;
    parts.push({g: box(5.4, y - base, 5.4, PAL.stone), x, y: base, z}, {g: shelter(), x, y, z, ry: Math.atan2(tx - x, tz - z)});
    const h0 = groundH(tx, tz) + 0.12;
    parts.push({g: walkway(2.2, 5.5, y - h0), x: (x + tx) / 2, y: h0 - 0.22, z: (z + tz) / 2, ry: Math.atan2(x - tx, z - tz)});
    addDeck({id: 'rural-shelter-link-' + f, ax: tx, az: tz, bx: x, bz: z, hw: 1.1, h0, h1: y});
    addDeck({id: 'rural-shelter-' + f, ax: x - 2.7, az: z, bx: x + 2.7, bz: z, hw: 2.7, h0: y, h1: y});
  }
  // 정상: 정자 + 기단 + 깃발 옆 바위
  const sy = groundH(PEAK[0], PEAK[1]);
  parts.push({g: cyl(SUMMIT_FLAT, 4, PAL.stone, 0, 0, 0, 0, 12), x: PEAK[0], y: sy - 4, z: PEAK[1]}, {g: gazebo(), x: PEAK[0], y: sy, z: PEAK[1]});
  // 능선·정상 바위
  for (let i = 0; i < 70; i++) {
    const a = hash2(i, 1, 91) * 6.283, r = 14 + hash2(i, 2, 91) * 130, x = PEAK[0] + Math.cos(a) * r, z = PEAK[1] + Math.sin(a) * r * 1.3;
    const mb = mountainBase(x, z);
    if (mb < 38 || Math.hypot(x - PEAK[0], z - PEAK[1]) < SUMMIT_FLAT + 3) continue;
    if (TRAIL.some(p => Math.hypot(p.x - x, p.z - z) < 6)) continue;
    parts.push({g: coastalRock(i), x, y: groundH(x, z) - 0.5, z, s: 0.8 + hash2(i, 3, 91) * 1.6, ry: i});
  }
  // 개울 띠
  for (const s of STREAMS) {
    const pts = smoothLine(s.pts, 7);
    paths.push(worldPart(terrainRibbon(pts, STREAM_W, WATER, 0.1), pts[0][0], pts[0][1]));
  }
  return {parts, paths, posts, lamps, trailLength: TRAIL.reduce((s, p, i) => s + (i ? Math.hypot(p.x - TRAIL[i - 1].x, p.z - TRAIL[i - 1].z) : 0), 0), lodgeY: ly};
}
