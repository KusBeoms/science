// kind 'building' 배치 → 기존 건물 모델(makeHouse / makeLite / makeHighrise)로 그리는 어댑터와 청크 병합.
// 컴파일 데이터에는 건물의 w·d·floors·style 이 없으므로(Placement 는 위치·회전만) 원본의 BuildingSource 를 id 로 찾아 쓴다(resolve 콜백).
// 회전: BuildingSource.rot(도) = three rotation.y (+z 정면이 +x 쪽으로 도는 방향). 발자국 중심 둘레로 돌려 (x, y, z)에 굽는다.
// 한계: 모델은 구 도심의 층고(약 5u)·치수 그대로다(SCALE.md 의 3.0m 층고와 어긋남). 창·문 개구부·실내는 이후 작업.
import type {CityBuilding, HrSpec} from '../../data/city.js';
import type {BuildingSource} from '../../data/city-schema.js';
import type {Placement} from '../../data/city-compiled.js';
import {PAL, type PalName} from '../lowpoly/palette.js';
import {glowMat, lowMat, mergePlaced, type Placed} from '../lowpoly/merge.js';
import {surfaceMaterial} from '../surface-detail.js';
import {tagStructure} from '../surface-tags.js';
import {facadeDetails} from '../city/facade-art.js';
import {rotRad, type Built} from '../city/building.js';
import {makeHighrise} from '../city/highrise.js';
import {makeHouse, makeLite} from '../city/residential.js';
import {distantBuilding} from '../city/detail-lod.js';
import {LodSet, cellKey} from './lod.js';

const pal = (n: string | undefined, fallback: PalName): PalName => (n && Object.prototype.hasOwnProperty.call(PAL, n) ? (n as PalName) : fallback);

/** BuildingSource → 기존 CityBuilding(정면 's' 고정, 방향은 rot 로 준다) */
export function toCityBuilding(src: BuildingSource): CityBuilding {
  const w = Math.max(3, src.w), d = Math.max(3, src.d), floors = Math.max(1, Math.round(src.floors));
  const base = {id: src.id, face: 's' as const, x: src.x, z: src.z, w, d, floors};
  switch (src.style) {
    case 'house': case 'lodge': case 'barn':
      return {...base, district: 'w7-house', style: 'house', wall: pal(src.wall, src.style === 'barn' ? 'clay' : 'plaster'), roof: pal(src.roof, src.style === 'barn' ? 'coal' : 'tileRed')};
    case 'shop':
      return {...base, district: 'w7-lite', style: 'shop', wall: pal(src.wall, 'brick'), roof: pal(src.roof, 'slate')};
    case 'office': case 'civic':
      return {...base, district: 'w7-lite', style: 'office', wall: pal(src.wall, src.style === 'civic' ? 'bone' : 'stone'), roof: pal(src.roof, 'coal')};
    case 'apartment': {
      const hr: HrSpec = {kind: 'slab', H: floors * 3.8, tint: 'glass'};
      return {...base, district: 'citygen-hr', style: 'office', wall: pal(src.wall, 'bone'), roof: pal(src.roof, 'slate'), hr};
    }
    case 'highrise': {
      const hr: HrSpec = {kind: floors >= 30 ? 'crown' : w >= 40 ? 'twin' : 'glass', H: floors * 3.8, tint: 'glass'};
      return {...base, district: 'citygen-hr', style: 'office', wall: pal(src.wall, 'steel'), roof: pal(src.roof, 'coal'), hr};
    }
    default: // landmark
      return {...base, district: 'w7-lite', style: 'neon', wall: pal(src.wall, 'slate'), roof: pal(src.roof, 'coal')};
  }
}
/** CityBuilding 의 모델 선택(index.ts addBuildings 와 같은 분기) */
function model(b: CityBuilding): Built {
  const built = b.hr ? makeHighrise(b) : b.district === 'w7-house' ? makeHouse(b) : makeLite(b);
  return facadeDetails(b, built);
}

