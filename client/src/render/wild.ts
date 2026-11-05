// 시골 섬 장식 진입점(W7 RURAL): 호숫가 길·선착장·갈대(wild-lake) + 농지·마을·산·해안·숲(rural-landscape) + 풍차 + 정상 깃발 + 교도소(wild-prison).
// 충돌체는 건물·교도소 벽만 등록한다(나무는 지나갈 수 있다).
import {buildRuralLandscape, ruralNightUpdate} from './rural-landscape.js';
import {buildLakeside} from './wild-lake.js';
import {buildPrison, guards} from './wild-prison.js';
import {addSolid, groundH} from '../core/terrain.js';
import {COUNTRY, SUMMIT} from '../data/wild.js';
import {PAL, NEUTRAL, ACCENT} from './lowpoly/palette.js';
import {box, cyl, ico} from './lowpoly/prim.js';
import {lowMat, mergePlaced, type Placed} from './lowpoly/merge.js';
import {windmill} from './rural-models.js';

let wheel: any = null;
const parts = (l: any[]): Placed[] => l.map(g => ({g}));
function flag() {
  return mergePlaced(parts([cyl(0.2, 9, NEUTRAL.steel, 0, 0, 0, 0, 5), box(3.4, 2, 0.15, ACCENT.red, 1.7, 7, 0), box(3, 0.8, 4, PAL.stone, 0, -0.4, 0), ico(1.6, 0, PAL.stone, 1.8, 0.6, 1.6)]));
}

export function buildWild(): any {
  const grp = new THREE.Group();
  grp.name = 'wild';
  grp.add(buildLakeside()); // 호숫가 길·선착장·갈대·벚꽃 (render/wild-lake.ts)
  grp.add(buildRuralLandscape()); // 농지·마을·산·해안·숲 (render/rural-landscape.ts)
  // 목장 옆 풍차(날개 회전) · 정상 깃발(정자 옆 평지)
  const wm = windmill(),
    wx = COUNTRY[2] + 26,
    wz = COUNTRY[1] + 100,
    fx = SUMMIT.x + 6.5,
    fz = SUMMIT.z + 2;
  const solids: Placed[] = [
    {g: wm.still, x: wx, y: groundH(wx, wz), z: wz},
    {g: flag(), x: fx, y: groundH(fx, fz), z: fz},
  ];
  addSolid(wx - 3.5, wz - 3.5, wx + 3.5, wz + 3.5);
  grp.add(new THREE.Mesh(mergePlaced(solids), lowMat()));
  const w = new THREE.Mesh(wm.blades, lowMat());
  w.position.set(wx, groundH(wx, wz) + 10.5, wz + 3.2);
  grp.add(w);
  wheel = w;
  buildPrison(grp);
  return grp;
}
export {guards};
export const wildUpdate = (raw: number) => {
  if (wheel) wheel.rotation.z += raw * 0.6;
  ruralNightUpdate();
};
