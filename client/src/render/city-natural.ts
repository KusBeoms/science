// 비어 있던 시가지 블록을 계획된 거리 전면·뒷마당으로 채운다. 기존 목적지·문·도로를 보존한다.
// 신규 건물은 배경 건축물이며 새 상점/퀘스트/세이브 항목을 만들지 않는다.
import {CITY_BUILDINGS,CITY_LANDMARKS,CITY_ROADS,CITY_PLAZAS,footprint,type CityBuilding} from '../data/city.js';
import {RESERVED} from '../data/city-w3.js';
import {CITY_HILL} from '../data/world-map.js';
import {addSolid} from '../core/terrain.js';
import {PAL,type PalName} from './lowpoly/palette.js';
import {box,gable,panel} from './lowpoly/prim.js';
import {mergeGeometries,type Placed} from './lowpoly/merge.js';
import {hash2} from './lowpoly/rng.js';
import {makeBuilding,buildingHeight} from './city/building.js';
import {landscapeBatch} from './landscape-batch.js';
import {G} from '../core/runtime.js';

type Rect=readonly[number,number,number,number];
const hit=(a:Rect,b:Rect,m=0)=>a[0]<b[2]+m&&a[2]>b[0]-m&&a[1]<b[3]+m&&a[3]>b[1]-m;
const roads=CITY_ROADS.map(r=>{const h=r.w/2+r.sidewalk+2;return r.x0===r.x1?[r.x0-h,Math.min(r.z0,r.z1),r.x0+h,Math.max(r.z0,r.z1)]:[Math.min(r.x0,r.x1),r.z0-h,Math.max(r.x0,r.x1),r.z0+h];}) as Rect[];
const blockers:Rect[]=[...CITY_BUILDINGS.map(footprint),...CITY_LANDMARKS.map(l=>[l.x-(l.w||l.r*2)/2,l.z-(l.d||l.r*2)/2,l.x+(l.w||l.r*2)/2,l.z+(l.d||l.r*2)/2] as Rect),...CITY_PLAZAS.map(p=>p.rect),...RESERVED];
const SCENERY_IN_CITY=0;
const groups:{near:any;far:any;x:number;z:number}[]=[];
export const naturalBuildings:CityBuilding[]=[];
export function buildNaturalCity() {
  const root=new THREE.Group();root.name='city-neighborhoods';
  // W7 CITY_DENSITY: 시가지 안 빈 블록은 이제 data/city-w7.ts 의 실제(입장 가능) 건물이 채운다. 배경 건물은 더 만들지 않는다.
  if(SCENERY_IN_CITY===0){root.userData.count=0;return root;}
  const wall:PalName[]=['plaster','bone','brick','cloud','ash'],roof:PalName[]=['tileRed','slate','tileBlue'];
  const cells=new Map<string,CityBuilding[]>();
  for(let z=-315;z<=315;z+=26)for(let x=-315;x<=315;x+=26) {
    if(Math.abs(x)<58&&Math.abs(z)<58||Math.hypot(x-CITY_HILL.x,z-CITY_HILL.z)<CITY_HILL.foot+8)continue;
    const rnd=hash2(x,z,401),w=12+(rnd>0.6?2:0),d=13;
    const r:Rect=[x-w/2,z-d/2,x+w/2,z+d/2];
    if(roads.some(q=>hit(r,q,1.5))||blockers.some(q=>hit(r,q,4)))continue;
    // 공원 옆은 낮은 주택, 북동쪽은 작은 사무실. 가까운 길을 향해 정면을 둔다.
    let closest=CITY_ROADS[0],best=1e9;
    for(const rd of CITY_ROADS){const t=rd.x0===rd.x1?Math.hypot(x-rd.x0,z-Math.max(Math.min(z,Math.max(rd.z0,rd.z1)),Math.min(rd.z0,rd.z1))):Math.hypot(z-rd.z0,x-Math.max(Math.min(x,Math.max(rd.x0,rd.x1)),Math.min(rd.x0,rd.x1)));if(t<best){best=t;closest=rd;}}
    const face=closest.x0===closest.x1?(x>closest.x0?'w':'e'):(z>closest.z0?'n':'s');
    const residential=x<-40&&z>40||x<-200,style=residential?'house':rnd<0.3?'shop':'office';
    const b:CityBuilding={id:`scenery-${naturalBuildings.length}`,district:'scenery',x,z,w,d,face,floors:residential?1+(rnd>0.65?1:0):1+Math.floor(rnd*4),style,wall:wall[Math.floor(hash2(x,z,402)*wall.length)],roof:roof[Math.floor(hash2(x,z,403)*roof.length)]};
    // 동서로 향한 발자국도 재검사해 문법 건물이 도로로 삐져나오지 않게 한다.
    const fp=footprint(b);if(roads.some(q=>hit(fp,q,1.5))||blockers.some(q=>hit(fp,q,4)))continue;
    naturalBuildings.push(b);blockers.push(fp);addSolid(...fp);
    const key=`${Math.floor(x/100)},${Math.floor(z/100)}`;(cells.get(key)||cells.set(key,[]).get(key)!).push(b);
  }
  const rotation={s:0,n:Math.PI,e:Math.PI/2,w:-Math.PI/2};
  cells.forEach(list=>{
    const nearParts:Placed[]=[],farParts:Placed[]=[];
    for(const b of list) {
      const built=makeBuilding(b),h=buildingHeight(b),ry=rotation[b.face];
      nearParts.push({g:built.solid,x:b.x,z:b.z,ry});built.lit.dispose();
      const p=[box(b.w,h,b.d,PAL[b.wall])];
      if(b.style==='house')p.push(gable(b.w+0.8,3,b.d+0.8,PAL[b.roof],0,h));
      else p.push(box(b.w+0.5,0.4,b.d+0.5,PAL[b.roof],0,h));
      // 원경에도 창 띠를 남겨 무채색 상자 덩어리가 되지 않게 한다.
      for(let f=0;f<b.floors;f++)p.push(panel(b.w-2,1.3,PAL.glass,0,f*5.2+2.8,b.d/2+0.05));
      farParts.push({g:mergeGeometries(p),x:b.x,z:b.z,ry});
    }
    const near=landscapeBatch(nearParts,'neighborhood-close',100),far=landscapeBatch(farParts,'neighborhood-distant',100);
    root.add(near,far);groups.push({near,far,x:list.reduce((s,b)=>s+b.x,0)/list.length,z:list.reduce((s,b)=>s+b.z,0)/list.length});
  });
  root.userData.count=naturalBuildings.length;
  return root;
}
export function updateNaturalCity() {
  if(!G.me)return;
  for(const t of groups){const near=G.camera.isOrthographicCamera||Math.hypot(t.x-G.me.pos.x,t.z-G.me.pos.z)<155;t.near.visible=near;t.far.visible=!near;}
}
