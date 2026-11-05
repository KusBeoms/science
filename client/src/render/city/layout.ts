// 도시 지면: 1u 칸마다 용도(아스팔트·보도·광장·잔디)를 정해 같은 색 칸을 큰 사각형으로 합친 정점색 평면 1장 + 소품(가로등·나무·벤치) 배치 계획
import {
  CITY_BUILDINGS, CITY_LANDMARKS, CITY_PADS, CITY_PLAZAS, CITY_ROADS, CITY_SIDEWALKS, footprint,
  type CityRect, type CityRoad,
} from '../../data/city.js';
import {CITY_APPROACH_START, approachNear} from '../../data/bridge.js';
import {ROADS_W3} from '../../data/city-w3.js';
import {CITY_HILL} from '../../data/world-map.js';
import {PITCH, STADIUM} from '../../data/soccer.js';
import {RESERVED} from '../../data/city-w3.js';
import {TRADE_EDGE} from './tradeline.js';
import {CITY_HALF} from '../../core/terrain.js';
import {PAL, mix} from '../lowpoly/palette.js';
import {hash2} from '../lowpoly/rng.js';
import {funSurface} from './fun-ground.js';
import {w7Surface} from './w7-ground.js';
import type {Inst} from '../lowpoly/merge.js';

const LAWN_A = mix(PAL.green, PAL.stone, 0.5),
  LAWN_B = mix(PAL.green, PAL.stone, 0.38),
  PAVE_A = PAL.paving,
  PAVE_B = mix(PAL.paving, PAL.bone, 0.4),
  PROM = mix(PAL.paving, PAL.brick, 0.28),
  LINE_Y = mix(PAL.amber, PAL.asphalt, 0.2),
  LINE_W = mix(PAL.cloud, PAL.asphalt, 0.15),
  GOLD = mix(PAL.amber, PAL.brick, 0.18);

const inRect = (x: number, z: number, r: CityRect, m = 0) => x >= r[0] - m && x < r[2] + m && z >= r[1] - m && z < r[3] + m;
/** 도로 포장 부분의 사각형 */
const roadRect = (r: CityRoad): CityRect => {
  const h = r.w / 2;
  return r.z0 === r.z1
    ? [Math.min(r.x0, r.x1), r.z0 - h, Math.max(r.x0, r.x1), r.z0 + h]
    : [r.x0 - h, Math.min(r.z0, r.z1), r.x0 + h, Math.max(r.z0, r.z1)];
};
const ROAD_RECTS = CITY_ROADS.map(roadRect);
const FOOTPRINTS = CITY_BUILDINGS.map(b => footprint(b));
/** 건물 발자국 공간 해시(16u 칸): 1u 칸마다 전부 훑지 않게 한다 */
const FGRID = new Map<string, CityRect[]>();
for (const f of FOOTPRINTS)
  for (let i = Math.floor((f[0] - 3) / 16); i <= Math.floor((f[2] + 3) / 16); i++)
    for (let j = Math.floor((f[1] - 3) / 16); j <= Math.floor((f[3] + 3) / 16); j++) (FGRID.get(i + ',' + j) || FGRID.set(i + ',' + j, []).get(i + ',' + j)!).push(f);
const nearFoot = (x: number, z: number) => (FGRID.get(Math.floor(x / 16) + ',' + Math.floor(z / 16)) || []).some(f => inRect(x, z, f, 1.2));
const POND = {x: -275, z: -268, r: 22},
  PITCH_RECT: CityRect = [PITCH.cx - PITCH.hl - 3, PITCH.cz - PITCH.hw - 3, PITCH.cx + PITCH.hl + 3, PITCH.cz + PITCH.hw + 3],
  PARK_R: CityRect = RESERVED[1] as CityRect,
  THEME_R: CityRect = RESERVED[2] as CityRect;
/** 분수(L2) 둘레 정사각 바닥 */
const FOUNTAIN = CITY_LANDMARKS.find(l => l.kind === 'orrery')!;
/** 큰 랜드마크(발자국 사각형) 둘레는 포장 */
const LM_RECTS: CityRect[] = CITY_LANDMARKS.filter(l => l.kind !== 'orrery' && l.kind !== 'arch').map(l => [
  l.x - (l.w ?? 2 * l.r) / 2, l.z - (l.d ?? 2 * l.r) / 2, l.x + (l.w ?? 2 * l.r) / 2, l.z + (l.d ?? 2 * l.r) / 2,
]);

