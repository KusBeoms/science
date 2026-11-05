// 입체교차로·횡단보도용 정점색 삼각형 버퍼: 면마다 정점을 나눠 두고 computeVertexNormals 로 각진 면 법선을 만든다 (render/lowpoly/prim.ts 와 같은 방식)
import {rgb} from './lowpoly/palette.js';

type P3 = readonly [number, number, number];
export class Buf {
  pos: number[] = [];
  col: number[] = [];
  /** 면 하나(4점). center 쪽을 안쪽으로 보고 법선이 바깥을 향하게 감는다 */
  quad(a: P3, b: P3, c: P3, d: P3, color: number, center?: P3) {
    const n = cross(sub(b, a), sub(c, a));
    if (center ? dot(n, sub(a, center)) < 0 : n[1] < 0) [b, d] = [d, b]; // 센터가 없으면 위를 보게
    this.tri(a, b, c, color);
    this.tri(a, c, d, color);
  }
  tri(a: P3, b: P3, c: P3, color: number) {
    const [r, g, bl] = rgb(color);
    for (const p of [a, b, c]) {
      this.pos.push(p[0], p[1], p[2]);
      this.col.push(r, g, bl);
    }
  }
  /** 정렬된 직육면체(x0..x1, y0..y1, z0..z1) — 한 색 */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: number, top = color) {
    const c: P3 = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], top, c);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], color, c);
    this.quad([x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], color, c);
    this.quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], color, c);
    this.quad([x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], color, c);
    this.quad([x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [x1, y0, z1], color, c);
  }
  get empty() {
    return this.pos.length === 0;
  }
  geo(): any {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.col), 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}
const sub = (a: P3, b: P3): P3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: P3, b: P3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: P3, b: P3): P3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
