// 실제 남동 해안 밖 요트항·방파제와 남쪽 해변. 걸을 수 있는 잔교만 데크로 등록한다.
import {groundH} from '../core/terrain.js';
import {addDeck} from '../core/deck.js';
import {SEA_Y} from '../data/world-map.js';
import {BRIDGE_ENDS} from '../data/outline.js';
import {PAL,mix} from './lowpoly/palette.js';
import {beam} from './lowpoly/structure.js';
import {box,cyl,cone} from './lowpoly/prim.js';
import {type Placed} from './lowpoly/merge.js';
import {landscapeBatch} from './landscape-batch.js';
import {terrainRibbon,type PathPoint} from './landscape-surface.js';
import {coastalRock} from './rural-art.js';
import {yachtGeo} from './city/fun-props.js';

export function buildWaterfront() {
  const parts:Placed[]=[],root=new THREE.Group();root.name='waterfront';
  const x=365;let shore=345;
  while(shore<550&&groundH(x,shore)>SEA_Y+0.2)shore+=2;
  const z=shore+18,y=SEA_Y+0.95;
  // 바다 위 L자 방파제 안에 잔교와 계류장을 놓는다.
  const deck=(id:string,ax:number,az:number,bx:number,bz:number,hw:number,h0=y,h1=y)=>addDeck({id,ax,az,bx,bz,hw,h0,h1});
  parts.push({g:box(3,0.7,84,PAL.bone),x:x-28,y:y-0.7,z:z+24});deck('marina-west',x-28,z-18,x-28,z+66,1.5);
  parts.push({g:box(62,0.7,3,PAL.bone),x:x+1,y:y-0.7,z:z-16.5});deck('marina-north',x-30,z-16.5,x+32,z-16.5,1.5);
  for(let i=0;i<5;i++) {
    const zz=z-5+i*13;
    parts.push({g:box(24,0.5,2,PAL.wood),x:x-16,y:y-0.5,z:zz});deck(`marina-finger-${i}`,x-28,zz,x-4,zz,1);
    for(const s of[-1,1])parts.push({g:yachtGeo(i%2?PAL.blue:PAL.red),x:x-15,y:SEA_Y+0.2,z:zz+s*4.7,ry:Math.PI/2,s:0.7});
  }
  // 동쪽과 남쪽 석축이 만을 감싸고 입구는 열어 둔다.
  for(let i=0;i<23;i++)parts.push({g:coastalRock(i),x:x+38,y:SEA_Y-0.5,z:z-18+i*4,s:1.2});
  for(let i=0;i<13;i++)parts.push({g:coastalRock(i+30),x:x+38-i*4,y:SEA_Y-0.5,z:z+70,s:1.2});
  parts.push({g:cyl(2,1.2,PAL.stone,0,0,0,0,8),x:x-10,y:SEA_Y+0.1,z:z+70},{g:cyl(0.5,5,PAL.white,0,0,0,0,6),x:x-10,y:SEA_Y+1.3,z:z+70},{g:cone(0.9,1.5,PAL.red,0,0,0,0,6),x:x-10,y:SEA_Y+6.3,z:z+70});
  // 마른 해안에서 내려가는 잔교. 물 위 구간은 같은 모델 좌표의 데크로 등록한다.
  const start=shore-20,sy=groundH(x-28,start);
  if(Number.isFinite(sy)) {
    // beam은 두 끝점 사이 실제 경사 길이를 사용한다. 표시 면과 등록 데크가 끝까지 맞는다.
    const g=beam([x-28,sy-0.125,start],[x-28,y-0.125,z-16],3,PAL.wood,0.25);
    parts.push({g,x:0,z:0});
    deck('marina-gangway',x-28,start,x-28,z-16,1.5,sy,y);
  }
  const trail:PathPoint[]=[];for(let i=0;i<=24;i++)trail.push([322+(x-28-322)*i/24,333+(start-333)*i/24]);
  parts.push({g:terrainRibbon(trail,2.6,PAL.bone),x:0,z:0});
  // 파라솔은 낮은 모래 해변에만 놓고 다리 진입로는 넓게 비운다.
  let parasols=0;
  for(let px=-290;px<=250;px+=30)for(const zz of[365,393]) {
    const py=groundH(px,zz);if(!Number.isFinite(py)||py<SEA_Y+1.5||py>1||Math.abs(px-BRIDGE_ENDS.x)<65)continue;
    const color=[PAL.red,PAL.blue,PAL.amber,PAL.teal][parasols%4];
    parts.push({g:cyl(0.08,3.4,PAL.wood,0,0,0,0,5),x:px,y:py,z:zz},{g:cone(2.8,1.2,color,0,0,0,0,8),x:px,y:py+3.2,z:zz},{g:box(1.6,0.2,3.6,PAL.bone),x:px+3.5,y:py+0.2,z:zz});parasols++;
  }
  root.add(landscapeBatch(parts,'marina-and-beach',100));root.userData={x,z,shore,boats:10,parasols,gangway:{ax:x-28,az:start,bx:x-28,bz:z-16,h0:sy,h1:y}};return root;
}
