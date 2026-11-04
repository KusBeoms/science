// 단계 배치: 매번 무작위. 항성(또는 블랙홀) 주위를 도는 행성(공전) + 따로 떨어져 혼자 자전하는 행성
import {SH, Z} from '../data/zones.js';
import {pickFrom} from '../data/planets.js';
import {rnd} from './util.js';
import type {Layout, LayItem, Nest, Star, StarDef} from './types.js';

export const STARS: StarDef[][] = [
  [{n: '태양', c: [0xffd27a, 0xffa84a], R: 4.5, orb: 5}],
  [
    {n: '적색왜성', c: [0xff6a4a, 0xff9a7a], R: 3.2, orb: 3},
    {n: '황색 항성', c: [0xffe27a, 0xffc04a], R: 4, orb: 3},
  ],
  [{n: '가르강튀아', bh: 1, c: [0xff9a3a, 0xffc070], R: 5, orb: 5}],
  [
    {n: '알파 센타우리 A', c: [0xffe8a0, 0xffc870], R: 4.2, orb: 3},
    {n: '알파 센타우리 B', c: [0xffb060, 0xff8a3a], R: 3.4, orb: 3},
  ],
];
export function genLayout(zi: number): Layout {
  const cz = Z[zi].z,
    stars: Star[] = [],
    items: LayItem[] = [],
    SOLO = 4;
  STARS[zi].forEach(def => {
    const rad = def.R + 6 + (def.orb - 1) * 2.4,
      lim = SH - rad - 3;
    for (let t = 0; t < 300; t++) {
      const x = rnd(-lim, lim),
        z = cz + rnd(-lim, lim);
      if (
        (Math.hypot(x, z - cz) > rad * 0.6 && stars.every(s => Math.hypot(s.x - x, s.z - z) > s.rad + rad - 4)) ||
        t === 299
      ) {
        stars.push(Object.assign({}, def, {x, z, rad}));
        break;
      }
    }
  });
  stars.forEach((st, si) => {
    for (let i = 0; i < st.orb; i++) {
      const r = st.R + 6 + i * 2.4,
        w = ((Math.random() < 0.5 ? -1 : 1) * rnd(3, 5.5)) / r;
      items.push({kind: 'orbit', s: si, r, a: rnd(0, 6.28), w, x: st.x, z: st.z});
    }
  });
  const solos: {x: number; z: number}[] = [];
  for (let t = 0; t < 600 && solos.length < SOLO; t++) {
    const x = rnd(-SH + 6, SH - 6),
      z = cz + rnd(-SH + 6, SH - 12);
    if (
      stars.every(s => Math.hypot(s.x - x, s.z - z) > s.rad + 3) &&
      Math.hypot(x, z - cz) > 9 &&
      solos.every(o => Math.hypot(o.x - x, o.z - z) > 16)
    )
      solos.push({x, z});
  }
  solos.forEach(p => items.push({kind: 'solo', x: p.x, z: p.z}));
  return {stars, items};
}
export function stepLayout(l: Layout, dt: number) {
  l.items.forEach(it => {
    if (it.kind !== 'orbit') return;
    it.a += it.w * dt;
    const st = l.stars[it.s];
    it.x = st.x + Math.cos(it.a) * it.r;
    it.z = st.z + Math.sin(it.a) * it.r;
  });
}
export const LAY: Layout[] = Z.map((_, i) => {
  const l = genLayout(i);
  stepLayout(l, 0);
  return l;
});
export const nestPos = (zi: number, k: number) => LAY[zi].items[k];
export const nests: Nest[] = Z.map((z, i) => ({
  t: LAY[i].items.map(() => 0),
  cd: LAY[i].items.map(() => 0),
  s: LAY[i].items.map(() => pickFrom(z.pool)),
}));
