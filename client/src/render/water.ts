// 진짜 물: 호수마다 얇은 수면 메시(호수 범위만, 6u 격자 중 물이 있는 칸만) + 바다 판. 둘 다 render/water-shader.ts 의 같은 물 재질.
// 수면 높이는 호수 level(data/wild.ts) — 바다 SEA_Y 와 독립. 수심은 셰이더가 지면 높이 텍스처에서 읽는다.
import {heightAt} from '../core/heightmap.js';
import {lakeT} from '../core/lake-shape.js';
import {LAKES, type Lake} from '../data/wild.js';
import {SEA_Y} from '../data/world-map.js';
import {makeWaterMat, syncWater} from './water-shader.js';

const CELL = 6;

/** 호수 한 개의 수면 메시: 타원 바운딩 박스 격자에서 지면이 수면 근처 이하인 칸만 */
function lakeMesh(L: Lake): any {
  const ext = Math.hypot(L.rx * Math.cos(L.rot), L.rz * Math.sin(L.rot)) * 1.3,
    exz = Math.hypot(L.rx * Math.sin(L.rot), L.rz * Math.cos(L.rot)) * 1.3,
    nx = Math.ceil((ext * 2) / CELL) + 1,
    nz = Math.ceil((exz * 2) / CELL) + 1,
    x0 = L.x - ext,
    z0 = L.z - exz,
    pos = new Float32Array(nx * nz * 3),
    wet = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const x = x0 + i * CELL,
        z = z0 + j * CELL,
        o = j * nx + i;
      pos.set([x, L.level, z], o * 3);
      wet[o] = heightAt(x, z) < L.level + 0.4 && lakeT(L, x, z) < 1.45 ? 1 : 0;
    }
  const idx: number[] = [];
  for (let j = 0; j < nz - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i,
        b = a + 1,
        c = a + nx,
        d = c + 1;
      if (wet[a] + wet[b] + wet[c] + wet[d] === 0) continue;
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  const m = makeWaterMat({
    level: L.level,
    shallow: 0x7fe0cc, // 얕은 곳: 연한 청록
    deep: 0x0a2c66, // 깊은 곳: 진한 남색
    deepD: Math.max(6, L.depth * 0.8),
    clear: 5,
    amp: 0.35,
    foam: 1,
    rough: 1.25,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.name = 'lake:' + L.id;
  mesh.renderOrder = 2;
  mesh.onBeforeRender = (_r: any, scene: any) => syncWater(m, scene);
  mesh.userData.tris = idx.length / 3;
  return mesh;
}

/** 바다: 대륙 전체 아래 큰 판. 호수 안은 구멍(호수 바닥이 바다보다 낮아도 바다가 겹쳐 보이지 않게) */
export function buildSeaMesh(): any {
  const m = makeWaterMat({
    level: SEA_Y,
    shallow: 0x62d6d2,
    deep: 0x16579c,
    deepD: 16,
    clear: 4,
    amp: 0,
    foam: 1,
    rough: 1,
    holes: LAKES.map(L => ({x: L.x, z: L.z, rx: L.rx * 1.25, rz: L.rz * 1.25, rot: L.rot})),
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4400, 4400, 1, 1), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(100, SEA_Y, 375); // 북쪽 섬 줄 ~ 야생지 남단, 서쪽 섬 ~ 동쪽 섬을 모두 덮는다
  mesh.name = 'sea';
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  mesh.onBeforeRender = (_r: any, scene: any) => syncWater(m, scene);
  return mesh;
}

/** 모든 호수 수면 (이름 'lakes') */
export function buildLakes(): any {
  const grp = new THREE.Group();
  grp.name = 'lakes';
  for (const L of LAKES) grp.add(lakeMesh(L));
  return grp;
}
