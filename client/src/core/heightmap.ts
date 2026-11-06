// 대륙 높이: 물 shader용 5u 기본 격자 + 지상 렌더/충돌 공통 2.5u lazy 표본.
// 땅 = 도시 외곽선 ∪ 야생지 외곽선 ∪ 임시 다리 ∪ 12개 섹터 섬(사각형). 서로 바다로 떨어져 있고 통로는 없다(이동은 포탈).
// 땅 밖은 가장자리에서 바깥으로 두 겹의 낭떠러지(−12, −40)로 내려가다 끊긴다. 도시 사각형 ±335 안은 평지, 그 바깥 윤곽까지는 산·숲·남쪽 해변.
// 도시 둘레 산악(능선·계곡·설산·산악 도로)은 core/belt-height.ts (W7).
// 구역은 둘레 능선 + 안쪽의 완만한 기복·언덕. 포탈 패드 둘레는 평지로 눌러 둔다.
import {SECTORS} from '../data/sectors.js';
import {CITY_HALF, CITY_HILL, TERRAIN, type SectorMap} from '../data/world-map.js';
import {beachW, beltH} from './belt-height.js';
import {CITY_POLY, WILD_POLY, BRIDGE_ENDS} from '../data/outline.js';
import {fbm, mulberry32} from '../render/lowpoly/rng.js';
import {padPos} from './geometry.js';
import {WILD_BRIDGE} from '../data/wild.js';
import {SEABED} from '../data/bridge.js';
import {wildH} from './wild-height.js';
import {roadNear} from '../data/wild-road.js';
import {cityHeightAt, ensureCityHeight} from './city-height.js';

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
/** 도시 섬 높이 공급원: 'json' = data/city-terrain.json(city-height.ts), 'procedural' = 옛 공식(boot 미연결 테스트·개발용 내부 경로) */
export let citySource: 'json' | 'procedural' | 'unbaked' = 'unbaked';
let cityJson = false;

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

export {beachW, beltH};

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
    if (cityJson) {
      const v = cityHeightAt(x, z); // 5u 격자 노드는 JSON 값 그대로, 사이는 쌍3차. 마스크 밖이면 NaN → 아래 절차 값
      if (v === v) return v;
    }
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
  cityJson = ensureCityHeight(); // 이 순간부터 setCityHeight 불가 — 굽기 도중 공급원이 바뀌지 않게
  citySource = cityJson ? 'json' : 'procedural';
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
/** 테스트 전용: 굽기·2.5u 표본 캐시를 비운다 (city-height 의 reset 과 함께 쓴다) */
export function resetHeightmapForTest(): void {
  HM = null;
  RG = null;
  detail = null;
  cityJson = false;
  citySource = 'unbaked';
}
/** 굽기 결과: 높이와 소속 코드 격자 (행 우선, 인덱스 = j*NX + i) */
export const gridOf = () => ({h: bakeContinent(), reg: RG!});

/** 물 shader용 5u 격자는 유지하고 지상 메시/충돌은 같은 native 2.5u 표본을 공유한다.
 * 절반 격자의 새 위치만 원래 지형 공식을 평가한다. 미방문 영역은 계산하지 않는다. */
export const DETAIL_STEP = STEP / 2;
const DX = (NX - 1) * 2 + 1, DZ = (NZ - 1) * 2 + 1;
let detail: Float32Array | null = null;
function detailAt(i: number, j: number): number {
  i = Math.max(0, Math.min(DX - 1, i));
  j = Math.max(0, Math.min(DZ - 1, j));
  const h = bakeContinent();
  if (!(i & 1) && !(j & 1)) return h[(j / 2) * NX + i / 2];
  if (!detail) detail = new Float32Array(DX * DZ).fill(NaN);
  const o = j * DX + i;
  if (Number.isNaN(detail[o])) detail[o] = evalAt(GX0 + i * DETAIL_STEP, GZ0 + j * DETAIL_STEP);
  return detail[o];
}
/** native 2.5u 메시의 같은 대각선으로 삼각 보간한다. 렌더/보행/차량 표면 일치. */
export function heightAt(x: number, z: number): number {
  const u = Math.min(DX - 1.000001, Math.max(0, (x - GX0) / DETAIL_STEP)),
    v = Math.min(DZ - 1.000001, Math.max(0, (z - GZ0) / DETAIL_STEP)),
    i = Math.floor(u), j = Math.floor(v), fx = u - i, fz = v - j;
  if (fx < 1e-7 && fz < 1e-7) return detailAt(i, j);
  const b = detailAt(i + 1, j), c = detailAt(i, j + 1);
  if (fx + fz <= 1) {
    const a = detailAt(i, j);
    return a + fx * (b - a) + fz * (c - a);
  }
  const d = detailAt(i + 1, j + 1);
  return d + (1 - fx) * (c - d) + (1 - fz) * (b - d);
}
/** LOD/청크와 무관한 월드 좌표 법선. 인접 메시의 공통 정점이 같은 조명을 받는다. */
export function terrainNormal(x: number, z: number): [number, number, number] {
  const dx = (heightAt(x + DETAIL_STEP, z) - heightAt(x - DETAIL_STEP, z)) / STEP,
    dz = (heightAt(x, z + DETAIL_STEP) - heightAt(x, z - DETAIL_STEP)) / STEP,
    len = Math.hypot(dx, 1, dz);
  return [-dx / len, 1 / len, -dz / len];
}
