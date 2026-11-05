// 남부 야생지 장식: 숲·농장(헛간·사일로·풍차·울타리·건초)·사막 선인장/바위·호수 선착장·산길 이정표와 정상 깃발·오두막, 그리고 교도소 단지.
// 전부 병합/인스턴싱. 충돌체는 건물·교도소 벽만 등록한다(나무는 지나갈 수 있다).
import {uniform} from './uniform.js';
import {G} from '../core/runtime.js';
import {addSolid, groundH} from '../core/terrain.js';
import {COUNTRY, DESERT, JAIL, LAKES, MOUNTAIN, SUMMIT, WILD_RECT} from '../data/wild.js';
import {SEA_Y} from '../data/world-map.js';
import {ACCENT, NEUTRAL, PAL, mix} from './lowpoly/palette.js';
import {box, cone, cyl, gable, ico, type Geo} from './lowpoly/prim.js';
import {hash2, mulberry32} from './lowpoly/rng.js';
import {instancedChunks, keep, lowMat, mergePlaced, type Inst, type Placed} from './lowpoly/merge.js';
import {pineGeo, roundTreeGeo} from './city/props.js';
import {blocky} from './characters.js';
import {PLAYER_SCALE} from '../core/scale.js';
import {setBarsMesh, setBrickMesh} from '../systems/jail.js';

const parts = (l: Geo[]): Placed[] => l.map(g => ({g}));
let wheel: any = null;

function barn(): Geo {
  return mergePlaced(parts([
    box(14, 7, 10, PAL.brick), box(15, 0.5, 11, PAL.cloud, 0, 7), gable(15, 4, 11, PAL.slate, 0, 7.4), box(4, 5, 0.4, PAL.cloud, 0, 0, 5.1),
    box(0.5, 5.2, 0.4, PAL.cloud, -2.1, 0, 5.2), box(0.5, 5.2, 0.4, PAL.cloud, 2.1, 0, 5.2),
  ]));
}
function silo(): Geo {
  return mergePlaced(parts([cyl(2.6, 11, NEUTRAL.ash, 0, 0, 0, 0, 10), cone(2.9, 3, PAL.tileRed, 0, 11, 0, 0, 10)]));
}
function farmhouse(): Geo {
  return mergePlaced(parts([box(10, 5, 8, PAL.plaster), gable(11, 3.4, 9, PAL.tileRed, 0, 5), box(1.4, 3, 0.3, PAL.wood, 0, 0, 4.1), box(2, 1.6, 0.3, PAL.glass, -3, 1.6, 4.1), box(2, 1.6, 0.3, PAL.glass, 3, 1.6, 4.1)]));
}
function windmill(): {still: Geo; blades: Geo} {
  const blades: Geo[] = [];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    blades.push(box(0.6, 9, 0.2, PAL.cloud, 0, 0, 0, 0)); // placeholder, rotated below via THREE
    const g = new THREE.BoxGeometry(1.6, 9, 0.2).toNonIndexed();
    g.translate(0, 4.8, 0);
    g.rotateZ(a);
    const n = g.attributes.position.count,
      col = new Float32Array(n * 3).fill(0.9);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    blades[blades.length - 1] = g;
  }
  return {
    still: mergePlaced(parts([box(7, 1, 7, NEUTRAL.stone), box(5, 12, 5, PAL.plaster, 0, 1), box(6, 0.8, 6, PAL.tileRed, 0, 13), cone(3.4, 3, PAL.tileRed, 0, 13.8, 0, 0, 4)])),
    blades: mergePlaced(parts(blades)),
  };
}
function cactus(): Geo {
  return mergePlaced(parts([box(1.1, 5, 1.1, ACCENT.green, 0, 0, 0), box(2.2, 0.9, 0.9, ACCENT.green, 0.9, 2, 0), box(0.9, 2, 0.9, ACCENT.green, 1.9, 2, 0), box(2, 0.9, 0.9, ACCENT.green, -0.9, 3, 0), box(0.9, 1.8, 0.9, ACCENT.green, -1.8, 3, 0)]));
}
function hut(): Geo {
  return mergePlaced(parts([box(9, 4.4, 7, PAL.wood), gable(10, 3, 8, PAL.slate, 0, 4.4), box(1.4, 3, 0.3, PAL.coal, 0, 0, 3.6), box(1.8, 1.4, 0.3, PAL.glass, -3, 1.6, 3.6)]));
}
function flag(): Geo {
  return mergePlaced(parts([cyl(0.2, 9, NEUTRAL.steel, 0, 0, 0, 0, 5), box(3.4, 2, 0.15, ACCENT.red, 1.7, 7, 0), box(3, 0.8, 4, PAL.stone, 0, -0.4, 0), ico(1.6, 0, PAL.stone, 1.8, 0.6, 1.6)]));
}

