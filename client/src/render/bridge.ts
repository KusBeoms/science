// 금문교급 현수교 렌더 + 충돌 등록 (W6 BRIDGE, data/bridge.ts). 도시 남안 진입로(harbor-s 끝에서 S자) → 램프 → 탑 2개 현수교 상판 → 램프 → 야생지 접속부.
// city 그룹 밖 월드에 직접 붙는다(밤 전용 lit 메시는 자체 낮밤 토글 bridgeSystem). 상판은 core/deck.ts 데크, 탑·교각·접안부·램프 둑은 core/terrain.ts 충돌체.
// 난간·케이블·행어·가로등은 충돌이 없다(난간 밖으로 걸어 나가면 바다로 떨어진다). 진입로(지상 구간)에는 울타리·난간이 전혀 없다.
import {G} from '../core/runtime.js';
import {addDeck} from '../core/deck.js';
import {addSolid} from '../core/terrain.js';
import {heightAt} from '../core/heightmap.js';
import {glowMat, lowMat} from './lowpoly/merge.js';
import type {GameSystem} from '../core/types.js';
import {Buf} from './overpass-buf.js';
import {
  BRIDGE_DECKS, BX, DECK_Y, HW, ROAD_HW, SLAB, TRUSS, TOWER_Z, Z_DN0, Z_DN1, Z_UP0, Z_UP1, cityApproach, deckY, wildFlare, type RoadSample,
} from '../data/bridge.js';
import {CONCRETE, CONCRETE_DK, ORANGE, ORANGE_DK, PAINT, WARM, Layer, anchorages, beam, cables, tower} from './bridge-parts.js';
import {NEUTRAL} from './lowpoly/palette.js';

/** 상판 가장자리 슬래브 반폭(걷는 폭 HW 바깥 1.4 = 난간 자리 + 트러스 면) */
const HWS = HW + 1.4,
  /** 램프가 육지 위에 놓인 구간(둑으로 채움) 경계: 도시 쪽 z < LAND_N, 야생지 쪽 z > LAND_S */
  LAND_N = 406,
  LAND_S = 738,
  RAIL_H = 1.3,
  BAY = 8;

let nightMeshes: any[] = [],
  airMeshes: any[] = [];

// ---------- 지상 도로(진입로·접속부): 아스팔트 + 보도 + 차선 ----------
function roadStrip(road: Buf, paint: Buf, S: RoadSample[], gy: (x: number, z: number) => number) {
  const off = (p: RoadSample, o: number): [number, number] => [p.x + p.tz * o, p.z - p.tx * o],
    P = (p: RoadSample, o: number, y: number): [number, number, number] => {
      const [x, z] = off(p, o);
      return [x, gy(x, z) + y, z];
    };
  for (let i = 0; i < S.length - 1; i++) {
    const a = S[i],
      b = S[i + 1];
    const band = (o0a: number, o1a: number, o0b: number, o1b: number, y: number, color: number, buf: Buf) => buf.quad(P(a, o0a, y), P(a, o1a, y), P(b, o1b, y), P(b, o0b, y), color);
    for (const sg of [-1, 1]) {
      const [s0, s1] = [a.r * sg, a.w * sg],
        [t0, t1] = [b.r * sg, b.w * sg];
      band(s0, s1, t0, t1, 0.06, PAINT.paving, road); // 보도
      band(sg * (a.r - 0.55), sg * (a.r - 0.25), sg * (b.r - 0.55), sg * (b.r - 0.25), 0.1, PAINT.white, paint); // 차도 가장자리 흰 실선
    }
    band(-a.r, a.r, -b.r, b.r, 0.07, PAINT.asphalt, road);
    for (const sg of [-1, 1]) band(sg * 0.7 - 0.14, sg * 0.7 + 0.14, sg * 0.7 - 0.14, sg * 0.7 + 0.14, 0.1, PAINT.yellow, paint); // 중앙 노랑 이중선
    if (i % 2 === 0 && a.r > 10.5)
      for (const sg of [-1, 1]) band(sg * (a.r / 2) - 0.12, sg * (a.r / 2) + 0.12, sg * (b.r / 2) - 0.12, sg * (b.r / 2) + 0.12, 0.1, PAINT.white, paint); // 차선 점선
  }
}

