// 차량 디테일. 기존 solid에 합쳐 파손 영역 판정·전조등 인덱스를 유지한다.
import {PAL} from './lowpoly/palette.js';
import {box, panel} from './lowpoly/prim.js';
export function carDetails(id: string, W: number, H: number, L: number, color: number): any[] {
  const parts: any[] = [], y = Math.max(0.45, H * 0.2) * 0.8 + H * 0.2;
  const open = ['kart', 'cart', 'buggy', 'rocket'].includes(id);
  if (!open) {
    for (const s of [-1, 1]) {
      parts.push(box(W * 0.86, 0.16, 0.22, PAL.steel, 0, y - 0.2, s * L / 2));
      parts.push(panel(W * 0.38, 0.22, PAL.cloud, 0, y + 0.05, s * (L / 2 + 0.13), s > 0 ? 0 : Math.PI));
      parts.push(box(0.24, 0.24, 0.42, color, s * (W / 2 + 0.03), H * 0.65, L * 0.18));
    }
    // B필러: 유리 띠를 창문 칸으로 나누되 얇은 면으로 예산을 제한한다.
    const count = id === 'bus' ? 6 : id === 'limo' ? 3 : 1;
    for (let i = 0; i < count; i++) for (const s of [-1, 1]) {
      const z = count === 1 ? -L * 0.03 : -L * 0.34 + i * L * 0.68 / (count - 1);
      parts.push(panel(0.13, H * 0.28, PAL.coal, s * (W / 2 + 0.03), H * 0.69, z, s * Math.PI / 2));
    }
    if (id === 'pickup') {
      parts.push(box(W, 0.85, 0.16, color, 0, y + H * 0.15, -L / 2));
      for (const s of [-1, 1]) parts.push(box(0.16, 0.85, L * 0.35, color, s * W * 0.46, y + H * 0.15, -L * 0.3));
    }
  }
  if (['sport', 'super', 'rocket'].includes(id)) for (const s of [-1, 1]) parts.push(box(0.16, 0.5, 0.16, PAL.coal, s * W * 0.3, y + 0.25, -L * 0.39));
  return parts;
}
