// 입체교차로·고가도로 렌더 + 충돌 등록 (data/roads-w4.ts). 데크 3개(램프-상판-램프)마다 상판 슬래브·난간 벽·차선 도색·기둥을 병합 메시로 만들고,
// core/deck.ts 에 데크를, core/terrain.ts 에 지상 기둥(hi)·램프 둑·고가 난간(up) 충돌체를 등록한다. 밤엔 상판 가로등이 켜진다.
import {G} from '../core/runtime.js';
import {addDeck, type Deck} from '../core/deck.js';
import {addSolid} from '../core/terrain.js';
import {CITY_ROADS} from '../data/city.js';
import {VIADUCTS, slipsOf, decksOf, type Slip} from '../data/roads-w4.js';
import {PAL, NEUTRAL, mix} from './lowpoly/palette.js';
import {glowMat, lowMat} from './lowpoly/merge.js';
import type {GameSystem} from '../core/types.js';
import {Buf} from './overpass-buf.js';

const TH = 0.9, // 상판 두께
  WALL_H = 1.2, // 난간 벽 높이
  WALL_T = 0.45,
  ASPHALT = PAL.asphalt,
  CONCRETE = mix(NEUTRAL.stone, NEUTRAL.ash, 0.35),
  UNDER = mix(NEUTRAL.stone, NEUTRAL.coal, 0.45),
  PIER = mix(NEUTRAL.stone, NEUTRAL.fog, 0.15),
  LINE_Y = mix(PAL.amber, ASPHALT, 0.15),
  LINE_W = mix(NEUTRAL.cloud, ASPHALT, 0.1);

/** 데크 한 줄의 로컬 좌표: t(중심선 거리) s(옆) → 세계 (x,z), 높이 */
class Frame {
  ux: number;
  uz: number;
  len: number;
  constructor(public d: Deck) {
    this.len = Math.hypot(d.bx - d.ax, d.bz - d.az);
    this.ux = (d.bx - d.ax) / this.len;
    this.uz = (d.bz - d.az) / this.len;
  }
  h = (t: number) => this.d.h0 + ((this.d.h1 - this.d.h0) * t) / this.len;
  x = (t: number, s: number) => this.d.ax + this.ux * t - this.uz * s;
  z = (t: number, s: number) => this.d.az + this.uz * t + this.ux * s;
  P = (t: number, s: number, y: number): [number, number, number] => [this.x(t, s), this.h(t) + y, this.z(t, s)];
  /** 단면 직사각형 [s0,s1]×[y0,y1](상판 윗면 기준 상대) 를 t0..t1 만큼 늘인 기울어진 직육면체 */
  prism(b: Buf, t0: number, t1: number, s0: number, s1: number, y0: number, y1: number, side: number, top = side, bottom = side) {
    const P = this.P,
      c = P((t0 + t1) / 2, (s0 + s1) / 2, (y0 + y1) / 2);
    b.quad(P(t0, s0, y1), P(t1, s0, y1), P(t1, s1, y1), P(t0, s1, y1), top, c);
    b.quad(P(t0, s0, y0), P(t1, s0, y0), P(t1, s1, y0), P(t0, s1, y0), bottom, c);
    b.quad(P(t0, s0, y0), P(t1, s0, y0), P(t1, s0, y1), P(t0, s0, y1), side, c);
    b.quad(P(t0, s1, y0), P(t1, s1, y0), P(t1, s1, y1), P(t0, s1, y1), side, c);
    b.quad(P(t0, s0, y0), P(t0, s1, y0), P(t0, s1, y1), P(t0, s0, y1), side, c);
    b.quad(P(t1, s0, y0), P(t1, s1, y0), P(t1, s1, y1), P(t1, s0, y1), side, c);
  }
  /** 상판 윗면 위 얇은 도색 띠 */
  paint(b: Buf, t0: number, t1: number, s0: number, s1: number, color: number) {
    b.quad(this.P(t0, s0, 0.04), this.P(t1, s0, 0.04), this.P(t1, s1, 0.04), this.P(t0, s1, 0.04), color);
  }
  /** 땅에서 상판 밑까지 메우는 옆벽 (램프 둑) */
  fill(b: Buf, t0: number, t1: number, s: number, outward: number, color: number) {
    const c: [number, number, number] = [this.x((t0 + t1) / 2, s - outward), 1, this.z((t0 + t1) / 2, s - outward)];
    b.quad(this.P(t0, s, -TH), this.P(t1, s, -TH), [this.x(t1, s), 0, this.z(t1, s)], [this.x(t0, s), 0, this.z(t0, s)], color, c);
  }
}

