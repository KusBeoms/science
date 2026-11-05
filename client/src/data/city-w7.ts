// 도시 7차(W7 CITY_DENSITY): 빈 블록 채우기 — 순환로·대로 양옆을 용도별 건물(단독주택·상가·중층 오피스·아파트·호텔)로 빽빽하게 채우고,
// 중앙 광장 둘레와 금융 지구에서 이어지는 고층 군집을 손으로 놓는다. 시드 고정(결정적). 기존 건물·도로·랜드마크·예약 구역·언덕·방사 대로는 모두 피한다.
// city.ts 가 기존 건물 목록을 넘겨 부른다(순환 import 방지: 이 파일은 city.ts 를 타입으로만 읽는다).
import type {PalName} from '../render/lowpoly/palette.js';
import {mulberry32} from '../render/lowpoly/rng.js';
import type {CityBuilding, CityLandmark, CityPlaza, CityRoad, Facing, HrSpec, SignIcon} from './city.js';
import type {Purpose} from './interiors.js';
import {RADIALS, type Rect4} from './roads-w7.js';
import {approachNear, CITY_APPROACH_START} from './bridge.js';

export interface W7Env {
  roads: readonly CityRoad[];
  plazas: readonly CityPlaza[];
  buildings: readonly CityBuilding[];
  landmarks: readonly CityLandmark[];
  reserved: readonly Rect4[];
  hill: {x: number; z: number; foot: number};
}

const WALLS: PalName[] = ['plaster', 'bone', 'cloud', 'ash', 'clay', 'brick', 'plaster', 'bone'],
  H_ROOFS: PalName[] = ['tileRed', 'tileBlue', 'clay', 'tileRed', 'slate', 'tileBlue', 'brick'],
  O_ROOFS: PalName[] = ['slate', 'steel', 'tileBlue', 'coal', 'steel'],
  ICONS: SignIcon[] = ['gem', 'planet', 'cube', 'cone', 'cross'];

interface Spec {
  style: CityBuilding['style'];
  floors: [number, number];
  w: [number, number];
  d: [number, number];
}
const SPEC: Partial<Record<Purpose, Spec>> = {
  house: {style: 'house', floors: [1, 2], w: [11, 14], d: [12, 14]},
  shop: {style: 'shop', floors: [1, 2], w: [12, 17], d: [13, 17]},
  cafe: {style: 'shop', floors: [1, 1], w: [10, 13], d: [12, 14]},
  restaurant: {style: 'shop', floors: [1, 2], w: [12, 16], d: [13, 17]},
  office: {style: 'office', floors: [3, 7], w: [14, 20], d: [16, 22]},
  apartment: {style: 'office', floors: [4, 8], w: [16, 22], d: [16, 20]},
  hotel: {style: 'office', floors: [5, 9], w: [16, 22], d: [16, 22]},
  bank: {style: 'office', floors: [2, 3], w: [14, 18], d: [16, 20]},
  library: {style: 'office', floors: [2, 3], w: [20, 26], d: [18, 22]},
  school: {style: 'office', floors: [2, 3], w: [26, 32], d: [18, 22]},
  gym: {style: 'office', floors: [1, 2], w: [16, 22], d: [16, 20]},
  pool: {style: 'office', floors: [1, 2], w: [20, 26], d: [18, 22]},
  arcade: {style: 'neon', floors: [1, 2], w: [14, 20], d: [14, 18]},
  hospital: {style: 'office', floors: [3, 5], w: [22, 28], d: [18, 22]},
};

