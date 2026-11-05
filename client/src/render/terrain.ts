// W7 terrain: native2.5u near /5u middle /10u distant; atomic root LOD transitions.
import {G} from '../core/runtime.js';
import {locked} from '../core/progress.js';
import {GX0, GZ0, NX, NZ, STEP, CLIFF1, bakeContinent} from '../core/heightmap.js';
import {SECTORS} from '../data/sectors.js';
import {registerLandmarkSolids} from './landmarks.js';
import {lowMat} from './lowpoly/merge.js';
import {clearTerrainColors} from './terrain-color.js';
import {terrainGeometry, type TerrainPatch} from './terrain-mesh.js';
interface Patch extends TerrainPatch {key: string; owner: number}
interface Entry {mesh: any; used: number}
interface Root {patch: Patch; coarse: any; active: string[]}
export interface TerrainBounds {x0: number; z0: number; x1: number; z1: number}
const ROOT_SIZE = 320;
let group: any, roots: Root[] = [], lockSig = '', tick = 0;
const cache = new Map<string, Entry>();
let overview: {step: number; bounds?: TerrainBounds} | null = null, overviewKey = '', autoOverview = false;
const sig = () => SECTORS.map((_, i) => locked(i) ? 1 : 0).join('');
const distance = (p: TerrainPatch, x: number, z: number) => Math.hypot(
  Math.max(p.x0 - x, 0, x - p.x1), Math.max(p.z0 - z, 0, z - p.z1));
function patch(x0: number, z0: number, x1: number, z1: number, step: number, owner: number): Patch {
  return {x0, z0, x1, z1, step, owner, key: `${x0},${z0},${x1},${z1}/${step}`};
}
function children(p: Patch, step: number) {
  // Split on an aligned 80/160u boundary; partial world edge roots remain aligned.
  const size = p.x1 - p.x0 > 160 || p.z1 - p.z0 > 160 ? 160 : 80, out: Patch[] = [];
  for (let z = p.z0; z < p.z1; z += size) for (let x = p.x0; x < p.x1; x += size)
    out.push(patch(x, z, Math.min(p.x1, x + size), Math.min(p.z1, z + size), step, p.owner));
  return out;
}
function mesh(p: Patch, spacing: (x: number, z: number) => number, skirtDepth = 12) {
  const g = terrainGeometry(p, spacing, skirtDepth), m = new THREE.Mesh(g, lowMat());
  m.name = `terrain-${p.key}`; m.userData.terrainStep = p.step;
  m.visible = false; group.add(m); return m;
}
/** Small distant chunks allow actual fog/frustum rejection without changing sampling density. */
function coarseMesh(p: Patch) {
  const g = new THREE.Group(); g.name = `terrain-distant-${p.key}`;
  for (let z = p.z0; z < p.z1; z += 80) for (let x = p.x0; x < p.x1; x += 80) {
    const part = patch(x, z, Math.min(p.x1, x + 80), Math.min(p.z1, z + 80), 10, p.owner),
      m = mesh(part, () => 10, 0);
    if (!m.geometry.index.count) { group.remove(m); m.geometry.dispose(); continue; }
    m.userData.terrainBounds = part; m.visible = true; g.add(m);
  }
  g.visible = false; group.add(g); return g;
}
function cullDistant() {
  const camera = G.camera?.position, far = G.scene?.fog?.far,
    direction = G.camera?.getWorldDirection(new THREE.Vector3());
  for (const r of roots) for (const m of r.coarse.children) {
    const sphere = m.geometry.boundingSphere;
    // Three fog uses view depth, not radial distance: keep side-of-view surfaces until opaque.
    const depth = camera && direction ? (sphere.center.x - camera.x) * direction.x
      + (sphere.center.y - camera.y) * direction.y + (sphere.center.z - camera.z) * direction.z - sphere.radius : 0;
    m.visible = !!overview || !camera || !Number.isFinite(far) || depth < far;
  }
}