const inAnyRoad = (x: number, z: number) =>
  CITY_ROADS.some(r => {
    const h = r.w / 2 + r.sidewalk + 1;
    return r.z0 === r.z1
      ? x >= Math.min(r.x0, r.x1) - h && x <= Math.max(r.x0, r.x1) + h && Math.abs(z - r.z0) <= h
      : z >= Math.min(r.z0, r.z1) - h && z <= Math.max(r.z0, r.z1) + h && Math.abs(x - r.x0) <= h;
  });

/** 데크 하나 → 본체/가로등/밤 조명 버퍼에 쌓고 충돌체를 등록 */
function buildDeck(d: Deck, body: Buf, lamps: Buf, glow: Buf) {
  const f = new Frame(d),
    hw = d.hw,
    flat = d.h0 === d.h1;
  // 슬래브(아스팔트 윗면, 콘크리트 옆, 어두운 밑면)
  f.prism(body, 0, f.len, -hw, hw, -TH, 0, CONCRETE, ASPHALT, UNDER);
  // 난간 벽 + 도색: 가장자리 흰 실선, 가운데 노란 점선
  for (const sg of [-1, 1]) {
    f.prism(body, 0, f.len, sg > 0 ? hw - WALL_T : -hw, sg > 0 ? hw : -hw + WALL_T, 0, WALL_H, mix(CONCRETE, NEUTRAL.fog, 0.2), mix(CONCRETE, NEUTRAL.fog, 0.3));
    const e = sg * (hw - WALL_T - 0.9);
    f.paint(body, 0, f.len, e - 0.1, e + 0.1, LINE_W);
  }
  for (let t = 2; t + 3 <= f.len; t += 6) f.paint(body, t, t + 3, -0.12, 0.12, LINE_Y);
  const aabb = (t0: number, t1: number, s0: number, s1: number): [number, number, number, number] => {
    const xs = [f.x(t0, s0), f.x(t0, s1), f.x(t1, s0), f.x(t1, s1)],
      zs = [f.z(t0, s0), f.z(t0, s1), f.z(t1, s0), f.z(t1, s1)];
    return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
  };
  // 충돌: 난간(고가 층 전용) 3u 조각 + 낮은 램프 구간은 지상에서 둑으로 막는다 (발치 진입은 deck 이 맡는다)
  for (let t = 0; t < f.len; t += 3) {
    const t1 = Math.min(f.len, t + 3),
      lo = Math.min(f.h(t), f.h(t1)),
      hm = f.h((t + t1) / 2);
    addSolid(...aabb(t, t1, hw - WALL_T, hw), lo, lo + 3.4, true);
    addSolid(...aabb(t, t1, -hw, -hw + WALL_T), lo, lo + 3.4, true);
    if (hm >= 1.4 && hm <= 3.4) {
      addSolid(...aabb(t, t1, -hw, hw), undefined, hm - 1.2);
      f.fill(body, t, t1, -hw, 1, UNDER);
      f.fill(body, t, t1, hw, -1, UNDER);
    }
  }
  // 기둥: 높이 3 이상 구간 12u 간격, 길 위에는 세우지 않는다 (T자 교각)
  if (Math.max(d.h0, d.h1) >= 3)
    for (let t = 6; t < f.len; t += 12) {
      const h = f.h(t);
      if (h < 3) continue;
      const cx = f.x(t, 0),
        cz = f.z(t, 0);
      if (inAnyRoad(cx, cz)) continue;
      body.box(cx - 0.8, 0, cz - 0.8, cx + 0.8, h - TH, cz + 0.8, PIER);
      f.prism(body, t - 0.9, t + 0.9, -hw + 0.6, hw - 0.6, -TH - 0.6, -TH, PIER); // 교각 머리
      addSolid(cx - 0.9, cz - 0.9, cx + 0.9, cz + 0.9, undefined, h - 2.2);
    }
  // 상판 가로등(평평한 구간): 24u 간격 양쪽, 전구는 밤에만 보이는 glow 에
  if (flat)
    for (let t = 8; t < f.len - 4; t += 24)
      for (const sg of [-1, 1]) {
        const x = f.x(t, sg * (hw - 0.3)),
          z = f.z(t, sg * (hw - 0.3)),
          y = d.h0 + WALL_H,
          ax = x + sg * f.uz * 1.1, // 팔은 상판 안쪽으로
          az = z - sg * f.ux * 1.1;
        lamps.box(x - 0.1, y, z - 0.1, x + 0.1, y + 4.6, z + 0.1, NEUTRAL.steel);
        lamps.box(Math.min(x, ax) - 0.1, y + 4.5, Math.min(z, az) - 0.1, Math.max(x, ax) + 0.1, y + 4.7, Math.max(z, az) + 0.1, NEUTRAL.steel);
        glow.box(ax - 0.35, y + 4.35, az - 0.35, ax + 0.35, y + 4.5, az + 0.35, mix(PAL.amber, NEUTRAL.white, 0.5));
      }
}

