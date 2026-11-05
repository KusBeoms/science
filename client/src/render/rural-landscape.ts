// 시골 섬 경관 조립(W7 RURAL): 참조 'Pastoral Island' 처럼 지형·도로·밭·마을이 하나의 풍경이 되게 모은다.
//   농지(rural-fields) · 마을(rural-village) · 산 장식(wild-mountain) · 해안(wild-coast) · 숲(wild-forest) · 밤 가로등.
// 병합(칸 병합) · 인스턴싱 · 숲 LOD(landscapeForest). userData.counts 는 landscape.spec 이 읽는다.
import {G} from '../core/runtime.js';
import {PAL, mix} from './lowpoly/palette.js';
import {box, cone, cyl} from './lowpoly/prim.js';
import {glowMat, instancedChunks, lowMat, mergeGeometries, instanced, type Inst} from './lowpoly/merge.js';
import {landscapeBatch, landscapeForest} from './landscape-batch.js';
import {roundTreeGeo} from './city/props.js';
import {lampGeo} from './city/props.js';
import {buildFields} from './rural-fields.js';
import {buildVillages} from './rural-village.js';
import {buildMountain} from './wild-mountain.js';
import {buildCoast} from './wild-coast.js';
import {buildForest} from './wild-forest.js';
import {palm} from './rural-models.js';
import {LODGE} from '../data/wild-mountain.js';

export {inParcel as ruralFieldAt} from '../data/wild-fields.js';
let nightMeshes: any[] = [];
/** 밤에만 켜지는 불(가로등 전구·산장 창): 낮엔 숨긴다 */
export function ruralNightUpdate() {
  const on = G.night > 0;
  for (const m of nightMeshes) if (m.visible !== on) m.visible = on;
}

export function buildRuralLandscape() {
  nightMeshes = [];
  const root = new THREE.Group();
  root.name = 'rural-landscape';
  const F = buildFields(), V = buildVillages(), M = buildMountain(), C = buildCoast(), Fo = buildForest();
  root.add(landscapeBatch([...F.fields, ...V.paths, ...M.paths], 'terraced-fields', 180));
  root.add(landscapeBatch([...V.village, ...F.details, ...V.details, ...M.parts, ...C.parts], 'rural-details', 120));
  const farTree = cone(2.3, 4.5, PAL.green, 0, 0, 0, 0, 5);
  root.add(landscapeForest(roundTreeGeo(), farTree, F.orchard, 'orchards'), Fo.group);
  root.add(instancedChunks(palm(), lowMat(), C.palms));
  // 등산로 난간 말뚝(인스턴스) — 나무 말뚝 + 줄
  const post = mergeGeometries([cyl(0.12, 1.1, PAL.wood, 0, 0, 0, 0, 4), box(0.5, 0.1, 0.1, PAL.bone, 0.25, 0.9, 0)]);
  root.add(instancedChunks(post, lowMat(), M.posts, 120, 4));
  // 가로등: 기둥 + 밤 전구(MeshBasic, 낮엔 숨김)
  const lamps: Inst[] = [...V.lamps, ...M.lamps], {pole, bulb} = lampGeo();
  if (lamps.length) {
    const lit = lamps.map(l => ({...l, y: l.y}));
    root.add(instanced(pole.clone(), lowMat(), lit));
    const bulbs = instanced(bulb.clone(), glowMat(), lit);
    bulbs.visible = false;
    nightMeshes.push(bulbs);
    root.add(bulbs);
  }
  // 산장 창 불빛(밤)
  const win = mergeGeometries([box(2.2, 1.4, 0.1, mix(PAL.amber, PAL.white, 0.4), -4, 1.4, 4.7), box(2.2, 1.4, 0.1, mix(PAL.amber, PAL.white, 0.4), 4, 1.4, 4.7), box(2, 1.4, 0.1, mix(PAL.amber, PAL.white, 0.4), -3, 4.8, 4.2), box(2, 1.4, 0.1, mix(PAL.amber, PAL.white, 0.4), 3, 4.8, 4.2)]);
  const lodgeWin = instanced(win, glowMat(), [{x: LODGE.x, y: M.lodgeY, z: LODGE.z, ry: LODGE.ry}]);
  lodgeWin.visible = false;
  nightMeshes.push(lodgeWin);
  root.add(lodgeWin);
  root.userData.counts = {
    fields: F.counts.fields,
    villageBuildings: V.counts.cottages + V.counts.farmBuildings + F.counts.greenhouses + V.counts.greenhouses,
    cottages: V.counts.cottages,
    greenhouses: F.counts.greenhouses + V.counts.greenhouses,
    farmBuildings: V.counts.farmBuildings,
    scarecrows: F.counts.scarecrows,
    orchardTrees: F.orchard.length,
    pines: Fo.pines,
    trees: Fo.trees,
    palms: C.palms.length,
    trailLength: M.trailLength,
    lamps: lamps.length,
  };
  return root;
}
