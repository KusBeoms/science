// 시골 섬 농지·마을 배치(순수 데이터, W7 RURAL): 서쪽·북서쪽 계단식 논밭 패치 모자이크(노랑·연두·갈색), 마을 부지, 농로.
// 밭은 지형과 맞물린다: 패치마다 높이(y)가 있어 굽기(core/wild-height.ts)가 그 자리를 평평한 단(계단식)으로 만든다. 렌더는 render/rural-fields.ts.
import {mulberry32} from '../render/lowpoly/rng.js';
import {WILD_POLY} from './outline.js';
import {COUNTRY, DESERT, JAIL, LAKES} from './wild.js';
import {LOT, STREAMS, STREAM_W} from './wild-mountain.js';
import {WEST_PLAZA, roadNear} from './wild-road.js';
import {lakeT} from '../core/lake-shape.js';
import {mountainBase} from '../core/wild-mountain.js';
import {plainsH, segDist} from '../core/wild-base.js';

export type CropKind = 'rice' | 'paddy' | 'pale' | 'soil' | 'meadow' | 'orchard';
export interface Parcel {
  x: number;
  z: number;
  w: number;
  d: number;
  ang: number;
  /** 단 높이(지면이 이 값으로 평평해진다) */
  y: number;
  kind: CropKind;
  c: number;
  s: number;
}
/** 마을·농가 부지(원): 안쪽 0.8r 은 평평하게 고른 땅 */
export interface Site {
  id: string;
  x: number;
  z: number;
  r: number;
  y: number;
}
const POND = LAKES[1];
const rawSites: Omit<Site, 'y'>[] = [
  {id: 'pond-village', x: POND.x, z: POND.z, r: 104},
  {id: 'west-village', x: WEST_PLAZA[0], z: WEST_PLAZA[1], r: 64},
  {id: 'ne-hamlet', x: 92, z: 1052, r: 40},
  {id: 'sw-farmstead', x: -318, z: 1590, r: 50},
  {id: 'pasture-farm', x: -260, z: 1115, r: 58},
];
/** 호수 마을은 호수 가장자리를 따라 서므로 평탄화 원은 쓰지 않는다(호수 바닥 규칙이 우선) */
export const SITES: Site[] = rawSites.map(s => ({...s, y: Math.round(plainsH(s.x, s.z) * 2) / 2}));
export const FLAT_SITES = SITES.filter(s => s.id !== 'pond-village');
export const siteById = (id: string) => SITES.find(s => s.id === id)!;

interface Zone {
  cx: number;
  cz: number;
  w: number;
  d: number;
  ang: number;
}
const ZONES: Zone[] = [
  {cx: -60, cz: 1000, w: 600, d: 340, ang: 0.14}, // 북서 평야(호수 마을 둘레)
  {cx: -400, cz: 1430, w: 300, d: 640, ang: -0.1}, // 서쪽 긴 농지(교도소·개울 사이)
  {cx: -300, cz: 1650, w: 360, d: 220, ang: 0.2}, // 남서 농지
  {cx: 385, cz: 1450, w: 200, d: 180, ang: 0.0}, // 간선 동쪽 작은 밭
  {cx: 225, cz: 1100, w: 140, d: 340, ang: -0.49}, // 간선과 동해안 사이 띠
];
const KINDS: [CropKind, number][] = [['rice', 0.26], ['paddy', 0.3], ['pale', 0.14], ['soil', 0.1], ['meadow', 0.12], ['orchard', 0.08]];

function pickKind(r: number): CropKind {
  let a = 0;
  for (const [k, w] of KINDS) {
    a += w;
    if (r < a) return k;
  }
  return 'paddy';
}
const inRectM = (x: number, z: number, r: readonly number[], m: number) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;

/** 점 하나가 밭이 앉을 수 있는 땅인가 */
function okPoint(x: number, z: number, y: number): boolean {
  if (WILD_POLY.dist(x, z, 20, 60) < 30) return false;
  if (x > DESERT.x0 - 30 && z > DESERT.z0) return false;
  const rd = roadNear(x, z);
  if (rd.d < rd.hw + 5) return false;
  if (LAKES.some(L => lakeT(L, x, z) < 1.62)) return false;
  if (mountainBase(x, z) > 5) return false;
  if (inRectM(x, z, JAIL.flat, 22) || inRectM(x, z, COUNTRY, 10) || inRectM(x, z, [LOT.x - LOT.w / 2, LOT.z - LOT.d / 2, LOT.x + LOT.w / 2, LOT.z + LOT.d / 2], 24)) return false;
  if (SITES.some(s => Math.hypot(x - s.x, z - s.z) < s.r + 4)) return false;
  for (const st of STREAMS) for (let i = 0; i < st.pts.length - 1; i++) if (segDist(x, z, st.pts[i][0], st.pts[i][1], st.pts[i + 1][0], st.pts[i + 1][1]) < STREAM_W + 7) return false;
  return Math.abs(plainsH(x, z) - y) < 1.9;
}

