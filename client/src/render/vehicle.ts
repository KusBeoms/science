// 자동차 모델: 로블록스식 상자 조립. 앞 = 로컬 +z, 바닥 y=0. 차체 색·튜닝(스포일러·휠·언더글로)을 반영해 solid/lit 2메시 그룹을 만든다.
import {carDetails} from './vehicle-art.js';
import {PAL} from './lowpoly/palette.js';
import {box} from './lowpoly/prim.js';
import {glowMat, lowMat, mergePlaced, type Placed} from './lowpoly/merge.js';
import {carOf} from '../data/cars.js';

export interface CarLook {
  t: string;
  c: number;
  eng?: number;
  tire?: number;
  neon?: number;
}
const GLASS = PAL.glass,
  INK = PAL.ink;

export function buildCar(look: CarLook): any {
  const t = carOf(look.t),
    {len: L, wid: W, hgt: H} = t,
    col = look.c,
    solid: Placed[] = [],
    lit: Placed[] = [],
    S = (w: number, h: number, d: number, c: number, x: number, y: number, z: number) => solid.push({g: box(w, h, d, c, 0, 0, 0), x, y, z}),
    G = (w: number, h: number, d: number, c: number, x: number, y: number, z: number) => lit.push({g: box(w, h, d, c, 0, 0, 0), x, y, z});
  const r = Math.max(0.45, H * 0.2),
    shape = t.id,
    low = shape === 'sport' || shape === 'super' || shape === 'rocket' || shape === 'kart';
  const ch = low ? H * 0.34 : H * 0.36; // 차체 높이
  // 바퀴 4개 (휠 튜닝 시 가운데 색 휠)
  const wz = L * 0.31;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      S(0.55, r * 2, r * 2, INK, sx * (W / 2 - 0.15), 0, sz * wz);
      if (look.tire) S(0.6, r * 1.1, r * 1.1, PAL.amber, sx * (W / 2 - 0.12), r * 0.45, sz * wz);
    }
  const y0 = r * 0.8;
  const lights = (zf: number, zr: number, y: number, w = W * 0.7) => {
    G(w * 0.28, 0.3, 0.2, PAL.yellow, -w * 0.32, y, zf);
    G(w * 0.28, 0.3, 0.2, PAL.yellow, w * 0.32, y, zf);
    G(w * 0.28, 0.3, 0.2, PAL.red, -w * 0.32, y, zr);
    G(w * 0.28, 0.3, 0.2, PAL.red, w * 0.32, y, zr);
  };
  const cabin = (cl: number, chh: number, cz: number, cw = 0.86, c = col) => {
    S(W * cw, chh, L * cl, GLASS, 0, y0 + ch, cz * L);
    S(W * cw + 0.05, 0.18, L * cl + 0.05, c, 0, y0 + ch + chh, cz * L); // 지붕
  };
  switch (shape) {
    case 'kart':
      S(W * 0.8, ch, L, col, 0, y0, 0);
      S(W * 0.5, 0.9, 0.5, INK, 0, y0 + ch, -0.2); // 시트
      S(0.9, 0.2, 0.2, INK, 0, y0 + ch + 0.7, 0.5); // 핸들
      S(W * 0.7, 0.3, 0.7, PAL.white, 0, y0 + ch, L / 2 - 0.4); // 앞 범퍼
      lights(L / 2, -L / 2, y0 + 0.5, W * 0.8);
      break;
    case 'cart':
      S(W * 0.9, ch, L, col, 0, y0, 0);
      S(W * 0.8, 0.4, 1.2, PAL.bone, 0, y0 + ch, -0.6); // 의자
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) S(0.18, H - y0 - ch - 0.2, 0.18, PAL.ash, sx * (W / 2 - 0.2), y0 + ch, sz * L * 0.34);
      S(W, 0.2, L * 0.85, PAL.cloud, 0, H - 0.2, -0.1);
      lights(L / 2, -L / 2, y0 + 0.5);
      break;
    case 'buggy':
      S(W * 0.85, ch, L * 0.9, col, 0, y0, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) S(0.16, H - y0 - ch, 0.16, INK, sx * (W / 2 - 0.35), y0 + ch, sz * L * 0.22);
      S(W * 0.8, 0.16, L * 0.5, INK, 0, H - 0.16, 0);
      S(W * 0.6, 0.7, 0.5, INK, 0, y0 + ch, -L * 0.2);
      lights(L / 2 - 0.05, -L / 2 + 0.05, y0 + 0.6);
      break;
    case 'bus':
      S(W, H - y0, L, col, 0, y0, 0);
      S(W + 0.05, 0.9, L - 0.8, GLASS, 0, y0 + H * 0.4, 0);
      S(W + 0.1, 0.12, L, PAL.white, 0, y0 + H * 0.3, 0);
      lights(L / 2, -L / 2, y0 + 0.4);
      break;
    case 'van':
      S(W, H * 0.55, L, col, 0, y0, 0);
      S(W * 0.94, H * 0.4, L * 0.55, GLASS, 0, y0 + H * 0.5, L * 0.12);
      S(W, 0.2, L * 0.55, col, 0, y0 + H * 0.9, L * 0.12);
      S(W * 0.97, H * 0.4, L * 0.42, col, 0, y0 + H * 0.5, -L * 0.28);
      lights(L / 2, -L / 2, y0 + 0.5);
      break;
    case 'pickup':
      S(W, ch, L, col, 0, y0, 0);
      cabin(0.32, H * 0.36, 0.2);
      S(W * 0.92, 0.9, L * 0.38, PAL.coal, 0, y0 + ch, -L * 0.28); // 짐칸
      lights(L / 2, -L / 2, y0 + 0.6);
      break;
    case 'suv':
      S(W, ch * 1.2, L, col, 0, y0, 0);
      cabin(0.72, H * 0.42, -0.08);
      S(W * 0.6, 0.12, L * 0.5, INK, 0, y0 + ch * 1.2 + H * 0.42 + 0.18, -0.08 * L); // 루프랙
      lights(L / 2, -L / 2, y0 + 0.7);
      break;
    case 'limo':
      S(W, ch, L, col, 0, y0, 0);
      cabin(0.6, H * 0.3, -0.06);
      lights(L / 2, -L / 2, y0 + 0.5);
      break;
    case 'rocket':
      S(W * 0.8, ch, L * 0.7, col, 0, y0, -L * 0.1);
      S(W * 0.55, ch * 0.8, L * 0.2, PAL.red, 0, y0, L * 0.35);
      S(W * 0.25, ch * 0.5, L * 0.12, PAL.red, 0, y0, L * 0.5);
      S(W * 0.5, 0.7, 1.4, GLASS, 0, y0 + ch, 0);
      for (const sx of [-1, 1]) S(0.2, 1.7, 1.4, PAL.red, sx * W * 0.45, y0, -L * 0.42);
      G(W * 0.4, 0.5, 0.4, PAL.orange, 0, y0 + 0.2, -L / 2 - 0.1);
      break;
    default: {
      // hatch · sedan · taxi · police · sport · super
      S(W, ch, L, col, 0, y0, 0);
      const sportish = shape === 'sport' || shape === 'super';
      cabin(shape === 'hatch' ? 0.55 : sportish ? 0.4 : 0.5, H * (sportish ? 0.28 : 0.38), sportish ? -0.04 : -0.05);
      if (shape === 'taxi') G(1.1, 0.4, 0.5, PAL.yellow, 0, H + 0.1, -0.2);
      if (shape === 'police') {
        G(0.7, 0.3, 0.5, PAL.red, -0.45, H + 0.1, -0.2);
        G(0.7, 0.3, 0.5, PAL.blue, 0.45, H + 0.1, -0.2);
        S(W * 1.02, ch * 0.4, L * 0.98, PAL.white, 0, y0, 0);
      }
      if (sportish) S(W * 0.9, 0.18, 0.7, PAL.ink, 0, y0 + ch + 0.5, -L / 2 + 0.3); // 스포일러
      lights(L / 2, -L / 2, y0 + ch * 0.5);
    }
  }
  if ((look.eng || 0) >= 2 && !['bus', 'rocket'].includes(shape)) S(W * 0.4, 0.25, 0.7, PAL.ink, 0, y0 + ch, L * 0.28); // 후드 스쿱
  if (look.neon) G(W * 1.1, 0.08, L * 1.05, PAL.cyan, 0, 0.06, 0);
  solid.push(...carDetails(shape, W, H, L, col).map(g => ({g})));
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(mergePlaced(solid), lowMat()), new THREE.Mesh(mergePlaced(lit), glowMat()));
  grp.userData.look = look;
  return grp;
}
