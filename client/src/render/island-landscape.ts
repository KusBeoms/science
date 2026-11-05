// 도시 섬 바깥 띠의 남쪽 해변 야자와 해안 바위. 산 숲·산악 도로·천문대·철탑은 W7 에서 render/city-mountain.ts 로 옮겼다.
// 땅 높이/윤곽/다리/물 판정은 공유 데이터를 읽기만 한다.
import {groundH} from '../core/terrain.js';
import {PAL} from './lowpoly/palette.js';
import {cone} from './lowpoly/prim.js';
import {CITY_POLY, BRIDGE_ENDS} from '../data/outline.js';
import {CITY_HALF, SEA_Y} from '../data/world-map.js';
import {hash2} from './lowpoly/rng.js';
import {mergeGeometries, type Placed, type Inst} from './lowpoly/merge.js';
import {landscapeBatch, landscapeForest} from './landscape-batch.js';
import {palmGeo} from './city/fun-props.js';
import {coastalRock} from './rural-art.js';

export function buildIslandLandscape() {
  const root=new THREE.Group();root.name='island-landscape';
  const palms:Inst[]=[], rocks:Placed[]=[], landmarks:Placed[]=[];
  const farPine=mergeGeometries([cone(2,6,PAL.green,0,0,0,0,5)]);
  for(let gx=CITY_POLY.x0+12;gx<CITY_POLY.x1;gx+=13)for(let gz=CITY_POLY.z0+12;gz<CITY_POLY.z1;gz+=13) {
    const x=gx+(hash2(gx,gz,210)-0.5)*10,z=gz+(hash2(gx,gz,211)-0.5)*10;
    if(Math.max(Math.abs(x),Math.abs(z))<CITY_HALF+14||!CITY_POLY.inside(x,z))continue;
    const y=groundH(x,z);
    if(y<SEA_Y+2||!Number.isFinite(y))continue;
    if(z>CITY_HALF&&Math.abs(x-BRIDGE_ENDS.x)<55)continue;
    const slope=Math.max(Math.abs(groundH(x+3,z)-y),Math.abs(groundH(x,z+3)-y))/3;
    if(slope>1.3)continue;
    const beach=z>CITY_HALF&&Math.abs(x)<CITY_HALF+40;
    if(beach&&y<2) { if(hash2(gx,gz,212)<0.09)palms.push({x,y,z,s:1.3+hash2(gx,gz)*0.8,ry:hash2(gx,gz,215)*6}); }
    if(y<10&&CITY_POLY.dist(x,z,0,35)<24&&hash2(gx,gz,216)<0.24)rocks.push({g:coastalRock(hash2(gx,gz)),x,y:y-0.7,z,s:0.6+hash2(gx,gz,217)});
  }
  root.add(landscapeForest(palmGeo(),farPine,palms,'beach-palms'),landscapeBatch(rocks,'coastal-rocks'));
  root.add(landscapeBatch(landmarks,'island-landmarks'));
  root.userData.counts={trees:0,palms:palms.length,rocks:rocks.length};
  return root;
}