function generate(): Parcel[] {
  const out: Parcel[] = [],
    r = mulberry32(2026);
  const hit = (x: number, z: number, m: number) =>
    out.some(p => {
      const dx = x - p.x, dz = z - p.z;
      return Math.abs(dx * p.c + dz * p.s) < p.w / 2 + m && Math.abs(-dx * p.s + dz * p.c) < p.d / 2 + m;
    });
  // 1차: 큰 패치 격자(행마다 폭이 다른 벽돌 모양), 2차: 남은 빈틈을 작은 패치로 메운다 → 참조의 촘촘한 모자이크
  for (const pass of [0, 1]) {
    const [w0, wr, d0, dr] = pass ? [14, 10, 14, 8] : [24, 22, 20, 14];
    for (const z of ZONES) {
      const c = Math.cos(z.ang), s = Math.sin(z.ang), G = 4;
      let v = -z.d / 2 + (pass ? 7 : 0);
      while (v < z.d / 2) {
        const dd = d0 + r() * dr;
        let u = -z.w / 2 - r() * 20 + (pass ? 9 : 0);
        while (u < z.w / 2) {
          const ww = w0 + r() * wr,
            pu = u + ww / 2,
            pv = v + dd / 2,
            x = z.cx + pu * c - pv * s,
            zz = z.cz + pu * s + pv * c,
            w = ww - G,
            d = dd - G;
          u += ww;
          const y = Math.round(plainsH(x, zz) * 2) / 2;
          // 장애물(도로·호수·산)에 걸리면 같은 자리에서 더 작게 줄여 빈틈을 메운다
          for (const k of [1, 0.78, 0.58]) {
            const pw = w * k, pd = d * k;
            if (pw < 11 || pd < 11) break;
            const pts: [number, number][] = [[0, 0]];
            for (const a of [-1, 1]) for (const b of [-1, 1]) pts.push([a * (pw / 2 + 2.5), b * (pd / 2 + 2.5)]);
            const ok = pts.every(([a, b]) => {
              const px = x + a * c - b * s, pz = zz + a * s + b * c;
              return okPoint(px, pz, y) && !hit(px, pz, pass ? 2 : 1);
            });
            if (ok) {
              out.push({x, z: zz, w: pw, d: pd, ang: z.ang, y, kind: pickKind(r()), c, s});
              break;
            }
          }
        }
        v += dd;
      }
    }
  }
  return out;
}
/** 곡선 도로가 밭 변 중간을 스치는 경우도 확인한다. 중심/모서리만 검사하면 긴 변 사이를 길이 관통할 수 있다.
 * 기존 결정적 후보 순서와 난수 상태는 보존하고, 배치가 끝난 후보의 전체 면을 6u 이하 간격으로 검수한다. */
function footprintClear(p: Parcel): boolean {
  const w = p.w + 5, d = p.d + 5, n = Math.ceil(w / 6), m = Math.ceil(d / 6);
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
    const u = (i / n - 0.5) * w, v = (j / m - 0.5) * d;
    if (!okPoint(p.x + u * p.c - v * p.s, p.z + u * p.s + v * p.c, p.y)) return false;
  }
  return true;
}
export const PARCELS: Parcel[] = generate().filter(footprintClear);

// ---- 공간 해시: 격자 높이 굽기 때 (x,z) 가 어느 밭 단에 속하는가 ----
const CELL = 48;
const hash = new Map<string, Parcel[]>();
for (const p of PARCELS) {
  const R = Math.hypot(p.w, p.d) / 2 + 12;
  for (let i = Math.floor((p.x - R) / CELL); i <= Math.floor((p.x + R) / CELL); i++)
    for (let j = Math.floor((p.z - R) / CELL); j <= Math.floor((p.z + R) / CELL); j++) {
      const k = i + ',' + j;
      (hash.get(k) || hash.set(k, []).get(k)!).push(p);
    }
}
/** 밭 단 바깥 가장자리 폭(완전 평지) · 옅어지는 폭 — 합이 5.5u 라 도로 평지(길 가장자리 +2u)까지 닿지 않는다 */
export const TERRACE_IN = 2,
  TERRACE_FADE = 3.5;
/** (x,z) 가 밭 단 위/근처면 {y: 단 높이, w: 지면을 단 높이로 맞추는 비율 0~1}, 아니면 null */
export function parcelNear(x: number, z: number): {y: number; w: number} | null {
  const list = hash.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL));
  if (!list) return null;
  let bd = 1e9, by = 0;
  for (const p of list) {
    const dx = x - p.x, dz = z - p.z,
      u = dx * p.c + dz * p.s,
      v = -dx * p.s + dz * p.c,
      d = Math.max(Math.abs(u) - p.w / 2, Math.abs(v) - p.d / 2);
    if (d < bd) {
      bd = d;
      by = p.y;
    }
  }
  if (bd > TERRACE_IN + TERRACE_FADE) return null;
  const t = Math.min(1, Math.max(0, (bd - TERRACE_IN) / TERRACE_FADE));
  return {y: by, w: 1 - t * t * (3 - 2 * t)};
}
/** 밭 안쪽 여유 m 이내인가 (숲·건물이 밭을 밟지 않게) */
export function inParcel(x: number, z: number, m = 0): boolean {
  const list = hash.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL));
  if (!list) return false;
  return list.some(p => {
    const dx = x - p.x, dz = z - p.z;
    return Math.abs(dx * p.c + dz * p.s) < p.w / 2 + m && Math.abs(-dx * p.s + dz * p.c) < p.d / 2 + m;
  });
}
/** 마을 부지 높이 맞춤 */
export function siteNear(x: number, z: number): {y: number; w: number} | null {
  for (const s of FLAT_SITES) {
    const d = Math.hypot(x - s.x, z - s.z);
    if (d < s.r) {
      const t = Math.min(1, Math.max(0, (d - s.r * 0.78) / (s.r * 0.22)));
      return {y: s.y, w: 1 - t * t * (3 - 2 * t)};
    }
  }
  return null;
}