export interface BuiltBuilding {
  id: string;
  owner: string;
  x: number; y: number; z: number; rot: number;
  w: number; d: number;
  /** 지붕까지 높이(m): 충돌체 y1 */
  height: number;
  style: BuildingSource['style'];
}
export interface BuildingBuild {
  group: any;
  lod: LodSet;
  geometries: any[];
  nightMeshes: any[];
  built: BuiltBuilding[];
  stats: {input: number; buildings: number; meshes: number; tris: number; unresolved: string[]; byStyle: Record<string, number>};
}
export interface BuildingOptions {
  cell?: number;
  /** 근거리 모델 반경(m). 기본 120 */
  range?: number;
}
const trisOf = (g: any) => (g.index ? g.index.count : g.attributes.position.count) / 3;

export function buildBuildings(list: readonly Placement[], resolve: (p: Placement) => BuildingSource | undefined, opt: BuildingOptions = {}): BuildingBuild {
  const cell = opt.cell ?? 70, range = opt.range ?? 120;
  const group = new THREE.Group(), lod = new LodSet(), geometries: any[] = [], nightMeshes: any[] = [], built: BuiltBuilding[] = [];
  group.name = 'citygen-buildings';
  const stats: BuildingBuild['stats'] = {input: 0, buildings: 0, meshes: 0, tris: 0, unresolved: [], byStyle: {}};
  type Cell = {solid: Placed[]; far: Placed[]; lit: Placed[]; hrSolid: Placed[]; hrLit: Placed[]; sx: number; sz: number; n: number};
  const by = new Map<string, Cell>();
  for (const p of list) {
    if (p.kind !== 'building') continue;
    stats.input++;
    const src = resolve(p);
    if (!src || ![p.x, p.y, p.z, p.rot].every(Number.isFinite)) {
      stats.unresolved.push(p.id);
      continue;
    }
    const b = toCityBuilding({...src, x: p.x, z: p.z, rot: p.rot}),
      m = model(b),
      at = {x: p.x, y: p.y, z: p.z, ry: rotRad(p.rot)},
      k = cellKey(p.x, p.z, cell),
      c = by.get(k) || by.set(k, {solid: [], far: [], lit: [], hrSolid: [], hrLit: [], sx: 0, sz: 0, n: 0}).get(k)!;
    tagStructure(m.solid, b);
    if (b.hr) {
      c.hrSolid.push({g: m.solid, ...at});
      c.hrLit.push({g: m.lit, ...at});
    } else {
      c.solid.push({g: m.solid, ...at});
      c.far.push({g: tagStructure(distantBuilding(b), b), ...at});
      c.lit.push({g: m.lit, ...at});
    }
    c.sx += p.x; c.sz += p.z; c.n++;
    const H = b.hr ? b.hr.H : b.district === 'w7-house' ? b.floors * 4.6 + 1 : b.floors * (b.style === 'shop' ? 5.6 : 5.2);
    built.push({id: p.id, owner: p.owner, x: p.x, y: p.y, z: p.z, rot: p.rot, w: b.w, d: b.d, height: H, style: src.style});
    stats.byStyle[src.style] = (stats.byStyle[src.style] ?? 0) + 1;
    stats.buildings++;
  }
  const add = (list: Placed[], night: boolean, name: string): any => {
    const geo = mergePlaced(list),
      mesh = new THREE.Mesh(geo, night ? glowMat() : geo.attributes.surfaceDetail ? surfaceMaterial() : lowMat());
    mesh.name = name;
    mesh.matrixAutoUpdate = false;
    geo.computeBoundingSphere();
    group.add(mesh);
    geometries.push(geo);
    stats.meshes++;
    stats.tris += trisOf(geo);
    if (night) nightMeshes.push(mesh);
    return mesh;
  };
  by.forEach((c, k) => {
    const cx = c.sx / c.n, cz = c.sz / c.n;
    if (c.solid.length) {
      const near = add(c.solid, false, `bld:${k}`), far = add(c.far, false, `bld-far:${k}`), lit = add(c.lit, true, `bld-lit:${k}`);
      lod.add({cx, cz, near, far, lit, range, cull: Infinity});
    }
    if (c.hrSolid.length) {
      const near = add(c.hrSolid, false, `hr:${k}`), lit = add(c.hrLit, true, `hr-lit:${k}`);
      lod.add({cx, cz, near, lit, range: Infinity, cull: Infinity}); // 고층은 실루엣 유지: 항상 근거리 모델
    }
  });
  return {group, lod, geometries, nightMeshes, built, stats};
}
