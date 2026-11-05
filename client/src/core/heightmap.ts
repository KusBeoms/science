// 대륙 높이 지도 굽기 (docs/WORLD.md 7.2): 부팅 때 1회, 5u 격자 Float32Array 하나.
// 땅 = 도시 ∪ 구역 사각형 ∪ 통로. 땅 밖은 땅 가장자리에서 바깥으로 두 겹의 낭떠러지(−12, −40)로 내려가다 끊긴다.
// 도시와 통로는 평지, 구역은 둘레 능선(통로 개구만 열림) + 안쪽의 완만한 기복·언덕. 포탈 패드·문 앞은 평지로 눌러 둔다.
import {SECTORS} from '../data/sectors.js';
import {BELT_W, CITY_HALF, CITY_HILL, CITY_OUT, PASSES, PASS_W, TERRAIN, type SectorMap} from '../data/world-map.js';
import {fbm, mulberry32} from '../render/lowpoly/rng.js';
import {padPos} from './geometry.js';

/** 격자: 샘플 간격 · 원점 · 개수 (대륙 x −400~380, z −640~450) */
export const STEP = 5,
  GX0 = -400,
  GZ0 = -640,
  NX = 157,
  NZ = 219;
/** 구역 소속 코드: 0 = 허공, 1..12 = 구역(인덱스+1), CITY, PASS */
export const REG_CITY = 13,
  REG_PASS = 14;
/** 땅 가장자리 낭떠러지 높이 (첫 겹, 둘째 겹) 와 끊김 */
export const CLIFF1 = -12,
  CLIFF2 = -40,
  CLIFF3 = -90;

const COAST = 5, // 땅 가장자리 안쪽으로 이만큼은 살짝 내려앉는다
  COAST_DIP = 1.5,
  EXT = 40, // 통로 중심선을 양 끝으로 이만큼 연장해서 "통로 근처" 를 잰다
  EXT_MASK = 8; // 통로 개구를 구역 안으로 이만큼 땅으로 친다 (경계선에 골이 패지 않게)

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
interface Pass {
  horiz: boolean;
  c: number;
  a0: number;
  a1: number;
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

let SEC: Sec[] = [],
  PS: Pass[] = [],
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
  PS = PASSES.map(r => {
    // 방향 = 폭(PASS_W)이 걸린 축의 반대. 길이 30짜리 짧은 통로는 사각형이 40×32 라 "긴 변" 으로는 가를 수 없다
    const horiz = Math.abs(r[3] - r[1] - PASS_W) < Math.abs(r[2] - r[0] - PASS_W);
    return horiz ? {horiz, c: (r[1] + r[3]) / 2, a0: r[0], a1: r[2]} : {horiz, c: (r[0] + r[2]) / 2, a0: r[1], a1: r[3]};
  });
}

/** 둘레 능선 단면: 가장자리(ds=0)에서 절반 높이로 시작해 마루(0.42w)에서 1, 안쪽 비탈을 따라 w 에서 0 */
function ridgeProfile(ds: number, w: number): number {
  if (ds >= w) return 0;
  const c = w * 0.42;
  return ds < c ? 0.5 + 0.5 * smooth(0, c, ds) : 1 - smooth(c, w, ds);
}

/** 구역 안쪽의 높이: 기복 + 언덕 + 능선. flat(0..1) 은 통로·패드 주변을 평지로 누르는 정도 */
function sectorH(s: Sec, x: number, z: number, ds: number, pw: number): number {
  const {m} = s,
    pd = Math.hypot(x - s.pad.x, z - s.pad.z),
    flat = Math.max(1 - smooth(24, 48, pw), 1 - smooth(10, 22, pd)),
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
  return h + m.ridge.h * mod * ridgeProfile(ds, m.ridge.w) * smooth(PASS_W / 2 + 1, PASS_W / 2 + 11, pw);
}

/** 도시 둘레 띠의 높이: 북·동·서는 산, 남쪽(z>150, |x|<150)은 바다로 가라앉는 해변 */
const MOUNT = 48;
function beltH(x: number, z: number, pw: number): number {
  const m = Math.max(Math.abs(x), Math.abs(z)),
    q = (m - CITY_HALF) / BELT_W; // 0 = 도시 쪽, 1 = 바깥 끝
  if (z > CITY_HALF && Math.abs(x) < CITY_HALF) return -8 * smooth(0, 1, q) * (0.85 + 0.15 * smooth(0, 0.3, q)); // 해변: 완만한 모래 경사
  const n = 0.75 + 0.5 * fbm(x * 0.045 + 7, z * 0.045 - 3, 4, 91),
    rr = 0.7 + 0.5 * (1 - Math.abs(fbm(x * 0.09, z * 0.09, 3, 17) * 2 - 1));
  let h = MOUNT * n * rr * (q < 0.45 ? smooth(0.04, 0.45, q) : 1 - 0.85 * smooth(0.45, 1, q));
  // 북쪽 사과 시선 축(정북 ±8°·고도 8°↑)을 가리지 않게 낮춘다
  if (z < -CITY_HALF * 0.5 && Math.abs(z) >= Math.abs(x)) h *= 0.38 + 0.62 * smooth(30, 70, Math.abs(x));
  return h * smooth(PASS_W / 2 + 1, PASS_W / 2 + 14, pw); // 통로 앞은 평지
}

let outReg = 0;
/** (x,z) 의 높이를 계산해 돌려주고 소속 코드는 outReg 에 둔다 */
function evalAt(x: number, z: number): number {
  let d = CITY_OUT - Math.max(Math.abs(x), Math.abs(z)),
    reg = REG_CITY,
    ds = -1e9,
    si: Sec | null = null;
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
  let pw = 1e9;
  for (const p of PS) {
    const along = p.horiz ? x : z,
      across = Math.abs((p.horiz ? z : x) - p.c),
      over = Math.max(p.a0 - EXT - along, 0, along - (p.a1 + EXT));
    pw = Math.min(pw, Math.hypot(over, across));
    const e = PASS_W / 2 - across;
    if (along >= p.a0 - EXT_MASK && along <= p.a1 + EXT_MASK && e > d) {
      d = e;
      reg = REG_PASS;
    }
  }
  outReg = reg;
  if (d < 0) return d > -7.5 ? CLIFF1 : d > -12.5 ? CLIFF2 : CLIFF3;
  let h = 0;
  if (reg === REG_CITY) {
    const hl = CITY_HILL;
    h = hl.h * (1 - smooth(hl.flat, hl.foot, Math.hypot(x - hl.x, z - hl.z)));
    if (Math.max(Math.abs(x), Math.abs(z)) > CITY_HALF) h = beltH(x, z, pw);
  } else if (si && reg <= SEC.length) h = sectorH(si, x, z, ds, pw);
  return reg === REG_CITY ? h : h - COAST_DIP * (1 - smooth(0, COAST, d)); // 도시 가장자리는 지면 판과 높이를 맞춘다
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
