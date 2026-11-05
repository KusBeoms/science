// W6 DOWNTOWN 단지 소품: 아파트 단지 정문 · 놀이터 · 주차장(선·주차 차 모형) · 금융 지구 화단·가로등. 병합 메시 2장(solid + 밤 lit) + 충돌.
// 건물 본체는 highrise.ts, 데이터는 data/city-w6.ts. 밤 전용 lit 메시는 downtownSystem 이 G.night 에 맞춰 켠다(낮엔 보이는 MeshBasicMaterial 없음).
import {G} from '../../core/runtime.js';
import {addSolid} from '../../core/terrain.js';
import {COMPLEXES, W6_PARCELS, type Rect4} from '../../data/city-w6.js';
import {ACCENT, NEUTRAL, PAL, mix} from '../lowpoly/palette.js';
import {box, cyl, wedge, type Geo} from '../lowpoly/prim.js';
import {glowMat, lowMat, mergePlaced, type Placed} from '../lowpoly/merge.js';
import {hash2} from '../lowpoly/rng.js';
import type {GameSystem} from '../../core/types.js';

const lit: any[] = [];
const CAR_C = [PAL.red, PAL.blue, PAL.cloud, PAL.coal, PAL.amber, PAL.teal, PAL.stone];

function parking(sol: Placed[], blocks: Rect4[], [x0, z0, x1, z1]: Rect4, seed: number) {
  const P = (g: Geo) => sol.push({g});
  P(box(x1 - x0, 0.06, z1 - z0, PAL.asphalt, (x0 + x1) / 2, 0, (z0 + z1) / 2));
  const n = Math.floor((x1 - x0) / 3.2);
  for (let i = 0; i <= n; i++) P(box(0.18, 0.04, z1 - z0 - 1.4, PAL.white, x0 + 0.8 + i * 3.2, 0.06, (z0 + z1) / 2));
  for (let i = 0; i < n; i++) {
    if (hash2(i, seed, 5) > 0.55) continue;
    const x = x0 + 2.4 + i * 3.2,
      z = (z0 + z1) / 2 + (hash2(i, seed, 6) - 0.5) * 1.2,
      c = CAR_C[Math.floor(hash2(i, seed, 7) * CAR_C.length)];
    P(box(1.9, 0.8, 3.8, c, x, 0.1, z));
    P(box(1.6, 0.6, 1.9, PAL.glass, x, 0.9, z - 0.1));
    blocks.push([x - 1, z - 1.9, x + 1, z + 1.9]);
  }
}
function playground(sol: Placed[], blocks: Rect4[], [x0, z0, x1, z1]: Rect4) {
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2,
    P = (g: Geo) => sol.push({g});
  P(box(x1 - x0, 0.08, z1 - z0, mix(PAL.amber, PAL.bone, 0.55), cx, 0, cz)); // 모래 바닥
  // 미끄럼틀: 계단 탑 + 경사로
  P(box(2.2, 3.2, 2.2, PAL.red, x0 + 2, 0, cz - 1));
  P(box(2.4, 0.3, 2.4, PAL.yellow, x0 + 2, 3.2, cz - 1));
  P(wedge(1.4, 3, 4.5, PAL.cyan, x0 + 2, 0.1, cz + 2.4));
  blocks.push([x0 + 0.9, cz - 2.1, x0 + 3.1, cz + 0.1]);
  // 그네 틀
  const gx = x1 - 5;
  P(box(0.3, 3.6, 0.3, PAL.steel, gx - 2.2, 0, cz - 1.6));
  P(box(0.3, 3.6, 0.3, PAL.steel, gx + 2.2, 0, cz - 1.6));
  P(box(4.8, 0.3, 0.3, PAL.steel, gx, 3.6, cz - 1.6));
  P(box(0.9, 0.15, 0.5, PAL.orange, gx - 0.9, 1.0, cz - 1.6));
  P(box(0.9, 0.15, 0.5, PAL.blue, gx + 0.9, 1.0, cz - 1.6));
  blocks.push([gx - 2.4, cz - 1.8, gx + 2.4, cz - 1.4]);
  // 시소 · 모래놀이 · 벤치
  P(box(4, 0.2, 0.6, PAL.green, cx, 0.5, z1 - 2));
  P(box(0.5, 0.5, 0.5, NEUTRAL.steel, cx, 0, z1 - 2));
  for (const s of [-1, 1]) P(box(2.2, 0.5, 0.6, PAL.wood, cx + s * 3.2, 0.1, z0 + 1.2));
}
/** 정문: 기둥 2 + 가로보 + 밤에 켜지는 등 */
function gate(sol: Placed[], ll: Placed[], blocks: Rect4[], x: number, z: number, face: string) {
  const h = 5.2;
  for (const s of [-1, 1]) {
    sol.push({g: box(1.2, h, 1.2, PAL.stone), x: x + s * 5.4, z, y: 0});
    sol.push({g: box(0.6, 0.6, 0.6, PAL.amber), x: x + s * 5.4, z, y: h});
    ll.push({g: box(0.5, 0.5, 0.5, ACCENT.amber), x: x + s * 5.4, z, y: h + 0.1});
    blocks.push([x + s * 5.4 - 0.6, z - 0.6, x + s * 5.4 + 0.6, z + 0.6]);
  }
  sol.push({g: box(12, 0.9, 0.9, PAL.slate), x, z, y: h - 0.9});
  ll.push({g: box(6, 0.35, 0.25, ACCENT.cyan), x, z: z + (face === 's' ? 0.5 : -0.5), y: h - 0.7});
}

