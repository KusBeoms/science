// 랜드마크 3차 (W3): 스타디움 · 대관람차 · 수족관 · 전망 타워 · 등대. 로컬 원점은 중심의 바닥.
import {stadiumDetails} from './stadium-art.js';
import {ACCENT, NEUTRAL, PAL, mix} from '../lowpoly/palette.js';
import {box, cyl, frustum, taper, type Geo} from '../lowpoly/prim.js';
import {mergePlaced, type Placed} from '../lowpoly/merge.js';
import {PITCH, STADIUM} from '../../data/soccer.js';
import type {Landmark} from './landmarks.js';

const parts = (list: Geo[]): Placed[] => list.map(g => ({g}));
/** Z축으로 기울인 상자 (세로 평면 구조용): 길이 len(x), 두께 t, 깊이 d, 중심 (x,y) */
function tilted(len: number, t: number, d: number, color: number, x: number, y: number, z: number, rz: number): Geo {
  const g = new THREE.BoxGeometry(len, t, d).toNonIndexed();
  g.rotateZ(rz);
  g.translate(x, y, z);
  const n = g.attributes.position.count,
    col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    col[i * 3] = (color >> 16) / 255;
    col[i * 3 + 1] = ((color >> 8) & 255) / 255;
    col[i * 3 + 2] = (color & 255) / 255;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/** 스타디움: 잔디 줄무늬는 지면색, 여기엔 경기장 선·골대·관중석·조명탑. 중심 = 피치 중심 */
export function stadium(): Landmark {
  const LINE = PAL.white,
    solid: Geo[] = [],
    lit: Geo[] = [],
    {hl, hw, goalHalf: gh, goalDepth: gd} = PITCH,
    Y = 0.1;
  const line = (w: number, d: number, x: number, z: number) => solid.push(box(w, 0.04, d, LINE, x, Y, z));
  // 경계선·중앙선·센터서클(조각)·페널티 박스
  line(2 * hl, 0.5, 0, -hw); line(2 * hl, 0.5, 0, hw); line(0.5, 2 * hw, -hl, 0); line(0.5, 2 * hw, hl, 0); line(0.5, 2 * hw, 0, 0);
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    solid.push(box(1.6, 0.04, 0.5, LINE, Math.cos(a) * 7, Y, Math.sin(a) * 7, -a + Math.PI / 2));
  }
  for (const s of [-1, 1]) {
    line(0.5, 26, s * (hl - 14), 0); line(14, 0.5, s * (hl - 7), -13); line(14, 0.5, s * (hl - 7), 13);
    line(0.5, 12, s * (hl - 5), 0);
    // 골대: 기둥 둘 + 크로스바 + 뒷그물
    const gx = s * hl;
    solid.push(box(0.4, 3.4, 0.4, LINE, gx, 0, -gh), box(0.4, 3.4, 0.4, LINE, gx, 0, gh), box(0.4, 0.4, 2 * gh + 0.4, LINE, gx, 3.2, 0));

    for (const z of [-gh, gh]) solid.push(box(0.12, 3.2, 0.12, PAL.cloud, gx + s * gd, 0, z));
  }
  // 관중석: 4면, 4단 계단식 (남쪽은 출입구를 비운다)
  const [x0, z0, x1, z1] = STADIUM.rect,
    cx = PITCH.cx,
    cz = PITCH.cz,
    seats = [ACCENT.red, PAL.cloud, ACCENT.blue, PAL.cloud];
  for (let r = 0; r < 4; r++) {
    const h = 2.4 * (r + 1),
      c = seats[r];
    const inset = r * 3; // 뒤로 갈수록 높아진다
    // 북쪽
    solid.push(box(x1 - x0 - inset * 0, h, 3, c, 0, 0, z0 + (3 - r) * 3 + 1.5 - cz));
    // 서·동쪽
    solid.push(box(3, h, z1 - z0 - 24, c, x0 + (3 - r) * 3 + 1.5 - cx, 0, 0), box(3, h, z1 - z0 - 24, c, x1 - (3 - r) * 3 - 1.5 - cx, 0, 0));
    // 남쪽: 출입구 양옆
    const half = (x1 - x0) / 2 - STADIUM.gateHalf;
    for (const s of [-1, 1]) solid.push(box(half, h, 3, c, s * (STADIUM.gateHalf + half / 2), 0, z1 - (3 - r) * 3 - 1.5 - cz));
  }
  solid.push(...stadiumDetails());
  // 조명탑 4개 (밤에 켜짐)
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x = sx * (hl + 8), z = sz * (hw + 24);
      solid.push(cyl(0.6, 24, NEUTRAL.steel, x, 0, z, 0, 6), box(5, 1.6, 1.2, NEUTRAL.coal, x, 24, z));
      lit.push(box(4.6, 1.2, 0.5, PAL.yellow, x, 24.2, z - sz * 0.8));
    }
  return {solid: mergePlaced(parts(solid)), lit: mergePlaced(parts(lit))};
}