/** 지상 연결로 띠 (램프 발치 ↔ 길): 아스팔트 + 가장자리 선 */
function slipMesh(s: Slip, b: Buf) {
  const len = Math.hypot(s.bx - s.ax, s.bz - s.az),
    ux = (s.bx - s.ax) / len,
    uz = (s.bz - s.az) / len,
    Q = (t: number, o: number, y: number): [number, number, number] => [s.ax + ux * t - uz * o, y, s.az + uz * t + ux * o];
  b.quad(Q(0, -s.hw, 0.05), Q(len, -s.hw, 0.05), Q(len, s.hw, 0.05), Q(0, s.hw, 0.05), ASPHALT);
  for (const sg of [-1, 1]) {
    const o = sg * (s.hw - 0.5);
    b.quad(Q(0, o - 0.1, 0.07), Q(len, o - 0.1, 0.07), Q(len, o + 0.1, 0.07), Q(0, o + 0.1, 0.07), LINE_W);
  }
}

let nightMeshes: any[] = [];
export function buildOverpasses(): any {
  const grp = new THREE.Group();
  grp.name = 'overpass';
  nightMeshes = [];
  const decalMat = new THREE.MeshLambertMaterial({vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2});
  for (const v of VIADUCTS) {
    const body = new Buf(),
      lamps = new Buf(),
      glow = new Buf(),
      slips = new Buf();
    for (const d of decksOf(v)) {
      addDeck(d);
      buildDeck(d, body, lamps, glow);
    }
    slipsOf(v).forEach(s => slipMesh(s, slips));
    grp.add(new THREE.Mesh(body.geo(), lowMat()), new THREE.Mesh(lamps.geo(), lowMat()), new THREE.Mesh(slips.geo(), decalMat));
    const bulbs = new THREE.Mesh(glow.geo(), glowMat());
    bulbs.visible = false;
    nightMeshes.push(bulbs);
    grp.add(bulbs);
  }
  return grp;
}
export const overpassSystem: GameSystem = {
  id: 'overpass',
  update() {
    const on = G.night > 0;
    if (nightMeshes.length && nightMeshes[0].visible !== on) nightMeshes.forEach(m => (m.visible = on));
  },
};