export function buildDowntown(): any {
  const grp = new THREE.Group(),
    sol: Placed[] = [],
    ll: Placed[] = [],
    blocks: Rect4[] = [];
  grp.name = 'downtown';
  lit.length = 0;
  COMPLEXES.forEach((c, k) => {
    c.parking.forEach((r, i) => parking(sol, blocks, r, k * 10 + i));
    playground(sol, blocks, c.playground);
    gate(sol, ll, blocks, c.gate.x, c.gate.z, c.gate.face);
  });
  // 금융 지구: 보행로(z=-233) 양옆 화단 + 가로등 (밤엔 등이 켜진다)
  const [fx0, , fx1] = W6_PARCELS.finE;
  for (let x = fx0 + 8; x < fx1 - 4; x += 14) {
    for (const z of [-236.6, -229.4]) {
      sol.push({g: box(2.4, 0.7, 2.4, PAL.stone), x, z, y: 0});
      sol.push({g: box(1.8, 0.5, 1.8, PAL.green), x, z, y: 0.7});
      blocks.push([x - 1.2, z - 1.2, x + 1.2, z + 1.2]);
    }
    sol.push({g: cyl(0.16, 5.2, NEUTRAL.steel, 0, 0, 0, 0, 5), x: x + 3, z: -239.2, y: 0});
    sol.push({g: box(0.9, 0.3, 0.9, NEUTRAL.coal), x: x + 3, z: -239.2, y: 5.2});
    ll.push({g: box(0.7, 0.12, 0.7, mix(ACCENT.amber, PAL.white, 0.5)), x: x + 3, z: -239.2, y: 5.15});
  }
  grp.add(new THREE.Mesh(mergePlaced(sol), lowMat()));
  const m = new THREE.Mesh(mergePlaced(ll), glowMat());
  m.visible = false;
  lit.push(m);
  grp.add(m);
  for (const [x0, z0, x1, z1] of blocks) addSolid(x0, z0, x1, z1);
  return grp;
}

export const downtownSystem: GameSystem = {
  id: 'downtown',
  update() {
    const on = G.night > 0;
    if (lit.length && lit[0].visible !== on) lit.forEach(m => (m.visible = on));
  },
};
