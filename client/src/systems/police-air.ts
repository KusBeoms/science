// 경찰 헬기(★4 이상)와 바리케이드(★5 이상). 헬기가 70u 안에서 시야에 잡으면 별이 식지 않는다(건물 안으로 숨어야 한다). 바리케이드는 앞길을 막는다.
import {S} from '../core/state.js';
import {G, paused} from '../core/runtime.js';
import {addDynSolid, dropDynSolid, groundH, type Solid} from '../core/terrain.js';
import {CITY_ROADS} from '../data/city.js';
import {CITY_HALF} from '../data/world-map.js';
import {PAL} from '../render/lowpoly/palette.js';
import {box} from '../render/lowpoly/prim.js';
import {lowMat, mergePlaced, type Placed} from '../render/lowpoly/merge.js';
import {removeVeh, spawnVeh, type Veh} from './vehicle.js';
import {sfx} from '../audio/index.js';
import {toast} from '../game/hud.js';
import type {GameSystem} from '../core/types.js';
import {dropDynSolid as drop2} from '../core/terrain.js';

export let heliSees = false;
let heli: {g: any; rotor: any; beam: any; x: number; z: number; a: number} | null = null,
  chopT = 0;
const blocks: {meshes: any; solids: Solid[]; cars: Veh[]; x: number; z: number}[] = [];

function makeHeli() {
  const g = new THREE.Group(),
    P: Placed[] = [
      {g: box(2.6, 2, 5.4, PAL.slate), y: 0},
      {g: box(1.1, 1, 6, PAL.slate), y: 0.5, z: -5.6},
      {g: box(0.3, 2.2, 1.2, PAL.slate), y: 0.4, z: -8.4},
      {g: box(2.2, 1, 2.2, PAL.glass), y: 1, z: 1.4},
      {g: box(0.5, 0.5, 5.8, PAL.red), x: -1.1, y: 2.0, z: 0},
      {g: box(0.5, 0.5, 5.8, PAL.blue), x: 1.1, y: 2.0, z: 0},
    ];
  g.add(new THREE.Mesh(mergePlaced(P), lowMat()));
  const rotor = new THREE.Mesh(mergePlaced([{g: box(14, 0.18, 0.7, PAL.coal)}, {g: box(0.7, 0.18, 14, PAL.coal)}]), lowMat());
  rotor.position.y = 2.6;
  g.add(rotor);
  const bg = new THREE.ConeGeometry(4.5, 1, 16, 1, true);
  bg.translate(0, -0.5, 0);
  bg.rotateX(-Math.PI / 2); // 꼭짓점 = 원점(헬기), 밑면 = +z 쪽
  const beam = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({color: 0xfff3a0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide}));
  G.scene.add(g, beam);
  return {g, rotor, beam, x: G.me.pos.x + 60, z: G.me.pos.z, a: 0};
}
function removeHeli() {
  if (!heli) return;
  G.scene.remove(heli.g, heli.beam);
  heli = null;
}
function roadblock() {
  const cars = CITY_ROADS.filter(r => r.car),
    h = G.drive ? G.drive.h : G.me.rotation.y;
  let best: {r: (typeof cars)[0]; x: number; z: number} | null = null;
  for (let k = 0; k < 40; k++) {
    const r = cars[Math.floor(Math.random() * cars.length)],
      t = Math.random(),
      x = r.x0 + (r.x1 - r.x0) * t,
      z = r.z0 + (r.z1 - r.z0) * t,
      dx = x - G.me.pos.x,
      dz = z - G.me.pos.z,
      d = Math.hypot(dx, dz);
    if (d < 90 || d > 170 || Math.abs(x) > CITY_HALF - 8 || Math.abs(z) > CITY_HALF - 8) continue;
    if ((dx * Math.sin(h) + dz * Math.cos(h)) / d < 0.2) continue;
    best = {r, x, z};
    break;
  }
  if (!best) return;
  const {r, x, z} = best,
    horiz = r.z0 === r.z1,
    W = r.w,
    P: Placed[] = [],
    solids: Solid[] = [],
    vs: Veh[] = [];
  for (let k = 0; k < 5; k++) {
    const o = -W / 2 + 1.2 + (k * (W - 2.4)) / 4,
      bx = horiz ? x : x + o,
      bz = horiz ? z + o : z;
    P.push({g: box(horiz ? 1 : 2.6, 1.1, horiz ? 2.6 : 1, k % 2 ? PAL.orange : PAL.white), x: bx, y: 0, z: bz});
    solids.push(addDynSolid(bx - (horiz ? 0.6 : 1.4), bz - (horiz ? 1.4 : 0.6), bx + (horiz ? 0.6 : 1.4), bz + (horiz ? 1.4 : 0.6)));
  }
  const m = new THREE.Mesh(mergePlaced(P), lowMat());
  G.scene.add(m);
  for (const s of [-1, 1]) {
    const v = spawnVeh({t: 'police', x: horiz ? x + 4 : x + s * (W / 2 - 1.5), z: horiz ? z + s * (W / 2 - 1.5) : z + 4, h: horiz ? Math.PI / 2 : 0, own: -5, c: 0xffffff});
    vs.push(v);
  }
  blocks.push({meshes: m, solids, cars: vs, x, z});
}
function clearBlock(b: (typeof blocks)[0]) {
  G.scene.remove(b.meshes);
  b.solids.forEach(s => dropDynSolid(s));
  b.cars.forEach(removeVeh);
}

