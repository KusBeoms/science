// 경관 메시를 공간별로 병합한다. 숲은 근거리 100u / 원거리 300u 청크를 따로 둔다.
import {G} from '../core/runtime.js';
import {instanced, lowMat, mergePlaced, type Placed, type Inst} from './lowpoly/merge.js';

interface ForestNear {
  mesh: any;
  x: number;
  z: number;
  active: boolean;
}
interface ForestFar {
  mesh: any;
  sources: {near: ForestNear; items: Inst[]}[];
  x: number;
  z: number;
  radius: number;
  state: string;
}
const nearTiles: ForestNear[] = [], farTiles: ForestFar[] = [];
const NEAR_CELL = 100, FAR_CELL = 300, NEAR_DISTANCE = 210, FAR_DISTANCE = 620;

export function landscapeBatch(parts: Placed[], name: string, cell = 100) {
  const group = new THREE.Group();
  group.name = name;
  const cells = new Map<string, Placed[]>();
  for (const p of parts) {
    const key = `${Math.floor((p.x || 0) / cell)},${Math.floor((p.z || 0) / cell)}`;
    (cells.get(key) || cells.set(key, []).get(key)!).push(p);
  }
  cells.forEach(list => {
    const geometry = mergePlaced(list);
    geometry.computeBoundingSphere();
    group.add(new THREE.Mesh(geometry, lowMat()));
  });
  return group;
}

/** 인스턴스 행렬은 월드 위치를 담으므로 geometry의 컬링 구도 같은 좌표계를 쓴다. */
function bounds(geo: any, items: Inst[]) {
  geo.computeBoundingSphere();
  const reach = geo.boundingSphere.radius + geo.boundingSphere.center.length();
  const x = items.reduce((s, p) => s + p.x, 0) / items.length,
    y = items.reduce((s, p) => s + p.y, 0) / items.length,
    z = items.reduce((s, p) => s + p.z, 0) / items.length;
  const radius = Math.max(...items.map(p => Math.hypot(p.x - x, p.y - y, p.z - z) + reach * (p.s ?? 1)));
  return {x, y, z, radius};
}
function forestMesh(geo: any, items: Inst[], name: string) {
  const geometry = geo.clone(), b = bounds(geometry, items);
  const mesh = instanced(geometry, lowMat(), items);
  mesh.name = name;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(b.x, b.y, b.z), b.radius);
  mesh.frustumCulled = true;
  return {mesh, ...b};
}

export function landscapeForest(nearGeo: any, farGeo: any, items: Inst[], name: string) {
  const root = new THREE.Group();
  root.name = name;
  const nearCells = new Map<string, Inst[]>(), farCells = new Map<string, ForestFar['sources']>();
  for (const p of items) {
    const key = `${Math.floor(p.x / NEAR_CELL)},${Math.floor(p.z / NEAR_CELL)}`;
    (nearCells.get(key) || nearCells.set(key, []).get(key)!).push(p);
  }
  nearCells.forEach((list, key) => {
    const built = forestMesh(nearGeo, list, `${name}-near-${key}`);
    const near: ForestNear = {mesh: built.mesh, x: built.x, z: built.z, active: true};
    nearTiles.push(near);
    root.add(near.mesh);
    // 각 근거리 청크의 원경 표본을 하나의 더 큰 청크로 묶는다.
    const farKey = `${Math.floor(near.x / FAR_CELL)},${Math.floor(near.z / FAR_CELL)}`;
    (farCells.get(farKey) || farCells.set(farKey, []).get(farKey)!).push({near, items: list.filter((_, i) => i % 3 === 0)});
  });
  farCells.forEach((sources, key) => {
    const list = sources.flatMap(s => s.items), built = forestMesh(farGeo, list, `${name}-far-${key}`);
    built.mesh.visible = false;
    root.add(built.mesh);
    farTiles.push({mesh: built.mesh, sources, x: built.x, z: built.z, radius: built.radius, state: ''});
  });
  return root;
}

const object = new THREE.Object3D(), color = new THREE.Color();
/** 근거리 청크가 전환될 때만 원경 인스턴스를 다시 압축한다. 한 나무가 두 LOD에 동시에 나오지 않는다. */
function updateFar(tile: ForestFar, state: string) {
  let n = 0;
  const mesh = tile.mesh;
  for (const source of tile.sources) {
    if (source.near.active) continue;
    for (const p of source.items) {
      object.position.set(p.x, p.y, p.z);
      object.rotation.set(0, p.ry ?? 0, 0);
      object.scale.setScalar(p.s ?? 1);
      object.updateMatrix();
      mesh.setMatrixAt(n, object.matrix);
      if (mesh.instanceColor) mesh.setColorAt(n, color.setHex(p.color ?? 0xffffff));
      n++;
    }
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  tile.state = state;
}
export function updateLandscapeLOD() {
  if (!G.me) return;
  const p = G.me.pos, overview = G.camera.isOrthographicCamera;
  for (const tile of nearTiles) {
    tile.active = overview || Math.hypot(tile.x - p.x, tile.z - p.z) < NEAR_DISTANCE;
    tile.mesh.visible = tile.active;
  }
  for (const tile of farTiles) {
    if (overview) {tile.mesh.visible = false; continue;}
    const state = tile.sources.map(s => s.near.active ? '1' : '0').join('');
    if (tile.state !== state) updateFar(tile, state);
    tile.mesh.visible = tile.mesh.count > 0 && Math.hypot(tile.x - p.x, tile.z - p.z) - tile.radius < FAR_DISTANCE;
  }
}
