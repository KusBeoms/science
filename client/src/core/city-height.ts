// 도시 섬 높이 공급원 (W8 P3-b). boot.ts 가 data/city-terrain.json 을 디코딩해 setCityHeight 로 넣으면,
// heightmap.ts 의 도시 영역이 절차 공식(belt-height.ts·CITY_HILL) 대신 이 5u 격자를 읽는다.
// 5u 격자 노드에서는 JSON 값을 그대로 돌려주고(정확히 cm), 노드 사이는 Catmull-Rom 쌍3차로 잇는다 → 2.5u 지상 메시에 계단이 생기지 않는다.
// 땅 마스크(land)를 존중한다: 마스크 밖 칸(바다·낭떠러지)은 보간에 섞지 않는다(해안선에서 -12/-40 이 끌려오지 않게).
// 높이를 주지 않으면(테스트가 모듈을 직접 import, boot 미연결) heightmap.ts 가 기존 절차 계산으로 돌아간다 — 개발/테스트용 내부 경로이며 사용자 폴백이 아니다.
import type {CityTerrain} from '../data/city-terrain-codec.js';

interface Grid {
  ox: number;
  oz: number;
  step: number;
  nx: number;
  nz: number;
  h: Float32Array;
  land: Uint8Array;
}
let G: Grid | null = null,
  consumed = false;

/** 디코딩된 격자를 보관(cm → u). heightmap 이 이미 굽기를 시작했다면 두 공급원이 섞이므로 던진다 */
export function setCityHeight(t: CityTerrain): void {
  if (consumed) throw new Error('city height: 높이맵이 이미 절차 공식으로 구워졌습니다 (setCityHeight 는 굽기 전에 호출)');
  if (t.cm.length !== t.nx * t.nz || t.land.length !== t.nx * t.nz) throw new Error('city height: 격자 크기가 nx*nz 와 다릅니다');
  const h = new Float32Array(t.cm.length);
  for (let i = 0; i < h.length; i++) h[i] = t.cm[i] / 100;
  G = {ox: t.origin.x, oz: t.origin.z, step: t.step, nx: t.nx, nz: t.nz, h, land: t.land};
}
export const hasCityHeight = (): boolean => G !== null;
/** heightmap 이 굽기 직전에 호출: 이후 setCityHeight 를 막는다. JSON 구동이면 true, 아니면 절차 폴백(false) */
export function ensureCityHeight(): boolean {
  consumed = true;
  return G !== null;
}
/** 테스트 전용 초기화 */
export function resetCityHeightForTest(): void {
  G = null;
  consumed = false;
}
/** 격자 범위(월드 bbox). 없으면 null */
export function cityHeightBBox(): {x0: number; x1: number; z0: number; z1: number} | null {
  return G && {x0: G.ox, x1: G.ox + (G.nx - 1) * G.step, z0: G.oz, z1: G.oz + (G.nz - 1) * G.step};
}

const cr = (a: number, b: number, c: number, d: number, t: number) =>
  b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));

/** (x,z) 의 땅 높이(u). 격자 밖이거나 네 모서리가 모두 마스크 밖이면 NaN (호출자가 절차 값으로 처리) */
export function cityHeightAt(x: number, z: number): number {
  const g = G;
  if (!g) return NaN;
  const u = (x - g.ox) / g.step, v = (z - g.oz) / g.step;
  if (!(u >= 0 && v >= 0 && u <= g.nx - 1 && v <= g.nz - 1)) return NaN;
  const i = Math.min(Math.floor(u), g.nx - 2), j = Math.min(Math.floor(v), g.nz - 2),
    fx = u - i, fz = v - j, nx = g.nx, o = j * nx + i;
  if (fx < 1e-9 && fz < 1e-9) return g.land[o] ? g.h[o] : NaN; // 노드: 정확한 JSON 값
  const l00 = g.land[o], l10 = g.land[o + 1], l01 = g.land[o + nx], l11 = g.land[o + nx + 1];
  if (!(l00 && l10 && l01 && l11)) {
    // 해안 칸: 땅 모서리만으로 가중 평균(바다 값이 끌려오지 않는다)
    const w00 = l00 * (1 - fx) * (1 - fz), w10 = l10 * fx * (1 - fz), w01 = l01 * (1 - fx) * fz, w11 = l11 * fx * fz,
      s = w00 + w10 + w01 + w11;
    if (s > 1e-6) return (w00 * g.h[o] + w10 * g.h[o + 1] + w01 * g.h[o + nx] + w11 * g.h[o + nx + 1]) / s;
    return l00 + l10 + l01 + l11 === 0 ? NaN : l00 ? g.h[o] : l10 ? g.h[o + 1] : l01 ? g.h[o + nx] : g.h[o + nx + 1];
  }
  // 안쪽 4칸이 모두 땅: Catmull-Rom. 바깥 줄의 마스크 밖 칸은 가장 가까운 안쪽 칸 값으로 대신한다
  const at = (ii: number, jj: number): number => {
    const a = Math.min(nx - 1, Math.max(0, ii)), b = Math.min(g.nz - 1, Math.max(0, jj)), k = b * nx + a;
    if (g.land[k]) return g.h[k];
    return g.h[Math.min(j + 1, Math.max(j, jj)) * nx + Math.min(i + 1, Math.max(i, ii))];
  };
  const row = (jj: number) => cr(at(i - 1, jj), at(i, jj), at(i + 1, jj), at(i + 2, jj), fx);
  return cr(row(j - 1), row(j), row(j + 1), row(j + 2), fz);
}

/** 땅 마스크: 가장 가까운 격자 칸이 땅이면 true (격자 밖은 false) */
export function cityLandAt(x: number, z: number): boolean {
  const g = G;
  if (!g) return false;
  const i = Math.round((x - g.ox) / g.step), j = Math.round((z - g.oz) / g.step);
  return i >= 0 && j >= 0 && i < g.nx && j < g.nz && g.land[j * g.nx + i] === 1;
}

/** 기울기 크기(rise/run). 중앙 차분 ±1.25u. 높이를 얻지 못하면 NaN */
export function cityHeightSlope(x: number, z: number): number {
  const e = 1.25,
    dx = (cityHeightAt(x + e, z) - cityHeightAt(x - e, z)) / (2 * e),
    dz = (cityHeightAt(x, z + e) - cityHeightAt(x, z - e)) / (2 * e);
  return Math.hypot(dx, dz);
}