/** 가로등(보도 안쪽 가장자리): 기둥 + 팔 + 밤에 켜지는 머리. dir = 팔이 향하는 x 방향(±1) */
function lamp(body: Buf, glow: Buf, x: number, y: number, z: number, dir: number, h = 8.4) {
  body.box(x - 0.18, y, z - 0.18, x + 0.18, y + h, z + 0.18, NEUTRAL.steel);
  body.box(Math.min(x, x + dir * 2.8) - 0.15, y + h - 0.3, z - 0.15, Math.max(x, x + dir * 2.8) + 0.15, y + h, z + 0.15, NEUTRAL.steel);
  glow.box(x + dir * 2.8 - 0.6, y + h - 0.5, z - 0.35, x + dir * 2.8 + 0.6, y + h - 0.3, z + 0.35, WARM);
}

// ---------- 상판 ----------
/** 상판 단면 측정 지점(약 12u 간격, 경계 정확히 포함) */
function stations(): number[] {
  const zs: number[] = [],
    seg = (a: number, b: number) => {
      const n = Math.max(1, Math.round((b - a) / 12));
      for (let i = 0; i < n; i++) zs.push(a + ((b - a) * i) / n);
    };
  seg(Z_UP0, Z_UP1);
  seg(Z_UP1, Z_DN0);
  seg(Z_DN0, Z_DN1);
  zs.push(Z_DN1);
  return zs;
}

function deckBody(L: {body: Layer; paint: Layer; glow: Layer}) {
  const zs = stations();
  for (let i = 0; i < zs.length - 1; i++) {
    const za = zs[i],
      zb = zs[i + 1],
      zm = (za + zb) / 2,
      ya = deckY(za),
      yb = deckY(zb),
      b = L.body.at(zm),
      p = L.paint.at(zm),
      Q = (u0: number, u1: number, dy = 0): [number, number, number][] => [[BX + u0, ya + dy, za], [BX + u1, ya + dy, za], [BX + u1, yb + dy, zb], [BX + u0, yb + dy, zb]];
    const quad = (buf: Buf, u0: number, u1: number, color: number, dy = 0) => {
      const q = Q(u0, u1, dy);
      buf.quad(q[0], q[1], q[2], q[3], color);
    };
    // 윗면: 보도(교대 색) · 차도
    quad(b, -HW, -ROAD_HW, i % 2 ? PAINT.paving2 : PAINT.paving);
    quad(b, ROAD_HW, HW, i % 2 ? PAINT.paving2 : PAINT.paving);
    quad(b, -ROAD_HW, ROAD_HW, PAINT.asphalt);
    quad(b, -HWS, -HW, ORANGE_DK); // 가장자리 띠(난간 자리)
    quad(b, HW, HWS, ORANGE_DK);
    // 도색: 중앙 노랑 이중선, 차도 가장자리 흰 실선, 차선 점선
    quad(p, -0.75, -0.45, PAINT.yellow, 0.05);
    quad(p, 0.45, 0.75, PAINT.yellow, 0.05);
    for (const sg of [-1, 1]) {
      quad(p, sg > 0 ? ROAD_HW - 0.55 : -ROAD_HW + 0.25, sg > 0 ? ROAD_HW - 0.25 : -ROAD_HW + 0.55, PAINT.white, 0.05);
      if (i % 2 === 0) for (const lane of [sg * 7.2]) quad(p, lane - 0.14, lane + 0.14, PAINT.white, 0.05);
    }
    // 밑면 + 옆면(슬래브 두께)
    const c: [number, number, number] = [BX, (ya + yb) / 2 - SLAB / 2, zm];
    b.quad([BX - HWS, ya - SLAB, za], [BX + HWS, ya - SLAB, za], [BX + HWS, yb - SLAB, zb], [BX - HWS, yb - SLAB, zb], CONCRETE_DK, c);
    for (const sg of [-1, 1]) b.quad([BX + sg * HWS, ya - SLAB, za], [BX + sg * HWS, ya, za], [BX + sg * HWS, yb, zb], [BX + sg * HWS, yb - SLAB, zb], ORANGE_DK, c);
    // 육지 위 램프: 슬래브 옆을 땅까지 둑(콘크리트)으로 메운다
    const land = zm < LAND_N || zm > LAND_S;
    if (land) {
      const bot = zm > LAND_S ? -12 : -3;
      for (const sg of [-1, 1]) b.quad([BX + sg * HWS, bot, za], [BX + sg * HWS, ya - SLAB, za], [BX + sg * HWS, yb - SLAB, zb], [BX + sg * HWS, bot, zb], CONCRETE, c);
    }
  }
}

