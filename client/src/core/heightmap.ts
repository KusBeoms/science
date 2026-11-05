// 대륙 높이 지도 굽기 (docs/design/WORLD.md 7.2, W6): 부팅 때 1회, 5u 격자 Float32Array 하나.
// 땅 = 도시 외곽선 ∪ 야생지 외곽선 ∪ 임시 다리 ∪ 12개 섹터 섬(사각형). 서로 바다로 떨어져 있고 통로는 없다(이동은 포탈).
// 땅 밖은 가장자리에서 바깥으로 두 겹의 낭떠러지(−12, −40)로 내려가다 끊긴다. 도시 사각형 ±335 안은 평지, 그 바깥 윤곽까지는 산·숲·남쪽 해변.
// 구역은 둘레 능선 + 안쪽의 완만한 기복·언덕. 포탈 패드 둘레는 평지로 눌러 둔다.
import {SECTORS} from '../data/sectors.js';
import {CITY_HALF, CITY_HILL, TERRAIN, type SectorMap} from '../data/world-map.js';
import {CITY_POLY, WILD_POLY, BRIDGE_ENDS} from '../data/outline.js';
import {fbm, mulberry32} from '../render/lowpoly/rng.js';
import {padPos} from './geometry.js';
import {WILD_BRIDGE} from '../data/wild.js';
import {SEABED, approachNear, FLAT_MARGIN, FLAT_FADE} from '../data/bridge.js';
import {wildH} from './wild-height.js';
import {roadNear} from '../data/wild-road.js';

/** 격자: 샘플 간격 · 원점 · 개수 (x −1300~1500, z −1300~2050: 북쪽 섬 줄 · 도시 · 야생지 · 동서 섬 줄을 모두 덮는다) */
export const STEP = 5,
  GX0 = -1300,
  GZ0 = -1300,
  NX = 561,
  NZ = 671;
/** 구역 소속 코드: 0 = 허공, 1..12 = 구역(인덱스+1), CITY, PASS */
export const REG_CITY = 13,
  REG_PASS = 14,
  REG_WILD = 15;
/** 땅 가장자리 낭떠러지 높이 (첫 겹, 둘째 겹) 와 끊김 */
export const CLIFF1 = -12,
  CLIFF2 = -40,
  CLIFF3 = -90;

const COAST = 5, // 땅 가장자리 안쪽으로 이만큼은 살짝 내려앉는다
  COAST_DIP = 1.5,
  SHORE_W = 26, // 야생지 해안: 가장자리 안쪽 이 폭 동안 SHORE_DIP 만큼 가라앉아 바다로 이어진다 (높은 산은 낭떠러지로 남는다)
  SHORE_DIP = 10;

