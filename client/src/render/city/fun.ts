// W5 FUN 렌더 조립: 구역(공원·테마파크·해변·항구·문화·레저·놀이터)마다 정적 소품을 solid / lit(밤 전용) 병합 메시 2장으로 만들고,
// 움직이는 것(오리·회전목마·코스터·범퍼카·그네·요트·음표)은 funSystem 이 매 프레임 funClock 에 맞춰 돌린다. 가로수(야자·벚꽃·은행)는 칸 단위 인스턴싱.
import {approachNear, CITY_APPROACH_START, Z_UP0} from '../../data/bridge.js';
import {G} from '../../core/runtime.js';
import {addSolid} from '../../core/terrain.js';
import {PARCELS, POND, funClock} from '../../data/city-w5.js';
import {glowMat, instancedChunks, lowMat, mergePlaced, type Inst} from '../lowpoly/merge.js';
import {hash2} from '../lowpoly/rng.js';
import type {GameSystem} from '../../core/types.js';
import {cherryGeo, ginkgoGeo, newCtx, palmGeo, type Anim, type Ctx} from './fun-props.js';
import {buildPark, buildTheme} from './fun-park.js';
import {buildBeach, buildPort} from './fun-coast.js';
import {buildCulture, buildLeisure, buildResi} from './fun-town.js';

void PARCELS;
const anims: Anim[] = [],
  nightMeshes: any[] = [];

/** 가로수 배치: 항구로 야자(해변 산책로 포함) · 동쪽 대로 벚꽃(+공원 둘레·광장) · 북쪽 사과 대로 은행 */
function plantPlan() {
  const palms: Inst[] = [], cherries: Inst[] = [], ginkgos: Inst[] = [];
  for (let z = 166; z < 304; z += 14) for (const s of [-1, 1]) if (s < 0 || z > 266) palms.push({x: s * 9.6, y: 0, z: z + s * 3, ry: hash2(z, s) * 6, s: 1 + hash2(z, 3 + s) * 0.25});
  for (let x = -186; x < -28; x += 17) palms.push({x: x + hash2(x, 1) * 4, y: 0, z: 304.6 + hash2(x, 2) * 1.2, ry: hash2(x, 3) * 6, s: 1.05 + hash2(x, 4) * 0.3});
  for (let x = 30; x < 186; x += 40) palms.push({x, y: 0, z: 308 + hash2(x, 5) * 2, ry: hash2(x, 6) * 6, s: 1.1});
  for (let x = 276; x < 330; x += 14) {
    if (Math.abs(x - 275) < 10) continue;
    for (const s of [-1, 1]) cherries.push({x: x + s * 3, y: 0, z: s * 8.9, ry: hash2(x, s) * 6, s: 0.95 + hash2(x, s + 7) * 0.3});
  }
  for (let z = 112; z < 186; z += 12) cherries.push({x: 213, y: 0, z, ry: hash2(z, 9) * 6, s: 1.1});
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 + 0.1;
    cherries.push({x: POND.x + Math.cos(a) * 38, y: 0, z: POND.z + Math.sin(a) * 38, ry: a, s: 1.1 + hash2(k, 3) * 0.3});
  }
  for (let z = -318; z < -158; z += 16) {
    if (Math.abs(z + 200) < 12 || Math.abs(z + 275) < 12) continue;
    for (const s of [-1]) ginkgos.push({x: s * 14, y: 0, z, ry: hash2(z, s) * 6, s: 1 + hash2(z, s + 3) * 0.3});
  }
  const clear = (p: Inst) => { const a = approachNear(p.x, p.z); return p.z < CITY_APPROACH_START - 8 || p.z > Z_UP0 + 8 || a.d > a.w + 4; };
  return {palms: palms.filter(clear), cherries, ginkgos};
}

export function buildFun(): any {
  const grp = new THREE.Group();
  grp.name = 'fun';
  anims.length = 0;
  nightMeshes.length = 0;
  const zones: [string, (c: Ctx) => void][] = [
    ['park', buildPark], ['theme', buildTheme], ['beach', buildBeach], ['port', buildPort], ['culture', buildCulture], ['leisure', buildLeisure], ['resi', buildResi],
  ];
  for (const [, build] of zones) {
    const c = newCtx();
    build(c);
    if (c.solid.length) grp.add(new THREE.Mesh(mergePlaced(c.solid), lowMat()));
    if (c.lit.length) {
      const m = new THREE.Mesh(mergePlaced(c.lit), glowMat());
      m.visible = false;
      nightMeshes.push(m);
      grp.add(m);
    }
    for (const [x0, z0, x1, z1] of c.blocks) addSolid(x0, z0, x1, z1);
    for (const a of c.anims) {
      a.mesh.frustumCulled = false;
      grp.add(a.mesh);
      anims.push(a);
    }
  }
  const plan = plantPlan();
  grp.add(instancedChunks(palmGeo(), lowMat(), plan.palms));
  grp.add(instancedChunks(cherryGeo(), lowMat(), plan.cherries));
  grp.add(instancedChunks(ginkgoGeo(), lowMat(), plan.ginkgos));
  return grp;
}

export const funSystem: GameSystem = {
  id: 'fun',
  update(_dt, raw) {
    funClock.t += raw;
    const on = G.night > 0;
    if (nightMeshes.length && nightMeshes[0].visible !== on) nightMeshes.forEach(m => (m.visible = on));
    for (const a of anims) a.fn(funClock.t, a.mesh);
  },
};
