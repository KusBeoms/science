// 온사이트 실내 메시 (W8 INTERIOR): RoomPlan(interior-plan.ts) + ShellPlan → 건물 로컬 좌표의 그룹(바닥·천장·벽 안판·칸막이·가구·장식·조명·유리·문짝).
// 표면은 조명을 받지 않는 재질(MeshBasic 정점색)에 법선별 명암을 정점색에 구워 둔다 → 바깥이 어두워져도(render/interior-dark.ts) 실내는 일정하고,
// 밤에는 재질 색조만 따뜻하게 바꾼다(setInteriorTone). 방마다 점광원을 두지 않는다(광원 수가 바뀌면 모든 재질이 다시 컴파일되기 때문).
import {PAL, mix} from './lowpoly/palette.js';
import {box, panel, type Geo} from './lowpoly/prim.js';
import {mergeGeometries, mergePlaced, type Placed} from './lowpoly/merge.js';
import {PURPOSE_INFO} from '../data/interiors.js';
import {interiorDetails} from './interior-art.js';
import {FURN_K, LINER, type RoomPlan} from './interior-plan.js';
import {wallPieces, type Hole} from './citygen/openings.js';
import {SIDES, sideFrame, wallToLocal, type ShellPlan} from './citygen/shell-plan.js';

let bodyMat: any = null, glassMat: any = null, doorMat: any = null;
/** 실내 표면 재질(공유, keep) */
export function interiorMat(): any {
  if (!bodyMat) { bodyMat = new THREE.MeshBasicMaterial({vertexColors: true}); bodyMat.userData.keep = true; }
  return bodyMat;
}
export function glassMaterial(): any {
  if (!glassMat) {
    glassMat = new THREE.MeshBasicMaterial({vertexColors: true, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false});
    glassMat.userData.keep = true;
  }
  return glassMat;
}
function doorMaterial(): any {
  if (!doorMat) { doorMat = new THREE.MeshLambertMaterial({vertexColors: true}); doorMat.userData.keep = true; }
  return doorMat;
}
/** 실내 색조: 0 = 낮(중립, 창으로 들어온 햇빛), 1 = 밤(따뜻한 전등) */
export function setInteriorTone(warm: number): void {
  interiorMat().color.setRGB(0.93 + 0.07 * warm, 0.92 - 0.05 * warm, 0.88 - 0.17 * warm);
}

/** 법선에 따른 명암을 정점색에 곱한다(위 밝게, 아래 어둡게) */
function shade(g: Geo): Geo {
  const n = g.attributes.normal.array, c = g.attributes.color.array;
  for (let i = 0; i < n.length; i += 3) {
    const k = Math.min(1, Math.max(0.55, 0.8 + 0.2 * n[i + 1] + 0.06 * n[i] - 0.04 * n[i + 2]));
    c[i] *= k; c[i + 1] *= k; c[i + 2] *= k;
  }
  return g;
}
const DOOR = mix(PAL.wood, PAL.coal, 0.4);