export function buildWild(): any {
  const grp = new THREE.Group();
  grp.name = 'wild';
  const solids: Placed[] = [],
    rnd = mulberry32(4242),
    put = (g: Geo, x: number, z: number, ry = 0, hw = 0, hd = 0) => {
      const y = Math.max(groundH(x, z), 0);
      solids.push({g, x, y, z, ry});
      if (hw) addSolid(x - hw, z - hd, x + hw, z + hd);
    };
  // --- 시골: 헛간·사일로·농가·건초·울타리·풍차 ---
  const [cx0, cz0, cx1, cz1] = COUNTRY;
  const B = barn(), F = farmhouse(), Si = silo();
  for (let k = 0; k < 6; k++) {
    const x = cx0 + 40 + (k % 3) * 80 + rnd() * 10,
      z = cz0 + 50 + Math.floor(k / 3) * 120 + rnd() * 10;
    put(B, x, z, (k % 2) * Math.PI, 7.5, 5.5);
    put(Si, x + 11, z - 2, 0, 2.7, 2.7);
    put(F, x - 16, z + 4, 0, 5.5, 4.5);
    for (let h = 0; h < 4; h++) put(mergePlaced(parts([cyl(1.4, 1.8, PAL.amber, 0, 0, 0, 0, 7)])), x + 4 + h * 3.5, z + 12 + (h % 2) * 2, 0);
    for (let f = 0; f < 10; f++) { // 울타리: 마당 가장자리
      put(mergePlaced(parts([box(0.3, 1.6, 0.3, PAL.wood), box(3, 0.3, 0.2, PAL.wood, 1.5, 0.9, 0)])), x - 20 + f * 3, z + 18, 0);
    }
  }
  const wm = windmill();
  const wx = cx0 + 160,
    wz = cz0 + 30;
  put(wm.still, wx, wz, 0, 3.5, 3.5);
  // --- 호수 선착장 + 작은 배 ---
  const L = LAKES[0],
    dockX = L.x - L.r * 0.98;
  for (let k = 0; k < 6; k++) put(mergePlaced(parts([box(2.6, 0.4, 4, PAL.wood), box(0.4, 1.2, 0.4, PAL.coal, -1.1, -0.8, 1.5), box(0.4, 1.2, 0.4, PAL.coal, 1.1, -0.8, 1.5)])), dockX + 5 + k * 4, L.z, Math.PI / 2);
  solids.push({g: mergePlaced(parts([box(2.4, 0.8, 5.4, PAL.red), box(2, 0.3, 4.6, PAL.bone, 0, 0.8)])), x: dockX + 32, y: SEA_Y + 0.1, z: L.z + 4, ry: 0.4});
  // --- 산: 이정표(나선형 등산로) · 오두막 · 정상 깃발 ---
  const M = MOUNTAIN,
    post = mergePlaced(parts([cyl(0.18, 2.6, PAL.wood, 0, 0, 0, 0, 5), box(1.2, 0.5, 0.15, PAL.red, 0, 2, 0)]));
  for (let k = 0; k < 28; k++) {
    const a = 1.4 + k * 0.5,
      r = M.r * 0.92 * (1 - k / 29);
    put(post, M.x + Math.cos(a) * r, M.z + Math.sin(a) * r * 0.9, 0);
  }
  put(hut(), M.x + 20, M.z - M.r * 0.93, 0, 5, 4);
  put(flag(), SUMMIT.x, SUMMIT.z, 0);
  // --- 사막: 선인장·바위 ---
  const cac = cactus();
  for (let k = 0; k < 90; k++) {
    const x = DESERT.x0 + 20 + rnd() * (WILD_RECT[2] - DESERT.x0 - 30),
      z = DESERT.z0 + 20 + rnd() * (WILD_RECT[3] - DESERT.z0 - 30);
    if (Math.hypot(x - M.x, z - M.z) < M.r * 0.95) continue;
    if (k % 3) put(cac, x, z, rnd() * 6);
    else put(mergePlaced(parts([ico(1.2 + rnd() * 1.6, 0, mix(PAL.stone, PAL.clay, 0.4), 0, 1, 0)])), x, z, rnd() * 6);
  }
  grp.add(new THREE.Mesh(mergePlaced(solids), lowMat()));
  // --- 숲: 평야·시골·산기슭에 나무 ---
  const pines: Inst[] = [],
    trees: Inst[] = [];
  for (let gx = WILD_RECT[0] + 10; gx < WILD_RECT[2]; gx += 12)
    for (let gz = WILD_RECT[1] + 40; gz < WILD_RECT[3]; gz += 12) {
      const x = gx + (hash2(gx, gz, 5) - 0.5) * 9,
        z = gz + (hash2(gx, gz, 6) - 0.5) * 9,
        y = groundH(x, z);
      if (y < SEA_Y + 1.2 || y > 55) continue;
      if (x > DESERT.x0 && z > DESERT.z0) continue; // 사막엔 나무 없음
      const inFarm = x < COUNTRY[2] && z > COUNTRY[1] && z < COUNTRY[3];
      const m = Math.hypot(x - M.x, z - M.z) / M.r;
      const dens = m < 1 ? 0.45 : inFarm ? 0.07 : 0.2;
      if (hash2(gx, gz, 7) > dens) continue;
      if (x > JAIL.flat[0] - 4 && x < JAIL.flat[2] + 4 && z > JAIL.flat[1] - 4 && z < JAIL.flat[3] + 4) continue;
      (hash2(gx, gz, 8) < (m < 1 ? 0.7 : 0.35) ? pines : trees).push({x, y, z, ry: hash2(gx, gz, 9) * 6, s: 1.1 + hash2(gx, gz, 4) * 0.7});
    }
  grp.add(instancedChunks(pineGeo(), lowMat(), pines), instancedChunks(roundTreeGeo(), lowMat(), trees));
  const w = new THREE.Mesh(wm.blades, lowMat());
  w.position.set(wx, 10.5, wz + 3.2);
  grp.add(w);
  wheel = w;
  buildPrison(grp);
  return grp;
}

/** 교도소: 담장(북쪽 모서리에 일부러 남긴 틈 + 쓰레기통), 감시탑 4, 감방 블록(서쪽 벽에 헐거운 벽돌), 철창문, 간수 */
function buildPrison(grp: any) {
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
export const wildUpdate = (raw: number) => {
  if (wheel) wheel.rotation.z += raw * 0.6;
};
void keep;
