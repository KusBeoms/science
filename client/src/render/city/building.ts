// 문법식 건물: 데이터(CityBuilding) → 조명 받는 병합 지오메트리(solid) + 밤에만 켜지는 창문/네온(lit).
// 로컬 좌표: 발자국 중심이 원점, 정면이 +z. 세계 배치(회전·이동)는 index.ts 가 mergePlaced 로 한다.
import type {CityBuilding, SignIcon} from '../../data/city.js';
import {ACCENT, CITY, NEUTRAL, PAL, mix} from '../lowpoly/palette.js';
import {box, gable, panel, wedge, type Geo} from '../lowpoly/prim.js';
import {mergePlaced, type Placed} from '../lowpoly/merge.js';
import {hash2} from '../lowpoly/rng.js';
import {signEmblem} from './props.js';

export interface Built {
  solid: Geo;
  lit: Geo;
}
/** 창문 간격 · 창 크기 */
const SPAN = 4.4,
  WIN_W = 2.2,
  WIN_H = 2.5;
const GLASS = mix(PAL.glass, PAL.slate, 0.55),
  DOOR = mix(NEUTRAL.wood, NEUTRAL.coal, 0.4),
  NEON = [ACCENT.magenta, ACCENT.cyan, ACCENT.violet];

/** 층 높이: 상점은 문(5u)이 들어가고, 대로변 주택·사무소는 지붕까지 14u 이하가 되게 낮춘다 */
export const floorH = (b: CityBuilding) => (b.style === 'shop' ? 5.6 : 5.2);
export const buildingHeight = (b: CityBuilding) => b.floors * floorH(b);

const emblems = new Map<SignIcon, Geo>();
const emblem = (i: SignIcon) => emblems.get(i) || emblems.set(i, signEmblem(i)).get(i)!;

