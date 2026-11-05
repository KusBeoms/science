// W5 FUN: 구역별 바닥색. layout.ts 의 기본 지면색(base)을 받아 ① 놀이 구획(공원·테마파크·해변·항구·문화 광장·레저·놀이터)은 직접 칠하고
// ② 그 밖의 신도심(원도심 바깥)은 구역 분위기에 맞춰 보도·잔디 색만 살짝 물들인다. 도로·스타디움·원도심은 건드리지 않는다.
import {districtAt} from '../../data/city-w3.js';
import {BIKE, BUMPER, CAROUSEL, FERRIS, PARCELS, POND, inR, type Rect} from '../../data/city-w5.js';
import {PAL, mix} from '../lowpoly/palette.js';
import {hash2} from '../lowpoly/rng.js';

const LAWN_A = mix(PAL.green, PAL.stone, 0.5),
  LAWN_B = mix(PAL.green, PAL.stone, 0.38),
  PAVE_A: number = PAL.paving,
  PAVE_B = mix(PAL.paving, PAL.bone, 0.4);
const at = (x: number, z: number, r: Rect) => inR(x, z, r);
const chk = (x: number, z: number, s: number) => (Math.floor(x / s) + Math.floor(z / s)) & 1;

function park(x: number, z: number, base: number): number {
  const d = Math.hypot(x - POND.x, z - POND.z);
  if (d < POND.r) return d < 3.6 ? PAL.stone : d > POND.r - 1.5 ? mix(PAL.cyan, PAL.white, 0.3) : mix(PAL.cyan, PAL.blue, 0.22 + 0.1 * chk(x, z, 4));
  if (d < POND.r + 2) return PAL.bone;
  if (d >= BIKE.r0 && d < BIKE.r1) return Math.abs(d - BIKE.rm) < 0.3 && Math.floor((x + z) / 2) % 2 ? PAL.cloud : mix(PAL.brick, PAL.orange, 0.3);
  if ((Math.abs(x - POND.x) < 2.2 || Math.abs(z - POND.z) < 2.2) && d > BIKE.r1 && d < 52) return PAVE_B;
  if (at(x, z, [-245, -253, -221, -233])) return chk(x, z, 3) ? PAVE_A : PAVE_B; // 체스 광장
  if (hash2(Math.floor(x / 3), Math.floor(z / 3), 41) < 0.06 && base !== PAL.asphalt) return [PAL.pink, PAL.yellow, PAL.white, PAL.magenta][Math.floor(hash2(Math.floor(x / 3), Math.floor(z / 3), 42) * 4)];
  return base;
}
function theme(x: number, z: number, base: number): number {
  if (Math.hypot(x - CAROUSEL.x, z - CAROUSEL.z) < 11) return mix(PAL.amber, PAL.bone, 0.5);
  if (Math.hypot(x - FERRIS.x, z - FERRIS.z) < 9) return mix(PAL.amber, PAL.bone, 0.4);
  if (at(x, z, [BUMPER[0] - 1, BUMPER[1] - 1, BUMPER[2] + 1, BUMPER[3] + 1])) return chk(x, z, 3) ? PAL.coal : PAL.slate;
  if (at(x, z, [-292, -84, -272, -60])) return Math.floor(x / 2) & 1 ? PAL.yellow : PAL.coal; // 코스터 승강장
  if (at(x, z, [-326, 8, -310, 66])) return chk(x, z, 4) ? mix(PAL.cyan, PAL.white, 0.5) : mix(PAL.pink, PAL.white, 0.5); // 게임 골목
  if (x > -232 && x < -219 && z > -104 && z < 76) return Math.floor(z / 3) & 1 ? PAL.pink : PAL.cloud; // 입구 대로
  return base;
}
function beach(x: number, z: number): number {
  if (z < 308) return mix(PAL.wood, PAL.bone, 0.35 + 0.1 * (Math.floor(x / 1.5) & 1)); // 널빤지 산책로
  if (at(x, z, [-120, 314.5, -100, 325.5])) {
    const edge = x < -119 || x > -101 || z < 315.5 || z > 324.5;
    return edge ? PAL.white : mix(PAL.bone, PAL.amber, 0.12);
  }
  const wet = z > 331;
  const c = hash2(Math.floor(x / 3), Math.floor(z / 3), 51) < 0.5 ? mix(PAL.bone, PAL.amber, 0.38) : mix(PAL.bone, PAL.amber, 0.3);
  return wet ? mix(c, PAL.clay, 0.28) : c;
}
function port(x: number, z: number): number {
  if (z > 331 && z < 333) return Math.floor(x / 3) & 1 ? PAL.yellow : PAL.coal;
  if (z > 318.5 && z < 319.5 && Math.floor(x / 4) & 1) return PAL.yellow; // 통로 점선
  if (at(x, z, [90, 328, 106, 335])) return mix(PAL.wood, PAL.bone, 0.3); // 승선장 데크
  return z > 328 ? mix(PAL.stone, PAL.slate, 0.3) : chk(x, z, 12) ? mix(PAL.ash, PAL.stone, 0.5) : mix(PAL.ash, PAL.stone, 0.62);
}
function culture(x: number, z: number): number {
  if (x >= 234.2 && x < 241.8) return mix(PAL.bone, PAL.amber, 0.25); // 천막 사이 통로
  if (x >= 256) return mix(PAL.asphalt, PAL.paving, 0.35);
  return (Math.floor(x / 2) + Math.floor(z / 2)) & 1 ? mix(PAL.brick, PAL.bone, 0.45) : mix(PAL.brick, PAL.bone, 0.62);
}
function leisure(x: number, z: number, base: number): number {
  if (at(x, z, [214, 214, 244, 232])) {
    const line = x < 214.6 || x >= 243.4 || z < 214.6 || z >= 231.4 || Math.abs(x - 229) < 0.35;
    if (line) return PAL.white;
    if (x < 220 || x > 238) return mix(PAL.blue, PAL.cyan, 0.2); // 페인트존
    return mix(PAL.orange, PAL.brick, 0.28);
  }
  if (at(x, z, [248, 214, 264, 232])) return at(x, z, [249, 215, 263, 231]) ? ((Math.floor(z / 3.4) & 1) ? mix(PAL.cyan, PAL.blue, 0.2) : mix(PAL.cyan, PAL.blue, 0.4)) : PAL.cloud;
  if (at(x, z, [214, 238, 244, 262])) return hash2(Math.floor(x / 2), Math.floor(z / 2), 61) < 0.12 ? [PAL.magenta, PAL.cyan, PAL.yellow][Math.floor(x) % 3] : mix(PAL.ash, PAL.cloud, 0.4);
  if (Math.hypot(x - 256, z - 257) < 8) return Math.hypot(x - 261, z - 257) < 0.9 ? PAL.ink : mix(PAL.lime, PAL.green, 0.3 + 0.2 * chk(x, z, 2));
  if (at(x, z, [250, 236, 266, 246])) return chk(x, z, 2) ? PAL.red : PAL.orange; // 클라이밍 매트
  return base === PAVE_A || base === PAVE_B ? mix(base, PAL.teal, 0.3) : base;
}
function resi(x: number, z: number, base: number): number {
  if (at(x, z, [-264, 288, -234, 312])) return chk(x, z, 3) ? mix(PAL.red, PAL.orange, 0.4) : mix(PAL.blue, PAL.cyan, 0.3);
  if (at(x, z, [-262, 315, -224, 333])) return x >= -246 && x < -240 ? PAVE_B : Math.floor(z / 1.2) & 1 ? mix(PAL.clay, PAL.ink, 0.3) : mix(PAL.clay, PAL.ink, 0.45);
  return base === LAWN_A || base === LAWN_B ? mix(base, PAL.lime, 0.4) : base;
}