export interface OnsiteRoom {
  group: any;
  body: any; glass: any;
  /** 문짝: pivot 은 경첩 위치(건물 로컬), 회전 y = closedRy + 열림각 */
  door: {pivot: any; closedRy: number; w: number; h: number};
  geometries: any[];
}
export function buildOnsiteRoom(p: ShellPlan, rp: RoomPlan): OnsiteRoom {
  const info = PURPOSE_INFO[rp.purpose],
    ft = p.floorTop, ih = p.ceil - ft,
    iw0 = p.w - 2 * p.t, id0 = p.d - 2 * p.t,
    wallCol = info.wall, floorCol = info.floor, ceilCol = mix(info.wall, PAL.white, 0.5),
    solid: Placed[] = [], lit: Placed[] = [], glass: Placed[] = [],
    frame = {y: ft, ry: rp.ry};
  const toLocal = (X: number, Z: number) => {
    const c = Math.round(Math.cos(rp.ry)), s = Math.round(Math.sin(rp.ry));
    return {x: X * c + Z * s, z: -X * s + Z * c};
  };
  solid.push({g: box(iw0, 0.06, id0, floorCol, 0, ft - 0.06, 0)}, {g: box(iw0, 0.05, id0, ceilCol, 0, p.ceil - 0.05, 0)});
  // 벽 안판: 셸 개구와 같은 구멍을 뚫는다(문·창). 안쪽 면에 붙여 셸의 바깥색이 안에서 보이지 않게 한다
  for (const side of SIDES) {
    const f = sideFrame(side, p.w, p.d, p.t), holes: Hole[] = [],
      at = {...wallToLocal(f, 0, -p.t / 2 - LINER / 2), y: ft, ry: f.ry};
    if (side === p.door.side) holes.push({u0: p.door.u - p.door.w / 2, u1: p.door.u + p.door.w / 2, y0: 0, y1: p.door.h});
    for (const w of p.windows) {
      if (w.side !== side) continue;
      holes.push({u0: w.u - w.w / 2, u1: w.u + w.w / 2, y0: w.sill, y1: w.sill + w.h});
      glass.push({g: panel(w.w - 0.02, w.h - 0.02, 0xa8d8ff, w.u, w.sill + w.h / 2, 0), x: f.px, y: ft, z: f.pz, ry: f.ry});
    }
    for (const g of wallPieces(side === 's' || side === 'n' ? iw0 : id0, ih, LINER, holes, wallCol)) solid.push({g, x: at.x, y: ft, z: at.z, ry: f.ry});
  }
  // 칸막이
  for (const q of rp.partitions) {
    const m = toLocal((q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2);
    solid.push({g: box(q.x1 - q.x0, ih, q.z1 - q.z0, mix(wallCol, PAL.white, 0.2)), x: m.x, y: ft, z: m.z, ry: rp.ry});
  }
  // 가구
  for (const i of rp.items) {
    const m = toLocal(i.x, i.z), g = box(i.w, i.h, i.d, i.glow ? mix(i.c, PAL.white, 0.4) : i.c);
    (i.glow ? lit : solid).push({g, x: m.x, y: ft + (i.y ?? 0), z: m.z, ry: rp.ry});
  }
  // 장식(가상 방 치수로 만들어 K 배로 줄인다)
  for (const g of interiorDetails(rp.purpose, rp.vw / FURN_K, rp.vd / FURN_K, rp.virtualItems)) solid.push({g, y: ft - 0.1 * FURN_K, s: FURN_K, ry: rp.ry});
  // 천장 등(약 4m 격자)
  const nx = Math.max(1, Math.round(iw0 / 4)), nz = Math.max(1, Math.round(id0 / 4));
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) lit.push({g: box(0.5, 0.06, 0.5, 0xffe9b0, ((i + 0.5) / nx - 0.5) * iw0, p.ceil - 0.11, ((j + 0.5) / nz - 0.5) * id0)});
  const bodyGeo = mergeGeometries([shade(mergePlaced(solid)), mergePlaced(lit)]),
    glassGeo = mergePlaced(glass),
    group = new THREE.Group(),
    body = new THREE.Mesh(bodyGeo, interiorMat()),
    glassMesh = new THREE.Mesh(glassGeo, glassMaterial());
  body.name = 'onsite-body';
  glassMesh.name = 'onsite-glass';
  glassMesh.renderOrder = 2;
  // 문짝: 경첩 쪽(u 작은 쪽)에 피벗, 안쪽으로 열린다
  const df = sideFrame(p.door.side, p.w, p.d, p.t), hinge = wallToLocal(df, p.door.u - p.door.w / 2, 0);
  const leafGeo = mergePlaced([
    {g: box(p.door.w - 0.02, p.door.h, 0.05, DOOR, p.door.w / 2, 0, 0)},
    {g: box(0.1, 0.1, 0.14, PAL.steel, p.door.w - 0.16, 1.0, 0)},
  ]);
  const pivot = new THREE.Group(), leaf = new THREE.Mesh(leafGeo, doorMaterial());
  leaf.name = 'onsite-door-leaf';
  pivot.add(leaf);
  pivot.position.set(hinge.x, ft, hinge.z);
  pivot.rotation.y = df.ry;
  group.add(body, glassMesh, pivot);
  void frame;
  return {group, body, glass: glassMesh, door: {pivot, closedRy: df.ry, w: p.door.w, h: p.door.h}, geometries: [bodyGeo, glassGeo, leafGeo]};
}
