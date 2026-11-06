// 온사이트 건물 외관 셸 (W8 INTERIOR): 속이 빈 외벽(문·창 개구) + 슬라브 + 지붕. 나머지 외관은 청크 병합 메시에 그대로 들어간다.
// 출력 5개 지오메트리(건물 로컬, rot=0 기준):
//  - solid  : 기초·외벽 조각·문틀·슬라브·위층 벽·지붕·차양. 항상 보인다.
//  - lit    : 밤에 켜지는 현관 등.
//  - plug   : 실내가 올라오지 않았을 때 개구를 메우는 "그림 문/창" 판(불투명). 실내가 올라오면 정점을 접어 숨긴다(onsite-plug.ts).
//  - plugLit: 그림 창 안쪽의 호박색 불빛(밤). plug 와 같이 숨는다.
//  - far    : 원거리 단순 모델(상자+지붕).
import type {BuildingSource} from '../../data/city-schema.js';
import {PAL, NEUTRAL, CITY, ACCENT, mix} from '../lowpoly/palette.js';
import {box, gable, panel, wedge, type Geo} from '../lowpoly/prim.js';
import {mergePlaced, type Placed} from '../lowpoly/merge.js';
import {doorFrame, wallPieces, type Hole} from './openings.js';
import {SIDES, sideFrame, type ShellPlan, type Side} from './shell-plan.js';

export interface Shell {
  solid: Geo; lit: Geo; plug: Geo; plugLit: Geo; far: Geo;
}
export const GLASS = mix(PAL.glass, PAL.slate, 0.55);
const DOOR = mix(NEUTRAL.wood, NEUTRAL.coal, 0.4);

export function buildShell(src: BuildingSource, p: ShellPlan, wall: number, roof: number): Shell {
  const {w, d, t, slab, floors, fh0, fhU, H, floorTop, ceil} = p,
    trim = mix(wall, PAL.white, 0.35),
    yb = floorTop - 0.04, // 벽 띠 바닥(마감 바닥보다 4cm 아래: 틈 없이 얹는다)
    solid: Placed[] = [], lit: Placed[] = [], plug: Placed[] = [], plugLit: Placed[] = [];
  // 기초(대지 아래로 skirt 만큼) + 1층 천장 슬라브(층 수가 1이면 지붕 슬라브)
  solid.push({g: box(w, yb + p.skirt, d, NEUTRAL.stone, 0, -p.skirt, 0)}, {g: box(w, slab, d, trim, 0, ceil, 0)});
  const doorHole: Hole = {u0: p.door.u - p.door.w / 2, u1: p.door.u + p.door.w / 2, y0: 0, y1: floorTop - yb + p.door.h};
  for (const side of SIDES) {
    const f = sideFrame(side, w, d, t),
      at = {x: f.px, y: yb, z: f.pz, ry: f.ry},
      holes: Hole[] = [];
    if (side === p.door.side) holes.push(doorHole);
    for (const win of p.windows) {
      if (win.side !== side) continue;
      const y0 = floorTop - yb + win.sill;
      holes.push({u0: win.u - win.w / 2, u1: win.u + win.w / 2, y0, y1: y0 + win.h});
      plug.push({g: box(win.w - 0.02, win.h - 0.02, 0.05, GLASS, win.u, y0 + 0.01, 0), ...at});
      plug.push({g: box(0.04, win.h - 0.02, 0.07, trim, win.u, y0 + 0.01, 0), ...at}); // 세로 창살
      if (win.lit) plugLit.push({g: panel(win.w - 0.3, win.h - 0.3, ACCENT.amber, win.u, y0 + win.h / 2, 0.06), ...at});
    }
    for (const g of wallPieces(f.len, ceil - yb, t, holes, wall)) solid.push({g, ...at});
    if (side === p.door.side) {
      for (const g of doorFrame(doorHole, t, trim)) solid.push({g, ...at});
      plug.push({g: box(p.door.w - 0.02, p.door.h, 0.06, DOOR, p.door.u, floorTop - yb, 0), ...at});
      plug.push({g: box(0.1, 0.1, 0.12, NEUTRAL.steel, p.door.u + p.door.w / 2 - 0.16, floorTop - yb + 1.0, 0), ...at});
      lit.push({g: box(0.3, 0.12, 0.12, ACCENT.amber, p.door.u, floorTop - yb + p.door.h + 0.2, t / 2 + 0.06), ...at});
      if (p.shopFront) { // 줄무늬 차양: 문 위, 벽 바깥으로 돌출
        const aw = p.door.w + 1.8, ns = Math.max(2, Math.round(aw / 0.9)), cols = p.seed % 2 ? [CITY.awning, PAL.white] : [CITY.tileRed, PAL.cloud];
        for (let i = 0; i < ns; i++) solid.push({g: wedge(aw / ns, 0.45, 1.3, cols[i % 2], p.door.u + (i - (ns - 1) / 2) * (aw / ns), floorTop - yb + p.door.h + 0.35, t / 2 + 0.65), ...at});
      }
    }
  }
  // 위층: 속 찬 덩어리 + 층 띠 + 그림 창 (실내는 1층만)
  if (floors > 1) {
    solid.push({g: box(w, H - fh0, d, wall, 0, fh0, 0)});
    for (let f = 1; f < floors; f++) {
      const y = fh0 + (f - 1) * fhU;
      solid.push({g: box(w + 0.2, 0.2, d + 0.2, trim, 0, y - 0.1, 0)});
      for (const side of SIDES) {
        const fr = sideFrame(side, w, d, t), at = {x: fr.px, y, z: fr.pz, ry: fr.ry}, n = Math.max(1, Math.floor((fr.len - 1) / 3.2)), sp = fr.len / n;
        for (let i = 0; i < n; i++) {
          const u = (i + 0.5) * sp - fr.len / 2;
          solid.push({g: box(1.2, 1.2, 0.12, GLASS, u, 0.9, t / 2), ...at});
          if ((p.seed + f * 7 + i * 3 + side.charCodeAt(0)) % 10 < 7) lit.push({g: panel(0.9, 0.9, ACCENT.amber, u, 1.5, t / 2 + 0.07), ...at});
        }
      }
    }
  }
  // 지붕
  const roofGeo = p.house ? gable(w + 0.8, 2.2, d + 0.8, roof, 0, H) : box(w + 0.4, 0.35, d + 0.4, roof, 0, H);
  solid.push({g: roofGeo});
  const far = mergePlaced([{g: box(w, H, d, wall)}, {g: roofGeo}]);
  return {solid: mergePlaced(solid), lit: mergePlaced(lit), plug: mergePlaced(plug), plugLit: mergePlaced(plugLit), far};
}
export type {Side};
