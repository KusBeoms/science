// W5 상점 거리 13종의 방 가구: 진열대·계산대(shop2 지점 = 상점 화면)·거울·전시 차·자전거 거치대·냉장고·꽃 양동이·펫 우리 등. 쓸 수 있는 가구는 'use' 지점.
import {PAL} from './lowpoly/palette.js';
import type {Item, Spot} from './interior.js';
import type {Purpose} from '../data/interiors.js';

/** 새 상점 용도면 가구를 채우고 true */
export function furnishShops(p: Purpose, w: number, d: number, spots: Spot[], add: (i: Item) => void): boolean {
  const hx = w / 2,
    hz = d / 2,
    use = (x: number, z: number, fx: string, icon: string) => spots.push({kind: 'use', x, z, fx, icon}),
    shop = (x: number, z: number, icon: string) => spots.push({kind: 'shop2', x, z, fx: p, icon}),
    box = (ww: number, h: number, dd: number, c: number, x: number, z: number, y = 0, solid = true, glow = false) => add({w: ww, h, d: dd, c, x, z, y, solid, glow}),
    counter = (x: number, z: number, len: number, icon: string) => {
      box(len, 1.5, 1.2, PAL.clay, x, z);
      box(len, 0.2, 1.4, PAL.wood, x, z, 1.5, false);
      box(0.7, 0.5, 0.5, PAL.ink, x - len / 3, z, 1.7, false);
      shop(x, z + 1.7, icon);
    },
    wallGlow = (x: number, ww: number, hh: number, y: number, c: number) => box(ww, hh, 0.15, c, x, -hz + 0.2, y, false, true),
    shelf = (x: number, z: number, len: number, alongX: boolean, c: number = PAL.wood, goods?: number[]) => {
      box(alongX ? len : 0.8, 3, alongX ? 0.8 : len, c, x, z);
      goods?.forEach((g, k) => box(0.55, 0.6, 0.55, g, alongX ? x - len / 2 + 0.6 + k * ((len - 1.2) / Math.max(1, goods.length - 1)) : x, alongX ? z : z - len / 2 + 0.6 + k * ((len - 1.2) / Math.max(1, goods.length - 1)), 3, false, true));
    },
    car = (x: number, z: number, c: number) => {
      box(3.6, 0.9, 1.8, c, x, z, 0.35);
      box(1.9, 0.7, 1.6, PAL.glass, x - 0.1, z, 1.25, false);
      [-1.2, 1.2].forEach(dx => [-0.95, 0.95].forEach(dz => box(0.7, 0.7, 0.28, PAL.ink, x + dx, z + dz, 0, false)));
    },
    bike = (x: number, z: number, c: number) => {
      box(0.12, 0.9, 0.9, PAL.ink, x, z - 0.7, 0, false);
      box(0.12, 0.9, 0.9, PAL.ink, x, z + 0.7, 0, false);
      box(0.12, 0.12, 1.5, c, x, z, 0.65, false);
      box(0.12, 0.7, 0.12, c, x, z - 0.4, 0.5, false);
      box(0.6, 0.1, 0.1, PAL.ink, x, z + 0.8, 1.0, false);
    },
    tint = [PAL.red, PAL.amber, PAL.cyan, PAL.lime, PAL.pink, PAL.violet, PAL.orange, PAL.blue];
  switch (p) {
    case 'clothes': {
      wallGlow(0, Math.min(5, w - 4), 3.6, 0.8, PAL.cloud);
      box(Math.min(5.4, w - 3), 0.5, 0.5, PAL.amber, 0, -hz + 0.5, 0.4, false);
      shop(0, -hz + 2.6, '👕'); // 거울 앞 = 갈아입기
      for (const s of [-1, 1]) {
        box(0.12, 2.4, 0.12, PAL.steel, s * (hx - 1), -1.5, 0);
        box(0.12, 2.4, 0.12, PAL.steel, s * (hx - 1), 2.5, 0);
        box(0.12, 0.12, 4.2, PAL.steel, s * (hx - 1), 0.5, 2.3, false);
        for (let k = 0; k < 6; k++) box(0.4, 0.9, 0.5, tint[(k + (s > 0 ? 3 : 0)) % 8], s * (hx - 1.1), -1.3 + k * 0.7, 1.2, false);
      }
      for (const s of [-1, 1]) {
        box(0.6, 1.3, 0.5, PAL.stone, s * 1.6, 0.5, 0);
        box(0.9, 1.1, 0.5, s > 0 ? PAL.magenta : PAL.cyan, s * 1.6, 0.5, 1.3);
        box(0.55, 0.5, 0.5, PAL.bone, s * 1.6, 0.5, 2.4);
      }
      counter(hx - 2.6, hz - 2.2, 3.6, '👕');
      use(-hx + 2.2, hz - 2.5, 'look', '🪞');
      break;
    }
    case 'autoshop': {
      const n = Math.max(2, Math.floor((w - 2) / 4.4));
      for (let k = 0; k < n; k++) {
        const x = -hx + 2.9 + k * ((w - 5.8) / Math.max(1, n - 1));
        box(4.2, 0.25, 2.6, PAL.cloud, x, -hz + 2.6, 0, false);
        car(x, -hz + 2.6, [PAL.red, PAL.blue, PAL.amber, PAL.lime][k % 4]);
        box(4.2, 0.1, 0.12, [PAL.red, PAL.blue, PAL.amber, PAL.lime][k % 4], x, -hz + 4.0, 0.25, false, true);
        use(x, -hz + 5, 'look', '🚘');
      }
      counter(hx - 3, hz - 3, 4, '🚘');
      box(1.2, 2.2, 0.2, PAL.cyan, -hx + 1, 1, 0, false, true);
      break;
    }
    case 'bikeshop': {
      for (let k = 0; k < 4; k++) bike(-hx + 1.2, -hz + 2.2 + k * 2.3, [PAL.blue, PAL.orange, PAL.green, PAL.magenta][k]);
      for (let k = 0; k < 3; k++) bike(hx - 1.2, -hz + 2.6 + k * 2.4, [PAL.red, PAL.cyan, PAL.yellow][k]);
      box(Math.min(4, w - 6), 0.3, 2.4, PAL.wood, 0, -hz + 2.2, 0, false); // 전시 단상
      bike(0, -hz + 2.2, PAL.violet);
      box(3.2, 0.7, 3, PAL.stone, 0, 0.5, 0, false); // 시험 주행용 작은 언덕
      use(0, 0.6, 'train', '🚲');
      for (let k = 0; k < 4; k++) box(0.6, 0.45, 0.6, tint[k], -1.5 + k * 1.0, -hz + 0.9, 3, false);
      counter(hx - 3, hz - 2.6, 3.4, '🚲');
      break;
    }
    case 'mart24': {
      for (let r = 0; r < 2; r++) shelf(-1.4 + r * 3.6, -1, d - 7, false, PAL.cloud, [PAL.red, PAL.amber, PAL.cyan, PAL.lime, PAL.pink, PAL.orange].slice(0, 5));
      for (let k = 0; k < Math.max(2, Math.floor((w - 3) / 2.2)); k++) {
        const x = -hx + 1.6 + k * 2.2;
        box(2, 3.2, 1, PAL.white, x, -hz + 0.8);
        box(1.7, 2.4, 0.1, PAL.cyan, x, -hz + 1.35, 0.5, false, true);
      }
      counter(hx - 3, hz - 2.8, 4, '🏪');
      box(1.2, 2.2, 0.8, PAL.slate, -hx + 1, hz - 2, 0);
      use(-hx + 1.4, hz - 3.6, 'snack', '🍜');
      box(w - 1, 0.18, 0.2, PAL.yellow, 0, hz - 0.3, 4.2, false, true);
      break;
    }
    case 'florist': {
      for (let r = 0; r < 2; r++)
        for (let c = -1; c <= 1; c++) {
          const x = c * 2.3,
            z = -2 + r * 3;
          box(1.4, 0.8, 1.4, PAL.wood, x, z);
          for (let k = 0; k < 4; k++) box(0.22, 0.6 + (k % 2) * 0.3, 0.22, tint[(c + r * 3 + k + 8) % 8], x - 0.45 + (k % 2) * 0.9, z - 0.4 + (k >> 1) * 0.8, 0.8, false, true);
        }
      box(w - 3, 2.6, 0.6, PAL.glass, 0, -hz + 0.7);
      for (let k = 0; k < 6; k++) box(0.3, 1.2, 0.2, tint[k], -hx + 2 + k * ((w - 4) / 5), -hz + 0.7, 0.4, false, true);
      counter(hx - 2.6, hz - 2.6, 3.2, '💐');
      use(0, hz - 3.2, 'look', '🌷');
      break;
    }
    case 'petshop': {
      for (let k = 0; k < 3; k++) {
        const z = -hz + 2.2 + k * 2.6;
        box(1.8, 1.5, 2, PAL.glass, -hx + 1.4, z);
        box(0.7, 0.6, 0.9, [PAL.clay, PAL.cloud, PAL.amber][k], -hx + 1.4, z, 0, false);
        use(-hx + 3.0, z, 'look', ['🐶', '🐱', '🐰'][k]);
      }
      box(Math.min(5, w - 5), 2.8, 1.2, PAL.cyan, hx - 3, -hz + 1.2, 0.2, true, true);
      for (let k = 0; k < 3; k++) box(0.4, 0.2, 0.2, [PAL.orange, PAL.yellow, PAL.pink][k], hx - 4 + k, -hz + 2, 1 + k * 0.5, false, true);
      box(1.6, 0.4, 1.6, PAL.pink, 0, 0.5, 0, false);
      counter(hx - 2.8, hz - 2.8, 3.4, '🐶');
      break;
    }
    case 'electro': {
      for (let k = 0; k < 4; k++) wallGlow(-hx + 2 + k * ((w - 4) / 3), 2.2, 2.0, 1.4 + (k % 2) * 0.4, [PAL.cyan, PAL.magenta, PAL.lime, PAL.blue][k]);
      for (let r = 0; r < 2; r++) {
        box(2.6, 1.0, 1.2, PAL.stone, -1.7 + r * 3.4, -1.5);
        box(1.2, 0.8, 0.1, PAL.cyan, -1.7 + r * 3.4, -1.9, 1.0, false, true);
      }
      use(0, 1.5, 'look', '🎮');
      box(2.4, 0.9, 1.4, PAL.coal, 0, 0.3);
      box(1.2, 0.7, 0.1, PAL.violet, 0, 0.0, 0.9, false, true);
      counter(hx - 2.8, hz - 2.6, 3.4, '🎧');
      break;
    }
    case 'bookshop': {
      for (let r = 0; r < 3; r++) {
        shelf(-hx + 1, -hz + 2.2 + r * 3.2, 3, false, PAL.wood, [PAL.red, PAL.blue, PAL.green, PAL.amber]);
        shelf(hx - 1, -hz + 2.2 + r * 3.2, 3, false, PAL.wood, [PAL.violet, PAL.cyan, PAL.orange, PAL.pink]);
      }
      box(2.2, 1.0, 2.2, PAL.wood, 0, -1.5);
      for (let k = 0; k < 5; k++) box(0.5, 0.18, 0.7, tint[k], -0.5 + (k % 2) * 0.8, -1.5 - (k >> 1) * 0.3, 1.0 + (k >> 1) * 0.18, false);
      use(0, 0.6, 'read', '📖');
      box(1.6, 0.9, 0.9, PAL.green, -2.4, hz - 2.8);
      counter(hx - 2.8, hz - 2.4, 3.2, '📖');
      break;
    }
    case 'bakery': {
      box(w - 3, 1.3, 1.6, PAL.glass, 0, -hz + 2.6);
      for (let k = 0; k < Math.floor((w - 4) / 1.2); k++) box(0.8, 0.4, 0.8, k % 2 ? PAL.amber : PAL.clay, -hx + 2.4 + k * 1.2, -hz + 2.6, 1.3, false, true);
      box(3, 3.2, 1.4, PAL.brick, hx - 2.2, -hz + 0.9);
      box(1.8, 1.2, 0.1, PAL.orange, hx - 2.2, -hz + 1.65, 0.8, false, true);
      for (let k = 0; k < 3; k++) box(1.0, 0.7, 1.0, PAL.wood, -hx + 1.5, -hz + 5 + k * 1.5);
      counter(hx - 2.8, hz - 2.8, 3.4, '🥐');
      use(-hx + 2.4, hz - 3.2, 'snack', '🥐');
      break;
    }
    case 'pharmacy': {
      wallGlow(0, 0.9, 3.2, 0.8, PAL.green);
      wallGlow(0, 3.2, 0.9, 2.0, PAL.green);
      for (let r = 0; r < 3; r++) shelf(-hx + 1.2, -1 + r * 3, 2.4, false, PAL.white, [PAL.green, PAL.cyan, PAL.white]);
      shelf(hx - 1.2, 0, d - 6, false, PAL.white, [PAL.pink, PAL.amber, PAL.green, PAL.blue, PAL.white]);
      box(1.0, 1.6, 1.0, PAL.slate, 0, 1.5);
      use(0, 3.0, 'look', '🩺');
      counter(0, -hz + 2.4, Math.min(5, w - 4), '💊');
      break;
    }
    case 'gasstation': {
      box(w - 4, 3.2, 0.8, PAL.cloud, 0, -hz + 0.8);
      for (let k = 0; k < 5; k++) box(0.5, 0.6, 0.4, tint[k], -hx + 2.2 + k * ((w - 5) / 4), -hz + 0.8, 3.2, false, true);
      for (let k = 0; k < 4; k++) box(1.0, 0.45 + (k % 2) * 0.4, 1.0, PAL.ink, hx - 1.6, -1 + k * 1.2, 0, true);
      for (let k = 0; k < 3; k++) box(0.6, 0.8, 0.6, [PAL.red, PAL.amber, PAL.blue][k], -hx + 1.2, -1 + k * 1.1, 0, true);
      counter(0, hz - 3, 4.4, '⛽');
      use(-hx + 3, hz - 2.6, 'look', '⛽');
      break;
    }
    case 'carwash': {
      box(w - 4, 2.4, 1.2, PAL.steel, 0, -hz + 1);
      box(w - 5, 0.8, 0.1, PAL.cyan, 0, -hz + 1.65, 1.2, false, true);
      for (let k = 0; k < 3; k++) box(0.9, 0.9, 0.9, [PAL.cyan, PAL.white, PAL.pink][k], -hx + 2 + k * 1.3, 0, 0, true);
      box(0.3, 3, 0.3, PAL.blue, hx - 1.4, -1);
      box(0.3, 0.3, 3.4, PAL.blue, hx - 1.4, 0.7, 2.7, false);
      counter(hx - 3, hz - 3, 3.6, '🫧');
      use(0, 0.5, 'look', '🫧');
      break;
    }
    case 'usedcar': {
      car(-hx + 3, -hz + 2.8, PAL.stone);
      car(hx - 3, -hz + 2.8, PAL.clay);
      for (let k = 0; k < 2; k++) {
        const x = -1.2 + k * 2.6;
        box(0.3, 0.55, 1.6, PAL.coal, x, -1.2);
        box(0.35, 0.3, 0.7, [PAL.red, PAL.orange][k], x, -0.9, 0.9, false);
        box(0.3, 0.7, 0.7, PAL.ink, x, -1.9, 0, false);
        box(0.3, 0.7, 0.7, PAL.ink, x, -0.5, 0, false);
        use(x, 0.8, 'look', '🏍️');
      }
      for (let k = 0; k < 6; k++) box(0.25, 0.25, 0.1, k % 2 ? PAL.amber : PAL.red, -hx + 2 + k * 0.8, -hz + 0.5, 3 + (k % 3) * 0.3, false, true);
      box(2.4, 0.8, 0.12, PAL.red, 0, -hz + 0.6, 2, false, true);
      counter(hx - 3, hz - 2.8, 3.8, '🏍️');
      break;
    }
    default:
      return false;
  }
  return true;
}
