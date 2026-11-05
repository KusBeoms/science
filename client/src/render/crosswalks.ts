// 신도심 교차로 디테일(W5 ROADS): 차도가 직교하는 모든 교차점에 횡단보도(얼룩말 줄무늬)와 신호등 기둥을 놓는다. 96u 칸마다 병합 메시 1개(컬링 가능).
// 지면 위 y=0.06 의 정점색 판(폴리곤 오프셋) + 기둥/신호 머리. 스타디움 구역(x≥194, z≤−194)은 총괄 소유라 건드리지 않는다.
import {ROADS_W3} from '../data/city-w3.js';
import type {CityRoad} from '../data/city.js';
import {PAL, NEUTRAL, mix} from './lowpoly/palette.js';
import {lowMat} from './lowpoly/merge.js';
import {Buf} from './overpass-buf.js';

const ZEBRA = mix(NEUTRAL.cloud, PAL.asphalt, 0.08);
const cellOf = (x: number, z: number) => Math.floor(x / 96) + ',' + Math.floor(z / 96);
export interface Junction {
  x: number;
  z: number;
  v: CityRoad; // 세로(남북) 도로
  h: CityRoad; // 가로(동서) 도로
}
const span = (r: CityRoad) => (r.x0 === r.x1 ? [Math.min(r.z0, r.z1), Math.max(r.z0, r.z1)] : [Math.min(r.x0, r.x1), Math.max(r.x0, r.x1)]);
/** 신도심 차도 교차점 (스타디움 구역 제외) */
export function junctions(): Junction[] {
  const cars = ROADS_W3.filter(r => r.car),
    out: Junction[] = [];
  for (const v of cars.filter(r => r.x0 === r.x1))
    for (const h of cars.filter(r => r.z0 === r.z1)) {
      const [vz0, vz1] = span(v),
        [hx0, hx1] = span(h);
      if (h.z0 < vz0 - 0.1 || h.z0 > vz1 + 0.1 || v.x0 < hx0 - 0.1 || v.x0 > hx1 + 0.1) continue;
      if (v.x0 >= 194 && h.z0 <= -194) continue; // 스타디움 구역
      out.push({x: v.x0, z: h.z0, v, h});
    }
  return out;
}

/** 얼룩말 한 줄: 교차점에서 dir 쪽 팔 위. along=true 면 x 방향 도로(줄무늬가 x 방향으로 길다) */
function zebra(b: Buf, cx: number, cz: number, horizontal: boolean, sign: number, roadW: number, off: number) {
  const n = Math.floor((roadW - 1) / 1.6);
  for (let i = 0; i < n; i++) {
    const o = (i - (n - 1) / 2) * 1.6,
      c = off * sign;
    if (horizontal) b.quad([cx + c - 1.5, 0.06, cz + o - 0.4], [cx + c + 1.5, 0.06, cz + o - 0.4], [cx + c + 1.5, 0.06, cz + o + 0.4], [cx + c - 1.5, 0.06, cz + o + 0.4], ZEBRA);
    else b.quad([cx + o - 0.4, 0.06, cz + c - 1.5], [cx + o + 0.4, 0.06, cz + c - 1.5], [cx + o + 0.4, 0.06, cz + c + 1.5], [cx + o - 0.4, 0.06, cz + c + 1.5], ZEBRA);
  }
}
/** 신호등: 어두운 기둥 + 빨강·노랑·초록 세 칸 머리(어느 쪽에서도 보이게 정육면체), 머리는 밝은 원색 */
function signal(pole: Buf, head: Buf, x: number, z: number) {
  pole.box(x - 0.12, 0, z - 0.12, x + 0.12, 4.6, z + 0.12, NEUTRAL.steel);
  pole.box(x - 0.33, 4.0, z - 0.33, x + 0.33, 5.6, z + 0.33, NEUTRAL.coal);
  head.box(x - 0.36, 5.05, z - 0.36, x + 0.36, 5.5, z + 0.36, PAL.red);
  head.box(x - 0.36, 4.58, z - 0.36, x + 0.36, 5.03, z + 0.36, PAL.amber);
  head.box(x - 0.36, 4.1, z - 0.36, x + 0.36, 4.56, z + 0.36, PAL.green);
}

export function buildCrosswalks(): any {
  const grp = new THREE.Group();
  grp.name = 'crosswalks';
  const cells = new Map<string, {z: Buf; pole: Buf; head: Buf}>(),
    cell = (x: number, z: number) => {
      const k = cellOf(x, z);
      if (!cells.has(k)) cells.set(k, {z: new Buf(), pole: new Buf(), head: new Buf()});
      return cells.get(k)!;
    };
  for (const j of junctions()) {
    const c = cell(j.x, j.z),
      vh = j.v.w / 2,
      hh = j.h.w / 2;
    // 가로 도로의 동·서 팔은 세로 도로 폭 바깥에, 세로 도로의 남·북 팔은 가로 도로 폭 바깥에 놓는다 (팔이 있을 때만)
    const [hx0, hx1] = span(j.h),
      [vz0, vz1] = span(j.v);
    for (const s of [-1, 1]) {
      if (s > 0 ? hx1 - j.x > vh + 14 : j.x - hx0 > vh + 14) zebra(c.z, j.x, j.z, true, s, j.h.w, vh + 3.2);
      if (s > 0 ? vz1 - j.z > hh + 14 : j.z - vz0 > hh + 14) zebra(c.z, j.x, j.z, false, s, j.v.w, hh + 3.2);
    }
    // 신호등 네 모퉁이 (보도 쪽)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) signal(c.pole, c.head, j.x + sx * (vh + 1.4), j.z + sz * (hh + 1.4));
  }
  const decal = new THREE.MeshLambertMaterial({vertexColors: true, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3});
  cells.forEach(c => {
    if (!c.z.empty) grp.add(new THREE.Mesh(c.z.geo(), decal));
    grp.add(new THREE.Mesh(c.pole.geo(), lowMat()), new THREE.Mesh(c.head.geo(), lowMat()));
  });
  return grp;
}