/** 구역별 물들이기: 원도심 바깥 신도심의 보도·잔디 색 */
function tint(x: number, z: number, base: number): number {
  const paving = base === PAVE_A || base === PAVE_B, lawn = base === LAWN_A || base === LAWN_B;
  if (!paving && !lawn) return base;
  switch (districtAt(x, z)) {
    case 'north': return paving ? mix(base, PAL.steel, 0.4) : mix(base, PAL.slate, 0.3);
    case 'culture': return paving ? mix(base, PAL.brick, 0.32) : mix(base, PAL.green, 0.1);
    case 'beach': return paving ? mix(base, PAL.amber, 0.28) : mix(base, PAL.amber, 0.4);
    case 'amuse': return paving ? mix(base, PAL.magenta, 0.2) : mix(base, PAL.teal, 0.3);
    case 'resi3': return paving ? mix(base, PAL.bone, 0.3) : mix(base, PAL.lime, 0.42);
    case 'leisure': return paving ? mix(base, PAL.cyan, 0.25) : mix(base, PAL.lime, 0.3);
    default: return base;
  }
}

/** 칸 중심 (x,z) 의 최종 지면색 */
export function funSurface(x: number, z: number, base: number): number {
  const P = PARCELS;
  const m = Math.max(Math.abs(x), Math.abs(z));
  if (m >= 333 && m < 334) return base; // 거래의 선 인레이는 그대로
  if (x < -208 && z < -208) return inR(x, z, P.park) ? park(x, z, base) : base;
  if (x < -208) {
    if (inR(x, z, P.theme)) return theme(x, z, base);
    if (z > 284 && inR(x, z, P.resi)) return resi(x, z, base);
  } else if (x > 206) {
    if (z > 204 && inR(x, z, P.leisure)) return leisure(x, z, base);
    if (z > 100 && z < 190 && inR(x, z, P.culture)) return culture(x, z);
  }
  if (z > 300) {
    if (inR(x, z, [P.beachW[0], 304, P.beachW[2], 335])) return beach(x, z);
    if (inR(x, z, [P.port[0], P.port[1], P.port[2], 335])) return port(x, z);
  }
  if (Math.abs(x) < 152 && Math.abs(z) < 152) return base;
  if (x > 200 && z < -200) return base; // 스타디움(총괄 소유)은 그대로
  return tint(x, z, base);
}
