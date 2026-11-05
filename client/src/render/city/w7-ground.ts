// W7 CITY_DENSITY 지면(1u 칸): 소공원 길·주차장·탱크 구역 포장·동쪽 공원 십자 길·테니스·축구장 줄무늬. 곡선(원형 광장·방사 대로·트랙·연못·아레나)은 칸이 계단져 삼각형이 폭증하므로 w7-flat.ts 의 얇은 메시로 그린다.
// layout.ts 의 surfaceAt 이 baseSurface 결과를 이 함수에 넘겨 덮어쓴다(1u 칸의 색). 판정은 큰 사각형 검사를 먼저 해 450k 칸 호출이 싸게 끝나게 한다.
import {CITY_PARKS} from '../../data/city.js';
import {W7_FEATURES as F, type Rect4} from '../../data/roads-w7.js';
import {PAL, mix} from '../lowpoly/palette.js';
import {POND_E} from './w7-flat.js';

const LAWN_P = mix(PAL.green, PAL.stone, 0.4),
  PATH = mix(PAL.bone, PAL.paving, 0.35),
  PAVE_A = PAL.paving,
  PAVE_B = mix(PAL.paving, PAL.bone, 0.4),
  WHITE = mix(PAL.cloud, PAL.paving, 0.12),
  ASPH = PAL.asphalt,
  COURT_B = mix(PAL.blue, PAL.teal, 0.35),
  CONC = mix(PAL.ash, PAL.paving, 0.5);

const inR = (x: number, z: number, r: Rect4) => x >= r[0] && x < r[2] && z >= r[1] && z < r[3];
const PARKS = CITY_PARKS.filter(r => Math.min(r[2] - r[0], r[3] - r[1]) >= 12);
/** 테니스 코트 6면: 2열 × 3행 (코트 19×9.5) */
export const COURTS: Rect4[] = [0, 1].flatMap(i => [0, 1, 2].map((j): Rect4 => [F.courts[0] + 1.5 + i * 21, F.courts[1] + 2 + j * 15.4, F.courts[0] + 1.5 + i * 21 + 19, F.courts[1] + 2 + j * 15.4 + 10]));
/** 축구장 2면 (40×36, 가로 줄무늬) */
export const FIELDS: Rect4[] = [0, 1].map((k): Rect4 => [F.fields[0] + 2, F.fields[1] + 2 + k * 41, F.fields[0] + 42, F.fields[1] + 2 + k * 41 + 36]);

/** 소공원: 잔디 + 테두리 길 + 십자 길 + 가운데 작은 광장 */
function parkSurface(x: number, z: number, r: Rect4, k: number): number {
  const w = r[2] - r[0],
    h = r[3] - r[1],
    ex = Math.min(x - r[0], r[2] - x),
    ez = Math.min(z - r[1], r[3] - z);
  if (k % 4 === 3 && Math.min(w, h) >= 14 && Math.max(w, h) < 2 * Math.min(w, h)) return ex < 1.2 || ez < 1.2 ? PATH : PAVE_B; // 포장 광장
  if (w > 16 && h > 16 && (Math.abs(x - (r[0] + r[2]) / 2) < 1 || Math.abs(z - (r[1] + r[3]) / 2) < 1)) return PATH; // 십자 길
  return LAWN_P;
}

export function w7Surface(x: number, z: number, base: number): number {
  if ((globalThis as any).__noW7) return base;
  if (x > 205 && x < 335) {
    if (inR(x, z, F.parking)) {
      const px = x - F.parking[0],
        pz = z - F.parking[1];
      const band = pz < 15 ? 0 : pz < 21 ? 1 : pz < 51 ? 2 : pz < 57 ? 3 : 4;
      if (band === 1 || band === 3) return ASPH;
      if (band < 4 && Math.floor(px) % 3 === 2 && px > 1 && px < 53) return WHITE;
      return ASPH;
    }
    if (inR(x, z, F.track)) return LAWN_P; // 트랙·잔디 타원은 w7-flat.ts 메시
    if (inR(x, z, F.tanks)) return CONC;
    if (inR(x, z, F.eastPark)) {
      if (Math.abs(x - POND_E.cx) < 1 || Math.abs(z - POND_E.cz) < 1) return PATH;
      return LAWN_P; // 연못·둘레 길은 w7-flat.ts 메시
    }
    if (inR(x, z, F.courts)) {
      for (const c of COURTS) {
        if (!inR(x, z, [c[0] - 1, c[1] - 1, c[2] + 1, c[3] + 1])) continue;
        const lx = x - c[0],
          lz = z - c[1];
        if (!inR(x, z, c)) return PATH;
        if (lx < 0.4 || lx > 18.6 || lz < 0.4 || lz > 9.6 || Math.abs(lx - 9.5) < 0.3 || (Math.abs(lz - 5) < 0.3 && lx > 4 && lx < 15)) return WHITE;
        return Math.floor(lz / 2.4) % 2 === 0 ? COURT_B : mix(COURT_B, PAL.teal, 0.2);
      }
      return CONC;
    }
    if (inR(x, z, F.fields)) {
      for (const f of FIELDS) {
        if (!inR(x, z, [f[0] - 1, f[1] - 1, f[2] + 1, f[3] + 1])) continue;
        const lx = x - f[0],
          lz = z - f[1];
        if (!inR(x, z, f)) return WHITE;
        if (lx < 0.4 || lx > 39.6 || lz < 0.4 || lz > 35.6 || Math.abs(lx - 20) < 0.3) return WHITE;
        return Math.floor(lx / 5) % 2 ? PAL.lime : mix(PAL.lime, PAL.green, 0.5);
      }
      return PATH;
    }
  }
  if (inR(x, z, F.arena)) return LAWN_P; // 광장 동심원은 w7-flat.ts 메시
  if (PARKS.length) {
    for (let k = 0; k < PARKS.length; k++) if (inR(x, z, PARKS[k])) return parkSurface(x, z, PARKS[k], k);
  }
  return base;
}
