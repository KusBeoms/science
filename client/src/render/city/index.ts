// 도시 허브 1차(W1): 지면 + 건물 + 랜드마크 + 소품. 병합 메시와 인스턴싱으로 드로우콜을 줄이고, 건물·랜드마크는 core/terrain.ts 충돌체로 등록한다.
// 창문·네온·가로등 전구(lit)는 밤(G.night > 0)에만 보인다. 같은 모양의 불 꺼진 면은 solid 메시에 있다.
import {G} from '../../core/runtime.js';
import {addSolid} from '../../core/terrain.js';
import {CITY_BUILDINGS, CITY_LANDMARKS, footprint, type CityBuilding, type Facing} from '../../data/city.js';
import {glowMat, instanced, instancedChunks, keep, lowMat, mergePlaced, type Placed} from '../lowpoly/merge.js';
import type {GameSystem} from '../../core/types.js';
import {buildCityGardens} from '../city-gardens.js';
import {buildWaterfront} from '../city-waterfront.js';
import {buildIslandLandscape} from '../island-landscape.js';
import {buildNaturalCity, updateNaturalCity} from '../city-natural.js';
import {updateLandscapeLOD} from '../landscape-batch.js';
import {updateCityFringe} from '../city-fringe.js';
import {updateWorldVisibility} from '../world-visibility.js';
import {facadeDetails} from './facade-art.js';
import {makeBuilding} from './building.js';
import {makeHighrise} from './highrise.js';
import {makeArena, makeHouse, makeLite} from './residential.js';
import {barrierGeo, benchGeo, lampGeo, pineGeo, roundTreeGeo} from './props.js';
import {clockTower, marketArch, orrery} from './landmarks.js';
import {castle, controlTower, hangar, observatory} from './landmarks2.js';
import {aquarium, ferris, lighthouse, stadium, tvTower} from './landmarks3.js';
import {STADIUM} from '../../data/soccer.js';
import {tradeLine} from './tradeline.js';
import {groundGeometry, planProps} from './layout.js';
import {buildFun} from './fun.js';
import {buildW7} from './w7.js';
import {cityDetail, distantBuilding, detailInstances, distantTree, distantLamp, distantBench, updateCityDetail} from './detail-lod.js';
import {buildDowntown} from './downtown.js';
import {buildOverpasses} from '../overpass.js';
import {buildCrosswalks} from '../crosswalks.js';

const FACE_RY: Record<Facing, number> = {s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2};

/** 밤에만 보이는 메시들 */
const nightMeshes: any[] = [];
let spinner: any = null,
  wheel: any = null;

