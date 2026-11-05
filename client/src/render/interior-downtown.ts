// W6 DOWNTOWN 방 가구: 본사 로비(안내 데스크·엘리베이터 문·라운지·로고 벽) · 거래소(시세 전광판·거래 데스크). 쓸 수 있는 것은 'use' 지점.
// 엘리베이터는 fx 'lift' — game/lift.ts 가 층 표시 연출 + 옥상 전망을 보여 준다.
import {PAL} from './lowpoly/palette.js';
import type {Item, Spot} from './interior.js';
import type {Purpose} from '../data/interiors.js';

export function furnishDowntown(p: Purpose, w: number, d: number, spots: Spot[], add: (i: Item) => void): boolean {
  const hx = w / 2,
    hz = d / 2,
    use = (x: number, z: number, fx: string, icon: string) => spots.push({kind: 'use', x, z, fx, icon}),
    glow = (x: number, z: number, ww: number, hh: number, y: number, c: number) => add({w: ww, h: hh, d: 0.15, c, x, z, y, solid: false, glow: true}),
    seat = (x: number, z: number, c: number) => {
      add({w: 2.2, h: 0.9, d: 1.3, c, x, z,surface:c===PAL.steel?12:15});
      add({w: 2.2, h: 1.0, d: 0.4, c, x, z: z - 0.7, y: 0.9,surface:c===PAL.steel?12:15});
      spots.push({kind: 'seat', x, z: z + 0.9, ry: 0});
    };
  switch (p) {
    case 'hq': {
      // 뒷벽: 엘리베이터 두 대(문 + 층 표시등) + 앞 버튼
      for (const s of [-1, 1]) {
        add({w: 2.6, h: 4.4, d: 0.4, c: PAL.steel, x: s * 3, z: -hz + 0.5});
        glow(s * 3, -hz + 0.78, 1.6, 0.5, 4.7, PAL.green);
      }
      use(0, -hz + 2.6, 'lift', '🛗');
      // 안내 데스크 + 안내원 자리
      add({w: Math.min(9, w - 6), h: 1.4, d: 1.4, c: PAL.stone, x: 0, z: -2});
      add({w: Math.min(9, w - 6), h: 0.2, d: 1.6, c: PAL.cloud, x: 0, z: -2, y: 1.4, solid: false});
      glow(0, -2.8, 3, 0.9, 1.7, PAL.cyan);
      use(0, -0.2, 'look', '💼');
      // 라운지 + 화분
      seat(-hx + 2.4, hz - 3, PAL.slate);
      seat(-hx + 5.4, hz - 3, PAL.slate);
      add({w: 2, h: 0.7, d: 2, c: PAL.wood, x: -hx + 3.9, z: hz - 5.2});
      for (const s of [-1, 1]) {
        add({w: 1.4, h: 1.0, d: 1.4, c: PAL.stone, x: s * (hx - 1.2), z: -hz + 1.2});
        add({w: 1.1, h: 1.4, d: 1.1, c: PAL.green, x: s * (hx - 1.2), z: -hz + 1.2, y: 1.0, solid: false});
      }
      // 옆벽 로고(글자 없는 도형)
      glow(hx - 0.3, 3, 0.15, 3.4, 3.5, PAL.magenta);
      add({w: 0.2, h: 4.2, d: 4.2, c: PAL.ink, x: hx - 0.2, z: 3, y: 3.1, solid: false});
      return true;
    }
    case 'exchange': {
      // 뒷벽 시세 전광판: 초록/빨강 막대가 이어진다
      for (let k = 0; k < 8; k++) glow(-hx + 2 + k * ((w - 4) / 7), -hz + 0.4, 1.8, 1 + (k % 3) * 0.8, 3.2 + (k % 2), k % 3 ? PAL.green : PAL.red);
      // 거래 데스크 3×2 (모니터가 빛난다)
      for (let r = 0; r < 2; r++)
        for (let c = -1; c <= 1; c++) {
          add({w: 3.2, h: 1.1, d: 1.4, c: PAL.stone, x: c * 6, z: -2 + r * 4.4});
          glow(c * 6, -2.6 + r * 4.4, 2, 0.8, 1.3, r ? PAL.cyan : PAL.amber);
        }
      use(0, hz - 3, 'look', '📈');
      seat(hx - 2.4, hz - 2.4, PAL.slate);
      seat(-hx + 2.4, hz - 2.4, PAL.slate);
      return true;
    }
  }
  return false;
}