/** 램프 아래가 물인 구간과 본 경간의 측면 트러스(위·아래 현재 + 지그재그 대각) + 바닥보 */
function trusses(L: {body: Layer}) {
  const z0 = Math.max(LAND_N, Z_UP0),
    z1 = Math.min(LAND_S, Z_DN1),
    n = Math.floor((z1 - z0) / BAY);
  const yt = (z: number) => deckY(z) - SLAB,
    yb = (z: number) => deckY(z) - SLAB - TRUSS;
  for (let i = 0; i < n; i++) {
    const za = z0 + i * BAY,
      zb = za + BAY,
      zm = za + BAY / 2,
      b = L.body.at(zm);
    for (const sg of [-1, 1]) {
      const x = BX + sg * (HWS - 0.4);
      beam(b, [x, yb(za), za], [x, yt(zm), zm], 0.5, 0.5, ORANGE);
      beam(b, [x, yt(zm), zm], [x, yb(zb), zb], 0.5, 0.5, ORANGE);
      if (i % 2 === 0) {
        beam(b, [x, yt(za), za], [x, yt(za + 2 * BAY), za + 2 * BAY], 0.8, 0.8, ORANGE_DK);
        beam(b, [x, yb(za), za], [x, yb(za + 2 * BAY), za + 2 * BAY], 0.8, 0.8, ORANGE_DK);
      }
    }
    if (i % 2 === 0) b.box(BX - HWS, yb(za) - 0.1, za - 0.4, BX + HWS, yb(za) + 0.6, za + 0.4, CONCRETE_DK); // 바닥보
  }
}

/** 물 위 램프 교각: 상판 밑 기둥 한 쌍 + 가로 받침보. 충돌체는 상판 아래(hi)만 */
function piers(L: {body: Layer}) {
  for (const z of [421, 714]) {
    const top = deckY(z) - SLAB - TRUSS,
      b = L.body.at(z);
    for (const sg of [-1, 1]) {
      b.box(BX + sg * 14 - 1.4, -14, z - 1.7, BX + sg * 14 + 1.4, top, z + 1.7, CONCRETE, CONCRETE_DK);
      addSolid(BX + sg * 14 - 1.4, z - 1.7, BX + sg * 14 + 1.4, z + 1.7, undefined, top);
    }
    b.box(BX - 17.5, top - 0.9, z - 1.5, BX + 17.5, top, z + 1.5, CONCRETE_DK);
  }
}

/** 상판 난간(낮은 가로대 + 기둥, 충돌 없음): 램프가 땅에서 충분히 떠오른 구간에서만. 지상 진입로에는 없다 */
function rails(L: {body: Layer; glow: Layer}) {
  const za = Z_UP0 + 12,
    zb = Z_DN1 - 12;
  for (const sg of [-1, 1]) {
    const x = BX + sg * (HW - 0.2);
    for (let z = za; z < zb; z += 10) {
      const z2 = Math.min(zb, z + 10),
        b = L.body.at(z + 5);
      beam(b, [x, deckY(z) + RAIL_H, z], [x, deckY(z2) + RAIL_H, z2], 0.3, 0.3, ORANGE_DK);
      b.box(x - 0.17, deckY(z), z - 0.17, x + 0.17, deckY(z) + RAIL_H, z + 0.17, ORANGE);
      if (Math.round((z - za) / 10) % 3 === 0) L.glow.at(z).box(x - 0.3, deckY(z) + RAIL_H + 0.1, z - 0.3, x + 0.3, deckY(z) + RAIL_H + 0.5, z + 0.3, WARM);
    }
  }
}

