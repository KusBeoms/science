// 금문교 부품 지오메트리 (W6 BRIDGE): 임의 방향 보(beam)·육각 케이블(rod)·테이퍼 상자, 칸(cell) 단위 병합 버퍼, 탑·주케이블·행어·앵커리지.
// 전부 정점색 삼각형(render/overpass-buf.ts Buf) — 면마다 정점이 분리돼 각진 로우폴리 셰이딩이 나온다. 좌표는 월드 좌표(메시는 원점).
import {Buf} from './overpass-buf.js';
import {ACCENT, NEUTRAL, PAL, mix} from './lowpoly/palette.js';
import {ANCHOR_Z, BX, DECK_Y, FOOT_Y, TOWER_TOP, TOWER_X, TOWER_Z, deckY} from '../data/bridge.js';

export type P3 = [number, number, number];

/** 국제 오렌지 계열(밝은/기본/어두운) · 콘크리트 · 케이블 */
export const ORANGE = mix(mix(ACCENT.red, ACCENT.orange, 0.3), NEUTRAL.coal, 0.16),
  ORANGE_LT = mix(ORANGE, ACCENT.orange, 0.45),
  ORANGE_DK = mix(ORANGE, NEUTRAL.coal, 0.42),
  CONCRETE = mix(NEUTRAL.stone, NEUTRAL.ash, 0.4),
  CONCRETE_DK = mix(NEUTRAL.stone, NEUTRAL.coal, 0.4),
  WARM = mix(ACCENT.amber, NEUTRAL.white, 0.55),
  RED_LIGHT = ACCENT.red;

/** 칸(128u) 단위로 나눠 담는 버퍼: 칸마다 메시 하나 → 가까운 칸만 그려진다 (boundingSphere 는 Buf.geo 가 정점으로 정확히 계산) */
export class Layer {
  cells = new Map<number, Buf>();
  at(z: number): Buf {
    const k = Math.floor(z / 128);
    let b = this.cells.get(k);
    if (!b) this.cells.set(k, (b = new Buf()));
    return b;
  }
  meshes(mat: any, hidden = false): any[] {
    const out: any[] = [];
    this.cells.forEach(b => {
      if (b.empty) return;
      const m = new THREE.Mesh(b.geo(), mat);
      m.visible = !hidden;
      out.push(m);
    });
    return out;
  }
}

const sub = (a: P3, b: P3): P3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add3 = (a: P3, b: P3, k = 1): P3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const cross = (a: P3, b: P3): P3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: P3): P3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const mid = (a: P3, b: P3): P3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

/** a→c 를 잇는 직사각 단면(w × h) 보. 단면 축: s = 진행×위, u = s×진행 (거의 수직이면 x 축을 기준으로) */
export function beam(b: Buf, a: P3, c: P3, w: number, h: number, color: number, caps = false) {
  const d = norm(sub(c, a)),
    s = norm(cross(d, Math.abs(d[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0])),
    u = cross(s, d),
    sg: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]],
    corner = (p: P3, i: number): P3 => add3(add3(p, s, (sg[i][0] * w) / 2), u, (sg[i][1] * h) / 2),
    m = mid(a, c);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    b.quad(corner(a, i), corner(a, j), corner(c, j), corner(c, i), color, m);
  }
  if (caps) {
    b.quad(corner(a, 0), corner(a, 1), corner(a, 2), corner(a, 3), color, m);
    b.quad(corner(c, 0), corner(c, 1), corner(c, 2), corner(c, 3), color, m);
  }
}
/** 육각 단면 케이블 (반지름 r, 12 tris) */
export function rod(b: Buf, a: P3, c: P3, r: number, color: number) {
  const d = norm(sub(c, a)),
    s = norm(cross(d, Math.abs(d[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0])),
    u = cross(s, d),
    ring = (p: P3, i: number): P3 => {
      const t = (i / 6) * Math.PI * 2;
      return add3(add3(p, s, Math.cos(t) * r), u, Math.sin(t) * r);
    },
    m = mid(a, c);
  for (let i = 0; i < 6; i++) b.quad(ring(a, i), ring(a, i + 1), ring(c, i + 1), ring(c, i), color, m);
}
/** 위아래 크기가 다른 직사각 기둥 (중심 cx,cz) — 옆 4면 + 윗면 */
export function taperBox(b: Buf, cx: number, cz: number, y0: number, y1: number, w0: number, d0: number, w1: number, d1: number, color: number, bottom = false) {
  const c: P3 = [cx, (y0 + y1) / 2, cz],
    B = (sx: number, sz: number): P3 => [cx + (sx * w0) / 2, y0, cz + (sz * d0) / 2],
    T = (sx: number, sz: number): P3 => [cx + (sx * w1) / 2, y1, cz + (sz * d1) / 2],
    ring: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let i = 0; i < 4; i++) {
    const [ax, az] = ring[i],
      [bx, bz] = ring[(i + 1) % 4];
    b.quad(B(ax, az), B(bx, bz), T(bx, bz), T(ax, az), color, c);
  }
  b.quad(T(-1, -1), T(1, -1), T(1, 1), T(-1, 1), color, c);
  if (bottom) b.quad(B(-1, -1), B(1, -1), B(1, 1), B(-1, 1), color, c);
}