interface Bump {
  x: number;
  z: number;
  r: number;
  h: number;
}
interface Sec {
  cx: number;
  cz: number;
  half: number;
  idx: number;
  m: SectorMap;
  bumps: Bump[];
  pad: {x: number; z: number};
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

let SEC: Sec[] = [],
  HM: Float32Array | null = null,
  RG: Uint8Array | null = null;
/** 마지막 굽기에 걸린 시간 (ms) */
export let bakeMs = 0;

function setup() {
  SEC = SECTORS.map((s, idx) => {
    const m = TERRAIN[s.id],
      rnd = mulberry32(m.bumps.seed),
      half = s.size / 2,
      bumps: Bump[] = [];
    for (let k = 0; k < m.bumps.n; k++) {
      const r = m.bumps.r[0] + rnd() * (m.bumps.r[1] - m.bumps.r[0]),
        lim = half - m.ridge.w - r * 0.6;
      bumps.push({
        x: s.center.x + (rnd() * 2 - 1) * lim,
        z: s.center.z + (rnd() * 2 - 1) * lim,
        r,
        h: m.bumps.h[0] + rnd() * (m.bumps.h[1] - m.bumps.h[0]),
      });
    }
    return {cx: s.center.x, cz: s.center.z, half, idx, m, bumps, pad: padPos(idx)};
  });
}

/** 둘레 능선 단면: 가장자리(ds=0)에서 절반 높이로 시작해 마루(0.42w)에서 1, 안쪽 비탈을 따라 w 에서 0 */
function ridgeProfile(ds: number, w: number): number {
  if (ds >= w) return 0;
  const c = w * 0.42;
  return ds < c ? 0.5 + 0.5 * smooth(0, c, ds) : 1 - smooth(c, w, ds);
}

/** 구역 안쪽의 높이: 기복 + 언덕 + 능선. flat(0..1) 은 포탈 패드 주변을 평지로 누르는 정도 */
function sectorH(s: Sec, x: number, z: number, ds: number): number {
  const {m} = s,
    pd = Math.hypot(x - s.pad.x, z - s.pad.z),
    flat = 1 - smooth(10, 22, pd),
    n = (fbm(x * m.relief.freq, z * m.relief.freq, 4, m.relief.seed) - 0.5) * 2,
    rr = 1 - Math.abs(fbm(x * m.relief.freq * 0.8, z * m.relief.freq * 0.8, 3, m.relief.seed + 7) * 2 - 1);
  let h = m.relief.amp * ((1 - m.relief.ridged) * n + m.relief.ridged * (rr * rr * 1.6 - 0.6));
  for (const b of s.bumps) {
    const t = Math.hypot(x - b.x, z - b.z) / b.r;
    if (t < 1) h += b.h * (1 - t * t) * (1 - t * t);
    else if (b.h < 0 && t < 1.3) h -= b.h * 0.3 * (1 - smooth(1, 1.3, t)); // 분화구 테두리
  }
  h *= smooth(m.ridge.w * 0.9, m.ridge.w * 0.9 + 26, ds) * (1 - flat);
  const mod = 0.9 + 0.35 * fbm(x * 0.04 + 3, z * 0.04 - 5, 3, m.relief.seed + 13);
  return h + m.ridge.h * mod * ridgeProfile(ds, m.ridge.w);
}

/** 도시 남쪽 해변 가중(0..1): 사각형 바로 남쪽 + 양옆으로 서서히 산으로 바뀐다 */
export const beachW = (x: number, z: number) => (z > CITY_HALF ? 1 - smooth(CITY_HALF - 60, CITY_HALF + 170, Math.abs(x)) : 0);

/**
 * 도시 사각형 바깥 ~ 윤곽까지의 띠 높이. d = 윤곽(해안선)까지 안쪽 거리, 사각형 가장자리에서 윤곽까지 가는 비율 q(0..1)로 모양을 잡는다.
 * 북·동·서는 산(마루는 띠 중간, 해안 쪽으로 내려가 바다에 잠긴다), 남쪽은 모래 해변. 다리 어귀(BRIDGE_ENDS.x)는 평지로 이어진다.
 */
const MOUNT = 52;
function beltH(x: number, z: number, d: number): number {
  const dsq = Math.max(Math.abs(x), Math.abs(z)) - CITY_HALF,
    q = dsq / (dsq + Math.max(d, 0.01)),
    bw = beachW(x, z),
    n = 0.75 + 0.5 * fbm(x * 0.045 + 7, z * 0.045 - 3, 4, 91),
    rr = 0.7 + 0.5 * (1 - Math.abs(fbm(x * 0.09, z * 0.09, 3, 17) * 2 - 1));
  let m = MOUNT * n * rr * (q < 0.45 ? smooth(0.04, 0.45, q) : 1 - 0.7 * smooth(0.45, 1, q));
  // 북쪽 사과 시선 축(정북 ±8°·고도 8°↑)을 가리지 않게 낮춘다
  if (z < -CITY_HALF * 0.5 && Math.abs(z) >= Math.abs(x)) m *= 0.38 + 0.62 * smooth(30, 70, Math.abs(x));
  const beach = -8 * smooth(0, 1, q) * (0.85 + 0.15 * smooth(0, 0.3, q));
  let h = m * (1 - bw) + beach * bw;
  h -= 12 * (1 - smooth(0, 34, d)) * (1 - bw); // 산 해안은 마지막 34u 에서 바다로 내려선다
  if (z > CITY_HALF) h *= smooth(14, 60, Math.abs(x - BRIDGE_ENDS.x)); // 다리 어귀는 평지 둑길
  const ap = approachNear(x, z); // W6 BRIDGE: 도시 도로 → 다리 진입로 구간은 평지(0)로 눌러 끊김 없이 잇는다
  if (ap.d < 1e9) h *= smooth(ap.w + FLAT_MARGIN, ap.w + FLAT_MARGIN + FLAT_FADE, ap.d);
  return h;
}

let outReg = 0;
/** (x,z) 의 높이를 계산해 돌려주고 소속 코드는 outReg 에 둔다 */
function evalAt(x: number, z: number): number {
  const cm = Math.max(Math.abs(x), Math.abs(z)),
    head = Math.hypot(x - BRIDGE_ENDS.x, z - BRIDGE_ENDS.wild);
  let d = -1e9,
    reg = 0,
    ds = -1e9,
    si: Sec | null = null;
  const cd = cm <= CITY_HALF ? 200 : CITY_POLY.dist(x, z, 14, 200);
  if (cd > d) {
    d = cd;
    reg = REG_CITY;
  }
  for (const s of SEC) {
    const e = s.half - Math.max(Math.abs(x - s.cx), Math.abs(z - s.cz));
    if (e > ds) {
      ds = e;
      si = s;
    }
  }
  if (ds > d) {
    d = ds;
    reg = si!.idx + 1;
  }
  const dw = WILD_POLY.dist(x, z, 14, 80);
  if (dw > d) {
    d = dw;
    reg = REG_WILD;
  }
  // 해협 바닥(W6 BRIDGE): 두 땅 어디에도 속하지 않은 다리 밑은 평평한 바다 바닥(−12, 낭떠러지 첫 겹과 같은 높이) — 상판 밑은 허공이 아니라 물이다
  const B = WILD_BRIDGE;
  if (d < 0 && z >= B[1] && z <= B[3] && Math.abs(x - (B[0] + B[2]) / 2) < (B[2] - B[0]) / 2) {
    outReg = REG_PASS;
    return SEABED;
  }
  outReg = reg;
  if (d < 0) return d > -7.5 ? CLIFF1 : d > -12.5 ? CLIFF2 : CLIFF3;
  let h = 0;
  if (reg === REG_CITY) {
    const hl = CITY_HILL;
    h = hl.h * (1 - smooth(hl.flat, hl.foot, Math.hypot(x - hl.x, z - hl.z)));
    if (cm > CITY_HALF) h = beltH(x, z, d);
    return h;
  }
  if (reg === REG_WILD) {
    const base = wildH(x, z);
    if (d >= SHORE_W) return base;
    return base - SHORE_DIP * (1 - smooth(0, SHORE_W, d)) * smooth(30, 90, head) * smooth(8, 26, roadNear(x, z).d); // 다리 어귀 곶·길은 가라앉지 않는다
  }
  if (si && reg <= SEC.length) h = sectorH(si, x, z, ds);
  return h - COAST_DIP * (1 - smooth(0, COAST, d));
}

/** 대륙 전체를 굽는다 (이미 구웠으면 그대로). ≤ 120ms 목표, 시간은 bakeMs */
export function bakeContinent(): Float32Array {
  if (HM) return HM;
  const t0 = performance.now();
  setup();
  HM = new Float32Array(NX * NZ);
  RG = new Uint8Array(NX * NZ);
  for (let j = 0; j < NZ; j++)
    for (let i = 0; i < NX; i++) {
      HM[j * NX + i] = evalAt(GX0 + i * STEP, GZ0 + j * STEP);
      RG[j * NX + i] = outReg;
    }
  bakeMs = performance.now() - t0;
  return HM;
}
/** 굽기 결과: 높이와 소속 코드 격자 (행 우선, 인덱스 = j*NX + i) */
export const gridOf = () => ({h: bakeContinent(), reg: RG!});

/** 이중선형 보간 높이 (대륙 밖은 가장자리 값). 땅인지는 호출한 쪽이 판정한다 */
export function heightAt(x: number, z: number): number {
  const h = bakeContinent(),
    u = Math.min(NX - 1.001, Math.max(0, (x - GX0) / STEP)),
    v = Math.min(NZ - 1.001, Math.max(0, (z - GZ0) / STEP)),
    i = Math.floor(u),
    j = Math.floor(v),
    fx = u - i,
    fz = v - j,
    o = j * NX + i;
  return (h[o] * (1 - fx) + h[o + 1] * fx) * (1 - fz) + (h[o + NX] * (1 - fx) + h[o + NX + 1] * fx) * fz;
}
