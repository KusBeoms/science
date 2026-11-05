// 커튼월 세로 멀리언·옥상 냉각기·물탱크. 반환 계약(Built)과 충돌 발자국을 유지한다.
import type {CityBuilding} from '../../data/city.js';
import type {Built} from './building.js';
import {PAL, mix} from '../lowpoly/palette.js';
import {box, panel, cyl} from '../lowpoly/prim.js';
import {mergeGeometries} from '../lowpoly/merge.js';
export function facadeDetails(b: CityBuilding, built: Built): Built {
  const hr = b.hr;
  if (!hr) return built;
  const parts = [built.solid], {w, d} = b, H = hr.H;
  const shaft = (ww: number, dd: number, x: number, z: number, y0: number, y1: number) => {
    for (const s of [-1, 1]) {
      for (let u = -ww / 2 + 3; u < ww / 2; u += 4.2) parts.push(panel(0.14, y1 - y0, PAL.steel, x + u, (y0 + y1) / 2, z + s * (dd / 2 + 0.25), s > 0 ? 0 : Math.PI));
      for (let u = -dd / 2 + 3; u < dd / 2; u += 4.2) parts.push(panel(0.14, y1 - y0, PAL.steel, x + s * (ww / 2 + 0.25), (y0 + y1) / 2, z + u, s * Math.PI / 2));
    }
  };
  if (hr.kind === 'twin') {
    shaft(w * 0.36, d, -w * 0.32, 0, 6, H);
    shaft(w * 0.36, d, w * 0.32, 0, 6, H * 0.9);
  } else if (hr.kind === 'stepped') {
    let y = 6;
    for (const [f, q] of [[1, 0.46], [0.8, 0.78], [0.6, 1]]) { shaft(w * f, d * f, 0, 0, y, H * q); y = H * q; }
  } else if (hr.kind === 'mixed') shaft(w * 0.56, d * 0.62, 0, -d * 0.12, 12.6, H);
  else if (hr.kind === 'glass' || hr.kind === 'crown') shaft(w, d, 0, 0, 6, hr.kind === 'crown' ? H * 0.9 : H);
  else if (hr.kind === 'slab') {
    // 층마다 세로 칸막이가 돌출된 발코니를 구분한다.
    for (let x = -w / 2 + 5; x < w / 2; x += 6) for (const s of [-1, 1]) parts.push(box(0.2, H - 5, 1.4, mix(PAL[b.wall], PAL.white, 0.3), x, 3.2, s * (d / 2 + 0.8)));
    parts.push(cyl(1.3, 2, PAL.ash, -w * 0.15, H, 0, 0, 6));
  }
  // 설비는 옥상의 작은 구역만 차지한다. 왕관·쌍둥이·계단식은 기존 루프 형태를 보존한다.
  if (['slab', 'mixed', 'exchange'].includes(hr.kind)) {
    for (const s of [-1, 1]) {
      const x = s * w * 0.18, z = -d * 0.22;
      parts.push(box(2.6, 1.1, 2.2, PAL.ash, x, H + 0.4, z), cyl(0.65, 0.12, PAL.coal, x, H + 1.5, z, 0, 6));
    }
  }
  const solid = mergeGeometries(parts); built.solid.dispose();
  return {solid, lit: built.lit};
}
