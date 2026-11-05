// 도시 둘레 산악의 정점색 (W7): 아래 숲(진녹) → 중턱 암석(회색) → 설선 위 눈(흰/연청). 남쪽은 모래 해변.
// 경사는 면 법선이 아니라 높이 격자의 기울기(정점마다)로 계산해 5u 격자의 계단 같은 색 얼룩을 줄인다.
import {STEP, beachW, heightAt} from '../core/heightmap.js';
import {SEA_Y} from '../data/world-map.js';
import {CITY_HALF} from '../data/world-map.js';
import {mroadNear, MROAD_W} from '../data/mountain-road.js';
import {PAL, mix} from './lowpoly/palette.js';
import {fbm} from './lowpoly/rng.js';

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const FOREST = mix(PAL.green, PAL.ink, 0.6),
  MEADOW_C = mix(PAL.green, PAL.lime, 0.2),
  ROCK = mix(PAL.stone, PAL.steel, 0.5),
  ROCK_LIGHT = mix(PAL.stone, PAL.ash, 0.4),
  SNOW = mix(PAL.white, PAL.cloud, 0.35),
  ICE = mix(PAL.cloud, PAL.cyan, 0.18),
  SAND = mix(PAL.bone, PAL.amber, 0.25),
  WET_SAND = mix(SAND, PAL.clay, 0.45),
  VERGE_C = mix(PAL.asphalt, PAL.stone, 0.5);

/** (x,z) 에서 격자 기울기로 구한 sin(경사각) — 정점마다 다르므로 색이 부드럽게 이어진다 */
export function gradSlope(x: number, z: number): number {
  const gx = (heightAt(x + STEP, z) - heightAt(x - STEP, z)) / (2 * STEP),
    gz = (heightAt(x, z + STEP) - heightAt(x, z - STEP)) / (2 * STEP),
    g = Math.hypot(gx, gz);
  return g / Math.sqrt(1 + g * g);
}

/** 산·숲·해변 정점색. slope = sin(경사각) */
export function beltColor(cx: number, cz: number, y: number, slope: number): number {
  const bw = beachW(cx, cz);
  if (bw > 0.5 || y < SEA_Y + 1.5) return y < SEA_Y + 1.2 ? WET_SAND : SAND;
  const n = fbm(cx * 0.03 + 11, cz * 0.03 - 5, 3, 27), // 눈·암석 경계의 불규칙
    patch = fbm(cx * 0.07, cz * 0.07 + 13, 2, 41);
  const snowLine = 58 + 30 * (n - 0.5) * 2;
  const rockLine = 26 + 16 * (n - 0.5) * 2;
  // 숲 → 암석: 높을수록, 가파를수록 바위가 드러난다
  let c = mix(FOREST, MEADOW_C, smooth(0.45, 0.7, patch) * 0.55 * (1 - smooth(8, 24, y)));
  const edge = Math.max(Math.abs(cx), Math.abs(cz)) - CITY_HALF;
  const townMeadow = mix(PAL.green, PAL.stone, 0.5);
  const transition = smooth(12, 110 + (n - 0.5) * 50, edge) * smooth(1.5, 14, y);
  c = mix(townMeadow, c, transition);
  const rock = Math.max(smooth(rockLine, rockLine + 22, y) * 0.95, smooth(0.5, 0.82, slope) * 0.9);
  c = mix(c, mix(ROCK, ROCK_LIGHT, smooth(0.35, 0.65, patch)), rock);
  // 눈: 설선 위, 아주 가파른 벽에는 붙지 못한다. 그늘진(가파른) 눈은 연청색
  const snow = smooth(snowLine, snowLine + 12, y) * (1 - smooth(0.78, 0.95, slope) * 0.75);
  c = mix(c, mix(SNOW, ICE, smooth(0.35, 0.7, slope)), snow);
  const r = mroadNear(cx, cz).d;
  if (r < MROAD_W / 2 + 6) c = mix(c, VERGE_C, 1 - smooth(MROAD_W / 2 - 1, MROAD_W / 2 + 6, r));
  return c;
}
