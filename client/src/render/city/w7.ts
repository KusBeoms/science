// W7 CITY_DENSITY 조립: 가로수·가로등·벤치(인스턴싱, 칸 단위 컬링) + 특색 시설 병합 메시(solid 칸 병합 + 밤 전용 lit) + 충돌. render/city/index.ts 가 한 줄로 부른다.
// 건물 본체는 data/city-w7.ts 가 만든 CityBuilding 이라 index.ts 의 기존 addBuildings 가 그린다(단독주택 → residential.ts).
import {addSolid} from '../../core/terrain.js';
import {glowMat, instancedChunks, keep, lowMat, mergePlaced} from '../lowpoly/merge.js';
import {landscapeBatch} from '../landscape-batch.js';
import {benchGeo, lampGeo} from './props.js';
import {NEUTRAL, PAL, mix} from '../lowpoly/palette.js';
import {cone, cyl, ico, wobble} from '../lowpoly/prim.js';
import {mergeGeometries} from '../lowpoly/merge.js';
import {featureParts} from './w7-features.js';
import {planW7Props} from './w7-props.js';
import {buildFlat} from './w7-flat.js';
import {detailInstances, distantTree, distantLamp, distantBench} from './detail-lod.js';

/** 가벼운 가로수(≈30 tris): 줄기 + 흔들린 이코스피어 하나. 수백 그루를 인스턴싱해도 시야 삼각형 예산을 아낀다 */
const smallTree = () => keep(mergeGeometries([cyl(0.28, 2.4, NEUTRAL.wood, 0, 0, 0, 0, 4), wobble(ico(1.9, 0, mix(PAL.green, PAL.lime, 0.3), 0, 3.5, 0, 0, 1.15), 0.2, 5)]));
/** 가벼운 소나무(≈34 tris) */
const smallPine = () => keep(mergeGeometries([cyl(0.25, 1.6, NEUTRAL.wood, 0, 0, 0, 0, 4), cone(1.9, 3.4, mix(PAL.green, PAL.teal, 0.3), 0, 1.4, 0, 0, 6), cone(1.3, 3.0, mix(PAL.green, PAL.teal, 0.2), 0, 3.6, 0, 0, 6)]));

/** nightMesh: 밤에만 켜질 메시를 index.ts 의 토글 목록에 등록하는 함수 */
export function buildW7(nightMesh: (m: any) => void): any {
  const grp = new THREE.Group();
  grp.name = 'city-w7';
  const plan = planW7Props(),
    ft = featureParts(),
    lamp = lampGeo();
  plan.lamps.push(...ft.lamps);
  grp.add(buildFlat());
  grp.add(detailInstances(smallTree(), distantTree(), plan.trees, 'w7-trees'));
  grp.add(detailInstances(smallPine(), distantTree(true), plan.pines, 'w7-pines'));
  grp.add(detailInstances(benchGeo(), distantBench(), plan.benches, 'w7-benches'));
  grp.add(detailInstances(keep(lamp.pole), distantLamp(), plan.lamps, 'w7-lamps'));
  const bulbs = instancedChunks(keep(lamp.bulb), glowMat(), plan.lamps);
  bulbs.children.forEach((m: any) => {
    m.visible = false;
    nightMesh(m);
  });
  grp.add(bulbs);
  grp.add(landscapeBatch(ft.solid, 'w7-features', 110));
  const lit = new THREE.Mesh(mergePlaced(ft.lit), glowMat());
  lit.visible = false;
  nightMesh(lit);
  grp.add(lit);
  for (const [x0, z0, x1, z1] of ft.blocks) addSolid(x0, z0, x1, z1);
  return grp;
}
