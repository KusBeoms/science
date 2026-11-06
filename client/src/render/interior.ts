// 건물 내부 방 생성: 월드 밖 한 곳(RX,RZ)에 방 하나를 짓고(바닥+안쪽만 보이는 벽+가구) 들어갈 때마다 새로 만든다.
// 벽은 BackSide 재질이라 카메라가 방 밖에 있어도 안쪽이 보인다. 가구는 용도(Purpose)별 목록으로 배치.
import {interiorDetails} from './interior-art.js';
import {PAL} from './lowpoly/palette.js';
import {box, cyl} from './lowpoly/prim.js';
import {glowMat, lowMat, mergePlaced, type Placed} from './lowpoly/merge.js';
import {PURPOSE_INFO, type Enterable, type Purpose} from '../data/interiors.js';
import type {Rect} from '../core/terrain.js';
import {furnish2} from './interior-furn2.js';
import {furnishShops} from './interior-shops.js';
import {furnishDowntown} from './interior-downtown.js';
import {markSurface,surfaceMaterial} from './surface-detail.js';
import {SURFACE,tagStructure} from './surface-tags.js';

export const RX = 1500,
  RZ = 1500;
export type SpotKind = 'exit' | 'shop' | 'shop2' | 'dealer' | 'tuning' | 'garage' | 'bed' | 'seat' | 'tv' | 'use';
export interface Spot {
  kind: SpotKind;
  x: number;
  z: number;
  ry?: number;
  /** 온사이트 실내: 바닥 월드 높이(앉을 때 사용). 가상 방은 0 */
  y?: number;
  /** kind='use': 효과(rest·snack·coin·look·sing·train·bowl·read·swim·heal) 와 표시 이모지 */
  fx?: string;
  icon?: string;
}
export interface Room {
  grp: any;
  rect: Rect;
  solids: Rect[];
  spots: Spot[];
  spawn: {x: number; z: number};
}
export interface Item {
  w: number;
  h: number;
  d: number;
  c: number;
  x: number;
  z: number;
  y?: number;
  solid?: boolean;
  glow?: boolean;
  surface?: number;
}
const rnd = (seed: number, k: number) => ((Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;

/** 용도별 가구 (방 중심 기준 로컬 좌표, 문은 +z 쪽 벽 가운데) */
export function furnish(p: Purpose, w: number, d: number, seed: number, spots: Spot[]): Item[] {
  const hx = w / 2,
    hz = d / 2,
    it: Item[] = [],
    add = (i: Item) => it.push({solid: true, ...i});
  const shelf = (x: number, z: number, len: number, along: 'x' | 'z', c: number = PAL.wood) =>
    add({w: along === 'x' ? len : 0.9, h: 3.2, d: along === 'x' ? 0.9 : len, c, x, z});
  const seat = (x: number, z: number, c: number = PAL.tileBlue, ry = 0) => {
    const surface=c===PAL.wood?SURFACE.wood:c===PAL.steel?SURFACE.steel:SURFACE.fabric;
    add({w: 2.4, h: 0.9, d: 1.4, c, x, z, surface});
    add({w: 2.4, h: 1.0, d: 0.4, c, x, z: z - 0.8, y: 0.9, surface});
    spots.push({kind: 'seat', x, z: z + 0.9, ry});
  };
  const counter = (x: number, z: number, len: number, kind?: SpotKind) => {
    add({w: len, h: 1.6, d: 1.2, c: PAL.clay, x, z});
    add({w: len, h: 0.2, d: 1.4, c: PAL.wood, x, z, y: 1.6, solid: false});
    if (kind) spots.push({kind, x, z: z + 1.6});
  };
  const crate = (x: number, z: number, c: number = PAL.wood) => add({w: 1.1, h: 1.1, d: 1.1, c, x, z});
  const more = furnish2(p, w, d, spots, add) || furnishShops(p, w, d, spots, add) || furnishDowntown(p, w, d, spots, add);
  if (more) return it.filter(i => i.w > 0.05);
  switch (p) {
    case 'shop': {
      counter(0, -hz + 3.5, Math.min(6, w - 4), 'shop');
      for (let k = -1; k <= 1; k += 2) shelf(k * (hx - 1.1), -hz + 1.2 + 0, 0.01, 'z');
      shelf(-hx + 1, -2, d - 5, 'z');
      shelf(hx - 1, -2, d - 5, 'z');
      for (let k = 0; k < 6; k++) add({w: 0.8, h: 0.8, d: 0.8, c: [PAL.red, PAL.amber, PAL.cyan, PAL.lime, PAL.pink, PAL.violet][k], x: (k % 2 ? 1 : -1) * (hx - 1), z: -hz + 2 + k * 1.1, y: 3.2, solid: false});
      break;
    }
    case 'house': {
      add({w: 3, h: 1, d: 4.2, c: PAL.red, x: -hx + 2.2, z: -hz + 2.6});
      add({w: 3, h: 0.5, d: 1, c: PAL.cloud, x: -hx + 2.2, z: -hz + 1.0, y: 1, solid: false});
      spots.push({kind: 'bed', x: -hx + 4.2, z: -hz + 2.6});
      add({w: 3.2, h: 1.1, d: 2, c: PAL.wood, x: hx - 2.4, z: -hz + 1.6});
      seat(hx - 3, 1, PAL.green, 0);
      add({w: 2.6, h: 0.5, d: 1.4, c: PAL.amber, x: 0, z: 0.5, solid: false});
      spots.push({kind: 'tv', x: 0, z: 0.5});
      add({w: 2, h: 1.4, d: 1.4, c: PAL.cloud, x: hx - 1.6, z: hz - 2.5});
      break;
    }
    case 'office': {
      const rows = Math.max(1, Math.floor((d - 4) / 3.5));
      for (let r = 0; r < rows; r++)
        for (const s of [-1, 1]) {
          add({w: 3.2, h: 1.2, d: 1.6, c: PAL.stone, x: s * (hx / 2), z: -hz + 2.2 + r * 3.5});
          add({w: 1.4, h: 0.9, d: 0.1, c: PAL.cyan, x: s * (hx / 2), z: -hz + 2.2 + r * 3.5 - 0.5, y: 1.2, solid: false, glow: true});
        }
      shelf(-hx + 0.8, 0, d - 4, 'z', PAL.slate);
      break;
    }
    case 'arcade': {
      for (let k = 0; k < 5; k++) {
        const x = -hx + 2 + k * ((w - 4) / 4);
        add({w: 1.5, h: 3, d: 1.2, c: [PAL.magenta, PAL.violet, PAL.blue, PAL.teal, PAL.red][k], x, z: -hz + 1.2});
        add({w: 1.1, h: 0.9, d: 0.1, c: PAL.yellow, x, z: -hz + 1.9, y: 1.6, solid: false, glow: true});
      }
      counter(hx - 3.5, 2, 5, undefined);
      add({w: 0.5, h: 1.4, d: 0.5, c: PAL.amber, x: hx - 6, z: 2, solid: false});
      spots.push({kind: 'tv', x: 0, z: -1});
      break;
    }
    case 'stall': {
      counter(0, -hz + 1.6, w - 3, 'shop');
      crate(-hx + 1.2, 0); crate(-hx + 1.2, 1.4, PAL.steel); crate(hx - 1.2, 0.5, PAL.steel);
      add({w: 0.9, h: 2.2, d: 0.9, c: PAL.violet, x: hx - 1.2, z: -hz + 1, glow: true});
      break;
    }
    case 'terminal': {
      for (let k = 0; k < 3; k++) seat(-hx + 3 + k * 3.2, -hz + 3, PAL.steel, Math.PI);
      for (let k = 0; k < 6; k++) crate(hx - 1.4 - (k % 3) * 1.2, -hz + 1.4 + Math.floor(k / 3) * 1.2, k % 2 ? PAL.amber : PAL.clay);
      add({w: 2.4, h: 4.5, d: 0.5, c: PAL.ink, x: 0, z: -hz + 0.5});
      add({w: 2, h: 1, d: 0.1, c: PAL.cyan, x: 0, z: -hz + 0.8, y: 3, solid: false, glow: true});
      break;
    }
    case 'lab': {
      for (let k = 0; k < 2; k++) {
        add({w: 4, h: 1.2, d: 1.4, c: PAL.white, x: -hx / 2 + k * hx, z: -1});
        add({w: 0.6, h: 1, d: 0.6, c: [PAL.lime, PAL.cyan][k], x: -hx / 2 + k * hx - 0.8, z: -1, y: 1.2, solid: false, glow: true});
      }
      shelf(0, -hz + 0.8, w - 3, 'x', PAL.steel);
      add({w: 1.4, h: 2.4, d: 1.4, c: PAL.violet, x: hx - 1.6, z: hz - 3, glow: true});
      break;
    }
    case 'dealer': {
      for (let k = 0; k < 3; k++) {
        add({w: 4.4, h: 0.3, d: 2.4, c: PAL.cloud, x: -hx + 3 + k * 4.4, z: -hz + 2.4, solid: false});
        add({w: 3.4, h: 1.0, d: 1.7, c: [PAL.red, PAL.blue, PAL.amber][k], x: -hx + 3 + k * 4.4, z: -hz + 2.4, y: 0.3});
        add({w: 1.8, h: 0.7, d: 1.5, c: PAL.glass, x: -hx + 3 + k * 4.4, z: -hz + 2.4, y: 1.3, solid: false});
      }
      counter(hx - 3, 1, 4.6, 'dealer');
      break;
    }
    case 'tuning': {
      add({w: 3.6, h: 0.9, d: 1.7, c: PAL.orange, x: -hx + 3, z: -hz + 3});
      add({w: 1.9, h: 0.8, d: 1.5, c: PAL.glass, x: -hx + 3, z: -hz + 3, y: 0.9, solid: false});
      counter(hx - 3, -hz + 3, 4.6, 'tuning');
      for (let k = 0; k < 4; k++) add({w: 0.8, h: 0.8, d: 0.8, c: [PAL.red, PAL.cyan, PAL.lime, PAL.yellow][k], x: hx - 1.2, z: 0 + k * 0.9, solid: false});
      shelf(0, hz - 1, w - 6, 'x', PAL.coal);
      break;
    }
    case 'garage': {
      counter(0, -hz + 1.6, 5.6, 'garage');
      add({w: 3.4, h: 0.9, d: 1.7, c: PAL.stone, x: -hx + 3, z: 1.5});
      add({w: 3.4, h: 0.9, d: 1.7, c: PAL.teal, x: hx - 3, z: 1.5});
      shelf(-hx + 0.8, -2, 5, 'z', PAL.slate);
      break;
    }
    case 'clock': {
      add({w: 1.6, h: 5.5, d: 1.6, c: PAL.brick, x: 0, z: 0});
      add({w: 1.0, h: 1.0, d: 0.2, c: PAL.amber, x: 0, z: 0.9, y: 4, solid: false, glow: true});
      seat(-hx + 2, 0, PAL.wood, Math.PI / 2);
      break;
    }
    case 'hangar': {
      for (let k = 0; k < 2; k++) {
        add({w: 5, h: 1.6, d: 9, c: [PAL.cloud, PAL.orange][k], x: -hx / 2 + k * hx, z: -hz / 3});
        add({w: 2.4, h: 2.2, d: 2.4, c: PAL.red, x: -hx / 2 + k * hx, z: -hz / 3 - 5.2, y: 0});
      }
      for (let k = 0; k < 5; k++) crate(hx - 1.4, -hz + 1.5 + k * 1.3, PAL.steel);
      break;
    }
    case 'observatory': {
      add({w: 3, h: 1.4, d: 3, c: PAL.steel, x: 0, z: 0});
      add({w: 0.9, h: 3, d: 0.9, c: PAL.cloud, x: 0, z: 0, y: 1.4});
      add({w: 0.7, h: 0.7, d: 3.2, c: PAL.white, x: 0, z: -0.6, y: 3.6, solid: false});
      seat(hx - 3, 2, PAL.violet, 0);
      break;
    }
    case 'castle': {
      add({w: 3, h: 1.2, d: 8, c: PAL.wood, x: 0, z: -2});
      for (let k = 0; k < 4; k++) add({w: 1, h: 1.1, d: 1, c: PAL.brick, x: (k % 2 ? 2 : -2), z: -4 + k * 2.4, solid: true});
      add({w: 2, h: 3.4, d: 0.8, c: PAL.amber, x: 0, z: -hz + 1.2, glow: true});
      break;
    }
    case 'tower': {
      add({w: 4, h: 1.2, d: 1.6, c: PAL.steel, x: 0, z: -hz + 1.6});
      add({w: 3.2, h: 0.8, d: 0.1, c: PAL.green, x: 0, z: -hz + 2.5, y: 1.2, solid: false, glow: true});
      break;
    }
  }
  return it.filter(i => i.w > 0.05);
}

export function buildRoom(e: Enterable): Room {
  const info = PURPOSE_INFO[e.purpose],
    {w, d} = e,
    spots: Spot[] = [],
    items = furnish(e.purpose, w, d, e.seed, spots),
    grp = new THREE.Group(),
    solids: Rect[] = [],
    solid: Placed[] = [],
    lit: Placed[] = [];
  const tint = (e.seed % 5) * 0.012;
  const wallGeo = box(w, e.wallH, d, info.wall, 0, 0, 0),
    wallMesh = new THREE.Mesh(wallGeo, lowMat().clone());
  wallMesh.material.side = THREE.BackSide;
  wallMesh.position.set(RX, 0, RZ);
  grp.add(wallMesh);
  solid.push({g: markSurface(box(w, 0.1, d, info.floor),e.purpose==='house'?SURFACE.wood:SURFACE.tile,3,.55), x: RX, y: 0.02, z: RZ});
  // 바닥 격자 무늬
  for (let i = 0; i < Math.floor(w / 2); i++)
    for (let j = 0; j < Math.floor(d / 2); j++)
      if ((i + j) % 2) solid.push({g: markSurface(box(2, 0.04, 2, info.floor + 0x0a0a0a),e.purpose==='house'?SURFACE.wood:SURFACE.tile,3,.55), x: RX - w / 2 + 1 + i * 2, y: 0.12, z: RZ - d / 2 + 1 + j * 2});
  // 문(남쪽 벽 안쪽)
  solid.push({g: box(2.8, 3.8, 0.2, PAL.wood, 0, 0, 0), x: RX, y: 0.1, z: RZ + d / 2 - 0.15});
  lit.push({g: box(0.9, 0.2, 0.15, PAL.green, 0, 0, 0), x: RX, y: 4.0, z: RZ + d / 2 - 0.3});
  // 천장 등
  lit.push({g: cyl(0.5, 0.3, PAL.yellow, 0, 0, 0), x: RX, y: e.wallH - 0.4, z: RZ});
  for (const i of items) {
    const g = box(i.w, i.h, i.d, i.c, 0, 0, 0),
      p = {g, x: RX + i.x, y: (i.y ?? 0) + 0.1, z: RZ + i.z};
    if(!i.glow&&i.surface!==undefined)markSurface(g,i.surface,i.surface===SURFACE.fabric?1.2:3,.65);
    (i.glow ? lit : solid).push(p);
    if (i.solid) solids.push([RX + i.x - i.w / 2, RZ + i.z - i.d / 2, RX + i.x + i.w / 2, RZ + i.z + i.d / 2]);
  }
  solid.push(...interiorDetails(e.purpose, w, d, items).map(g => ({g, x: RX, y: 0.1, z: RZ})));
  void tint;
  const s = new THREE.Mesh(tagStructure(mergePlaced(solid)), surfaceMaterial()),
    l = new THREE.Mesh(mergePlaced(lit), glowMat());
  grp.add(s, l);
  const spotsW = spots.map(sp => ({...sp, x: RX + sp.x, z: RZ + sp.z}));
  spotsW.push({kind: 'exit', x: RX, z: RZ + d / 2 - 1.2});
  return {
    grp,
    rect: [RX - w / 2, RZ - d / 2, RX + w / 2, RZ + d / 2],
    solids,
    spots: spotsW,
    spawn: {x: RX, z: RZ + d / 2 - 2.4},
  };
}