/** 대관람차: still = 다리·허브, spin = 바퀴(허브 중심 회전). 바퀴는 x-y 평면 */
export function ferris(): Landmark & {spin: Geo} {
  const R = 22,
    hubY = 26,
    still: Geo[] = [],
    spin: Geo[] = [],
    lit: Geo[] = [];
  for (const s of [-1, 1]) for (const z of [-3, 3]) still.push(tilted(30, 1.2, 1.2, NEUTRAL.steel, s * 6.5, hubY / 2, z, s * 1.2));
  still.push(box(9, 1, 9, NEUTRAL.stone, 0, 0, 0), cyl(1.6, 2, NEUTRAL.coal, 0, hubY - 1, 0, 0, 8));
  const N = 24;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2,
      mx = Math.cos(a) * R,
      my = Math.sin(a) * R;
    for (const z of [-2.6, 2.6]) spin.push(tilted((2 * Math.PI * R) / N + 0.6, 0.7, 0.7, PAL.cloud, mx, my, z, a + Math.PI / 2));
    if (k % 2 === 0) {
      for (const z of [-2.6, 2.6]) spin.push(tilted(R, 0.35, 0.35, NEUTRAL.ash, mx / 2, my / 2, z, a));
      spin.push(box(3, 2.4, 3.6, [ACCENT.red, ACCENT.amber, ACCENT.cyan, ACCENT.magenta][(k / 2) % 4], mx - 1.5, my - 2.4, -1.8));
      lit.push(box(0.8, 0.8, 0.8, PAL.yellow, mx, my, 0));
    }
  }
  return {solid: mergePlaced(parts(still)), lit: mergePlaced(parts(lit)), spin: mergePlaced(parts(spin))};
}

/** 수족관: 낮고 넓은 건물 + 파란 유리 돔 + 상어 지느러미 간판 */
export function aquarium(): Landmark {
  const solid = parts([
    box(48, 10, 40, mix(PAL.teal, PAL.cloud, 0.5)),
    box(49, 0.8, 41, NEUTRAL.stone, 0, 10),
    frustum(12, 15, 9, 8, mix(PAL.cyan, PAL.glass, 0.4), 0, 10.8),
    taper(2, 6, 0.1, 0.1, 6, ACCENT.blue, 0, 18.8),
    box(6, 4, 1, ACCENT.blue, -14, 10.8, 18),
    box(4.4, 2, 0.6, PAL.cloud, 14, 8, 20.2),
  ]);
  const lit = parts([box(20, 1.4, 0.4, ACCENT.cyan, 0, 6, 20.3)]);
  return {solid: mergePlaced(solid), lit: mergePlaced(lit)};
}

/** 전망 타워(90u) */
export function tvTower(): Landmark {
  const solid = parts([
    box(12, 2, 12, NEUTRAL.stone),
    taper(8, 8, 3.2, 3.2, 50, NEUTRAL.cloud, 0, 2),
    taper(3.2, 3.2, 1.8, 1.8, 24, NEUTRAL.ash, 0, 52),
    frustum(10, 5, 8, 4, NEUTRAL.coal, 0, 60),
    cyl(8, 3.6, mix(PAL.glass, PAL.slate, 0.4), 0, 64, 0, 0, 10),
    frustum(10, 8, 3, 2.4, NEUTRAL.coal, 0, 67.6),
    cyl(0.4, 22, NEUTRAL.steel, 0, 70, 0, 0, 5),
    box(0.9, 0.9, 0.9, ACCENT.red, 0, 92, 0),
  ]);
  const lit = parts([cyl(8.1, 3, mix(ACCENT.amber, PAL.white, 0.4), 0, 64.2, 0, 0, 10), box(1, 1, 1, ACCENT.red, 0, 92.4, 0)]);
  return {solid: mergePlaced(solid), lit: mergePlaced(lit)};
}

/** 등대(46u): 흰·빨강 띠 */
export function lighthouse(): Landmark {
  const list: Geo[] = [box(11, 1.4, 11, NEUTRAL.stone)];
  for (let i = 0; i < 6; i++) list.push(taper(7 - i * 0.7, 7 - i * 0.7, 6.3 - i * 0.7, 6.3 - i * 0.7, 6, i % 2 ? ACCENT.red : PAL.white, 0, 1.4 + i * 6));
  list.push(box(8, 0.8, 8, NEUTRAL.coal, 0, 37.4), cyl(2.6, 4, mix(PAL.glass, PAL.white, 0.3), 0, 38.2, 0, 0, 8), frustum(8, 3.2, 0.4, 3, ACCENT.red, 0, 42.2));
  const lit = parts([cyl(2.7, 3.4, PAL.yellow, 0, 38.4, 0, 0, 8)]);
  return {solid: mergePlaced(parts(list)), lit: mergePlaced(lit)};
}