function plan(load: number): Patch[] {
  const pos = G.me?.pos || {x: 0, z: 0}, out: Patch[] = [];
  for (const r of roots) {
    const p = r.patch;
    if (overview) {
      const b = overview.bounds;
      if (!b || !(p.x1 < b.x0 || p.x0 > b.x1 || p.z1 < b.z0 || p.z0 > b.z1))
        out.push({...p, step: overview.step, key: `${p.key}/overview${overview.step}`});
      else out.push(p);
    } else if (distance(p, pos.x, pos.z) < load) {
      for (const mid of children(p, 5)) {
        if (distance(mid, pos.x, pos.z) < Math.min(65, load * 0.5)) {
          for (const near of children(mid, 2.5)) {
            if (distance(near, pos.x, pos.z) >= Math.min(65, load * 0.5)) {
              near.step = 5; near.key = near.key.replace('/2.5', '/5');
            }
            out.push(near);
          }
        } else out.push(mid);
      }
    } else out.push(p);
  }
  return out;
}
function spacingAt(list: Patch[], x: number, z: number) {
  return list.find(p => x >= p.x0 && x < p.x1 && z >= p.z0 && z < p.z1)?.step ?? 10;
}
function cacheKey(p: Patch, list: Patch[]) {
  const edge: number[][] = [];
  for (let z = p.z0 + 20; z < p.z1; z += 40) edge.push([p.x0 - 0.01, z], [p.x1 + 0.01, z]);
  for (let x = p.x0 + 20; x < p.x1; x += 40) edge.push([x, p.z0 - 0.01], [x, p.z1 + 0.01]);
  // Include the complete desired neighborhood so split-edge transitions rebuild safely.
  return p.key + ':' + edge.map(([x, z]) => spacingAt(list, x, z)).join(',') + ':' + lockSig;
}
/** Native mesh overview. Synchronous preparation makes one-call map snapshots deterministic.
 * Optional bounds limit high-density work; outside the bounds retains normal10u terrain. */
