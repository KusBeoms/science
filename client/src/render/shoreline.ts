// 해수면과 높이 격자의 교선을 따라 얇은 포말을 만든다(마칭 스퀘어).
// 폴리곤 꼭짓점을 그대로 잇지 않아 모래 경사와 절벽의 실제 물가를 따른다.
import {gridOf, GX0, GZ0, NX, NZ, STEP, REG_CITY, REG_WILD} from '../core/heightmap.js';
import {SEA_Y} from '../data/world-map.js';
import {PAL, mix, rgb} from './lowpoly/palette.js';
export function buildShoreline() {
  const {h, reg} = gridOf(), chunks = new Map<string, number[]>(), root = new THREE.Group();
  root.name = 'shoreline';
  const add = (a: number[], b: number[], width: number) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    if (len < 0.01) return;
    const nx = -dz / len * width / 2, nz = dx / len * width / 2;
    const key = `${Math.floor(a[0] / 160)},${Math.floor(a[1] / 160)}`, verts = chunks.get(key) || [];
    const p = [[a[0] - nx, a[1] - nz], [b[0] - nx, b[1] - nz], [b[0] + nx, b[1] + nz], [a[0] + nx, a[1] + nz]];
    for (const k of [0, 2, 1, 0, 3, 2]) verts.push(p[k][0], SEA_Y + 0.08, p[k][1]);
    chunks.set(key, verts);
  };
  for (let j = 0; j < NZ - 2; j += 2) for (let i = 0; i < NX - 2; i += 2) {
    const ids = [j * NX + i, j * NX + i + 2, (j + 2) * NX + i + 2, (j + 2) * NX + i];
    if (!ids.some(k => reg[k] === REG_CITY || reg[k] === REG_WILD)) continue;
    const points = [[GX0 + i * STEP, GZ0 + j * STEP], [GX0 + (i + 2) * STEP, GZ0 + j * STEP], [GX0 + (i + 2) * STEP, GZ0 + (j + 2) * STEP], [GX0 + i * STEP, GZ0 + (j + 2) * STEP]];
    const cross: number[][] = [];
    for (let k = 0; k < 4; k++) {
      const n = (k + 1) % 4, a = h[ids[k]], b = h[ids[n]];
      if ((a > SEA_Y) === (b > SEA_Y)) continue;
      const t = (SEA_Y - a) / (b - a);
      cross.push([points[k][0] + (points[n][0] - points[k][0]) * t, points[k][1] + (points[n][1] - points[k][1]) * t]);
    }
    for (let k = 0; k + 1 < cross.length; k += 2) add(cross[k], cross[k + 1], 0.7);
  }
  const material = new THREE.MeshLambertMaterial({color: mix(PAL.cloud, PAL.cyan, 0.15), transparent: true, opacity: 0.48, depthWrite: false, side: THREE.DoubleSide});
  chunks.forEach(p => {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.computeVertexNormals(); geo.computeBoundingSphere();
    root.add(new THREE.Mesh(geo, material));
  });
  return root;
}
