// 신도심 용도(식당·카페·호텔·영화관·노래방·볼링장·체육관·도서관·박물관·수영장·공연장·시청·학교·병원·은행·쇼핑몰·수족관·등대·전망타워)의 방 가구.
// 쓸 수 있는 가구는 'use' 지점(fx)으로 등록한다 — 효과는 game/interior.ts 가 처리.
import {PAL} from './lowpoly/palette.js';
import type {Item, Spot} from './interior.js';
import type {Purpose} from '../data/interiors.js';

/** 새 용도면 가구를 채우고 true, 아니면 false (기존 용도는 interior.ts 가 채운다) */
export function furnish2(p: Purpose, w: number, d: number, spots: Spot[], add: (i: Item) => void): boolean {
  const hx = w / 2,
    hz = d / 2,
    use = (x: number, z: number, fx: string, icon: string) => spots.push({kind: 'use', x, z, fx, icon}),
    seat = (x: number, z: number, c: number = PAL.tileBlue, ry = 0) => {
      add({w: 2.2, h: 0.9, d: 1.3, c, x, z,surface:c===PAL.wood?10:c===PAL.steel?12:15});
      add({w: 2.2, h: 1.0, d: 0.4, c, x, z: z - 0.7, y: 0.9,surface:c===PAL.wood?10:c===PAL.steel?12:15});
      spots.push({kind: 'seat', x, z: z + 0.9, ry});
    },
    table = (x: number, z: number, c: number = PAL.wood) => add({w: 2, h: 1.1, d: 2, c, x, z}),
    shelf = (x: number, z: number, len: number, alongX: boolean, c: number = PAL.wood) => add({w: alongX ? len : 0.9, h: 3.2, d: alongX ? 0.9 : len, c, x, z}),
    glow = (x: number, z: number, ww: number, hh: number, y: number, c: number) => add({w: ww, h: hh, d: 0.15, c, x, z, y, solid: false, glow: true});
  switch (p) {
    case 'restaurant':
    case 'cafe': {
      add({w: Math.min(7, w - 4), h: 1.6, d: 1.2, c: PAL.clay, x: 0, z: -hz + 1.4});
      use(0, -hz + 3, 'snack', p === 'cafe' ? '☕' : '🍜');
      for (let r = 0; r < 2; r++) for (let c = -1; c <= 1; c += 2) { table(c * hx * 0.5, -1 + r * 3.6); seat(c * hx * 0.5, 0.2 + r * 3.6, PAL.red); }
      break;
    }
    case 'bank': case 'cityhall': {
      for (let k = -1; k <= 1; k++) add({w: 3.2, h: 1.4, d: 1.2, c: PAL.stone, x: k * hx * 0.55, z: -hz + 2});
      use(0, -hz + 3.4, 'look', p === 'bank' ? '💰' : '📜');
      seat(-hx + 2.2, 1, PAL.slate); seat(hx - 2.2, 1, PAL.slate);
      break;
    }
    case 'mall': {
      for (let r = 0; r < 3; r++) shelf(-hx + 3 + r * 5, -1, d - 7, false, [PAL.amber, PAL.cyan, PAL.pink][r]);
      use(hx - 3, -hz + 3, 'coin', '🛍️');
      add({w: 4, h: 1.4, d: 1.4, c: PAL.clay, x: hx - 3, z: hz - 3});
      break;
    }
    case 'hotel': case 'apartment': {
      add({w: 3, h: 1, d: 4.2, c: PAL.violet, x: -hx + 2.2, z: -hz + 2.6});
      spots.push({kind: 'bed', x: -hx + 4.4, z: -hz + 2.6});
      add({w: 2.4, h: 1.2, d: 1.4, c: PAL.wood, x: hx - 2, z: -hz + 1.4});
      use(hx - 2, -hz + 3.2, 'snack', '🍫');
      seat(hx - 3, 2, PAL.teal);
      glow(0, hz - 0.5, 3, 1.6, 2, PAL.cyan);
      break;
    }
    case 'school': {
      for (let r = 0; r < 3; r++) for (let c = -1; c <= 1; c++) add({w: 1.8, h: 0.9, d: 1.2, c: PAL.wood, x: c * 3.6, z: -1 + r * 2.8});
      add({w: Math.min(8, w - 3), h: 2.2, d: 0.2, c: PAL.green, x: 0, z: -hz + 0.4, y: 1});
      use(0, -hz + 2, 'read', '📖');
      break;
    }
    case 'hospital': {
      for (let k = -1; k <= 1; k += 2) { add({w: 3, h: 1, d: 4, c: PAL.white, x: k * hx * 0.5, z: -hz + 3}); spots.push({kind: 'bed', x: k * hx * 0.5 + 2.3, z: -hz + 3}); }
      add({w: 1.4, h: 1.8, d: 1.4, c: PAL.red, x: hx - 1.6, z: hz - 2.5});
      use(hx - 1.6, hz - 4, 'heal', '💊');
      break;
    }
    case 'cinema': {
      glow(0, -hz + 0.5, Math.min(12, w - 4), 4, 2.5, PAL.cloud);
      for (let r = 0; r < 4; r++) for (let c = -2; c <= 2; c++) seat(c * 2.6, -2 + r * 2.4, PAL.red);
      use(hx - 2, hz - 2.4, 'snack', '🍿');
      add({w: 2, h: 1.4, d: 1.4, c: PAL.amber, x: hx - 2, z: hz - 1.2});
      break;
    }
    case 'karaoke': {
      glow(0, -hz + 0.5, 6, 3, 1.8, PAL.magenta);
      use(0, -hz + 2, 'sing', '🎤');
      for (let k = -1; k <= 1; k += 2) seat(k * 4, 1.5, PAL.violet);
      table(0, 1.6, PAL.coal);
      break;
    }
    case 'bowling': {
      for (let k = -1; k <= 1; k++) { add({w: 2, h: 0.12, d: d - 6, c: PAL.bone, x: k * 4.4, z: -1, solid: false}); add({w: 0.9, h: 0.9, d: 0.9, c: PAL.white, x: k * 4.4, z: -hz + 2, solid: false}); use(k * 4.4, hz - 2.4, 'bowl', '🎳'); }
      break;
    }
    case 'gym': {
      for (let k = -1; k <= 1; k++) { add({w: 1.4, h: 1.8, d: 2.4, c: PAL.steel, x: k * 4, z: -hz + 2.4}); use(k * 4, -hz + 4.4, 'train', '🏋️'); }
      add({w: 5, h: 0.2, d: 3, c: PAL.blue, x: 0, z: hz - 3, solid: false});
      break;
    }
    case 'library': {
      for (let r = 0; r < 3; r++) shelf(0, -hz + 1.4 + r * 3.4, w - 5, true, PAL.wood);
      use(0, hz - 3, 'read', '📚');
      seat(-hx + 2, hz - 2.4, PAL.green); seat(hx - 2, hz - 2.4, PAL.green);
      break;
    }
    case 'museum': {
      for (let k = 0; k < 4; k++) {
        const x = -hx + 3 + k * ((w - 6) / 3);
        add({w: 1.6, h: 1.1, d: 1.6, c: PAL.stone, x, z: -hz + 3});
        add({w: 0.8, h: 0.8, d: 0.8, c: [PAL.amber, PAL.cyan, PAL.pink, PAL.lime][k], x, z: -hz + 3, y: 1.1, solid: false, glow: true});
        use(x, -hz + 4.6, 'look', ['🏺', '🦕', '💎', '🪐'][k]);
        glow(x, -hz + 0.3, 2.2, 2.8, 1.6, [PAL.red, PAL.blue, PAL.amber, PAL.violet][k]);
      }
      seat(0, 1, PAL.clay, 0);
      break;
    }
    case 'pool': {
      add({w: w - 5, h: 0.05, d: d - 8, c: PAL.cyan, x: 0, z: -1, solid: false});
      use(0, hz - 3, 'swim', '🏊');
      seat(-hx + 2, hz - 2, PAL.cloud); seat(hx - 2, hz - 2, PAL.cloud);
      break;
    }
    case 'concert': {
      add({w: w - 4, h: 1.2, d: 5, c: PAL.wood, x: 0, z: -hz + 3});
      glow(0, -hz + 0.4, 10, 4, 1.6, PAL.violet);
      use(0, -hz + 6, 'sing', '🎼');
      for (let r = 0; r < 3; r++) for (let c = -2; c <= 2; c++) seat(c * 2.6, 0.5 + r * 2.4, PAL.red);
      break;
    }
    case 'aquarium': {
      for (let k = 0; k < 4; k++) {
        const x = -hx + 3.5 + k * ((w - 7) / 3);
        add({w: 4, h: 3, d: 1.6, c: PAL.cyan, x, z: -hz + 2});
        add({w: 1, h: 0.5, d: 0.6, c: [PAL.orange, PAL.pink, PAL.yellow, PAL.lime][k], x, z: -hz + 2, y: 1.4, solid: false, glow: true});
        use(x, -hz + 4, 'look', ['🐠', '🦈', '🐙', '🐢'][k]);
      }
      break;
    }
    case 'lighthouse': case 'tvtower': {
      add({w: 1.6, h: 1.2, d: 1.6, c: PAL.steel, x: 0, z: 0});
      use(0, 2, 'look', p === 'lighthouse' ? '🌊' : '🌃');
      break;
    }
    default:
      return false;
  }
  return true;
}