// ---------- 케이블 곡선 ----------
const [T1, T2] = TOWER_Z,
  CABLE_TOP = TOWER_TOP - 3,
  CABLE_MID = DECK_Y + 7,
  ANCHOR_Y = 15.2;
/** z 에서의 주케이블 높이: 탑 사이는 포물선(상판 가운데에서 가장 낮음), 바깥 경간은 앵커리지에서 탑 정상으로 오르는 처진 곡선 */
export function cableY(z: number): number {
  if (z >= T1 && z <= T2) {
    const k = (z - (T1 + T2) / 2) / ((T2 - T1) / 2);
    return CABLE_MID + (CABLE_TOP - CABLE_MID) * k * k;
  }
  const s = z < T1 ? (z - ANCHOR_Z[0]) / (T1 - ANCHOR_Z[0]) : (ANCHOR_Z[1] - z) / (ANCHOR_Z[1] - T2);
  return ANCHOR_Y + (CABLE_TOP - ANCHOR_Y) * Math.pow(Math.max(0, s), 1.5);
}

// ---------- 탑 ----------
/** 탑 다리 단면 층: [y, 폭(x), 깊이(z)] — 아래로 갈수록 굵다 */
const TIERS: [number, number, number][] = [[2, 6.6, 8.4], [40, 5.8, 7.4], [75, 5.0, 6.6], [TOWER_TOP, 4.4, 5.8]];
/** 가로보 아래 높이(상판 위 여유 22 이상) · 높이 */
const STRUTS: [number, number][] = [[28, 6], [52, 6], [76, 6], [96.5, 6.5]];

/** 한 탑: 다리 2개(기초 → 3단 테이퍼 → 안장) + 가로보 4단 + 아치. 반환: 충돌 상자 [x0,z0,x1,z1][] */
export function tower(body: Buf, glow: Buf, air: Buf, zc: number): [number, number, number, number, number?][] {
  const solids: [number, number, number, number, number?][] = [];
  for (const sg of [-1, 1]) {
    const cx = BX + sg * TOWER_X;
    // 물 속 기초(콘크리트 케이슨) + 그 위 받침대
    body.box(cx - 6, FOOT_Y, zc - 6.4, cx + 6, 0.5, zc + 6.4, CONCRETE_DK, CONCRETE);
    taperBox(body, cx, zc, 0.5, TIERS[0][0], 9.6, 11, TIERS[0][1] + 0.6, TIERS[0][2] + 0.6, CONCRETE);
    solids.push([cx - 6, zc - 6.4, cx + 6, zc + 6.4, 2.5], [cx - 3.1, zc - 4, cx + 3.1, zc + 4]); // 기초는 상판 밑(hi), 다리는 전 높이
    for (let i = 0; i < 3; i++) {
      const [y0, w0, d0] = TIERS[i],
        [y1, w1, d1] = TIERS[i + 1];
      taperBox(body, cx, zc, y0, y1, w0, d0, w1, d1, ORANGE);
      // 층 이음 띠
      body.box(cx - w1 / 2 - 0.3, y1 - 0.5, zc - d1 / 2 - 0.3, cx + w1 / 2 + 0.3, y1 + 0.9, zc + d1 / 2 + 0.3, ORANGE_DK);
      // 앞뒤 면의 세로 리브 2개 (면 기울기를 따른다)
      for (const fz of [-1, 1])
        for (const ox of [-1.3, 1.3]) {
          beam(body, [cx + ox, y0, zc + (fz * d0) / 2 + fz * 0.14], [cx + ox, y1, zc + (fz * d1) / 2 + fz * 0.14], 0.55, 0.3, ORANGE_LT);
        }
    }
    // 안장 + 꼭대기 뿔
    body.box(cx - 3, TOWER_TOP - 0.2, zc - 3.6, cx + 3, TOWER_TOP + 1.4, zc + 3.6, ORANGE_DK);
    taperBox(body, cx, zc, TOWER_TOP + 1.4, TOWER_TOP + 4, 3.2, 4.2, 0.8, 0.8, ORANGE);
    // 밤 조명: 다리 앞뒤 면 가운데를 따라 올라가는 투광 띠 + 항공 장애등(빨강)
    for (const fz of [-1, 1]) {
      beam(glow, [cx, 5, zc + (fz * TIERS[0][2]) / 2 + fz * 0.3], [cx, TOWER_TOP - 2, zc + (fz * TIERS[3][2]) / 2 + fz * 0.3], 0.8, 0.3, WARM);
    }
    air.box(cx - 0.7, TOWER_TOP + 4, zc - 0.7, cx + 0.7, TOWER_TOP + 5.4, zc + 0.7, RED_LIGHT);
    air.box(cx - 0.6, TOWER_TOP - 14, zc + 3.2, cx + 0.6, TOWER_TOP - 12.8, zc + 4.4, RED_LIGHT);
    air.box(cx - 0.6, TOWER_TOP - 14, zc - 4.4, cx + 0.6, TOWER_TOP - 12.8, zc - 3.2, RED_LIGHT);
  }
  // 가로보(포털 스트럿) 4단: 다리 사이를 잇는 속 빈 상자 + 짙은 창 띠
  const xi = TOWER_X - 2.2; // 다리 안쪽 면 근처
  STRUTS.forEach(([y, h], k) => {
    body.box(BX - xi - 1.2, y, zc - 2.7, BX + xi + 1.2, y + h, zc + 2.7, ORANGE);
    for (const fz of [-1, 1]) {
      body.box(BX - xi + 1.2, y + 1.2, zc + fz * 2.72 - 0.04, BX + xi - 1.2, y + h - 1.2, zc + fz * 2.72 + 0.04, ORANGE_DK);
      glow.box(BX - xi + 0.6, y - 0.3, zc + fz * 2.8 - 0.1, BX + xi - 0.6, y - 0.05, zc + fz * 2.8 + 0.1, WARM);
    }
    // 중간 두 단 밑에는 아치(반타원)를 달아 금문교 탑의 아치형 가로보 느낌을 낸다
    if (k === 1 || k === 2) {
      const rx = xi - 0.4,
        ry = 9,
        n = 14;
      let prev: P3 | null = null;
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * Math.PI,
          p: P3 = [BX - rx * Math.cos(t), y - ry * Math.sin(t), zc];
        if (prev) beam(body, prev, p, 1.5, 3.4, ORANGE_DK);
        prev = p;
      }
    }
  });
  return solids;
}

