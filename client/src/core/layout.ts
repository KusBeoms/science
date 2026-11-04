// 섹터 배치 (지연 생성): 항성(또는 블랙홀) 주위를 도는 행성(공전) + 따로 떨어져 혼자 자전하는 행성
// 레이아웃·둥지는 섹터가 처음 필요할 때 만들고(데이터라 해제하지 않음), 시간은 advance() 로 활성 섹터만 진행한다.
import {SECTORS} from '../data/sectors.js';
import {pickFrom} from '../data/planets.js';
import {rnd} from './util.js';
import {gateFrame, padPos} from './geometry.js';
import type {Layout, LayItem, Nest, Star} from './types.js';

/** 둥지에 쓸 풀: 비어 있으면 앞 섹터의 풀을 빌린다 (행성 데이터가 아직 없는 섹터용) */
export function poolOf(i: number): number[] {
  for (let j = i; j >= 0; j--) if (SECTORS[j].pool.length) return SECTORS[j].pool;
  return [0];
}
function genLayout(i: number): Layout {
  const s = SECTORS[i],
    {x: cx, z: cz} = s.center,
    h = s.size / 2,
    stars: Star[] = [],
    items: LayItem[] = [],
    pad = padPos(i),
    gate = gateFrame(i);
  s.stars.forEach(def => {
    const rad = def.R + 6 + (def.orb - 1) * 2.4,
      lim = h - rad - 3;
    for (let t = 0; t < 300; t++) {
      const x = cx + rnd(-lim, lim),
        z = cz + rnd(-lim, lim);
      if (
        (Math.hypot(x - cx, z - cz) > rad * 0.6 &&
          Math.hypot(x - pad.x, z - pad.z) > rad + 4 &&
          stars.every(o => Math.hypot(o.x - x, o.z - z) > o.rad + rad - 4)) ||
        t === 299
      ) {
        stars.push(Object.assign({}, def, {x, z, rad}));
        break;
      }
    }
  });
  stars.forEach((st, si) => {
    for (let k = 0; k < st.orb; k++) {
      const r = st.R + 6 + k * 2.4,
        w = ((Math.random() < 0.5 ? -1 : 1) * rnd(3, 5.5)) / r;
      items.push({kind: 'orbit', s: si, r, a: rnd(0, 6.28), w, x: st.x, z: st.z});
    }
  });
  const solos: {x: number; z: number}[] = [];
  for (let t = 0; t < 150 * s.solo && solos.length < s.solo; t++) {
    const x = cx + rnd(-h + 6, h - 6),
      z = cz + rnd(-h + 6, h - 6);
    if (
      stars.every(o => Math.hypot(o.x - x, o.z - z) > o.rad + 3) &&
      Math.hypot(x - cx, z - cz) > 9 &&
      Math.hypot(x - gate.x, z - gate.z) > 12 &&
      Math.hypot(x - pad.x, z - pad.z) > 6 &&
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
const LAY: (Layout | null)[] = SECTORS.map(() => null);
/** 섹터별 둥지 상태 (생성 전 null). 생성된 것만 순회하려면 forEachNest */
export const nests: (Nest | null)[] = SECTORS.map(() => null);
/** 레이아웃·둥지를 (없으면 만들어) 돌려준다. now = 생성 시각(G.gameT) */
export function layoutOf(i: number, now = 0): Layout {
  let l = LAY[i];
  if (!l) {
    l = LAY[i] = genLayout(i);
    stepLayout(l, 0);
    const pool = poolOf(i);
    nests[i] = {t: l.items.map(() => 0), cd: l.items.map(() => 0), s: l.items.map(() => pickFrom(pool)), at: now};
  }
  return l;
}
export const nestOf = (i: number) => (layoutOf(i), nests[i]!);
export const nestPos = (i: number, k: number) => layoutOf(i).items[k];
export const forEachNest = (f: (n: Nest, i: number) => void) =>
  nests.forEach((n, i) => {
    if (n) f(n, i);
  });
/** 섹터 시간을 now 까지 진행 (재생성 타이머·재도전 쿨다운·공전). 오래 비활성이던 섹터도 한 번에 따라잡는다 */
export function advance(i: number, now: number) {
  const l = layoutOf(i, now),
    n = nests[i]!,
    e = now - n.at;
  n.at = now;
  if (e <= 0) return;
  n.t.forEach((v, k) => {
    if (v > 0 && v < 1e8 && (n.t[k] -= e) <= 0) n.t[k] = 0;
    if (n.cd[k] > 0) n.cd[k] -= e;
  });
  stepLayout(l, e);
}
