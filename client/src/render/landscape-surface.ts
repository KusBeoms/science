// 높이를 바꾸지 않고 지면을 따라가는 보도·밭·초지 면을 만든다.
import {groundH} from '../core/terrain.js';
import {rgb} from './lowpoly/palette.js';

export type PathPoint = readonly [number, number];

/** 이웃 선분의 접선을 평균해 이음매가 벌어지지 않는 좁은 산책로. */
export function terrainRibbon(points: readonly PathPoint[], width: number, color: number, lift = 0.1) {
  const pos: number[] = [], col: number[] = [], tint = rgb(color);
  const edge = (i: number, side: number) => {
    const p = points[i], a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz) || 1;
    const x = p[0] - dz / length * width / 2 * side, z = p[1] + dx / length * width / 2 * side;
    return [x, groundH(x, z) + lift, z];
  };
  for (let i = 0; i < points.length - 1; i++) {
    const q = [edge(i, -1), edge(i, 1), edge(i + 1, -1), edge(i + 1, 1)];
    if (q.some(p => !Number.isFinite(p[1]))) continue;
    for (const k of [0, 1, 2, 1, 3, 2]) {
      pos.push(...q[k]); col.push(...tint);
    }
  }
  return geometry(pos, col);
}

/** 밭 한 조각. 회전한 네 모서리와 실제 지면에 맞춰 작은 면으로 나눈다. */
export function terrainPatch(cx: number, cz: number, w: number, d: number, color: number, angle = 0) {
  const pos: number[] = [], col: number[] = [], tint = rgb(color);
  const n = Math.ceil(w / 8), m = Math.ceil(d / 8), c = Math.cos(angle), s = Math.sin(angle);
  const at = (i: number, j: number) => {
    const u = (i / n - 0.5) * w, v = (j / m - 0.5) * d;
    const x = cx + u * c - v * s, z = cz + u * s + v * c;
    return [x, groundH(x, z) + 0.12, z];
  };
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
    const q = [at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)];
    if (q.some(p => !Number.isFinite(p[1]) || p[1] < -2.6)) continue;
    for (const k of [0, 2, 1, 1, 2, 3]) {
      pos.push(...q[k]); col.push(...tint);
    }
  }
  return geometry(pos, col);
}

/** 정상 초지. 등산로보다 낮게 얹고 중심의 퇴화 삼각형은 만들지 않는다. */
export function terrainDisk(cx: number, cz: number, radius: number, color: number, lift = 0.14) {
  const pos: number[] = [], col: number[] = [], tint = rgb(color), N = 48, R = 10;
  const at = (i: number, j: number) => {
    const a = i / N * Math.PI * 2, d = j / R * radius, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    return [x, groundH(x, z) + lift, z];
  };
  for (let j = 0; j < R; j++) for (let i = 0; i < N; i++) {
    const q = [at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)];
    if (q.some(p => !Number.isFinite(p[1]))) continue;
    // 중심 고리에서는 같은 정점 두 개로 만드는 퇴화 삼각형을 생략한다.
    for (const k of j === 0 ? [1, 3, 2] : [0, 1, 2, 1, 3, 2]) {
      pos.push(...q[k]); col.push(...tint);
    }
  }
  return geometry(pos, col);
}

function geometry(pos: number[], col: number[]) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}
