// 가구 상자의 기능을 읽을 수 있게 얇은 다리·선반·수납·식기·화분을 얹는다. 추가 충돌은 없다.
import type {Item} from './interior.js';
import type {Purpose} from '../data/interiors.js';
import {beam, ring} from './lowpoly/structure.js';
import {PAL} from './lowpoly/palette.js';
import {box, cyl, ico} from './lowpoly/prim.js';
export function interiorDetails(p: Purpose, w: number, d: number, items: Item[]) {
  const parts: any[] = [];
  const library = ['library', 'bookshop', 'office'].includes(p), dining = ['cafe', 'restaurant', 'house', 'hotel', 'apartment'].includes(p);
  for (const it of items) {
    if (it.glow || it.y || it.h < 0.7) continue;
    const {x, z} = it;
    if (it.h > 2.8 && (it.w < 1.1 || it.d < 1.1)) {
      const along = it.w > it.d, len = Math.max(it.w, it.d);
      for (const y of [0.8, 1.7, 2.6]) {
        parts.push(box(it.w + 0.04, 0.08, it.d + 0.04, PAL.bone, x, y, z));
        if (library) for (let k = 0; k < Math.min(12, Math.floor(len / 0.5)); k++) parts.push(box(along ? 0.24 : 0.48, 0.5 + (k % 3) * 0.08, along ? 0.48 : 0.24, [PAL.red, PAL.blue, PAL.bone, PAL.green][k % 4], x + (along ? -len / 2 + 0.4 + k * 0.5 : 0), y + 0.08, z + (along ? 0 : -len / 2 + 0.4 + k * 0.5)));
      }
    }
    if (dining && it.h > 1 && it.h < 1.7 && it.w >= 2 && it.d >= 1.2) {
      parts.push(cyl(0.34, 0.06, PAL.cloud, x, it.h + 0.04, z, 0, 8), cyl(0.12, 0.28, PAL.bone, x + 0.55, it.h + 0.05, z, 0, 6));
    }
    if (['hotel', 'apartment', 'house', 'hospital'].includes(p) && it.h === 1 && it.d >= 4) parts.push(box(it.w * 0.8, 0.18, 0.8, PAL.cloud, x, 1.02, z - it.d / 2 + 0.7), box(0.15, 0.4, it.d * 0.7, PAL.bone, x + it.w / 2 - 0.2, 1.01, z + 0.4));
  }
  if (p === 'observatory' || p === 'tvtower') {
    parts.push(beam([0, 4, 0], [0, 5, -3], 0.9, PAL.cloud));
    parts.push(box(1.1, 1.1, 0.16, PAL.glass, 0, 4.5, -3));
  }
  if (p === 'lighthouse') {
    parts.push(cyl(1.8, 0.3, PAL.steel, 0, 1.4, 0, 0, 8), cyl(1.2, 2.1, PAL.glass, 0, 1.7, 0, 0, 8));
    for (const s of [-1, 1]) parts.push(box(0.1, 2.2, 0.1, PAL.steel, s, 1.7, 0));
    parts.push(...ring(1.5, 0.14, PAL.amber, 0, 2.8, 0, Math.PI / 2, 12));
  }
  if (p === 'clock') for (const [x, y, r] of [[-1.2, 3.2, 0.7], [1.1, 4.5, 0.8]]) parts.push(...ring(r, 0.16, PAL.amber, x, y, 0.85, 0, 12));
  for (const s of [-1, 1]) {
    const x = s * (w / 2 - 0.8), z = d / 2 - 1.1;
    parts.push(cyl(0.35, 0.6, PAL.clay, x, 0.1, z, 0, 6), ico(0.55, 0, PAL.green, x, 1.1, z));
  }
  // 벽 아래 몰딩, 동선 중앙·출입문에는 아무것도 놓지 않는다.
  parts.push(box(w, 0.18, 0.12, PAL.bone, 0, 0.25, -d / 2 + 0.1));
  for (const s of [-1, 1]) parts.push(box(0.12, 0.18, d, PAL.bone, s * (w / 2 - 0.1), 0.25, 0));
  return parts;
}