type Kind = 'house' | 'north' | 'east' | 'inner' | 'south' | 'resi3' | 'park';
const TABLE: Record<Kind, Purpose[]> = {
  house: ['house', 'house', 'house', 'house', 'house', 'house', 'cafe', 'house'],
  north: ['office', 'office', 'bank', 'hotel', 'cafe', 'office', 'restaurant', 'office'],
  east: ['office', 'apartment', 'hotel', 'office', 'cafe', 'shop', 'apartment', 'library'],
  inner: ['shop', 'office', 'apartment', 'cafe', 'restaurant', 'office', 'hotel', 'shop'],
  south: ['hotel', 'restaurant', 'shop', 'cafe', 'hotel', 'restaurant', 'shop', 'apartment'],
  resi3: ['house', 'house', 'apartment', 'house', 'house', 'shop', 'house', 'house'],
  park: ['house', 'cafe', 'house', 'gym', 'house', 'house', 'library', 'house'],
};
function kindAt(x: number, z: number): Kind {
  if (x < -200 && z > 200) return 'resi3';
  if (x < -200 && z < -200) return 'park';
  if (x < -200) return 'house';
  if (x < -40 && z > 40 && x > -200 && z < 200) return 'house'; // 원도심 주거 지구 둘레
  if (Math.abs(x) <= 195 && Math.abs(z) <= 195 && !(Math.abs(x) < 8 && z > 0)) return 'inner';
  if (z < -200) return 'north';
  if (z > 200) return 'south';
  if (x > 200) return 'east';
  return 'inner';
}

const FACE_RECT = (x: number, z: number, w: number, d: number, f: Facing): Rect4 => {
  const ew = f === 'e' || f === 'w',
    hx = (ew ? d : w) / 2,
    hz = (ew ? w : d) / 2;
  return [x - hx, z - hz, x + hx, z + hz];
};
const hit = (a: Rect4, b: Rect4, m = 0) => a[0] < b[2] + m && a[2] > b[0] - m && a[1] < b[3] + m && a[3] > b[1] - m;
const roadRect = (r: CityRoad, h: number): Rect4 =>
  r.z0 === r.z1 ? [Math.min(r.x0, r.x1), r.z0 - h, Math.max(r.x0, r.x1), r.z0 + h] : [r.x0 - h, Math.min(r.z0, r.z1), r.x0 + h, Math.max(r.z0, r.z1)];
const segDist = (px: number, pz: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax,
    dz = bz - az,
    t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
};

/** 사과 시선 축(정북 ±8°, 고도 8° 이상 하늘)을 가리는 높이인가 — tests/e2e/downtown.spec.ts 와 같은 식 */
const T8 = Math.tan((8 * Math.PI) / 180);
export function blocksApple(fp: Rect4, H: number): boolean {
  if (fp[3] >= 17) return false;
  for (let x = fp[0]; x <= fp[2] + 0.01; x += 0.5) for (const z of [fp[1], fp[3]]) {
    const D = 17 - z;
    if (Math.abs(x) < D * T8 && H > D * T8) return true;
  }
  return false;
}
const FLOOR_H = (style: CityBuilding['style']) => (style === 'shop' ? 5.6 : 5.2);

/** 손으로 놓는 고층 군집: 중앙 광장 동쪽·북동 안쪽 띠(금융 지구와 이어짐). 정북 ±8° 시선 축 밖(|x| ≥ 58) */
const hr = (id: string, purpose: Purpose, face: Facing, x: number, z: number, w: number, d: number, spec: HrSpec): CityBuilding => ({
  id,
  district: 'w7-tower',
  purpose,
  face,
  x,
  z,
  w,
  d,
  floors: Math.max(2, Math.round(spec.H / 3.6)),
  style: 'office',
  wall: spec.tint,
  roof: 'steel',
  hr: spec,
});
const TOWERS: CityBuilding[] = [
  // CBD 북열: 본사 구역(z −190~−160) 바로 남쪽 — 금융 지구에서 남쪽으로 이어지는 고층 띠 (정면이 남쪽)
  hr('w7-t-n0', 'hq', 's', 88, -146, 22, 20, {kind: 'glass', H: 124, tint: 'cyan', logo: 1, heli: true}),
  hr('w7-t-n1', 'office', 's', 116, -146, 22, 20, {kind: 'stepped', H: 96, tint: 'stone', logo: 3}),
  hr('w7-t-n2', 'hotel', 's', 144, -146, 24, 20, {kind: 'crown', H: 108, tint: 'violet', logo: 2}),
  // CBD 동열: 상점가(z=0) 북쪽 — 광장 동쪽 고층
  hr('w7-t-e0', 'office', 's', 90, -39, 20, 18, {kind: 'glass', H: 78, tint: 'teal', logo: 4}),
  hr('w7-t-e1', 'hotel', 's', 118, -39, 20, 18, {kind: 'glass', H: 100, tint: 'blue', logo: 0}),
  hr('w7-t-e2', 'office', 's', 146, -39, 20, 18, {kind: 'stepped', H: 84, tint: 'cloud', logo: 2}),
  // 남동열: 상점가 남쪽 — 정면이 북쪽
  hr('w7-t-s0', 'apartment', 'n', 90, 39, 20, 18, {kind: 'slab', H: 66, tint: 'bone'}),
  hr('w7-t-s1', 'office', 'n', 118, 39, 20, 18, {kind: 'glass', H: 92, tint: 'cyan', logo: 1}),
  hr('w7-t-s2', 'hq', 'n', 146, 39, 22, 18, {kind: 'crown', H: 88, tint: 'blue', logo: 3}),
  // 안쪽 동변: 순환로 r1-e 안쪽 아파트
  hr('w7-t-i0', 'apartment', 'e', 157, 92, 18, 22, {kind: 'slab', H: 58, tint: 'plaster'}),
  hr('w7-t-i1', 'apartment', 'e', 157, 126, 18, 22, {kind: 'slab', H: 50, tint: 'ash'}),
];