export function makeBuilding(b: CityBuilding): Built {
  const {w, d, floors} = b,
    fh = floorH(b),
    H = buildingHeight(b),
    wall = PAL[b.wall],
    roof = PAL[b.roof],
    trim = mix(wall, PAL.white, 0.35),
    seed = Math.round(b.x * 7 + b.z * 13),
    rnd = (k: number) => hash2(seed, k, 21),
    dw = w >= 14 ? 4.4 : 3.6, // 문 폭
    solid: Geo[] = [box(w, H, d, wall), box(w + 0.3, 0.7, d + 0.3, NEUTRAL.stone)],
    lit: Geo[] = [],
    extra: Placed[] = [];
  for (let f = 1; f < floors; f++) solid.push(box(w + 0.4, 0.35, d + 0.4, trim, 0, f * fh - 0.15));

  // 문과 문틀
  solid.push(
    panel(dw, 4.6, DOOR, 0, 2.5, d / 2 + 0.2),
    box(dw + 0.8, 0.4, 0.5, trim, 0, 4.8, d / 2),
    box(0.4, 4.8, 0.4, trim, -(dw / 2 + 0.2), 0, d / 2),
    box(0.4, 4.8, 0.4, trim, dw / 2 + 0.2, 0, d / 2)
  );

  // 창문: 정면과 양옆면. 켜진 창(lit)은 70%, 대부분 호박색
  let n = 0;
  const win = (len: number, face: 0 | 1 | 2, f: number, skip: number) => {
    const cnt = Math.max(1, Math.floor((len - 1) / SPAN)),
      sp = len / cnt,
      ry = [0, Math.PI / 2, -Math.PI / 2][face];
    for (let i = 0; i < cnt; i++) {
      const s = (i + 0.5) * sp - len / 2;
      if (f === 0 && Math.abs(s) < skip) continue;
      const y = f * fh + 1.4,
        px = [s, w / 2, -w / 2][face],
        pz = [d / 2, s, s][face];
      solid.push(box(WIN_W, WIN_H, 0.4, GLASS, px, y, pz, ry));
      if (rnd(n++) < 0.7) {
        const o = 0.28,
          qx = px + [0, o, -o][face],
          qz = pz + (face ? 0 : o);
        lit.push(panel(WIN_W - 0.3, WIN_H - 0.3, rnd(n) < 0.8 ? ACCENT.amber : ACCENT.yellow, qx, y + WIN_H / 2, qz, ry));
      }
    }
  };
  for (let f = 0; f < floors; f++) {
    win(w, 0, f, dw / 2 + 1.4);
    win(d, 1, f, 0);
    win(d, 2, f, 0);
  }

  if (b.style === 'shop') {
    // 쇼윈도 + 줄무늬 차양 + 지붕 간판 도형
    const zone = dw / 2 + 1.4,
      wd = w / 2 - 0.8 - zone;
    if (wd >= 1.2) {
      for (const sx of [-1, 1]) {
        solid.push(box(wd, 2.8, 0.4, GLASS, sx * (zone + wd / 2), 1.0, d / 2));
        lit.push(panel(wd - 0.3, 2.5, ACCENT.amber, sx * (zone + wd / 2), 2.3, d / 2 + 0.28));
      }
    }
    const aw = dw + 4,
      ns = Math.round(aw / 1.6),
      colors = rnd(50) < 0.5 ? [CITY.awning, PAL.white] : [CITY.tileRed, PAL.cloud];
    for (let i = 0; i < ns; i++) solid.push(wedge(aw / ns, 0.9, 2.2, colors[i % 2], (i - (ns - 1) / 2) * (aw / ns), 5.3, d / 2 + 1.1));
    solid.push(box(w + 0.6, 0.5, d + 0.6, roof, 0, H), box(w + 0.9, 0.5, 0.9, trim, 0, H - 0.1, d / 2), box(2.8, 1.4, 2.2, NEUTRAL.ash, w * 0.25, H + 0.5, -d * 0.2));
    if (b.sign) extra.push({g: emblem(b.sign), y: H + 0.5, z: d / 2 - 1});
  } else if (b.style === 'house') {
    solid.push(
      box(dw + 0.8, 0.25, 1.0, NEUTRAL.stone, 0, 0, d / 2 + 0.5),
      gable(w + 0.8, 3, d + 0.8, roof, 0, H),
      box(1.0, 2.4, 1.0, CITY.brick, w * 0.25, H + 0.6, -d * 0.2)
    );
  } else if (b.style === 'office') {
    solid.push(
      box(w + 0.5, 0.5, d + 0.5, roof, 0, H),
      box(w * 0.45, 1.8, d * 0.4, mix(wall, NEUTRAL.slate, 0.5), w * 0.1, H + 0.5, -d * 0.15),
      box(0.7, H, 0.5, trim, -w / 2, 0, d / 2),
      box(0.7, H, 0.5, trim, w / 2, 0, d / 2)
    );
  } else {
    // 네온: 어두운 벽에 층마다 네온띠 + 모서리 세로띠. 낮엔 어두운 색, 밤엔 lit 이 한 겹 더 밝게 감싼다
    solid.push(box(w + 0.6, 0.5, d + 0.6, roof, 0, H));
    const c = NEON[Math.floor(rnd(60) * 3)];
    const strip = (len: number, h: number, x: number, y: number, z: number, ry: number, col: number) => {
      solid.push(box(len, h, 0.3, mix(col, NEUTRAL.ink, 0.45), x, y, z, ry));
      lit.push(box(len + 0.1, h + 0.1, 0.4, col, x, y - 0.05, z, ry));
    };
    for (let f = 1; f <= floors; f++) strip(w - 1.6, 0.3, 0, f * fh - 0.7, d / 2 + 0.2, 0, f % 2 ? c : NEON[(NEON.indexOf(c) + 1) % 3]);
    strip(0.4, H * 0.8, w / 2 - 0.5, 1.2, d / 2 + 0.2, 0, NEON[(NEON.indexOf(c) + 2) % 3]);
  }

  const parts = (list: Geo[]): Placed[] => list.map(g => ({g}));
  return {solid: mergePlaced([...parts(solid), ...extra]), lit: mergePlaced(parts(lit))};
}
