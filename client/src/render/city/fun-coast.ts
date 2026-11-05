// W5 FUN: 해변(남서)과 항구(남동). 파라솔·배구·서핑 렌탈·모래성 / 컨테이너 야적장·항만 크레인·요트.
import {approachNear} from '../../data/bridge.js';
import {NEUTRAL, PAL, mix} from '../lowpoly/palette.js';
import {box, cyl, ico, taper} from '../lowpoly/prim.js';
import {lowMat, mergeGeometries} from '../lowpoly/merge.js';
import {hash2} from '../lowpoly/rng.js';
import {YACHT, rideOvr} from '../../data/city-w5.js';
import {
  beachBar, block, container, gantry, lampBulb, lifeguard, lounge, parasol, put, sandcastle, surfRack, volleyNet, yachtGeo, type Ctx,
} from './fun-props.js';

const CANOPY = [PAL.red, PAL.yellow, PAL.cyan, PAL.pink, PAL.lime, PAL.orange, PAL.violet, PAL.blue];

export function buildBeach(c: Ctx) {
  // 파라솔 줄 (배구 코트·모래성 근처는 비운다)
  for (let x = -186, i = 0; x < -30; x += 12, i++) {
    if (Math.abs(x + 110) < 14 || Math.abs(x + 180) < 8) continue;
    parasol(c, x + (hash2(i, 1) - 0.5) * 3, 311 + (hash2(i, 2) - 0.5) * 2, CANOPY[i % 8], hash2(i, 3) * 6);
  }
  for (const [i, x] of [-168, -150, -128, -70, -46].entries()) parasol(c, x, 319 + hash2(i, 5) * 2, CANOPY[(i + 3) % 8], hash2(i, 6) * 6);
  // 선베드 (앉을 수 있는 자리는 spot 과 일치)
  for (const x of [-90, -140]) lounge(c, x, 327, x === -90 ? PAL.cyan : PAL.pink);
  for (const x of [-160, -75, -45]) lounge(c, x, 327, CANOPY[Math.abs(x) % 8]);
  volleyNet(c, -110, 320);
  // 서핑 렌탈 · 구조대 · 모래성 · 비치 바
  surfRack(c, -66, 322);
  lifeguard(c, -158, 316);
  sandcastle(c, -180, 322);
  beachBar(c, -40, 314);
  // 공 · 튜브
  put(c.solid, ico(0.45, 1, PAL.white, 0, 0.45, 0), -106, 0, 323);
  put(c.solid, mergeGeometries([cyl(0.9, 0.45, PAL.red, 0, 0, 0, 0, 10), cyl(0.5, 0.5, mix(PAL.bone, PAL.amber, 0.3), 0, 0, 0, 0, 10)]), -118, 0, 326);
  // 산책로(널빤지) 가로등
  for (let x = -186; x < -30; x += 38) lampBulb(c, x, 307.6, 4.6, PAL.cyan);
}

export function buildPort(c: Ctx) {
  // 컨테이너 야적장: 2줄 × 10칸, 높이 1~3
  const palette = [PAL.red, PAL.blue, PAL.orange, PAL.teal, PAL.yellow, PAL.violet, PAL.green, PAL.brick];
  for (let i = 0; i < 10; i++)
    for (const [j, z] of [[0, 313], [1, 325]] as const) {
      if (i === 4 && j === 1) continue;
      const approach = approachNear(36 + i * 12.5, z);
      if (approach.d < approach.w + 9) continue; // 곡선 진입로의 보도·회전 여유
      container(c, 36 + i * 12.5, z, 1 + Math.floor(hash2(i, j, 4) * 3), palette[Math.floor(hash2(i, j, 9) * 8)]);
    }
  gantry(c, 168, 326);
  // 항만 창고·말뚝·가로등
  for (let x = 30; x < 186; x += 28) put(c.solid, cyl(0.35, 0.9, NEUTRAL.coal, 0, 0, 0, 0, 6), x, 0, 331.8);
  for (let x = 40; x < 186; x += 38) lampBulb(c, x, 330.6, 6.5, PAL.white);
  // 요트 승선장 매표소
  put(c.solid, mergeGeometries([box(3.6, 3, 3.6, PAL.cloud, 0, 0, 0), box(4.2, 0.4, 4.2, PAL.blue, 0, 3, 0), taper(4.2, 4.2, 0.4, 0.4, 1.2, PAL.blue, 0, 3.4, 0), box(1.6, 1.2, 0.1, PAL.glass, 0, 1.2, 1.82)]), 94, 0, 330);
  block(c, 94, 330, 2);
  put(c.lit, box(3.2, 0.2, 0.2, PAL.yellow, 0, 2.9, 1.85), 94, 0, 330);
  // 요트: 계류(떠 있음). 0번은 탑승 중이면 항로를 따라간다
  const y0 = new THREE.Mesh(yachtGeo(PAL.red), lowMat()),
    y1 = new THREE.Mesh(yachtGeo(PAL.blue), lowMat()),
    y2 = new THREE.Mesh(mergeGeometries([box(2, 0.8, 4.2, PAL.orange, 0, -0.3, 0), taper(2, 1.5, 0.2, 0.2, 0.8, PAL.orange, 0, -0.3, 2.8), box(0.1, 1.4, 0.1, NEUTRAL.steel, 0, 0.4, 0)]), lowMat());
  c.anims.push(
    {mesh: y0, fn: (T, m) => {
      const o = rideOvr.yacht;
      if (o) m.position.set(o.x, o.y, o.z), (m.rotation.y = o.ry);
      else m.position.set(YACHT.moorX, -3.6 + Math.sin(T * 1.4) * 0.12, YACHT.moorZ), (m.rotation.y = 0);
      m.rotation.z = Math.sin(T * 1.1) * 0.03;
    }},
    {mesh: y1, fn: (T, m) => (m.position.set(128, -3.6 + Math.sin(T * 1.3 + 1) * 0.12, 358), (m.rotation.y = 0.3), (m.rotation.z = Math.sin(T) * 0.03))},
    {mesh: y2, fn: (T, m) => (m.position.set(150, -3.8 + Math.sin(T * 1.6 + 2) * 0.1, 352), (m.rotation.y = -0.5))},
  );
}