// ---------- 주케이블 · 행어 ----------
/** 양쪽 주케이블(탑 다리 위) + 수직 행어 + 밤 구슬 조명 */
export function cables(L: {body: Layer; glow: Layer}) {
  const zs: number[] = [];
  for (let z = ANCHOR_Z[0]; z < ANCHOR_Z[1] - 0.01; z += 6) zs.push(z);
  zs.push(ANCHOR_Z[1]);
  // 탑 위치가 반드시 끊김 점이 되도록 정렬해 끼워 넣는다
  for (const t of TOWER_Z) if (!zs.includes(t)) zs.push(t);
  zs.sort((a, b) => a - b);
  for (const sg of [-1, 1]) {
    const x = BX + sg * TOWER_X;
    for (let i = 0; i < zs.length - 1; i++) {
      const za = zs[i],
        zb = zs[i + 1];
      rod(L.body.at((za + zb) / 2), [x, cableY(za), za], [x, cableY(zb), zb], 0.85, ORANGE);
      if (i % 3 === 0 && Math.abs(zb - T1) > 3 && Math.abs(zb - T2) > 3) L.glow.at(zb).box(x - 0.55, cableY(zb) + 0.7, zb - 0.55, x + 0.55, cableY(zb) + 1.7, zb + 0.55, WARM);
    }
    // 행어: 탑 근처는 건너뛰고 케이블이 상판보다 충분히 높은 곳에만
    for (let z = ANCHOR_Z[0] + 8; z < ANCHOR_Z[1] - 4; z += 9) {
      if (Math.abs(z - T1) < 6 || Math.abs(z - T2) < 6) continue;
      const top = cableY(z),
        base = deckY(z) + 0.9;
      if (top - base < 4) continue;
      beam(L.body.at(z), [x, top, z], [x - sg * 2.2, base, z], 0.32, 0.32, ORANGE_DK);
    }
  }
}

// ---------- 앵커리지(접안부) ----------
/** 케이블 끝을 잡는 콘크리트 블록 한 쌍. 반환: 충돌 상자 */
export function anchorages(L: {body: Layer}): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  for (const az of ANCHOR_Z)
    for (const sg of [-1, 1]) {
      const x0 = sg > 0 ? BX + 24.2 : BX - 33.2,
        x1 = x0 + 9,
        b = L.body.at(az);
      b.box(x0, -3, az - 8, x1, 13.4, az + 8, CONCRETE, CONCRETE_DK);
      taperBox(b, (x0 + x1) / 2, az, 13.4, 15.2, 9.4, 16.4, 4, 6, CONCRETE_DK);
      out.push([x0, az - 8, x1, az + 8]);
    }
  return out;
}

export const PAINT = {
  yellow: mix(PAL.amber, PAL.yellow, 0.4),
  white: mix(NEUTRAL.cloud, NEUTRAL.white, 0.5),
  asphalt: PAL.asphalt,
  paving: mix(PAL.paving, NEUTRAL.cloud, 0.25),
  paving2: mix(PAL.paving, NEUTRAL.ash, 0.5),
};
