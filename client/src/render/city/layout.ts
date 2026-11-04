// 도시 지면: 1u 칸마다 용도(아스팔트·보도·광장·잔디)를 정해 같은 색 칸을 큰 사각형으로 합친 정점색 평면 1장 + 소품(가로등·나무·벤치) 배치 계획
import {
  CITY_BUILDINGS, CITY_LANDMARKS, CITY_PLAZAS, CITY_ROADS, CITY_SIDEWALKS, footprint,
  type CityRect, type CityRoad,
} from '../../data/city.js';
import {CITY_HALF} from '../../core/terrain.js';
import {PAL, mix} from '../lowpoly/palette.js';
import {hash2} from '../lowpoly/rng.js';
import type {Inst} from '../lowpoly/merge.js';

const LAWN_A = mix(PAL.green, PAL.stone, 0.5),
  LAWN_B = mix(PAL.green, PAL.stone, 0.38),
  PAVE_A = PAL.paving,
  PAVE_B = mix(PAL.paving, PAL.bone, 0.4),
  PROM = mix(PAL.paving, PAL.brick, 0.28),
  LINE_Y = mix(PAL.amber, PAL.asphalt, 0.2),
  LINE_W = mix(PAL.cloud, PAL.asphalt, 0.15);

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
/** 분수(L2) 둘레 정사각 바닥 */
const FOUNTAIN = CITY_LANDMARKS.find(l => l.kind === 'orrery')!;

/** 칸 (cx,cz 는 칸 중심 좌표) 의 지면색. 도로 > 보도 > 광장 > 건물 마당 > 잔디 */
export function surfaceAt(cx: number, cz: number): number {
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
  if (CITY_SIDEWALKS.some(s => inRect(cx, cz, s))) return PAVE_A;
  for (const p of CITY_PLAZAS) {
    if (inRect(cx, cz, p.rect)) return p.id === 'central' && (Math.floor(cx / 10) + Math.floor(cz / 10)) % 2 === 0 ? PAVE_B : PAVE_A;
  }
  if (FOOTPRINTS.some(f => inRect(cx, cz, f, 1.2))) return PAVE_A;
  return hash2(Math.floor(cx / 8), Math.floor(cz / 8), 3) < 0.5 ? LAWN_A : LAWN_B;
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
  for (const sx of [-1, 1]) {
    lamps.push({x: sx * 30, y: 0, z: -36, ry: 0}, {x: sx * 30, y: 0, z: 36, ry: 0}, {x: sx * 45, y: 0, z: 45, ry: 0});
  }
  // 나무: 대로 가로수(시계탑 앞마당 쪽은 비움), 광장, 빈 잔디에 드문드문
  for (const z of [-72, -92, -112, -132]) {
    if (z !== -112) trees.push({x: -13.8, y: 0, z, s: 0.95 + hash2(z, 1) * 0.3});
    trees.push({x: 13.8, y: 0, z, s: 0.95 + hash2(z, 2) * 0.3});
  }
  for (const [x, z] of [[-40, -28], [40, -28], [-40, 28], [40, 28]]) trees.push({x, y: 0, z, s: 1.15});
  for (let gx = -140; gx <= 140; gx += 14) {
    for (let gz = -140; gz <= 140; gz += 14) {
      const x = gx + (hash2(gx, gz, 5) - 0.5) * 8,
        z = gz + (hash2(gx, gz, 6) - 0.5) * 8;
      if (hash2(gx, gz, 7) > 0.2 || !openLawn(x, z)) continue;
      (hash2(gx, gz, 8) < 0.45 ? pines : trees).push({x, y: 0, z, ry: hash2(gx, gz, 9) * 6, s: 0.9 + hash2(gx, gz, 4) * 0.5});
    }
  }
  // 벤치: 기지 부지 둘레를 향해(정면 = 로컬 +z)
  for (const s of [-1, 1]) {
    for (const o of [-10, 10]) benches.push({x: s * 27, y: 0, z: o, ry: -s * Math.PI / 2});
    benches.push({x: s * 10, y: 0, z: 28, ry: Math.PI});
  }
  return {lamps, trees, pines, benches};
}
