// 12개 섹터의 문: 크레이터·소행성·폭풍·고리·혜성·쌍성·성운·결정 등 실루엣.
import {BIOME, PAL, mix, type Biome} from './lowpoly/palette.js';
import {box, ico, cone} from './lowpoly/prim.js';
import {ring, beam} from './lowpoly/structure.js';
import {mergeGeometries} from './lowpoly/merge.js';

export function portalFrame(id: string, x = 0, z = 0, returning = false) {
  const c = BIOME[id as Biome], dark = mix(c[4], PAL.slate, 0.5), accent = c[5];
  const parts = [box(5.8, 0.4, 4, PAL.slate, x, 0, z), box(4.8, 0.2, 3.2, c[2], x, 0.4, z)];
  for (const s of [-1, 1]) parts.push(box(0.65, 6.2, 1.2, dark, x + s * 2.2, 0.6, z), box(0.2, 4.4, 0.1, accent, x + s * 2.2, 1.4, z + 0.65));
  parts.push(beam([x - 2.2, 6.8, z], [x, 8.3, z], 0.8, c[2]), beam([x, 8.3, z], [x + 2.2, 6.8, z], 0.8, c[2]));
  const ox = x, oy = 9.2;
  switch (id) {
    case 'solar':
      parts.push(ico(1.15, 0, c[3], ox, oy, z), ico(0.35, 0, dark, ox - 0.35, oy + 0.2, z + 0.9), ico(0.22, 0, dark, ox + 0.45, oy - 0.3, z + 1)); break;
    case 'belt':
      for (let i = 0; i < 5; i++) parts.push(ico(0.5 + i * 0.06, 0, c[i % 4], ox + Math.cos(i * 1.4) * 1.4, oy + Math.sin(i * 1.4) * 0.8, z)); break;
    case 'jovian':
      parts.push(ico(1.1, 1, c[2], ox, oy, z), box(2, 0.2, 0.15, accent, ox, oy, z + 0.95), box(1.7, 0.2, 0.15, c[0], ox, oy + 0.5, z + 0.8)); break;
    case 'giants':
      parts.push(ico(0.8, 0, c[2], ox, oy, z), ...ring(1.6, 0.2, accent, ox, oy, z, 0.7, 16)); break;
    case 'kuiper':
      parts.push(ico(0.8, 0, c[3], ox - 0.6, oy, z));
      for (let i = 0; i < 3; i++) parts.push(beam([ox, oy + i * 0.2, z], [ox + 1.9, oy + 0.6 + i * 0.35, z], 0.13, accent)); break;
    case 'reddwarf':
    case 'exo':
      for (const s of [-1, 1]) parts.push(ico(s < 0 ? 0.95 : 0.65, 0, s < 0 ? accent : c[3], ox + s * 0.8, oy, z)); break;
    case 'hotjup':
      parts.push(ico(0.9, 0, accent, ox, oy, z));
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; parts.push(beam([ox + Math.cos(a) * 1.2, oy + Math.sin(a) * 1.2, z], [ox + Math.cos(a) * 1.7, oy + Math.sin(a) * 1.7, z], 0.15, c[2])); } break;
    case 'nebula':
    case 'gargantua':
      parts.push(...ring(1.35, 0.24, accent, ox, oy, z, id === 'nebula' ? 0 : 0.7, 14), ...ring(0.8, 0.2, c[3], ox, oy, z, 0, 12), ico(0.45, 0, c[0], ox, oy, z)); break;
    case 'supernova':
      for (let i = 0; i < 5; i++) parts.push(cone(0.35, 1.8, i % 2 ? c[3] : accent, ox + (i - 2) * 0.55, oy - 0.7 + (i % 2) * 0.4, z, i * 0.3, 4)); break;
    case 'alpha':
      parts.push(cone(1.4, 1.8, c[2], ox, oy - 0.8, z, 0, 5), ico(0.5, 0, accent, ox, oy + 1.2, z)); break;
  }
  // 귀환은 정문 위 집 모양 픽토그램(실루엣으로 읽힌다).
  if (returning) parts.push(box(1, 0.7, 0.3, PAL.white, x, 6.5, z + 0.8), beam([x - 0.7, 7.2, z + 0.8], [x, 7.8, z + 0.8], 0.2, PAL.white), beam([x, 7.8, z + 0.8], [x + 0.7, 7.2, z + 0.8], 0.2, PAL.white));
  return mergeGeometries(parts);
}
