// 벤치에 앉기: 가까운 벤치에서 E → 앉는다(앉은 자세), 이동·점프 키를 누르면 일어난다. 자리 목록은 render/city/layout.ts 의 BENCH_SPOTS.
import {G} from '../core/runtime.js';
import {groundH} from '../core/terrain.js';
import {dist2} from '../core/util.js';
import {BENCH_SPOTS} from '../render/city/layout.js';
import type {Interactable, Target} from '../core/types.js';

interface BenchT extends Target {
  kind: 'bench';
  d: number;
  i: number;
}
export const benchIt: Interactable<BenchT> = {
  kind: 'bench',
  tier: 0,
  find(me) {
    if (G.sit || G.drive || G.inside) return null;
    let best = -1,
      bd = 3.2;
    BENCH_SPOTS.forEach((b, i) => {
      const d = dist2(me.pos, b);
      if (d < bd) [best, bd] = [i, d];
    });
    return best < 0 ? null : {kind: 'bench', d: bd, i: best};
  },
  info: () => '벤치',
  prompt: () => 'E 🪑 착석',
  act(t, key) {
    if (key !== 'e') return;
    const b = BENCH_SPOTS[t.i];
    G.sit = {x: b.x, y: groundH(b.x, b.z) + 0.9, z: b.z, ry: b.ry ?? 0};
  },
};