export function setTerrainOverview(on: boolean, spacing: 2.5 | 5 = 5, bounds?: TerrainBounds) {
  overview = on ? {step: spacing, bounds} : null;
  autoOverview = false; overviewKey = '';
  if (group) update(140, true);
  if (overview) overviewKey = JSON.stringify(overview);
}
export function initTerrain() {
  const h = bakeContinent();
  group = new THREE.Group(); group.name = 'terrain'; G.scene.add(group);
  roots = []; cache.clear(); lockSig = sig();
  for (let z = GZ0; z < GZ0 + (NZ - 1) * STEP; z += ROOT_SIZE)
    for (let x = GX0; x < GX0 + (NX - 1) * STEP; x += ROOT_SIZE) {
      const p = patch(x, z, Math.min(GX0 + (NX - 1) * STEP, x + ROOT_SIZE),
        Math.min(GZ0 + (NZ - 1) * STEP, z + ROOT_SIZE), 10, roots.length);
      let land = false;
      for (let j = (z - GZ0) / STEP; j <= (p.z1 - GZ0) / STEP && !land; j++)
        for (let i = (x - GX0) / STEP; i <= (p.x1 - GX0) / STEP; i++)
          if (h[j * NX + i] >= CLIFF1) { land = true; break; }
      if (!land) continue;
      p.owner = roots.length;
      const coarse = coarseMesh(p); coarse.visible = true;
      roots.push({patch: p, coarse, active: []});
    }
  registerLandmarkSolids();
}
function update(load: number, sync: boolean) {
  if (!group) return;
  tick++;
  const now = sig();
  if (now !== lockSig) {
    lockSig = now; clearTerrainColors(); overviewKey = '';
    for (const r of roots) {
      const old = r.coarse; r.coarse = coarseMesh(r.patch);
      r.coarse.visible = old.visible; group.remove(old);
      old.traverse((m: any) => { if (m.geometry) m.geometry.dispose(); });
    }
  }
  const list = plan(load), byOwner = new Map<number, Patch[]>();
  for (const p of list) (byOwner.get(p.owner) || byOwner.set(p.owner, []).get(p.owner)!).push(p);
  const needed = new Set<string>(), pending: {p: Patch; key: string}[] = [];
  for (const p of list) {
    if (p.step === 10) continue;
    const key = cacheKey(p, list); needed.add(key);
    if (!cache.has(key)) pending.push({p, key});
    else cache.get(key)!.used = tick;
  }
  const pos = G.me?.pos || {x: 0, z: 0};
  pending.sort((a, b) => distance(a.p, pos.x, pos.z) - distance(b.p, pos.x, pos.z));
  // One detail patch per game frame. Explicit/orthographic overview completes all patches.
  for (const item of pending.slice(0, sync ? pending.length : 1))
    cache.set(item.key, {mesh: mesh(item.p, (x, z) => spacingAt(list, x, z)), used: tick});
  for (const r of roots) {
    const desired = byOwner.get(r.patch.owner) || [r.patch],
      keys = desired.map(p => cacheKey(p, list)),
      coarse = desired.length === 1 && desired[0].step === 10,
      ready = coarse || keys.every(key => cache.has(key));
    if (!ready) { r.active.forEach(key => { const e = cache.get(key); if (e) e.used = tick; }); continue; }
    r.active.forEach(key => { const e = cache.get(key); if (e) e.mesh.visible = false; });
    r.coarse.visible = coarse;
    r.active = coarse ? [] : keys;
    r.active.forEach(key => { const e = cache.get(key)!; e.mesh.visible = true; e.used = tick; });
  }
  cullDistant();
  // Retain only a small warm cache, never evict an active or desired patch.
  const inactive = [...cache].filter(([key, e]) => !e.mesh.visible && !needed.has(key)).sort((a, b) => a[1].used - b[1].used);
  while (cache.size > 120 && inactive.length) {
    const [key, e] = inactive.shift()!; group.remove(e.mesh); e.mesh.geometry.dispose(); cache.delete(key);
  }
}
/** Existing load/unload signature retained; spatial hierarchy handles unloading as whole roots. */
export function streamTerrain(load: number, _unload: number) {
  const ortho = !!G.camera?.isOrthographicCamera;
  if (ortho && !overview) { overview = {step: 5}; autoOverview = true; }
  if (!ortho && autoOverview) { overview = null; overviewKey = ''; autoOverview = false; }
  const sync = !!overview && overviewKey !== JSON.stringify(overview);
  update(load, sync);
  if (overview) overviewKey = JSON.stringify(overview);
}
/** Resident active LOD totals remain stable API; drawn totals additionally reject the current frustum. */
export function terrainStats() {
  let tris = 0, farTris = 0, tiles = 0, drawnTris = 0, drawnFarTris = 0;
  let frustum: any = null;
  if (G.camera) {
    G.scene?.updateMatrixWorld(true);
    G.camera.updateMatrixWorld(true);
    const projection = new THREE.Matrix4().multiplyMatrices(G.camera.projectionMatrix, G.camera.matrixWorldInverse);
    frustum = new THREE.Frustum().setFromProjectionMatrix(projection);
  }
  const lod: Record<string, number> = {};
  group?.traverse((m: any) => {
    if (!m.isMesh || !m.visible) return;
    for (let p = m.parent; p && p !== group; p = p.parent) if (!p.visible) return;
    const n = (m.geometry.index?.count || 0) / 3, step = m.userData.terrainStep;
    lod[step] = (lod[step] || 0) + n;
    if (step === 10) farTris += n; else { tris += n; tiles++; }
    if (frustum && (!m.frustumCulled || frustum.intersectsObject(m))) {
      if (step === 10) drawnFarTris += n; else drawnTris += n;
    }
  });
  return {tiles, tris, farTris, drawnTris, drawnFarTris, lod, cached: cache.size};
}
