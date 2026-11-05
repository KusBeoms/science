// 섬 랜드마크의 가까이서 읽히는 부품. 바이옴 팔레트, 결정적 배치, 단일 병합 메시.
import type {LandmarkKind} from '../data/world-map.js';
import {PAL} from './lowpoly/palette.js';
import {box, ico, cone, cyl} from './lowpoly/prim.js';
import {ring, beam} from './lowpoly/structure.js';
export function sectorDetails(kind: LandmarkKind, c: readonly number[]): any[] {
  const p: any[] = [];
  if (kind === 'dome') {
    for (const s of [-1, 1]) {
      p.push(box(5, 0.2, 3, PAL.blue, s * 12, 1.5, -1));
      for (let i = 0; i < 3; i++) p.push(box(0.07, 0.04, 3, PAL.cloud, s * 12 - 1.5 + i * 1.5, 1.72, -1));
      p.push(beam([s * 12, 0, -1], [s * 12, 1.5, -1], 0.2, PAL.steel));
    }
  } else if (kind === 'arch') {
    for (let i = 0; i < 5; i++) p.push(ico(1.1 + i * 0.1, 0, c[4], (i - 2) * 4, 1.1 + i % 2, 8 + i % 3));
  } else if (kind === 'storm' || kind === 'disk' || kind === 'sun') {
    p.push(...ring(kind === 'storm' ? 9 : 15, 0.35, c[2], 0, kind === 'storm' ? 25 : 26, 0, 0.75, 18));
  } else if (kind === 'ring' || kind === 'spire' || kind === 'crystal') {
    for (let i = 0; i < 7; i++) { const a=i*2.4; p.push(cone(0.8,3+i%3,c[i%4],Math.cos(a)*11,0,Math.sin(a)*10,a,4)); }
  } else if (kind === 'obelisk') {
    p.push(...ring(13, 0.2, c[5], 0, 0.2, 0, Math.PI / 2, 24));
  } else if (kind === 'falls') {
    for (let i=0;i<5;i++) p.push(ico(1.3,0,c[4],(i-2)*3,0.8,12+i%2));
  } else if (kind === 'pillar' || kind === 'mount') {
    for (let i=0;i<5;i++) {const a=i*1.7;p.push(cyl(0.18,4+i,c[1],Math.cos(a)*12,0,Math.sin(a)*12,0,5),ico(1.3,0,c[3],Math.cos(a)*12,5+i,Math.sin(a)*12));}
  }
  return p;
}
