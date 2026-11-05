// 금문교급 현수교 데이터 (W6 BRIDGE): 도시 남안 ↔ 야생지 북안 (BRIDGE_ENDS.x = 74 중심선). 순수 데이터 — 렌더(render/bridge*.ts)·지면(core/heightmap.ts)·충돌이 같이 쓴다.
// 구성(남쪽 +z 방향): 도시 도로 harbor-s 끝(0,334) → S자 진입로(점점 넓어짐) → 오르막 램프(UP) → 평평한 본 상판(탑 2개 사이) → 내리막 램프(DN) → 야생지 접속부(flare) → 호숫가 길.
// 상판은 core/deck.ts 의 데크로 등록되고(걸어서·차로 오른다), 상판 밑은 해협 바닥(−12, 물)이라 난간 밖으로 떨어지면 바다에 빠진다.
import {BRIDGE_ENDS} from './outline.js';
import type {Deck} from '../core/deck.js';

export const BX = BRIDGE_ENDS.x;
/** 상판 윗면 높이(바다 SEA_Y −4.6 위 약 10) · 걸을 수 있는 반폭(차도 2×2차선 + 양쪽 보도) */
export const DECK_Y = 5.5,
  HW = 23.5,
  /** 차도 반폭(중앙 분리 포함) — 이 밖은 보도 */
  ROAD_HW = 14,
  /** 상판 단면 두께(슬래브) · 트러스 깊이 */
  SLAB = 1.2,
  TRUSS = 3.4;
/** 램프·본 상판 z 경계: UP(0→DECK_Y) · 본 · DN(DECK_Y→0) */
export const Z_UP0 = 372,
  Z_UP1 = 432,
  Z_DN0 = 701,
  Z_DN1 = 761,
  /** 야생지 접속부 끝(여기서 호숫가 길 data/wild-road.ts 가 이어받는다) */
  Z_FLARE = 790;
/** 탑 2개: 해협 중앙 ∓115 */
const MID = (BRIDGE_ENDS.city + BRIDGE_ENDS.wild) / 2;
export const TOWER_Z: readonly [number, number] = [MID - 115, MID + 115];
/** 탑 다리 중심 x 오프셋(좌우 한 쌍) · 탑 꼭대기 y · 바다 바닥(기초 밑면) */
export const TOWER_X = 27,
  TOWER_TOP = DECK_Y + 98,
  FOOT_Y = -14;
/** 접안부(앵커리지) 중심 z — 주케이블 끝 */
export const ANCHOR_Z: readonly [number, number] = [378, 780];

/** 상판 데크 3조각 (id 는 br- 로 시작) */
export const BRIDGE_DECKS: readonly Deck[] = [
  {id: 'br-up', ax: BX, az: Z_UP0, bx: BX, bz: Z_UP1, hw: HW, h0: 0, h1: DECK_Y},
  {id: 'br-main', ax: BX, az: Z_UP1, bx: BX, bz: Z_DN0, hw: HW, h0: DECK_Y, h1: DECK_Y},
  {id: 'br-down', ax: BX, az: Z_DN0, bx: BX, bz: Z_DN1, hw: HW, h0: DECK_Y, h1: 0},
];
/** z 에서의 상판 윗면 높이 (램프 밖은 0) */
export function deckY(z: number): number {
  if (z <= Z_UP0 || z >= Z_DN1) return 0;
  if (z < Z_UP1) return (DECK_Y * (z - Z_UP0)) / (Z_UP1 - Z_UP0);
  if (z <= Z_DN0) return DECK_Y;
  return (DECK_Y * (Z_DN1 - z)) / (Z_DN1 - Z_DN0);
}

/** 해협 바닥 높이(상판 밑 바다) — core/heightmap.ts 가 쓴다 */
export const SEABED = -12,
  /** 해협 바닥 띠 반폭 (상판 반폭보다 넉넉히) */
  SEABED_HW = 34;

/** 진입로 중심선 점 하나: 차도 반폭 r · 보도 포함 반폭 w */
export interface RoadSample {
  x: number;
  z: number;
  /** 진행 방향 단위벡터 */
  tx: number;
  tz: number;
  r: number;
  w: number;
}
const smooth01 = (t: number) => t * t * (3 - 2 * t);
/** 도시 도로 안에서부터 차로가 넓어지는 긴 접근 구간. x=0 → BX를 100u에 걸쳐 옮긴다. */
export const CITY_APPROACH_START = 272;
/** 5차 곡선은 양끝의 접선과 곡률이 모두 직선과 맞는다. 안쪽 보도 반경도 폭보다 넉넉하다. */
export function cityApproach(n = 40): RoadSample[] {
  const out: RoadSample[] = [], length = Z_UP0 - CITY_APPROACH_START;
  for (let i = 0; i <= n; i++) {
    const t = i / n, k = t * t * t * (10 - 15 * t + 6 * t * t),
      dx = BX * 30 * t * t * (1 - t) * (1 - t), dz = length,
      len = Math.hypot(dx, dz), width = smooth01(t);
    out.push({x: BX * k, z: CITY_APPROACH_START + length * t, tx: dx / len, tz: dz / len,
      r: 8 + (ROAD_HW - 8) * width, w: 11 + (HW - 11) * width});
  }
  return out;
}
/** 야생지 접속부: 상판 끝(BX, Z_DN1) → 호숫가 길 폭(차도 4.5·보도 포함 5.5)으로 좁아진다 */
export function wildFlare(n = 10): RoadSample[] {
  return Array.from({length: n + 1}, (_, i) => {
    const t = i / n,
      k = smooth01(t);
    return {x: BX, z: Z_DN1 + (Z_FLARE - Z_DN1) * t, tx: 0, tz: 1, r: ROAD_HW + (4.5 - ROAD_HW) * k, w: HW + (5.5 - HW) * k};
  });
}

const APP = cityApproach(64);
/** (x,z) 에서 도시 진입로 중심선까지의 거리와 그 지점 보도 포함 반폭 (지형 평탄화용). 멀면 d = 1e9 */
export function approachNear(x: number, z: number): {d: number; w: number} {
  if (x < -40 || x > BX + 70 || z < CITY_APPROACH_START - 24 || z > Z_UP0 + 30) return {d: 1e9, w: 0};
  let bd = 1e9,
    bw = 0;
  for (let i = 0; i < APP.length - 1; i++) {
    const p = APP[i],
      q = APP[i + 1],
      dx = q.x - p.x,
      dz = q.z - p.z,
      t = Math.max(0, Math.min(1, ((x - p.x) * dx + (z - p.z) * dz) / (dx * dx + dz * dz || 1))),
      d = Math.hypot(x - (p.x + dx * t), z - (p.z + dz * t));
    if (d < bd) {
      bd = d;
      bw = p.w + (q.w - p.w) * t;
    }
  }
  // 램프 발치 너머(상판 구간 앞쪽)도 같은 폭의 직선으로 이어 평탄하게
  if (z > Z_UP0) return {d: Math.abs(x - BX), w: HW};
  return {d: bd, w: bw};
}
/** 도시 쪽 길 높이(평탄화 대상) = 0. 길 둘레 평탄 반폭 = w + 2, 거기서 18u 에 걸쳐 원래 지형으로 돌아간다 */
export const FLAT_MARGIN = 2,
  FLAT_FADE = 18;
