// W7 소품 배치 계획: 가로수(대로·순환로·방사 대로 보도 가장자리) · 가로등(기존 28u 간격 사이사이에 추가) · 소공원 나무와 벤치 · 중앙 원형 광장 벤치·화단.
// 순수 계획(Inst 목록)만 만든다. 인스턴싱·병합은 w7.ts. 지면 판정은 같은 데이터(도로·건물·진입로)로 해서 길·문 앞을 막지 않는다.
import {CITY_BUILDINGS, CITY_PARKS, CITY_ROADS, doorOf, footprint, type CityRect, type CityRoad} from '../../data/city.js';
import {ROADS_W3} from '../../data/city-w3.js';
import {approachNear} from '../../data/bridge.js';
import {CENTER_CIRCLE, RADIALS, W7_FEATURES as F} from '../../data/roads-w7.js';
import {hash2} from '../lowpoly/rng.js';
import type {Inst} from '../lowpoly/merge.js';

export interface W7Plan {
  trees: Inst[];
  pines: Inst[];
  lamps: Inst[];
  benches: Inst[];
}
const inR = (x: number, z: number, r: CityRect, m = 0) => x >= r[0] - m && x < r[2] + m && z >= r[1] - m && z < r[3] + m;
const rect = (r: CityRoad, h: number): CityRect =>
  r.z0 === r.z1 ? [Math.min(r.x0, r.x1), r.z0 - h, Math.max(r.x0, r.x1), r.z0 + h] : [r.x0 - h, Math.min(r.z0, r.z1), r.x0 + h, Math.max(r.z0, r.z1)];
const ROAD_R = CITY_ROADS.map(r => ({r, rc: rect(r, r.w / 2 + r.sidewalk + 1.2)}));
const FOOT = CITY_BUILDINGS.map(b => footprint(b));
const DOORS = CITY_BUILDINGS.map(b => doorOf(b));
const segDist = (px: number, pz: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
};
const onRadial = (x: number, z: number, m = 2) => RADIALS.some(r => segDist(x, z, r.x0, r.z0, r.x1, r.z1) < r.w / 2 + r.sw + m);
/** 보도 가장자리 소품이 서도 되는 점인가: 다른 도로 위·건물·문 앞·방사 대로·다리 진입로·시설 구획이 아니어야 한다 */
function free(x: number, z: number, self: string, gap = 0.6): boolean {
  if (Math.abs(x) > 331 || Math.abs(z) > 331) return false;
  if (ROAD_R.some(o => o.r.id !== self && inR(x, z, o.rc))) return false;
  if (FOOT.some(f => inR(x, z, f, gap))) return false;
  if (DOORS.some(d => Math.hypot(d.x - x, d.z - z) < 3.4)) return false;
  if (onRadial(x, z)) return false;
  const a = approachNear(x, z);
  if (z > 250 && a.d <= a.w + 3) return false;
  return !Object.values(F).some(q => inR(x, z, q as unknown as CityRect));
}

const w0 = (p: CityRect) => p[2] - p[0],
  h0 = (p: CityRect) => p[3] - p[1];