/** 충돌체: 탑·접안부는 전 높이, 램프 둑은 상판 밑(hi)만 */
function embankments() {
  for (const [a, b] of [[Z_UP0, LAND_N], [LAND_S, Z_DN1]]) {
    for (let z = a; z < b; z += 4) {
      const hi = deckY(Math.min(z, b)) - SLAB - 0.2;
      if (hi > 0.2) addSolid(BX - HWS, z, BX + HWS, Math.min(b, z + 4), undefined, hi);
    }
  }
}

export function buildBridge(): any {
  const grp = new THREE.Group();
  grp.name = 'bridge';
  nightMeshes = [];
  airMeshes = [];
  const L = {body: new Layer(), paint: new Layer(), glow: new Layer(), air: new Layer(), road: new Layer()};
  BRIDGE_DECKS.forEach(d => addDeck({...d}));

  deckBody(L);
  trusses(L);
  piers(L);
  rails(L);
  cables(L);
  for (const zc of TOWER_Z) for (const s of tower(L.body.at(zc), L.glow.at(zc), L.air.at(zc), zc)) addSolid(s[0], s[1], s[2], s[3], undefined, s[4]);
  for (const s of anchorages(L)) addSolid(s[0], s[1], s[2], s[3]);
  embankments();

  // 상판 가로등(보도 안쪽, 팔이 차도 쪽): 36u 간격
  for (let z = Z_UP1 + 12; z < Z_DN0 - 6; z += 36)
    for (const sg of [-1, 1]) lamp(L.body.at(z), L.glow.at(z), BX + sg * (ROAD_HW + 1.2), DECK_Y, z, -sg);

  // 도시 쪽 진입로 · 야생지 접속부(지면 도로)
  const city = cityApproach(),
    wild = wildFlare(),
    road = new Buf(),
    paint = new Buf();
  roadStrip(road, paint, city, () => 0);
  roadStrip(road, paint, wild, (x, z) => heightAt(x, z));
  const lampsAt = (S: RoadSample[], step: number, gy: (x: number, z: number) => number) => {
    for (let i = 2; i < S.length - 1; i += step)
      for (const sg of [-1, 1]) {
        const p = S[i],
          x = p.x + p.tz * sg * (p.r + 1.1),
          z = p.z - p.tx * sg * (p.r + 1.1);
        lamp(L.body.at(z), L.glow.at(z), x, gy(x, z), z, -sg * Math.sign(p.tz || 1) * 1);
      }
  };
  lampsAt(city, 7, () => 0);
  lampsAt(wild, 5, (x, z) => heightAt(x, z));

  const bodyMat = lowMat(),
    decal = (f: number) => new THREE.MeshLambertMaterial({vertexColors: true, polygonOffset: true, polygonOffsetFactor: f, polygonOffsetUnits: f});
  grp.add(...L.body.meshes(bodyMat), ...L.paint.meshes(decal(-4)));
  const rm = new THREE.Mesh(road.geo(), decal(-2)),
    pm = new THREE.Mesh(paint.geo(), decal(-4));
  grp.add(rm, pm);
  for (const m of L.glow.meshes(glowMat(), true)) (nightMeshes.push(m), grp.add(m));
  for (const m of L.air.meshes(glowMat(), true)) (airMeshes.push(m), grp.add(m));
  return grp;
}

/** 밤에만 케이블·탑 조명, 항공 장애등은 1초 주기로 깜박인다 */
export const bridgeSystem: GameSystem = {
  id: 'bridge',
  update() {
    const on = G.night > 0;
    for (const m of nightMeshes) if (m.visible !== on) m.visible = on;
    const blink = on && Math.floor(performance.now() / 700) % 2 === 0;
    for (const m of airMeshes) if (m.visible !== blink) m.visible = blink;
  },
};
