// 블록 인물 유니폼: 글자 텍스처 없이 등번호는 얇은 7세그먼트 면으로 그린다.
import {PAL} from './lowpoly/palette.js';
import {panel} from './lowpoly/prim.js';
import {mergeGeometries, lowMat} from './lowpoly/merge.js';
const DIGITS = ['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'];
export function uniform(model: any, kind: 'player' | 'referee' | 'guard', n = 0) {
  const p: any[] = [];
  if (kind === 'player') {
    const segments: Record<string, number[]> = {a:[0,0.9,0.5,0.09],b:[0.25,0.66,0.09,0.42],c:[0.25,0.18,0.09,0.42],d:[0,-0.05,0.5,0.09],e:[-0.25,0.18,0.09,0.42],f:[-0.25,0.66,0.09,0.42],g:[0,0.43,0.5,0.09]};
    for (const key of DIGITS[n % 10]) { const [x,y,w,h]=segments[key]; p.push(panel(w,h,PAL.white,x,2.7+y,-0.51,Math.PI)); }
    p.push(panel(0.28,0.32,PAL.amber,-0.5,3.5,0.51));
  } else {
    p.push(panel(0.28,0.36,PAL.amber,-0.5,3.4,0.51), panel(0.5,0.08,PAL.cloud,0.45,3.4,0.51), panel(2,0.16,PAL.ink,0,2.15,0.51));
  }
  model.add(new THREE.Mesh(mergeGeometries(p),lowMat()));
}
