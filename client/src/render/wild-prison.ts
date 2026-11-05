// 시골 섬 교도소 단지(W6 위치 그대로): 담장(북쪽 모서리 틈 + 쓰레기통), 감시탑 4, 감방 블록(서쪽 벽에 헐거운 벽돌), 철창문, 간수. 충돌체는 담장·탑·블록 벽.
import {G} from '../core/runtime.js';
import {addSolid} from '../core/terrain.js';
import {JAIL} from '../data/wild.js';
import {PAL, NEUTRAL, mix} from './lowpoly/palette.js';
import {box} from './lowpoly/prim.js';
import {lowMat, mergePlaced, type Placed} from './lowpoly/merge.js';
import {uniform} from './uniform.js';
import {blocky} from './characters.js';
import {PLAYER_SCALE} from '../core/scale.js';
import {setBarsMesh, setBrickMesh} from '../systems/jail.js';
import type {Geo} from './lowpoly/prim.js';

const parts = (l: Geo[]): Placed[] => l.map(g => ({g}));
/** 교도소: 담장(북쪽 모서리에 일부러 남긴 틈 + 쓰레기통), 감시탑 4, 감방 블록(서쪽 벽에 헐거운 벽돌), 철창문, 간수 */
export function buildPrison(grp: any) {
  const [x0, z0, x1, z1] = JAIL.rect,
    J0 = z0 - 725, // 감방 블록 좌표는 담장 기준 상대(원래 담장 z=725 기준)
    T = 2,
    H = 7,
    wall = PAL.stone,
    S: Placed[] = [],
    solid = (a: number, b: number, c: number, d: number, h = H, col: number = wall) => {
      S.push({g: box(c - a, h, d - b, col, 0, 0, 0), x: (a + c) / 2, y: 0, z: (b + d) / 2});
      addSolid(a, b, c, d);
    };
  const g = JAIL.gap;
  solid(x0, z0, g.x0, z0 + T); // 북쪽 담장 (틈 왼쪽)
  solid(g.x1, z0, x1, z0 + T); // 북쪽 담장 (틈 오른쪽)
  solid(x0, z1 - T, x1, z1);
  solid(x0, z0, x0 + T, z1);
  solid(x1 - T, z0, x1, z1);
  // 틈 앞 쓰레기통 (일부를 막지만 좁게 지나갈 수 있다)
  S.push({g: box(2, 1.6, 1.4, PAL.green, 0, 0, 0), x: (g.x0 + g.x1) / 2 + 0.9, y: 0, z: z0 - 1.3});
  addSolid((g.x0 + g.x1) / 2 - 0.1, z0 - 2, (g.x0 + g.x1) / 2 + 1.9, z0 - 0.6);
  // 감시탑
  for (const [tx, tz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
    S.push({g: mergePlaced(parts([box(5, 12, 5, PAL.ash, 0, 0, 0), box(6.4, 0.8, 6.4, PAL.slate, 0, 12), box(5.4, 2.2, 5.4, PAL.glass, 0, 12.8), box(6.4, 0.6, 6.4, PAL.coal, 0, 15)])), x: tx, y: 0, z: tz});
    addSolid(tx - 2.5, tz - 2.5, tx + 2.5, tz + 2.5);
  }
  // 감방 블록 (30×24): 서쪽 벽의 헐거운 벽돌 자리(z 745.9~749.1)만 비워 둔다
  const bx0 = -215, bz0 = 740 + J0, bx1 = -185, bz1 = 764 + J0, tk = 0.8, hh = 6, blk = PAL.brick;
  solid(bx0, bz0, bx1, bz0 + 1, hh, blk);
  solid(bx0, bz1 - 1, bx1, bz1, hh, blk);
  solid(bx1 - 1, bz0, bx1, bz1, hh, blk);
  solid(bx0 - tk, bz0, bx0, JAIL.brick.z - 1.6, hh, blk);
  solid(bx0 - tk, JAIL.brick.z + 1.6, bx0, bz1, hh, blk);
  solid(bx0 + 10, bz0, bx0 + 11, 752.4 + J0, hh, blk); // 감방 동쪽 벽
  // 블록 지붕(덮개)
  S.push({g: box(31, 0.8, 25, PAL.slate, 0, 0, 0), x: (bx0 + bx1) / 2, y: hh, z: (bz0 + bz1) / 2});
  grp.add(new THREE.Mesh(mergePlaced(S), lowMat()));
  // 헐거운 벽돌(보임/안 보임) + 철창 (jail.ts 가 켜고 끈다)
  const brick = new THREE.Mesh(mergePlaced([{g: box(0.8, hh, 3.2, mix(PAL.brick, PAL.clay, 0.5)), x: JAIL.brick.x + 0.4, z: JAIL.brick.z}]), lowMat());
  grp.add(brick);
  setBrickMesh(brick);
  const bars: Placed[] = [];
  for (let k = 0; k < 9; k++) bars.push({g: box(0.18, 5, 0.18, NEUTRAL.coal), x: JAIL.cell.x - 4.4 + k * 1.1, y: 0, z: 751.8 + J0});
  bars.push({g: box(10, 0.3, 0.3, NEUTRAL.coal), x: JAIL.cell.x, y: 4.8, z: 751.8 + J0});
  const barsMesh = new THREE.Mesh(mergePlaced(bars), lowMat());
  grp.add(barsMesh);
  setBarsMesh(barsMesh);
  // 간수 (마당을 느긋이 지키는 장식)
  for (const [gx, gz] of [[-225, 750 + J0], [-200, 772 + J0], [-176, 740 + J0]]) {
    const gd = blocky(0x2a3f6a, 0x1b2438, '#e0b090', PLAYER_SCALE, 0x1b2438);
    uniform(gd, 'guard');
    gd.position.set(gx, 0, gz);
    gd.rotation.y = Math.PI;
    G.scene.add(gd);
    guards.push(gd);
  }
}
export const guards: any[] = [];