/** 칸 (cx,cz 는 칸 중심 좌표) 의 지면색. 도로 > 보도 > 광장 > 건물 마당 > 잔디 */
export const surfaceAt = (cx: number, cz: number): number => funSurface(cx, cz, w7Surface(cx, cz, baseSurface(cx, cz))); // W5 FUN: 구역별 바닥색(fun-ground.ts) · W7: 방사 대로·원형 광장·소공원·시설(w7-ground.ts)
function baseSurface(cx: number, cz: number): number {
  // 긴 진입 곡선은 bridge가 덧그린다. 옛 직선 차도·보도의 남은 꼬리는 잔디로 마감한다.
  if (cz > CITY_APPROACH_START + 12 && cz <= CITY_HALF && Math.abs(cx) < 12) {
    const ap = approachNear(cx, cz);
    if (ap.d > ap.w + 0.5) return LAWN_A;
  }
  // 거래의 선 인레이: 도시 둘레 1u 폭 금빛 띠
  if (Math.floor(Math.max(Math.abs(cx), Math.abs(cz)) - (TRADE_EDGE - 0.5)) === 0) return GOLD;
  // 우주항 패드: 원 무늬 (바깥 테두리 노랑, 안쪽 아스팔트)
  for (const p of CITY_PADS) {
    const d = Math.hypot(cx - p.x, cz - p.z);
    if (d < 5.5) return d > 4.3 ? LINE_Y : PAL.asphalt;
  }
  if (Math.abs(cx - FOUNTAIN.x) < FOUNTAIN.r + 3 && Math.abs(cz - FOUNTAIN.z) < FOUNTAIN.r + 3) return PAL.ash;
  for (let i = 0; i < CITY_ROADS.length; i++) {
    if (!inRect(cx, cz, ROAD_RECTS[i])) continue;
    const r = CITY_ROADS[i];
    if (!r.car) return PROM;
    const lane = Math.floor(r.z0 === r.z1 ? cz : cx);
    if (r.id === 'apple') {
      if (cz >= -55 && cz < -52 && Math.floor(cx) % 2 === 0) return LINE_W; // 광장 앞 횡단보도
      if (lane === -1 || lane === 0) return LINE_Y;
      if ((lane === 5 || lane === -6) && Math.floor(cz / 3) % 2 === 0) return LINE_W;
    } else if (r.id === 'harbor' && (lane === -1 || lane === 0) && Math.floor(cz / 3) % 2 === 0) return LINE_Y;
    return PAL.asphalt;
  }
  // 스타디움: 경기장은 8u 폭 줄무늬 잔디, 둘레는 콘크리트
  if (inRect(cx, cz, PITCH_RECT)) return Math.floor((cx - PITCH_RECT[0]) / 8) % 2 ? PAL.lime : mix(PAL.lime, PAL.green, 0.5);
  if (inRect(cx, cz, STADIUM.rect as unknown as CityRect)) return PAVE_A;
  if (inRect(cx, cz, PARK_R)) {
    if (Math.hypot(cx - POND.x, cz - POND.z) < POND.r) return PAL.cyan;
    if (Math.hypot(cx - POND.x, cz - POND.z) < POND.r + 2) return PAL.bone;
    return LAWN_A;
  }
  if (inRect(cx, cz, THEME_R)) return (Math.floor(cx / 6) + Math.floor(cz / 6)) % 2 ? PAVE_B : mix(PAVE_A, PAL.pink, 0.2);
  if (CITY_SIDEWALKS.some(s => inRect(cx, cz, s))) return PAVE_A;
  for (const p of CITY_PLAZAS) {
    if (!inRect(cx, cz, p.rect)) continue;
    if (p.id.startsWith('pad-')) {
      const [x0, z0, x1, z1] = p.rect;
      return cx < x0 + 1 || cx > x1 - 1 || cz < z0 + 1 || cz > z1 - 1 ? LINE_Y : PAL.asphalt; // 착륙대: 노란 테두리
    }
    const chk = p.id === 'central' || p.id === 'dome-court' || p.id === 'port';
    return chk && (Math.floor(cx / 10) + Math.floor(cz / 10)) % 2 === 0 ? PAVE_B : PAVE_A;
  }
  if (LM_RECTS.some(r => inRect(cx, cz, r, 1.5))) return PAVE_A;
  if (nearFoot(cx, cz)) return PAVE_A;
  return LAWN_A; // 잔디는 연속 면으로 병합하고 변화는 배치된 나무·정원으로 만든다.
}