/** 건물 한 무리를 solid / lit 메시 2개로 병합해 grp 에 붙인다 */
function addBuildings(grp: any, list: readonly CityBuilding[]) {
  const solid: Placed[] = [],
    lit: Placed[] = [], far: Placed[] = [], persistent: Placed[] = [];
  for (const b of list) {
    const built = facadeDetails(b, b.hr ? makeHighrise(b) : b.district === 'w7-house' ? makeHouse(b) : b.district === 'w7-arena' ? makeArena(b) : b.district.startsWith('w7-') ? makeLite(b) : makeBuilding(b)),
      at = {x: b.x, z: b.z, ry: FACE_RY[b.face]};
    if (b.hr || b.district === 'w7-arena') persistent.push({g: built.solid, ...at});
    else { solid.push({g: built.solid, ...at}); far.push({g: distantBuilding(b), ...at}); }
    lit.push({g: built.lit, ...at});
    const [x0, z0, x1, z1] = footprint(b);
    addSolid(x0, z0, x1, z1);
  }
  if (solid.length) {
    const nearMesh = addMesh(grp, mergePlaced(solid), false), farMesh = addMesh(grp, mergePlaced(far), false);
    cityDetail(nearMesh, farMesh, list.reduce((s,b)=>s+b.x,0)/list.length, list.reduce((s,b)=>s+b.z,0)/list.length);
  }
  if (persistent.length) addMesh(grp, mergePlaced(persistent), false);
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

/** 대관람차 바퀴 각도(탑승 연출용) */
export const ferrisAngle = () => (wheel ? wheel.rotation.z : 0);
export function buildCity(): any {
  const grp = new THREE.Group();
  grp.name = 'city';
  nightMeshes.length = 0;

  // 지면: 기지 타일(윗면 y=0)보다 0.05 낮고 통로 판(윗면 -0.08)보다 0.03 높다
  const ground = new THREE.Mesh(groundGeometry(), new THREE.MeshLambertMaterial({vertexColors: true}));
  ground.position.y = -0.05;
  grp.add(ground);

  const where = (b: CityBuilding) => `${Math.floor(b.x / 70)},${Math.floor(b.z / 70)}`;
  const keys = [...new Set(CITY_BUILDINGS.map(where))];
  for (const key of keys) addBuildings(grp, CITY_BUILDINGS.filter(b => where(b) === key));

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
  // W3 랜드마크: 스타디움 · 대관람차 · 수족관 · 전망 타워 · 등대
  const L = (id: string) => CITY_LANDMARKS.find(l => l.id === id)!;
  const st = stadium(),
    s8 = L('L8'),
    [sx0, sz0, sx1, sz1] = STADIUM.rect;
  addMesh(grp, st.solid, false, s8.x, s8.z);
  addMesh(grp, st.lit, true, s8.x, s8.z);
  const D = STADIUM.stand;
  addSolid(sx0, sz0, sx1, sz0 + D);
  addSolid(sx0, sz0, sx0 + D, sz1);
  addSolid(sx1 - D, sz0, sx1, sz1);
  addSolid(sx0, sz1 - D, STADIUM.gateX - STADIUM.gateHalf, sz1);
  addSolid(STADIUM.gateX + STADIUM.gateHalf, sz1 - D, sx1, sz1);
  const fw = ferris(),
    s9 = L('L9');
  addMesh(grp, fw.solid, false, s9.x, s9.z);
  wheel = addMesh(grp, fw.spin, false, s9.x, s9.z);
  wheel.position.y = 26;
  addSolid(s9.x - 9, s9.z - 5, s9.x + 9, s9.z + 5);
  for (const [id, lm] of [['L10', aquarium()], ['L11', tvTower()], ['L12', lighthouse()]] as const) {
    const l = L(id);
    addMesh(grp, lm.solid, false, l.x, l.z);
    addMesh(grp, lm.lit, true, l.x, l.z);
    addSolid(l.x - l.w! / 2, l.z - l.d! / 2, l.x + l.w! / 2, l.z + l.d! / 2);
  }
  grp.add(buildIslandLandscape(), buildNaturalCity(), buildWaterfront(), buildCityGardens());
  grp.add(buildDowntown()); // W6 DOWNTOWN: 단지 정문·놀이터·주차장·금융 지구 화단
  grp.add(buildW7(m => { m.visible = false; nightMeshes.push(m); })); // W7 CITY_DENSITY: 가로수·시설·원형 광장 소품
  grp.add(buildFun()); // W5 FUN: 구역별 즐길 거리(공원·테마파크·해변·항구·문화·레저·놀이터)
  // 거래의 선: 도시 둘레 금빛 기둥 띠 (바닥 인레이는 layout.ts)
  addMesh(grp, tradeLine(), false);

  grp.add(buildOverpasses(), buildCrosswalks()); // 입체교차로·고가·횡단보도·신호등 (W5 ROADS)

  // 소품(인스턴싱)
  const plan = planProps(),
    lamp = lampGeo();
  grp.add(detailInstances(keep(lamp.pole), distantLamp(), plan.lamps, 'city-lamps'));
  const bulbs = instancedChunks(keep(lamp.bulb), glowMat(), plan.lamps);
  bulbs.children.forEach((m: any) => {
    m.visible = false;
    nightMeshes.push(m);
  });
  grp.add(bulbs);
  grp.add(detailInstances(roundTreeGeo(), distantTree(), plan.trees, 'city-trees'));
  grp.add(detailInstances(pineGeo(), distantTree(true), plan.pines, 'city-pines'));
  grp.add(detailInstances(benchGeo(), distantBench(), plan.benches, 'city-benches'));
  return grp;
}

/** 낮밤에 맞춰 불을 켜고 끈다 (daynight 가 따로 정하려면 이 함수를 부르면 된다) */
export function setCityNight(on: boolean) {
  nightMeshes.forEach(m => (m.visible = on));
}
export const citySystem: GameSystem = {
  id: 'city',
  update(_dt, raw) {
    updateLandscapeLOD();
    updateNaturalCity();
    updateCityDetail();
    updateCityFringe();
    updateWorldVisibility();
    const on = G.night > 0;
    if (nightMeshes.length && nightMeshes[0].visible !== on) setCityNight(on);
    if (spinner) spinner.rotation.y += raw * 0.35;
    if (wheel) wheel.rotation.z += raw * 0.12;
  },
};