export function planW7Props(): W7Plan {
  const plan: W7Plan = {trees: [], pines: [], lamps: [], benches: []};
  const tree = (x: number, z: number, k: number) => {
    const s = 0.85 + hash2(x, z, 3) * 0.35;
    (hash2(x, z, k) < 0.25 ? plan.pines : plan.trees).push({x, y: 0, z, ry: hash2(x, z, 4) * 6, s});
  };
  // 신도심 순환로·대로: 양쪽 보도 바깥 가장자리에 가로수(19u), 기존 가로등 사이에 가로등 추가(28u, 14u 어긋나게)
  for (const r of ROADS_W3) {
    if (!r.car) continue;
    const vert = r.x0 === r.x1,
      a0 = Math.min(vert ? r.z0 : r.x0, vert ? r.z1 : r.x1),
      a1 = Math.max(vert ? r.z0 : r.x0, vert ? r.z1 : r.x1),
      o = r.w / 2 + r.sidewalk - 0.9;
    for (const s of [-1, 1]) {
      for (let a = a0 + 10; a < a1 - 8; a += 19) {
        const x = vert ? r.x0 + s * o : a, z = vert ? a : r.z0 + s * o;
        if (free(x, z, r.id)) tree(x, z, 5);
      }
      for (let a = a0 + 28; a < a1 - 10; a += 28) {
        const x = vert ? r.x0 + s * (r.w / 2 + 1.4) : a, z = vert ? a : r.z0 + s * (r.w / 2 + 1.4);
        if (Math.abs(x) < 150 && Math.abs(z) < 150) continue;
        if (free(x, z, r.id, 0.2)) plan.lamps.push({x, y: 0, z, ry: vert ? (s > 0 ? Math.PI : 0) : s > 0 ? Math.PI / 2 : -Math.PI / 2});
      }
    }
  }
  // 방사 대로: 보도 바깥에 가로수 + 가로등 번갈아
  for (const rd of RADIALS) {
    const L = Math.hypot(rd.x1 - rd.x0, rd.z1 - rd.z0), ux = (rd.x1 - rd.x0) / L, uz = (rd.z1 - rd.z0) / L, nx = -uz, nz = ux, o = rd.w / 2 + rd.sw * 0.6;
    for (let t = 6; t < L - 3; t += 8) for (const s of [-1, 1]) {
      const x = rd.x0 + ux * t + nx * o * s, z = rd.z0 + uz * t + nz * o * s;
      if (ROAD_R.some(q => q.r.car && inR(x, z, q.rc, -1.2))) continue; // 교차 도로 위는 비운다
      if (FOOT.some(f => inR(x, z, f, 1))) continue;
      if (Math.round(t / 8) % 2) plan.lamps.push({x, y: 0, z, ry: Math.atan2(-nx * s, -nz * s) + Math.PI / 2});
      else tree(x, z, 6);
    }
    // 끝 광장: 가운데 나무
    tree(rd.x1 + ux * 3.5, rd.z1 + uz * 3.5, 7);
  }
  // 중앙 원형 광장: 모서리 화단 나무 + 방사선 사이 벤치(중심을 향함)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    for (const [dx, dz] of [[44, 38], [38, 44], [47, 47]]) tree(sx * dx, sz * dz, 8);
  }
  const R = CENTER_CIRCLE.r - 6.5;
  for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) * Math.PI) / 4, x = Math.cos(a) * R, z = Math.sin(a) * R;
    if (Math.hypot(x, z + 40) < 9) continue;
    plan.benches.push({x, y: 0, z, ry: Math.atan2(-x, -z), s: 1.5});
  }
  // 소공원: 격자 나무(길 제외) + 십자 길 끝 벤치
  const parks = CITY_PARKS.filter(r => Math.min(r[2] - r[0], r[3] - r[1]) >= 12);
  parks.forEach((p, k) => {
    if (k % 4 === 3 && Math.min(w0(p), h0(p)) >= 14 && Math.max(w0(p), h0(p)) < 2 * Math.min(w0(p), h0(p))) return;
    const cx = (p[0] + p[2]) / 2, cz = (p[1] + p[3]) / 2, w = p[2] - p[0], h = p[3] - p[1];
    for (let x = p[0] + 3; x < p[2] - 2.5; x += 5.5) for (let z = p[1] + 3; z < p[3] - 2.5; z += 5.5) {
      const px = x + (hash2(x, z, 11) - 0.5) * 2.4, pz = z + (hash2(x, z, 12) - 0.5) * 2.4;
      if (Math.abs(px - cx) < 2.4 || Math.abs(pz - cz) < 2.4 || Math.hypot(px - cx, pz - cz) < Math.min(w, h) * 0.2) continue;
      if (hash2(x, z, 13) < 0.42) tree(px, pz, 9);
    }
    if (w > 16 && h > 16) for (const s of [-1, 1]) plan.benches.push({x: cx + s * (w * 0.3), y: 0, z: cz - 1.8, ry: 0, s: 1.4}, {x: cx - 1.8, y: 0, z: cz + s * (h * 0.3), ry: Math.PI / 2, s: 1.4});
  });
  // 가로수: 도시 가장자리 숲 띠(바깥 길 둘레 ±335 안쪽 마지막 줄)
  return plan;
}
