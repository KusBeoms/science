// 도시 섬 바깥 띠: 북서~북동의 설산 숲, 해안 절벽, 동쪽 관측 반도, 남쪽 해변.
// 땅 높이/윤곽/다리/물 판정은 공유 데이터를 읽기만 한다.
import {groundH, addSolid} from '../core/terrain.js';
import {CITY_POLY, BRIDGE_ENDS} from '../data/outline.js';
import {CITY_HALF, SEA_Y} from '../data/world-map.js';
import {PAL, mix} from './lowpoly/palette.js';
import {box, cone, cyl, ico} from './lowpoly/prim.js';
import {hash2} from './lowpoly/rng.js';
import {mergeGeometries, type Placed, type Inst} from './lowpoly/merge.js';
import {landscapeBatch, landscapeForest} from './landscape-batch.js';
import {terrainRibbon, type PathPoint} from './landscape-surface.js';
import {pineGeo} from './city/props.js';
import {palmGeo} from './city/fun-props.js';
import {coastalRock} from './rural-art.js';
import {observatory} from './city/landmarks2.js';
import {beam} from './lowpoly/structure.js';

export function buildIslandLandscape() {
  const root=new THREE.Group();root.name='island-landscape';
  const trees:Inst[]=[], snowy:Inst[]=[], palms:Inst[]=[], rocks:Placed[]=[], landmarks:Placed[]=[];
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
    else if(y>1&&hash2(gx,gz,212)<(y>39?0.32:0.72)) {
      if(Math.hypot(x-725,z+155)<26)continue;
      (y>34?snowy:trees).push({x,y,z,s:1.4+hash2(gx,gz,213)*1.3,ry:hash2(gx,gz,214)*6});
    }
    if(y<10&&CITY_POLY.dist(x,z,0,35)<24&&hash2(gx,gz,216)<0.24)rocks.push({g:coastalRock(hash2(gx,gz)),x,y:y-0.7,z,s:0.6+hash2(gx,gz,217)});
  }
  const snowPine=mergeGeometries([cyl(0.28,1.8,PAL.wood,0,0,0,0,5),cone(2,2.6,PAL.green,0,1.4,0,0,7),cone(1.5,2.3,PAL.cloud,0,3.2,0,0,7),cone(1,2,PAL.white,0,4.9,0,0,7)]);
  root.add(landscapeForest(pineGeo(),farPine,trees,'mountain-forest'),landscapeForest(snowPine,farPine,snowy,'snowline-forest'),landscapeForest(palmGeo(),farPine,palms,'beach-palms'));
  root.add(landscapeBatch(rocks,'coastal-rocks'));
  // 동쪽 반도: 평평한 사각 섬이 아니라 기존 능선을 따라 꼬불꼬불 오르는 산책로.
  const trail:PathPoint[]=[];
  for(let i=0;i<=84;i++) {const t=i/84,x=340+t*390,z=-155+Math.sin(t*Math.PI*3.4)*38;trail.push([x,z]);}
  landmarks.push({g:terrainRibbon(trail,3.2,mix(PAL.bone,PAL.clay,0.25)),x:0,z:0});
  const ox=725,oz=-155,oy=groundH(ox,oz),obs=observatory();
  if(Number.isFinite(oy)) {
    landmarks.push({g:cyl(19,1.2,PAL.stone,0,-1.1,0,0,12),x:ox,y:oy,z:oz},{g:obs.solid,x:ox,y:oy,z:oz});
    addSolid(ox-10,oz-10,ox+10,oz+10);
  }
  // 북쪽 바다 곶의 항법 안테나: 사과 천체 고도 아래에 머무는 낮은 실루엣.
  const ax=95,az=-645,ay=groundH(ax,az);
  if(Number.isFinite(ay)) {
    const p=[box(6,2,6,PAL.stone),cyl(0.4,24,PAL.steel,0,2,0,0,5),box(1,1,1,PAL.red,0,26,0)];
    for(const s of [-1,1])p.push(beam([s*5,0,0],[0,20,0],0.25,PAL.steel),box(8,0.3,0.3,PAL.ash,0,11+s*4,0));
    landmarks.push({g:mergeGeometries(p),x:ax,y:ay,z:az});
  }
  root.add(landscapeBatch(landmarks,'island-landmarks'));
  root.userData.counts={trees:trees.length+snowy.length,palms:palms.length,rocks:rocks.length};
  return root;
}
