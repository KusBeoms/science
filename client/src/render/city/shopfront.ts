// W5 상점 거리 간판: 지붕 위 큰 간판판(색 판 + 글자 없는 도형 그림). 편의점은 "24" 7세그먼트라 밤에 빛난다.
// 반환 지오메트리는 건물 로컬 좌표(발자국 중심 원점, 정면 +z)로 위치가 이미 구워져 있다 → building.ts 가 solid/lit 목록에 그대로 넣는다.
import {PAL, mix} from '../lowpoly/palette.js';
import {box, cyl, type Geo} from '../lowpoly/prim.js';
import type {Purpose} from '../../data/interiors.js';

interface Icon {
  board: number;
  solid: Geo[];
  lit: Geo[];
}
/** 중심 (x,y), 두께 .3 인 판 (z 0~.3) */
const p = (w: number, h: number, c: number, x: number, y: number, t = 0.3): Geo => box(w, h, t, c, x, y - h / 2, t / 2);
/** 원판 (z 0~t) */
const disk = (r: number, c: number, x: number, y: number, t = 0.3): Geo => cyl(r, t, c, 0, 0, 0, 0, 12).rotateX(Math.PI / 2).translate(x, y, 0);
/** 기울인 막대 */
const bar = (len: number, th: number, c: number, x: number, y: number, a: number): Geo => box(len, th, 0.3, c, 0, -th / 2, 0.15).rotateZ(a).translate(x, y, 0);

/** 7세그먼트 숫자 하나 (높이 2.4, 폭 1.3): segs = 켜진 구간 문자열 abcdefg */
function digit(segs: string, x: number, on: number): Geo[] {
  const t = 0.26,
    w = 1.1,
    h = 1.1,
    S: Record<string, [number, number, number, number]> = {
      a: [w, t, 0, h * 2], b: [t, h, w / 2, h * 1.5], c: [t, h, w / 2, h * 0.5], d: [w, t, 0, 0], e: [t, h, -w / 2, h * 0.5], f: [t, h, -w / 2, h * 1.5], g: [w, t, 0, h],
    };
  return [...segs].map(k => p(S[k][0], S[k][1], on, x + S[k][2], S[k][3] - h + 0.1, 0.3));
}

