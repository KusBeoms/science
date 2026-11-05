// W7 주거: 가벼운 단독주택 모델(≈70 tris) + 남쪽 원형 아레나 모델. 건물 한 채는 makeBuilding 보다 훨씬 싸서(창문이 판 1장) 주거 블록 100채를 병합해도 부담이 작다.
// 로컬 좌표: 발자국 중심이 원점, 정면이 +z (render/city/index.ts 가 mergePlaced 로 세계에 놓는다). 문 위치는 makeBuilding 과 같다(정면 중앙, doorOf).
import type {CityBuilding} from '../../data/city.js';
import {ACCENT, CITY, NEUTRAL, PAL, mix} from '../lowpoly/palette.js';
import {box, cyl, frustum, gable, panel, wedge, type Geo} from '../lowpoly/prim.js';
import {mergePlaced, type Placed} from '../lowpoly/merge.js';
import {hash2} from '../lowpoly/rng.js';
import type {Built} from './building.js';

const FH = 4.6,
  GLASS = mix(PAL.glass, PAL.slate, 0.5),
  DOOR = [mix(NEUTRAL.wood, NEUTRAL.coal, 0.3), mix(PAL.tileRed, NEUTRAL.coal, 0.35), mix(PAL.tileBlue, NEUTRAL.coal, 0.35)];
const parts = (list: Geo[]): Placed[] => list.map(g => ({g}));

/** 단독주택: 몸체 + 박공 지붕 + 굴뚝 + 문 + 창(판) + 현관 계단 + 담 기둥. 지붕 색은 data 가 정한다 */
export function makeHouse(b: CityBuilding): Built {
  const {w, d, floors} = b,
    H = floors * FH + 1,
    seed = Math.round(b.x * 3 + b.z * 5),
    r = (k: number) => hash2(seed, k, 31),
    wall = PAL[b.wall],
    roof = PAL[b.roof],
    trim = mix(wall, PAL.white, 0.4),
    solid: Geo[] = [box(w, H, d, wall), box(w + 0.4, 0.6, d + 0.4, NEUTRAL.stone), gable(w + 1, 3.2, d + 1.2, roof, 0, H), box(0.9, 2.6, 0.9, CITY.brick, w * 0.22, H + 0.4, -d * 0.18)],
    lit: Geo[] = [];
  // 문 + 처마 + 계단
  solid.push(panel(2.6, 3.8, DOOR[Math.floor(r(1) * 3)], 0, 2, d / 2 + 0.15), box(3.6, 0.35, 1.6, trim, 0, 4.1, d / 2 + 0.7), box(3.4, 0.4, 1.4, NEUTRAL.stone, 0, 0, d / 2 + 0.7));
  // 창: 정면 좌우 + 옆면, 층마다
  const win = (px: number, y: number, pz: number, ry: number) => {
    solid.push(panel(1.9, 1.9, GLASS, px, y, pz, ry), box(2.3, 0.2, 0.35, trim, px, y - 1.0, pz, ry));
    if (r(Math.round(px * 7 + y * 3 + pz)) < 0.7) lit.push(panel(1.6, 1.6, r(px + pz) < 0.8 ? ACCENT.amber : ACCENT.yellow, px + (ry ? Math.sign(ry) * 0.12 : 0), y, pz + (ry ? 0 : 0.12), ry));
  };
  for (let f = 0; f < floors; f++) {
    const y = f * FH + 2.8;
    for (const s of [-1, 1]) if (f > 0 || w > 10) win(s * w * 0.3, y, d / 2 + 0.1, 0);
    if (f > 0) win(0, y, d / 2 + 0.1, 0);
    win(w / 2 + 0.1, y, 0, Math.PI / 2);
    win(-w / 2 - 0.1, y, 0, -Math.PI / 2);
  }
  return {solid: mergePlaced(parts(solid)), lit: mergePlaced(parts(lit))};
}

/** 남쪽 원형 아레나: 12각 드럼 + 계단식 링 지붕 + 투광 기둥 + 정면 캐노피. 밤엔 외벽 띠와 입구가 빛난다 */
export function makeArena(b: CityBuilding): Built {
  const R = Math.min(b.w, b.d) / 2 - 0.6,
    wall = mix(PAL.cloud, PAL.stone, 0.15),
    solid: Geo[] = [
      frustum(12, R, R, 7.5, wall),
      frustum(12, R + 0.8, R + 0.8, 0.8, NEUTRAL.stone, 0, 0, 0, 0),
      frustum(12, R + 0.6, R - 2.5, 3.2, mix(PAL.blue, PAL.steel, 0.4), 0, 7.5),
      frustum(12, R - 2.5, R - 6.5, 2.2, mix(PAL.cloud, PAL.steel, 0.3), 0, 10.7),
      frustum(12, R - 6.5, R - 7.2, 0.6, NEUTRAL.steel, 0, 12.9),
      box(10, 0.5, 5.5, PAL.red, 0, 5.6, R + 2.4), // 정면 캐노피
      box(0.6, 5.6, 0.6, NEUTRAL.steel, -4.6, 0, R + 4.4),
      box(0.6, 5.6, 0.6, NEUTRAL.steel, 4.6, 0, R + 4.4),
      panel(4.4, 4.6, mix(NEUTRAL.coal, PAL.glass, 0.3), 0, 2.4, R * Math.cos(Math.PI / 12) + 0.15),
    ],
    lit: Geo[] = [];
  for (let i = 0; i < 12; i++) {
    const a = ((i + 0.5) / 12) * Math.PI * 2,
      c = Math.cos(a),
      s = Math.sin(a);
    solid.push(cyl(0.35, 8.8, NEUTRAL.steel, s * (R + 0.9), 0, c * (R + 0.9), 0, 5));
    // 투광 기둥 꼭대기는 밤에만 켜진다
    lit.push(box(1.4, 0.5, 1.4, ACCENT.yellow, s * (R + 0.9), 8.8, c * (R + 0.9)));
    // 외벽 창 띠: 낮엔 어두운 판, 밤엔 발광
    const rr = R * Math.cos(Math.PI / 12) + 0.12;
    solid.push(panel(R * 0.46, 1.8, GLASS, s * rr, 4.4, c * rr, a));
    lit.push(panel(R * 0.4, 1.4, i % 3 ? ACCENT.amber : ACCENT.cyan, s * (rr + 0.12), 4.4, c * (rr + 0.12), a));
  }
  return {solid: mergePlaced(parts(solid)), lit: mergePlaced(parts(lit))};
}