/** 지면 평면: 같은 색 칸을 가로로 이은 뒤 위아래로 겹쳐 합친 사각형들(위로 향한 면) */
export function groundGeometry(): any {
  const n = CITY_HALF * 2,
    cell = new Int32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) cell[j * n + i] = surfaceAt(i - CITY_HALF + 0.5, j - CITY_HALF + 0.5);
  interface Quad {
    i0: number;
    i1: number;
    j0: number;
    j1: number;
    c: number;
  }
  const done: Quad[] = [];
  let open = new Map<string, Quad>();
  for (let j = 0; j < n; j++) {
    const next = new Map<string, Quad>();
    for (let i = 0; i < n; ) {
      const c = cell[j * n + i];
      let e = i + 1;
      while (e < n && cell[j * n + e] === c) e++;
      const key = `${i}:${e}:${c}`,
        q = open.get(key);
      if (q) {
        q.j1 = j + 1;
        open.delete(key);
        next.set(key, q);
      } else next.set(key, {i0: i, i1: e, j0: j, j1: j + 1, c});
      i = e;
    }
    open.forEach(q => done.push(q));
    open = next;
  }
  open.forEach(q => done.push(q));
  const pos = new Float32Array(done.length * 18),
    col = new Float32Array(done.length * 18),
    nor = new Float32Array(done.length * 18);
  done.forEach((q, k) => {
    const x0 = q.i0 - CITY_HALF, x1 = q.i1 - CITY_HALF, z0 = q.j0 - CITY_HALF, z1 = q.j1 - CITY_HALF,
      v = [x0, z0, x0, z1, x1, z1, x0, z0, x1, z1, x1, z0];
    for (let t = 0; t < 6; t++) {
      const o = k * 18 + t * 3;
      pos[o] = v[t * 2];
      pos[o + 2] = v[t * 2 + 1];
      nor[o + 1] = 1;
      col[o] = (q.c >> 16) / 255;
      col[o + 1] = ((q.c >> 8) & 255) / 255;
      col[o + 2] = (q.c & 255) / 255;
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

const isLawn = (x: number, z: number) => {
  const c = surfaceAt(x, z);
  return c === LAWN_A || c === LAWN_B;
};
/** (x,z) 와 둘레 4m 가 모두 잔디인가 (길·마당 위에 나무가 서지 않게) */
const openLawn = (x: number, z: number) =>
  [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4]].every(([dx, dz]) => isLawn(x + dx, z + dz));

/** 소품 배치 계획. ry 는 로컬 +x 가 세계에서 가리킬 방향을 정한다(가로등 팔 / 벤치 정면은 props.ts 설명 참고) */
export interface PropPlan {
  lamps: Inst[];
  trees: Inst[];
  pines: Inst[];
  benches: Inst[];
}
/** 앉을 수 있는 벤치 자리 (planProps 가 한 번 정한 목록) */
export let BENCH_SPOTS: readonly Inst[] = [];
export function planProps(): PropPlan {
  const lamps: Inst[] = [],
    trees: Inst[] = [],
    pines: Inst[] = [],
    benches: Inst[] = [];
  // 가로등: 대로 양옆(팔이 차도 쪽), 상점가 보도, 광장 네 귀퉁이
  for (const z of [-62, -82, -102, -122, -142]) {
    lamps.push({x: -13.5, y: 0, z, ry: 0}, {x: 13.5, y: 0, z, ry: Math.PI});
  }
  for (const x of [60, 80, 100, 120, 140]) {
    lamps.push({x, y: 0, z: -6.6, ry: -Math.PI / 2}, {x, y: 0, z: 6.6, ry: Math.PI / 2});
  }
  // W2 구역: 항구 도로 · 정비소 도로/시험로 · 과학관 도로 · 주거 도로 · 우주항/앞뜰 모서리
  for (const z of [62, 82, 102]) lamps.push({x: -10.8, y: 0, z, ry: 0}, {x: 10.8, y: 0, z, ry: Math.PI});
  for (const z of [-60, -90, -120, -140]) lamps.push({x: 54.2, y: 0, z, ry: 0}, {x: 69.8, y: 0, z, ry: Math.PI});
  for (const x of [80, 100, 120, 140]) lamps.push({x, y: 0, z: -78.2, ry: -Math.PI / 2}, {x, y: 0, z: -61.8, ry: Math.PI / 2});
  for (const x of [60, 80, 100, 120, 140]) lamps.push({x, y: 0, z: 53.8, ry: -Math.PI / 2}, {x, y: 0, z: 70.2, ry: Math.PI / 2});
  for (const x of [-60, -80, -100, -120]) lamps.push({x, y: 0, z: 91.8, ry: -Math.PI / 2}, {x, y: 0, z: 108.2, ry: Math.PI / 2});
  for (const sx of [-1, 1]) lamps.push({x: sx * 40, y: 0, z: 116, ry: 0}, {x: sx * 40, y: 0, z: 144, ry: 0});
  for (const [x, z] of [[80, 84], [120, 84], [80, 128], [120, 128]]) lamps.push({x, y: 0, z, ry: 0});
  for (const sx of [-1, 1]) {
    lamps.push({x: sx * 30, y: 0, z: -36, ry: 0}, {x: sx * 30, y: 0, z: 36, ry: 0}, {x: sx * 45, y: 0, z: 45, ry: 0});
  }
  // 신도심 도로 가로등: 차도 양쪽 28u 간격
  for (const r of ROADS_W3) {
    if (!r.car) continue;
    const vert = r.x0 === r.x1,
      a0 = Math.min(vert ? r.z0 : r.x0, vert ? r.z1 : r.x1) + 14,
      a1 = Math.max(vert ? r.z0 : r.x0, vert ? r.z1 : r.x1) - 10,
      o = r.w / 2 + 1.4;
    for (let a = a0; a < a1; a += 28)
      for (const s of [-1, 1]) {
        const x = vert ? r.x0 + s * o : a,
          z = vert ? a : r.z0 + s * o;
        if (Math.abs(x) < 150 && Math.abs(z) < 150) continue;
        lamps.push({x, y: 0, z, ry: vert ? (s > 0 ? Math.PI : 0) : s > 0 ? Math.PI / 2 : -Math.PI / 2});
      }
  }
  // 나무: 대로 가로수(시계탑 앞마당 쪽은 비움), 광장, 빈 잔디에 드문드문
  for (const z of [-72, -92, -112, -132]) {
    if (z !== -112) trees.push({x: -13.8, y: 0, z, s: 0.95 + hash2(z, 1) * 0.3});
    trees.push({x: 13.8, y: 0, z, s: 0.95 + hash2(z, 2) * 0.3});
  }
  for (const [x, z] of [[-40, -28], [40, -28], [-40, 28], [40, 28]]) trees.push({x, y: 0, z, s: 1.15});
  for (let gx = -326; gx <= 326; gx += 14) {
    for (let gz = -326; gz <= 326; gz += 14) {
      const x = gx + (hash2(gx, gz, 5) - 0.5) * 8,
        z = gz + (hash2(gx, gz, 6) - 0.5) * 8;
      if (hash2(gx, gz, 7) > 0.2 || !openLawn(x, z) || Math.hypot(x - CITY_HILL.x, z - CITY_HILL.z) < CITY_HILL.foot) continue;
      (hash2(gx, gz, 8) < 0.45 ? pines : trees).push({x, y: 0, z, ry: hash2(gx, gz, 9) * 6, s: 0.9 + hash2(gx, gz, 4) * 0.5});
    }
  }
  // 벤치: 기지 부지 둘레를 향해(정면 = 로컬 +z)
  for (const s of [-1, 1]) {
    for (const o of [-10, 10]) benches.push({x: s * 27, y: 0, z: o, ry: -s * Math.PI / 2, s: 1.6});
    benches.push({x: s * 10, y: 0, z: 28, ry: Math.PI, s: 1.6});
  }
  // 길가 벤치: 사과 대로 · 상점가 · 우주항 광장 · 과학관 앞뜰 (정면이 길 쪽)
  for (const z of [-70, -95, -130]) benches.push({x: -14.2, y: 0, z, ry: Math.PI / 2, s: 1.6}, {x: 14.2, y: 0, z: z + 10, ry: -Math.PI / 2, s: 1.6});
  for (const x of [70, 110, 130]) benches.push({x, y: 0, z: 7.2, ry: Math.PI, s: 1.6}, {x: x - 10, y: 0, z: -7.2, ry: 0, s: 1.6});
  for (const x of [-20, 20]) benches.push({x, y: 0, z: 121, ry: 0, s: 1.6});
  for (const x of [86, 114]) benches.push({x, y: 0, z: 82, ry: 0, s: 1.6});
  BENCH_SPOTS = benches;
  const clear = (p: Inst) => { const a = approachNear(p.x, p.z); return p.z < CITY_APPROACH_START + 8 || p.z > 380 || a.d > a.w + 2; };
  return {lamps: lamps.filter(clear), trees: trees.filter(clear), pines: pines.filter(clear), benches: benches.filter(clear)};
}