function icon(k: Purpose): Icon {
  const W = PAL.white;
  switch (k) {
    case 'clothes':
      return {board: PAL.magenta, lit: [], solid: [p(1.6, 2, W, 0, 0), p(1.1, 0.9, W, -1.25, 0.55), p(1.1, 0.9, W, 1.25, 0.55), p(0.7, 0.35, PAL.magenta, 0, 0.95, 0.4)]};
    case 'autoshop':
      return {board: PAL.blue, lit: [], solid: [p(3.4, 0.9, W, 0, -0.5), p(1.9, 0.8, W, -0.2, 0.3), p(1.3, 0.55, PAL.cyan, -0.2, 0.3, 0.35), disk(0.45, PAL.ink, -1.1, -1.0, 0.4), disk(0.45, PAL.ink, 1.1, -1.0, 0.4)]};
    case 'bikeshop':
      return {board: PAL.lime, lit: [], solid: [disk(0.8, PAL.ink, -1.3, -0.6), disk(0.55, PAL.lime, -1.3, -0.6, 0.35), disk(0.8, PAL.ink, 1.3, -0.6), disk(0.55, PAL.lime, 1.3, -0.6, 0.35), bar(1.9, 0.18, W, -0.1, 0.1, 0.5), bar(1.8, 0.18, W, 0.45, 0.2, -0.45), p(1.4, 0.18, W, 0.1, 0.9), p(0.7, 0.18, PAL.ink, -0.9, 0.9)]};
    case 'mart24':
      return {board: PAL.ink, solid: [...digit('abged', -1.0, mix(PAL.green, PAL.ink, 0.6)), ...digit('fgbc', 0.9, mix(PAL.green, PAL.ink, 0.6))], lit: [...digit('abged', -1.0, PAL.lime), ...digit('fgbc', 0.9, PAL.lime), p(3.6, 0.14, PAL.orange, 0, -1.25, 0.4), p(3.6, 0.14, PAL.red, 0, 1.35, 0.4)]};
    case 'florist':
      return {board: PAL.pink, lit: [], solid: [...[0, 1, 2, 3, 4, 5].map(i => bar(0.7, 0.6, W, Math.cos((i / 6) * 6.283) * 0.8, 0.4 + Math.sin((i / 6) * 6.283) * 0.8, (i / 6) * 6.283)), disk(0.4, PAL.yellow, 0, 0.4, 0.4), p(0.18, 1.2, PAL.green, 0, -1.2), bar(0.9, 0.3, PAL.green, 0.5, -0.9, 0.5)]};
    case 'petshop':
      return {board: PAL.amber, lit: [], solid: [p(1.6, 1.2, PAL.ink, 0, -0.5), ...[-1.1, -0.4, 0.4, 1.1].map((x, i) => disk(0.34, PAL.ink, x, i % 3 ? 0.9 : 0.55, 0.3))]};
    case 'electro':
      return {board: PAL.slate, solid: [], lit: [bar(1.5, 0.45, PAL.yellow, -0.35, 0.6, -1.1), bar(1.5, 0.45, PAL.yellow, 0.35, -0.6, -1.1), p(1.6, 0.45, PAL.yellow, 0, 0)]};
    case 'bookshop':
      return {board: PAL.brick, lit: [], solid: [p(2.8, 0.55, PAL.cyan, 0, -0.9), p(2.4, 0.55, PAL.amber, 0.2, -0.3), p(2.6, 0.55, PAL.green, -0.1, 0.3), p(2.1, 0.55, W, 0.3, 0.9)]};
    case 'bakery':
      return {board: PAL.clay, lit: [], solid: [p(3, 1.1, PAL.amber, 0, -0.3), p(2.5, 0.7, mix(PAL.amber, W, 0.25), 0, 0.5), ...[-0.8, 0, 0.8].map(x => bar(0.8, 0.14, PAL.orange, x, 0.4, -0.6))]};
    case 'pharmacy':
      return {board: PAL.green, lit: [p(0.8, 2.6, W, 0, 0, 0.4), p(2.6, 0.8, W, 0, 0, 0.4)], solid: [p(0.8, 2.6, mix(W, PAL.green, 0.4), 0, 0), p(2.6, 0.8, mix(W, PAL.green, 0.4), 0, 0)]};
    case 'gasstation':
      return {board: PAL.red, lit: [], solid: [p(1.7, 2.4, W, -0.4, 0), p(1.2, 0.8, PAL.cyan, -0.4, 0.5, 0.35), p(0.3, 1.4, W, 0.8, -0.3), p(0.9, 0.3, W, 1.15, 0.45), p(0.3, 0.7, W, 1.5, 0.15)]};
    case 'carwash':
      return {board: PAL.cyan, lit: [], solid: [disk(0.8, W, -0.9, -0.2), disk(0.55, W, 0.6, 0.5), disk(0.4, W, 1.2, -0.5), disk(0.3, W, -0.2, 0.9), disk(0.22, W, 0.1, -0.7)]};
    case 'usedcar':
      return {board: PAL.orange, lit: [], solid: [disk(0.65, PAL.ink, -1.2, -0.7, 0.4), disk(0.65, PAL.ink, 1.2, -0.7, 0.4), p(2.4, 0.5, PAL.red, 0, -0.2), p(0.9, 0.9, W, 0.8, 0.45), p(0.4, 0.7, PAL.ink, -0.8, 0.2), p(0.9, 0.5, PAL.yellow, 0, 1.0)]};
    default:
      return {board: PAL.ash, solid: [], lit: []};
  }
}
export const hasShopFront = (k?: Purpose) => !!k && icon(k).solid.length + icon(k).lit.length > 0;

/** 지붕 위 간판. H = 건물 높이 */
export function shopFront(k: Purpose, w: number, d: number, H: number): {solid: Geo[]; lit: Geo[]} {
  const ic = icon(k),
    bw = Math.min(w + 0.4, 8.5),
    bh = 4.4,
    z = d / 2 - 0.6,
    cy = H + 0.8 + bh / 2,
    at = (g: Geo, dz = 0.2) => g.translate(0, cy, z + dz);
  const solid: Geo[] = [
    box(bw, bh, 0.4, ic.board, 0, H + 0.8, z - 0.2),
    box(bw + 0.3, 0.25, 0.5, mix(ic.board, PAL.white, 0.5), 0, H + 0.8 + bh, z - 0.2),
    box(0.3, 0.9, 0.3, PAL.steel, -bw * 0.35, H, z - 0.3),
    box(0.3, 0.9, 0.3, PAL.steel, bw * 0.35, H, z - 0.3),
    ...ic.solid.map(g => at(g)),
  ];
  // 판 가장자리에 밤에 켜지는 띠 (모든 간판)
  const lit = [...ic.lit.map(g => at(g, 0.25)), box(bw - 0.3, 0.14, 0.2, mix(ic.board, PAL.white, 0.45), 0, H + 0.9, z + 0.05)];
  return {solid, lit};
}