/** 특색 시설의 건물: 남쪽 원형 아레나(내부는 체육관) · 탱크 구역 설비동 2 */
const FEATURE_B: CityBuilding[] = [
  {id: 'w7-arena', district: 'w7-arena', purpose: 'gym', face: 'n', x: 114, z: 238, w: 34, d: 32, floors: 4, style: 'office', wall: 'cloud', roof: 'steel'},
  {id: 'w7-fac-0', district: 'w7-fac', purpose: 'garage', face: 's', x: 298, z: -76, w: 16, d: 12, floors: 1, style: 'office', wall: 'steel', roof: 'slate'},
  {id: 'w7-fac-1', district: 'w7-fac', purpose: 'office', face: 's', x: 320, z: -76, w: 16, d: 12, floors: 2, style: 'office', wall: 'ash', roof: 'tileBlue'},
];
export interface W7Out {
  buildings: CityBuilding[];
  /** 건물로 못 채운 빈 구획(소공원·광장·숲 자리) */
  parks: Rect4[];
}
export function genW7(env: W7Env, streets: readonly CityRoad[]): W7Out {
  const out: CityBuilding[] = [...FEATURE_B, ...TOWERS],
    rnd = mulberry32(7007),
    block: Rect4[] = [],
    inflate = (r: Rect4, m: number): Rect4 => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
  for (const r of [...env.roads, ...streets]) block.push(roadRect(r, r.w / 2 + r.sidewalk + 0.8));
  for (const b of env.buildings) block.push(inflate(FACE_RECT(b.x, b.z, b.w, b.d, b.face), 2));
  for (const b of out) block.push(inflate(FACE_RECT(b.x, b.z, b.w, b.d, b.face), 2));
  for (const l of env.landmarks) block.push(inflate([l.x - (l.w ?? 2 * l.r) / 2, l.z - (l.d ?? 2 * l.r) / 2, l.x + (l.w ?? 2 * l.r) / 2, l.z + (l.d ?? 2 * l.r) / 2], 2));
  for (const p of env.plazas) block.push(p.rect);
  for (const q of env.reserved) block.push(q);
  const bad = (fp: Rect4) => {
    if (Math.max(Math.abs(fp[0]), Math.abs(fp[2]), Math.abs(fp[1]), Math.abs(fp[3])) > 329) return true;
    if (block.some(q => hit(fp, q))) return true;
    const cx = (fp[0] + fp[2]) / 2,
      cz = (fp[1] + fp[3]) / 2;
    const ap = approachNear(cx, cz);
    if (fp[3] > CITY_APPROACH_START - 4 && ap.d < ap.w + Math.hypot(fp[2] - fp[0], fp[3] - fp[1]) / 2 + 3) return true;
    if (Math.hypot(cx - env.hill.x, cz - env.hill.z) < env.hill.foot + 10) return true;
    return RADIALS.some(r => segDist(cx, cz, r.x0, r.z0, r.x1, r.z1) < r.w / 2 + r.sw + Math.hypot(fp[2] - fp[0], fp[3] - fp[1]) / 2 + 1);
  };
  let n = 0;
  for (const r of [...env.roads, ...streets]) {
    if (!r.car) continue;
    const vert = r.x0 === r.x1,
      a0 = Math.min(vert ? r.z0 : r.x0, vert ? r.z1 : r.x1),
      a1 = Math.max(vert ? r.z0 : r.x0, vert ? r.z1 : r.x1);
    for (const side of [-1, 1]) {
      let a = a0 + 8;
      while (a < a1 - 8) {
        const mid = a + 8,
          cx0 = vert ? r.x0 + side * 30 : mid,
          cz0 = vert ? mid : r.z0 + side * 30,
          kind = kindAt(cx0, cz0),
          pur = TABLE[kind][Math.floor(rnd() * 8)],
          sp = SPEC[pur] ?? SPEC.shop!,
          house = pur === 'house';
        let w = Math.round(sp.w[0] + rnd() * (sp.w[1] - sp.w[0])),
          d = Math.round(sp.d[0] + rnd() * (sp.d[1] - sp.d[0]));
        const old = Math.abs(cx0) < 165 && Math.abs(cz0) < 165, // 원도심 안은 낮게(광장·사과 대로 시야, 삼각형 예산)
          floors = Math.min(old ? 3 : 99, sp.floors[0] + Math.floor(rnd() * (sp.floors[1] - sp.floors[0] + 1))),
          face: Facing = vert ? (side > 0 ? 'w' : 'e') : side > 0 ? 'n' : 's',
          gap = house ? 3.2 : 1.4;
        let placed = false;
        for (const dd of [d, 12]) {
          d = Math.min(d, dd);
          const off = r.w / 2 + r.sidewalk + gap + d / 2,
            cx = vert ? r.x0 + side * off : a + w / 2,
            cz = vert ? a + w / 2 : r.z0 + side * off,
            fp = FACE_RECT(cx, cz, w, d, face);
          if (bad(fp)) continue;
          if (blocksApple(fp, floors * FLOOR_H(sp.style))) continue;
          block.push(inflate(fp, house ? 1.2 : 2));
          const rb = rnd();
          out.push({
            id: `w7-${n++}`,
            district: house ? 'w7-house' : 'w7-' + kind,
            purpose: pur,
            face,
            x: cx,
            z: cz,
            w,
            d,
            floors,
            style: sp.style,
            wall: WALLS[Math.floor(rnd() * WALLS.length)],
            roof: house ? H_ROOFS[Math.floor(rb * H_ROOFS.length)] : O_ROOFS[Math.floor(rb * O_ROOFS.length)],
            sign: sp.style === 'shop' ? ICONS[Math.floor(rnd() * 5)] : undefined,
          });
          placed = true;
          break;
        }
        a += placed ? w + (house ? 2.6 : 3) : 4;
      }
    }
  }
  // 2차: 대로변 채우기 뒤에도 남은 14×14 이상 빈 땅에 건물 한 채를 가까운 길 쪽으로 문을 내고 앉힌다(주거 지구는 단독주택, 그 밖은 상가·사무실)
  const hrds = [...env.roads, ...streets].map(r => roadRect(r, r.w / 2 + r.sidewalk));
  for (const R of freeRects(block, env, out)) {
    const w = R[2] - R[0],
      h = R[3] - R[1];
    if (Math.min(w, h) < 15) continue;
    let best: {d: number; face: Facing} | null = null;
    for (const q of hrds) {
      const gx = Math.max(q[0] - R[2], R[0] - q[2], 0),
        gz = Math.max(q[1] - R[3], R[1] - q[3], 0),
        d = Math.hypot(gx, gz);
      if (d > 8 || (best && d >= best.d)) continue;
      const face: Facing = gz > gx ? (q[1] >= R[3] ? 's' : 'n') : q[0] >= R[2] ? 'e' : 'w';
      best = {d, face};
    }
    if (!best) continue;
    const kind = kindAt((R[0] + R[2]) / 2, (R[1] + R[3]) / 2),
      pur = TABLE[kind][Math.floor(rnd() * 8)],
      sp = SPEC[pur] ?? SPEC.shop!,
      ew = best.face === 'e' || best.face === 'w',
      depthAvail = (ew ? w : h) - 2,
      alongAvail = (ew ? h : w) - 2,
      d = Math.min(sp.d[1], Math.floor(depthAvail)),
      wd = Math.min(sp.w[1], Math.floor(alongAvail));
    if (d < 11 || wd < 10) continue;
    const cxm = (R[0] + R[2]) / 2,
      czm = (R[1] + R[3]) / 2,
      cx = best.face === 'e' ? R[2] - 1 - d / 2 : best.face === 'w' ? R[0] + 1 + d / 2 : cxm,
      cz = best.face === 's' ? R[3] - 1 - d / 2 : best.face === 'n' ? R[1] + 1 + d / 2 : czm,
      old = Math.abs(cx) < 165 && Math.abs(cz) < 165,
      floors = Math.min(old ? 3 : 99, sp.floors[0] + Math.floor(rnd() * (sp.floors[1] - sp.floors[0] + 1))),
      fp = FACE_RECT(cx, cz, wd, d, best.face);
    if (bad(fp) || blocksApple(fp, floors * FLOOR_H(sp.style))) continue;
    block.push(inflate(fp, 2));
    const house = pur === 'house';
    out.push({
      id: `w7-${n++}`,
      district: house ? 'w7-house' : 'w7-' + kind,
      purpose: pur,
      face: best.face,
      x: cx,
      z: cz,
      w: wd,
      d,
      floors,
      style: sp.style,
      wall: WALLS[Math.floor(rnd() * WALLS.length)],
      roof: house ? H_ROOFS[Math.floor(rnd() * H_ROOFS.length)] : O_ROOFS[Math.floor(rnd() * O_ROOFS.length)],
      sign: sp.style === 'shop' ? ICONS[Math.floor(rnd() * 5)] : undefined,
    });
  }
  return {buildings: out, parks: freeRects(block, env, out)};
}