/** 가벼운 중·저층 건물(상가·오피스·아파트·호텔·네온): 창이 상자가 아니라 판 1장이라 makeBuilding 의 1/4~1/6 tris. 문 위치·정면은 makeBuilding 과 같다 */
export function makeLite(b: CityBuilding): Built {
  const {w, d, floors} = b,
    fh = b.style === 'shop' ? 5.6 : 5.2,
    H = floors * fh,
    seed = Math.round(b.x * 7 + b.z * 13),
    r = (k: number) => hash2(seed, k, 41),
    wall = PAL[b.wall],
    roof = PAL[b.roof],
    trim = mix(wall, PAL.white, 0.35),
    dw = w >= 14 ? 4.4 : 3.6,
    solid: Geo[] = [box(w, H, d, wall), box(w + 0.3, 0.7, d + 0.3, NEUTRAL.stone), box(w + 0.6, 0.5, d + 0.6, roof, 0, H)],
    lit: Geo[] = [];
  solid.push(panel(dw, 4.4, mix(NEUTRAL.wood, NEUTRAL.coal, 0.4), 0, 2.4, d / 2 + 0.15), box(dw + 0.8, 0.4, 0.6, trim, 0, 4.7, d / 2 + 0.1));
  const win = (len: number, face: 0 | 1 | 2, f: number, skip: number) => {
    const cnt = Math.max(1, Math.floor((len - 1) / 4.4)),
      sp = len / cnt,
      ry = [0, Math.PI / 2, -Math.PI / 2][face];
    for (let i = 0; i < cnt; i++) {
      const sx = (i + 0.5) * sp - len / 2;
      if (f === 0 && Math.abs(sx) < skip) continue;
      const y = f * fh + 2.7,
        px = [sx, w / 2 + 0.1, -w / 2 - 0.1][face],
        pz = [d / 2 + 0.1, sx, sx][face];
      solid.push(panel(2.3, 2.5, GLASS, px, y, pz, ry));
      if (r(f * 31 + i * 7 + face) < 0.7) lit.push(panel(2.0, 2.2, r(f + i) < 0.8 ? ACCENT.amber : ACCENT.yellow, px + (face ? (face === 1 ? 0.1 : -0.1) : 0), y, pz + (face ? 0 : 0.1), ry));
    }
  };
  for (let f = 0; f < floors; f++) {
    win(w, 0, f, dw / 2 + 1.4);
    win(d, 1, f, 0);
    win(d, 2, f, 0);
  }
  if (b.style === 'shop') {
    const aw = dw + 4,
      ns = Math.round(aw / 1.6),
      colors = r(50) < 0.5 ? [CITY.awning, PAL.white] : [CITY.tileRed, PAL.cloud];
    for (let i = 0; i < ns; i++) solid.push(wedge(aw / ns, 0.9, 2.2, colors[i % 2], (i - (ns - 1) / 2) * (aw / ns), 5.3, d / 2 + 1.1));
    solid.push(box(2.8, 1.4, 2.2, NEUTRAL.ash, w * 0.25, H + 0.5, -d * 0.2));
  } else if (b.style === 'office') {
    solid.push(box(w * 0.45, 1.8, d * 0.4, mix(wall, NEUTRAL.slate, 0.5), w * 0.1, H + 0.5, -d * 0.15), box(0.7, H, 0.5, trim, -w / 2, 0, d / 2), box(0.7, H, 0.5, trim, w / 2, 0, d / 2));
  } else {
    const c = [ACCENT.magenta, ACCENT.cyan, ACCENT.violet][Math.floor(r(60) * 3)];
    for (let f = 1; f <= floors; f++) {
      solid.push(box(w - 1.6, 0.3, 0.3, mix(c, NEUTRAL.ink, 0.45), 0, f * fh - 0.7, d / 2 + 0.2));
      lit.push(box(w - 1.5, 0.4, 0.4, c, 0, f * fh - 0.75, d / 2 + 0.2));
    }
  }
  return {solid: mergePlaced(parts(solid)), lit: mergePlaced(parts(lit))};
}
