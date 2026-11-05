// 차 찌그러짐 시각: 병합 메시의 solid 지오메트리를 잘게 쪼갠 뒤(처음 다칠 때 1번), 구역별 파손량만큼 버텍스를 안쪽으로 눌러 비튼다.
// 구역 = [앞, 뒤, 왼(+x), 오른(−x)] 0~1. 같은 차에 몇 번이든 다시 부를 수 있다(원본 좌표에서 매번 계산).
import {carOf} from '../data/cars.js';

const SUBDIV = 2; // 삼각형 1개 → 4^2 = 16개
function subdivide(pos: Float32Array, col: Float32Array, level: number) {
  for (let l = 0; l < level; l++) {
    const n = pos.length / 9,
      np = new Float32Array(pos.length * 4),
      nc = new Float32Array(col.length * 4);
    let o = 0;
    const put = (a: number[], ca: number[]) => {
      for (let k = 0; k < 3; k++) {
        np.set(a.slice(k * 3, k * 3 + 3), o * 3);
        nc.set(ca.slice(k * 3, k * 3 + 3), o * 3);
        o++;
      }
    };
    for (let i = 0; i < n; i++) {
      const p = Array.from(pos.subarray(i * 9, i * 9 + 9)),
        c = Array.from(col.subarray(i * 9, i * 9 + 9)),
        mid = (arr: number[], a: number, b: number) => [0, 1, 2].map(k => (arr[a * 3 + k] + arr[b * 3 + k]) / 2),
        A = p.slice(0, 3), B = p.slice(3, 6), C = p.slice(6, 9),
        AB = mid(p, 0, 1), BC = mid(p, 1, 2), CA = mid(p, 2, 0),
        ca = c.slice(0, 3), cb = c.slice(3, 6), cc = c.slice(6, 9),
        cab = mid(c, 0, 1), cbc = mid(c, 1, 2), cca = mid(c, 2, 0);
      put([...A, ...AB, ...CA], [...ca, ...cab, ...cca]);
      put([...AB, ...B, ...BC], [...cab, ...cb, ...cbc]);
      put([...CA, ...BC, ...C], [...cca, ...cbc, ...cc]);
      put([...AB, ...BC, ...CA], [...cab, ...cbc, ...cca]);
    }
    pos = np;
    col = nc;
  }
  return {pos, col};
}
const sm = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
/** 좌표 기반 의사난수 0~1 (같은 점은 항상 같은 값 → 찌그러짐이 프레임마다 떨리지 않는다) */
const hash = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

interface Cache {
  base: Float32Array;
  col0: Float32Array;
}
/** zn = [앞, 뒤, 왼, 오른], soot 0~1 = 전체 그을음 */
export function deformCar(grp: any, zn: number[], soot: number) {
  const mesh = grp.children[0];
  if (!mesh) return;
  const total = zn[0] + zn[1] + zn[2] + zn[3];
  let c: Cache | undefined = grp.userData.dmgCache;
  if (!c) {
    if (total < 0.01 && soot < 0.01) return; // 멀쩡하면 그대로 둔다 (쪼개기 비용 절약)
    const g = mesh.geometry,
      s = subdivide(new Float32Array(g.attributes.position.array), new Float32Array(g.attributes.color.array), SUBDIV);
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.BufferAttribute(new Float32Array(s.pos), 3));
    ng.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(s.pos.length), 3));
    ng.setAttribute('color', new THREE.BufferAttribute(new Float32Array(s.col), 3));
    g.dispose();
    mesh.geometry = ng;
    c = grp.userData.dmgCache = {base: s.pos, col0: s.col};
  }
  const t = carOf(grp.userData.look.t),
    L = t.len,
    W = t.wid,
    H = t.hgt,
    r = Math.max(0.45, H * 0.2),
    wz = L * 0.31,
    ng = mesh.geometry,
    pos = ng.attributes.position.array as Float32Array,
    col = ng.attributes.color.array as Float32Array,
    base = c.base,
    col0 = c.col0;
  for (let i = 0; i < base.length; i += 3) {
    const x = base[i], y = base[i + 1], z = base[i + 2];
    let nx = x, ny = y, nz = z, dark = soot;
    // 바퀴(몸통 옆 아래 상자)는 건드리지 않는다
    const wheel = y < r * 2.02 && Math.abs(x) > W / 2 - 0.45 && Math.abs(Math.abs(z) - wz) < r + 0.05;
    if (!wheel) {
      const u = z / (L / 2),
        sx = x / (W / 2),
        hf = 0.35 + 0.65 * sm((y - r * 0.5) / (r * 1.4)), // 위쪽일수록 더 구겨진다
        n1 = hash(x, y, z), n2 = hash(z, x, y), n3 = hash(y, z, x),
        wf = sm((u - 0.15) / 0.85) * zn[0],
        wb = sm((-u - 0.15) / 0.85) * zn[1],
        wl = sm((sx - 0.15) / 0.85) * zn[2],
        wr = sm((-sx - 0.15) / 0.85) * zn[3];
      nz += (-wf * (0.2 + 0.5 * n1) + wb * (0.2 + 0.5 * n1)) * L * 0.3 * hf;
      nx += (-wl * (0.2 + 0.5 * n2) + wr * (0.2 + 0.5 * n2)) * W * 0.3 * hf;
      const w = wf + wb + wl + wr;
      ny += (n3 - 0.35) * w * H * 0.22 * hf; // 보닛이 들리고 꺼진다
      nx += (n2 - 0.5) * (wf + wb) * W * 0.22 * hf;
      nz += (n1 - 0.5) * (wl + wr) * L * 0.1 * hf;
      dark = Math.max(soot, Math.min(1, w * 0.9));
    }
    pos[i] = nx;
    pos[i + 1] = ny;
    pos[i + 2] = nz;
    const k = 1 - dark * 0.7;
    col[i] = col0[i] * k + dark * 0.05;
    col[i + 1] = col0[i + 1] * k + dark * 0.04;
    col[i + 2] = col0[i + 2] * k + dark * 0.04;
  }
  ng.attributes.position.needsUpdate = true;
  ng.attributes.color.needsUpdate = true;
  ng.computeVertexNormals();
  ng.computeBoundingSphere();
}
/** 전조등 상태: 0 정상, 1 깜빡임(on/off 는 호출 쪽), 2 꺼짐 */
export function setLights(grp: any, on: boolean) {
  if (grp.children[1]) grp.children[1].visible = on;
}