/** 건물·도로·예약 사각형을 뺀 남는 빈 땅 중 14×14 이상인 큰 사각형을 큰 순서로 찾는다(2u 격자) — 소공원 자리 */
function freeRects(block: Rect4[], env: W7Env, built: CityBuilding[]): Rect4[] {
  const cell = 2,
    O = -336,
    N = 336,
    g = Array.from({length: N}, () => new Uint8Array(N)),
    mark = (r: Rect4, m = 0) => {
      const i0 = Math.max(0, Math.floor((r[0] - m - O) / cell)),
        i1 = Math.min(N - 1, Math.floor((r[2] + m - O) / cell)),
        j0 = Math.max(0, Math.floor((r[1] - m - O) / cell)),
        j1 = Math.min(N - 1, Math.floor((r[3] + m - O) / cell));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) g[j][i] = 1;
    };
  for (const r of block) mark(r, 0.5);
  for (const b of built) mark(FACE_RECT(b.x, b.z, b.w, b.d, b.face), 1.5);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const x = O + i * cell + 1,
        z = O + j * cell + 1;
      if (Math.hypot(x - env.hill.x, z - env.hill.z) < env.hill.foot + 6 || Math.abs(x) > 327 || Math.abs(z) > 327) g[j][i] = 1;
      else if (z > CITY_APPROACH_START - 4 && approachNear(x, z).d < approachNear(x, z).w + 5) g[j][i] = 1;
      else if (RADIALS.some(r => segDist(x, z, r.x0, r.z0, r.x1, r.z1) < r.w / 2 + r.sw + 2)) g[j][i] = 1;
    }
  const out: Rect4[] = [],
    h = new Int32Array(N);
  for (let k = 0; k < 60; k++) {
    let best = {a: 0, i0: 0, i1: 0, j0: 0, j1: 0};
    h.fill(0);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) h[i] = g[j][i] ? 0 : h[i] + 1;
      const st: [number, number][] = [];
      for (let i = 0; i <= N; i++) {
        const cur = i < N ? h[i] : 0;
        let start = i;
        while (st.length && st[st.length - 1][1] >= cur) {
          const [s, hh] = st.pop()!,
            a = hh * (i - s);
          if (a > best.a) best = {a, i0: s, i1: i, j0: j - hh + 1, j1: j + 1};
          start = s;
        }
        st.push([start, cur]);
      }
    }
    if (best.a < 7 * 7) break;
    out.push([O + best.i0 * cell + 1, O + best.j0 * cell + 1, O + best.i1 * cell - 1, O + best.j1 * cell - 1]);
    for (let j = best.j0; j < best.j1; j++) for (let i = best.i0; i < best.i1; i++) g[j][i] = 1;
  }
  return out;
}
