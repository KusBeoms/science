// Indexed terrain grid with shared world normals/colors and stitched LOD boundaries.
import {GX0, GZ0, CLIFF1, heightAt, terrainNormal} from '../core/heightmap.js';
import {CITY_HALF} from '../data/world-map.js';
import {terrainColor} from './terrain-color.js';
export interface TerrainPatch {x0: number; z0: number; x1: number; z1: number; step: number}
export type EdgeSpacing = (x: number, z: number) => number;
const axis = (a: number, b: number, step: number) => {
  const out = [a];
  for (let p = a + step; p < b - 0.001; p += step) out.push(p);
  out.push(b);
  return out;
};
function sample(x: number, z: number) {
  return {h: heightAt(x, z), n: terrainNormal(x, z), c: terrainColor(x, z)};
}
export function terrainGeometry(p: TerrainPatch, adjacent: EdgeSpacing, skirtDepth = 12): any {
  const xs = axis(p.x0, p.x1, p.step), zs = axis(p.z0, p.z1, p.step),
    w = xs.length, h = zs.length,
    pos: number[] = [], normals: number[] = [], colors: number[] = [], indices: number[] = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = xs[i], z = zs[j];
    let value = sample(x, z), edge = p.step, vertical = false;
    if (!i || i === w - 1) {
      edge = adjacent(x + (!i ? -0.01 : 0.01), z); vertical = true;
    }
    if (!j || j === h - 1) {
      const other = adjacent(x, z + (!j ? -0.01 : 0.01));
      if (other > edge) { edge = other; vertical = false; }
    }
    // Fine edge vertices lie on the coarser neighbor's actual linear edge.
    if (edge > p.step) {
      const a = vertical ? z : x, origin = vertical ? GZ0 : GX0,
        lo = Math.floor((a - origin) / edge + 1e-7) * edge + origin,
        t = (a - lo) / edge,
        v0 = sample(vertical ? x : lo, vertical ? lo : z),
        v1 = sample(vertical ? x : lo + edge, vertical ? lo + edge : z);
      value = {h: v0.h * (1 - t) + v1.h * t,
        n: v0.n.map((v, k) => v * (1 - t) + v1.n[k] * t) as [number, number, number],
        c: v0.c.map((v, k) => v * (1 - t) + v1.c[k] * t) as [number, number, number]};
    }
    pos.push(x, value.h - 0.08, z); normals.push(...value.n); colors.push(...value.c);
  }
  for (let j = 0; j < h - 1; j++) for (let i = 0; i < w - 1; i++) {
    const a = j * w + i, b = a + 1, c = a + w, d = c + 1,
      ys = [a, b, c, d].map(k => pos[k * 3 + 1]);
    if (Math.max(...ys) < CLIFF1 - 0.081) continue;
    if (ys.every(y => Math.abs(y + 0.08) < 0.001)
      && xs[i] >= -CITY_HALF && xs[i + 1] <= CITY_HALF
      && zs[j] >= -CITY_HALF && zs[j + 1] <= CITY_HALF) continue;
    indices.push(a, c, b, b, c, d); // +Y facing
  }
  // Short downward skirts conceal asynchronous neighboring-root changes only.
  // Steady-state edges above are matched exactly, so there is no double terrain surface.
  const skirt = (a: number, b: number) => {
    if (!skirtDepth || Math.max(pos[a * 3 + 1], pos[b * 3 + 1]) < CLIFF1 - 0.081) return;
    const start = pos.length / 3;
    for (const id of [a, b]) {
      pos.push(pos[id * 3], pos[id * 3 + 1] - skirtDepth, pos[id * 3 + 2]);
      normals.push(...normals.slice(id * 3, id * 3 + 3));
      colors.push(...colors.slice(id * 3, id * 3 + 3));
    }
    indices.push(a, start, b, b, start, start + 1);
  };
  for (let i = 0; i < w - 1; i++) { skirt(i + 1, i); skirt((h - 1) * w + i, (h - 1) * w + i + 1); }
  for (let j = 0; j < h - 1; j++) { skirt(j * w, (j + 1) * w); skirt((j + 1) * w + w - 1, j * w + w - 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices); g.computeBoundingSphere();
  return g;
}