export const policeAirSystem: GameSystem = {
  id: 'police-air',
  update(dt, raw) {
    const w = S.wanted;
    heliSees = false;
    if (paused() || G.jail) return;
    // 헬기
    if (w >= 4 && !heli && !G.inside) {
      heli = makeHeli();
      toast('경찰 헬기가 떴습니다. 건물 안으로 숨으세요', 3);
    }
    if (heli && (w < 4 || G.inside === null && false)) removeHeli();
    if (heli) {
      heli.a += dt * 0.6;
      const tx = G.me.pos.x + Math.cos(heli.a) * 9,
        tz = G.me.pos.z + Math.sin(heli.a) * 9,
        dx = tx - heli.x,
        dz = tz - heli.z,
        d = Math.hypot(dx, dz) || 1,
        sp = Math.min(d, 24 * dt);
      heli.x += (dx / d) * sp;
      heli.z += (dz / d) * sp;
      const y = Math.max(0, groundH(heli.x, heli.z)) + 24;
      heli.g.position.set(heli.x, y, heli.z);
      heli.g.rotation.y = Math.atan2(dx, dz);
      heli.rotor.rotation.y += raw * 30;
      // 서치라이트: 기체 → 플레이어
      const bx = G.me.pos.x - heli.x,
        by = G.me.pos.y - y,
        bz = G.me.pos.z - heli.z,
        L = Math.hypot(bx, by, bz);
      heli.beam.visible = !G.inside;
      heli.beam.position.set(heli.x, y - 0.5, heli.z);
      heli.beam.scale.set(1, 1, L);
      heli.beam.lookAt(G.me.pos.x, G.me.pos.y, G.me.pos.z);
      heliSees = !G.inside && Math.hypot(bx, bz) < 70;
      if (heliSees && (chopT -= dt) <= 0) {
        chopT = 0.7;
        sfx('chopper');
      }
    }
    if (w < 4) removeHeli();
    // 바리케이드
    if (w >= 5 && blocks.length < 2 && !G.inside && Math.random() < dt * 0.5) roadblock();
    for (const b of blocks.slice()) {
      if (w < 5 || Math.hypot(b.x - G.me.pos.x, b.z - G.me.pos.z) > 230) {
        clearBlock(b);
        blocks.splice(blocks.indexOf(b), 1);
      }
    }
  },
};
void drop2;
