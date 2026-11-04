// 도시 허브 1차(W1): 지면 + 건물 + 랜드마크 + 소품. 병합 메시와 인스턴싱으로 드로우콜을 줄이고, 건물·랜드마크는 core/terrain.ts 충돌체로 등록한다.
// 창문·네온·가로등 전구(lit)는 밤(G.night > 0)에만 보인다. 같은 모양의 불 꺼진 면은 solid 메시에 있다.
import {G} from '../../core/runtime.js';
import {addSolid} from '../../core/terrain.js';
import {CITY_BUILDINGS, CITY_LANDMARKS, footprint, type CityBuilding, type Facing} from '../../data/city.js';
import {glowMat, instanced, keep, lowMat, mergePlaced, type Placed} from '../lowpoly/merge.js';
import type {GameSystem} from '../../core/types.js';
import {makeBuilding} from './building.js';
import {barrierGeo, benchGeo, lampGeo, pineGeo, roundTreeGeo} from './props.js';
import {clockTower, marketArch, orrery} from './landmarks.js';
import {castle, controlTower, hangar, observatory} from './landmarks2.js';
import {tradeLine} from './tradeline.js';
import {groundGeometry, planProps} from './layout.js';

const FACE_RY: Record<Facing, number> = {s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2};

/** 밤에만 보이는 메시들 */
const nightMeshes: any[] = [];
let spinner: any = null;

/** 건물 한 무리를 solid / lit 메시 2개로 병합해 grp 에 붙인다 */
function addBuildings(grp: any, list: readonly CityBuilding[]) {
  const solid: Placed[] = [],
    lit: Placed[] = [];
  for (const b of list) {
    const built = makeBuilding(b),
      at = {x: b.x, z: b.z, ry: FACE_RY[b.face]};
    solid.push({g: built.solid, ...at});
    lit.push({g: built.lit, ...at});
    const [x0, z0, x1, z1] = footprint(b);
    addSolid(x0, z0, x1, z1);
  }
  addMesh(grp, mergePlaced(solid), false);
  addMesh(grp, mergePlaced(lit), true);
}
function addMesh(grp: any, geo: any, night: boolean, x = 0, z = 0) {
  const m = new THREE.Mesh(geo, night ? glowMat() : lowMat());
  m.position.set(x, 0, z);
  grp.add(m);
  if (night) {
    m.visible = false;
    nightMeshes.push(m);
  }
  return m;
}

export function buildCity(): any {
  const grp = new THREE.Group();
  grp.name = 'city';
  nightMeshes.length = 0;

  // 지면: 기지 타일(윗면 y=0)보다 0.05 낮고 통로 판(윗면 -0.08)보다 0.03 높다
  const ground = new THREE.Mesh(groundGeometry(), new THREE.MeshLambertMaterial({vertexColors: true}));
  ground.position.y = -0.05;
  grp.add(ground);

  const where = (b: CityBuilding) => (b.district === 'avenue' ? (b.x < 0 ? 'w' : 'e') : b.district);
  for (const key of ['w', 'e', 'shops', 'alley', 'market', 'garage', 'port', 'science', 'resi']) addBuildings(grp, CITY_BUILDINGS.filter(b => where(b) === key));

  // 랜드마크
  const [L1, L2, L3] = CITY_LANDMARKS,
    clock = clockTower(),
    arch = marketArch(),
    orr = orrery();
  addMesh(grp, clock.solid, false, L1.x, L1.z);
  addMesh(grp, clock.lit, true, L1.x, L1.z);
  addSolid(L1.x - 5.5, L1.z - 5.5, L1.x + 5.5, L1.z + 5.5);
  addMesh(grp, orr.still, false, L2.x, L2.z);
  spinner = addMesh(grp, orr.spin, false, L2.x, L2.z);
  addSolid(L2.x - L2.r, L2.z - L2.r, L2.x + L2.r, L2.z + L2.r);
  addMesh(grp, arch.solid, false, L3.x, L3.z);
  addMesh(grp, arch.lit, true, L3.x, L3.z);
  for (const s of [-1, 1]) addSolid(L3.x - 1.1, L3.z + s * 6.8 - 1.1, L3.x + 1.1, L3.z + s * 6.8 + 1.1);
  // W2 랜드마크: 관제탑 · 격납고 · 천문대 돔 · 성(언덕 위). 충돌체는 w·d 가 있으면 그 크기, 없으면 반폭 r
  const big: [string, {solid: any; lit: any}][] = [['L4', controlTower()], ['L5', hangar()], ['L6', observatory()], ['L7', castle()]];
  for (const [id, lm] of big) {
    const L = CITY_LANDMARKS.find(l => l.id === id)!,
      y = L.y ?? 0;
    for (const lit of [false, true]) addMesh(grp, lit ? lm.lit : lm.solid, lit, L.x, L.z).position.y = y;
    addSolid(L.x - (L.w ?? 2 * L.r) / 2, L.z - (L.d ?? 2 * L.r) / 2, L.x + (L.w ?? 2 * L.r) / 2, L.z + (L.d ?? 2 * L.r) / 2);
  }
  // 골목 막다른 곳의 공사 울타리
  const fence = new THREE.Mesh(barrierGeo(12), lowMat());
  fence.position.set(-140, 0, 0);
  grp.add(fence);
  addSolid(-140.4, -6, -139.6, 6);
  // 거래의 선: 도시 둘레 금빛 기둥 띠 (바닥 인레이는 layout.ts)
  addMesh(grp, tradeLine(), false);

  // 소품(인스턴싱)
  const plan = planProps(),
    lamp = lampGeo();
  grp.add(instanced(keep(lamp.pole), lowMat(), plan.lamps));
  const bulbs = instanced(keep(lamp.bulb), glowMat(), plan.lamps);
  bulbs.visible = false;
  nightMeshes.push(bulbs);
  grp.add(bulbs);
  grp.add(instanced(roundTreeGeo(), lowMat(), plan.trees));
  grp.add(instanced(pineGeo(), lowMat(), plan.pines));
  grp.add(instanced(benchGeo(), lowMat(), plan.benches));
  return grp;
}

/** 낮밤에 맞춰 불을 켜고 끈다 (daynight 가 따로 정하려면 이 함수를 부르면 된다) */
export function setCityNight(on: boolean) {
  nightMeshes.forEach(m => (m.visible = on));
}
export const citySystem: GameSystem = {
  id: 'city',
  update(_dt, raw) {
    const on = G.night > 0;
    if (nightMeshes.length && nightMeshes[0].visible !== on) setCityNight(on);
    if (spinner) spinner.rotation.y += raw * 0.35;
  },
};
