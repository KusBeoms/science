// Placement[] (건물 제외) → 공간 청크 × 에셋별 InstancedMesh. 근거리 모델/원거리 단순 모델/야간 조명 메시를 청크 단위로 거리 전환한다.
// 인스턴스는 compiled 의 (x, y, z, rot[도], scale) 를 그대로 쓴다 — 지형 높이를 다시 묻지 않는다(y-aware).
// 건물(kind 'building')은 buildings.ts 가 맡는다.
import type {Placement} from '../../data/city-compiled.js';
import {glowMat, instanced, lowMat, type Inst} from '../lowpoly/merge.js';
import {assetOf, type AssetDef} from './assets.js';
import {LodSet, cellKey} from './lod.js';

export interface PlacementOptions {
  /** 공간 청크 한 변(m). 기본 64 */
  cell?: number;
  /** 근거리 모델 반경(m). 기본 110 */
  range?: number;
  /** 원거리 모델까지 그리는 반경(m). 기본 500 */
  cull?: number;
}
export interface ResolvedPlacement {
  p: Placement;
  def: AssetDef;
}
export interface PlacementBuild {
  group: any;
  lod: LodSet;
  geometries: any[];
  nightMeshes: any[];
  resolved: ResolvedPlacement[];
  stats: {
    input: number;
    instances: number;
    meshes: number;
    tris: number;
    byAsset: Record<string, number>;
    /** 모르는 asset ID 별 개수(건너뜀) */
    unknownAssets: Record<string, number>;
    /** 값이 유한하지 않아 건너뛴 배치 수 */
    bad: number;
  };
}
const triCount = (g: any, n: number) => ((g.index ? g.index.count : g.attributes.position.count) / 3) * n;
const PAD = 8; // 모델 높이(≤7m) 여유

/** 같은 지오메트리를 복제(청크별 경계구를 따로 가지기 위해)해 InstancedMesh 1개로 만든다 */
function chunkMesh(geo: any, mat: any, items: Inst[], reach: number, geometries: any[]): any {
  const g = geo.clone(),
    m = instanced(g, mat, items);
  let cx = 0, cy = 0, cz = 0;
  for (const i of items) (cx += i.x), (cy += i.y), (cz += i.z);
  cx /= items.length; cy /= items.length; cz /= items.length;
  let r = 0;
  for (const i of items) r = Math.max(r, Math.hypot(i.x - cx, i.y - cy, i.z - cz));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), r + reach + PAD);
  m.frustumCulled = true;
  geometries.push(g);
  return m;
}

export function buildPlacements(list: readonly Placement[], opt: PlacementOptions = {}): PlacementBuild {
  const cell = opt.cell ?? 64,
    range = opt.range ?? 110,
    cull = opt.cull ?? 500,
    group = new THREE.Group(),
    lod = new LodSet(),
    geometries: any[] = [],
    nightMeshes: any[] = [],
    resolved: ResolvedPlacement[] = [],
    by = new Map<string, {def: AssetDef; items: Inst[]}>(),
    stats: PlacementBuild['stats'] = {input: list.length, instances: 0, meshes: 0, tris: 0, byAsset: {}, unknownAssets: {}, bad: 0};
  group.name = 'citygen-placements';
  for (const p of list) {
    if (p.kind === 'building') continue;
    if (![p.x, p.y, p.z, p.rot].every(Number.isFinite) || (p.scale !== undefined && !(p.scale > 0))) {
      stats.bad++;
      continue;
    }
    const def = assetOf(p);
    if (!def) {
      stats.unknownAssets[p.asset] = (stats.unknownAssets[p.asset] ?? 0) + 1;
      continue;
    }
    resolved.push({p, def});
    const k = cellKey(p.x, p.z, cell) + '|' + def.id;
    (by.get(k) || by.set(k, {def, items: []}).get(k)!).items.push({x: p.x, y: p.y, z: p.z, ry: (p.rot * Math.PI) / 180, s: p.scale ?? 1});
  }
  by.forEach(({def, items}) => {
    const n = items.length,
      near = chunkMesh(def.near(), lowMat(), items, def.reach, geometries),
      c = near.geometry.boundingSphere.center;
    near.name = `prop:${def.id}`;
    group.add(near);
    let far: any, lit: any;
    if (def.far) {
      far = chunkMesh(def.far(), lowMat(), items, def.reach, geometries);
      far.name = `prop-far:${def.id}`;
      group.add(far);
    }
    if (def.glow) {
      lit = chunkMesh(def.glow(), glowMat(), items, def.reach, geometries);
      lit.name = `prop-lit:${def.id}`;
      group.add(lit);
      nightMeshes.push(lit);
    }
    lod.add({cx: c.x, cz: c.z, near, far, lit, range, cull});
    stats.instances += n;
    stats.meshes += 1 + (far ? 1 : 0) + (lit ? 1 : 0);
    stats.tris += triCount(near.geometry, n) + (far ? triCount(far.geometry, n) : 0) + (lit ? triCount(lit.geometry, n) : 0);
    stats.byAsset[def.id] = (stats.byAsset[def.id] ?? 0) + n;
  });
  return {group, lod, geometries, nightMeshes, resolved, stats};
}
