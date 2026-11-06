// 도시→교외→산림 전이 생활권. 위치/진입로는 data/city-fringe.ts, 실제 지면은 terrainY를 공유한다.
// 부지 경사에 맞춘 기초·진입 데크·회전 건물 충돌을 등록하고 120u 블록마다 두 단계 LOD로 병합한다.
import {registerRuralInterior} from '../data/interiors.js';
import {G} from '../core/runtime.js';
import {surfaceMaterial} from './surface-detail.js';
import {tagStructure} from './surface-tags.js';
import {addSolid,groundH,solidAt} from '../core/terrain.js';
import {addDeck} from '../core/deck.js';
import {CITY_POLY,BRIDGE_ENDS} from '../data/outline.js';
import {CITY_ROADS,CITY_BUILDINGS,footprint,type CityBuilding} from '../data/city.js';
import {approachNear} from '../data/bridge.js';
import {mroadNear,OBS,MROAD_W} from '../data/mountain-road.js';
import {FRINGE_LANES,FRINGE_PLOTS,fringeRoadNear,type FringePlot,type FringePoint} from '../data/city-fringe.js';
import {PAL,mix} from './lowpoly/palette.js';
import {box,gable,panel,cyl,ico,cone} from './lowpoly/prim.js';
import {beam} from './lowpoly/structure.js';
import {lowMat,mergePlaced,mergeGeometries,type Placed} from './lowpoly/merge.js';
import {makeBuilding,buildingHeight} from './city/building.js';
import {terrainRibbon,terrainPatch} from './landscape-surface.js';
import {landscapeBatch} from './landscape-batch.js';
import {hash2} from './lowpoly/rng.js';

interface Site {plot:FringePlot;y:number;low:number;corners:FringePoint[];}
const hit=(a:readonly number[],b:readonly number[],m=0)=>a[0]<b[2]+m&&a[2]>b[0]-m&&a[1]<b[3]+m&&a[3]>b[1]-m;
const footprints=CITY_BUILDINGS.map(footprint),acceptedSites:Site[]=[],lods:{lod:any;x:number;z:number}[]=[];
const roads=CITY_ROADS.map(r=>{const h=r.w/2+r.sidewalk+1.2;return r.x0===r.x1?[r.x0-h,Math.min(r.z0,r.z1),r.x0+h,Math.max(r.z0,r.z1)]:[Math.min(r.x0,r.x1),r.z0-h,Math.max(r.x0,r.x1),r.z0+h];});
const placedWorld=(g:any,x:number,z:number):Placed=>{g.translate(-x,0,-z);return {g,x,z};};
const frame=(p:FringePlot,u:number,v:number):FringePoint=>[p.x+u*Math.cos(p.ry)+v*Math.sin(p.ry),p.z-u*Math.sin(p.ry)+v*Math.cos(p.ry)];
const extent=(corners:FringePoint[])=>[Math.min(...corners.map(p=>p[0])),Math.min(...corners.map(p=>p[1])),Math.max(...corners.map(p=>p[0])),Math.max(...corners.map(p=>p[1]))];
const cornersOf=(p:FringePlot,m=0)=>[[-p.w/2-m,-p.d/2-m],[p.w/2+m,-p.d/2-m],[p.w/2+m,p.d/2+m],[-p.w/2-m,p.d/2+m]].map(([u,v])=>frame(p,u,v));

function siteOf(p:FringePlot):Site|null {
  const corners=cornersOf(p,0.4),test=[...corners,[p.x,p.z] as FringePoint];
  if(test.some(([x,z])=>!CITY_POLY.inside(x,z)||Math.abs(x-BRIDGE_ENDS.x)<58&&z>310||mroadNear(x,z).d<MROAD_W/2+7||approachNear(x,z).d<29||Math.hypot(x-OBS.x,z-OBS.z)<OBS.r+16))return null;
  const heights=test.map(([x,z])=>groundH(x,z));
  if(heights.some(y=>!Number.isFinite(y)||y<-2.2||y>42))return null;
  const low=Math.min(...heights),high=Math.max(...heights),rect=extent(corners);
  if(high-low>3.8||roads.some(r=>hit(rect,r,0.8))||footprints.some(r=>hit(rect,r,1.5)))return null;
  if(test.some(([x,z])=>solidAt(x,z,0.5,groundH(x,z))))return null;
  if(corners.some(([x,z])=>{const r=fringeRoadNear(x,z);return r.lane&&r.d<r.lane.width/2+1.1;}))return null;
  if(acceptedSites.some(s=>hit(rect,extent(s.corners),2.2)||hit(rect,[Math.min(s.plot.entry[0],s.plot.road[0])-1.4,Math.min(s.plot.entry[1],s.plot.road[1])-1.4,Math.max(s.plot.entry[0],s.plot.road[0])+1.4,Math.max(s.plot.entry[1],s.plot.road[1])+1.4])))return null;
  const target=high+0.16,ry=groundH(...p.road),ey=groundH(...p.entry),run=Math.hypot(p.entry[0]-p.road[0],p.entry[1]-p.road[1]);
  if(!Number.isFinite(ry)||!Number.isFinite(ey)||Math.abs(target-ry)>run*0.7||solidAt(...p.entry,0.4,ey))return null;
  for(let t=0;t<=1;t+=0.1){const x=p.road[0]+(p.entry[0]-p.road[0])*t,z=p.road[1]+(p.entry[1]-p.road[1])*t;if(solidAt(x,z,0.4,groundH(x,z)))return null;}
  return {plot:p,y:target,low,corners};
}

/** 회전한 직사각형을 얇은 행으로 채워 AABB가 문 앞이나 골목을 과하게 막지 않게 한다. */
function registerHouse(s:Site,H:number) {
  const polygon=cornersOf(s.plot,-0.06),r=extent(polygon),step=1;
  for(let z=r[1];z<r[3];z+=step) {
    const zz=Math.min(r[3]-0.01,z+step/2),xs:number[]=[];
    for(let i=0;i<4;i++){const a=polygon[i],b=polygon[(i+1)%4];if((a[1]<=zz&&b[1]>zz)||(b[1]<=zz&&a[1]>zz))xs.push(a[0]+(b[0]-a[0])*(zz-a[1])/(b[1]-a[1]));}
    if(xs.length>=2)addSolid(Math.min(...xs)+0.1,z,Math.max(...xs)-0.1,Math.min(r[3],z+step),s.low-0.5,s.y+H+3);
  }
}
function nearParts(s:Site,b:CityBuilding) {
  const p=s.plot,built=makeBuilding(b),parts:any[]=[built.solid],foundation=s.y-s.low+0.2;
  built.lit.dispose();
  parts.push(box(p.w+0.45,foundation,p.d+0.45,PAL.stone,0,-foundation,0));
  // 발코니/현관, 창 아래 화분, 굴뚝·배수관은 같은 solid에 병합한다.
  parts.push(box(3.2,0.16,1.5,PAL.bone,0,-0.12,p.d/2+0.7),box(0.12,buildingHeight(b),0.12,PAL.steel,p.w/2-0.1,0,p.d/2));
  if(p.kind==='cabins')parts.push(box(3.5,0.2,2,PAL.wood,0,3.5,p.d/2+0.8),box(0.15,3.5,0.15,PAL.wood,-1.6,0,p.d/2+1.4),box(0.15,3.5,0.15,PAL.wood,1.6,0,p.d/2+1.4));
  if(p.kind==='coast')parts.push(box(p.w+0.4,0.2,1.8,PAL.tileBlue,0,3.8,p.d/2+0.6));
  for(const sign of[-1,1])parts.push(box(1.5,0.3,0.5,PAL.clay,sign*p.w*0.28,1.1,p.d/2+0.3),ico(0.35,0,PAL.green,sign*p.w*0.28,1.6,p.d/2+0.35));
  return tagStructure(mergeGeometries(parts),b);
}
function farParts(s:Site,b:CityBuilding) {
  const p=s.plot,H=buildingHeight(b);
  return tagStructure(mergeGeometries([box(p.w,H,p.d,PAL[p.wall]),gable(p.w+0.8,3,p.d+0.8,PAL[p.roof],0,H),box(p.w+0.4,s.y-s.low+0.1,p.d+0.4,PAL.stone,0,s.low-s.y),panel(p.w-2,1.3,PAL.glass,0,2.3,p.d/2+0.05)]),b);
}
function livingParts(s:Site,parts:Placed[]) {
  const p=s.plot,front=p.entry,road=p.road,ry=groundH(...road)+0.12;
  // 실제 걸을 수 있는 진입 판과 문 앞 높이를 동일한 데이터로 연결한다.
  parts.push(placedWorld(beam([road[0],ry-0.1,road[1]],[front[0],s.y-0.1,front[1]],2,PAL.bone,0.18),p.x,p.z));
  addDeck({id:`${p.id}-entry`,ax:road[0],az:road[1],bx:front[0],bz:front[1],hw:1,h0:ry,h1:s.y});
  registerRuralInterior({id: p.id, group: 'fringe', model: p.kind, x: p.x, y: s.y, z: p.z,
    w: p.w, d: p.d, ry: p.ry, door: {x: front[0], y: s.y, z: front[1]}, landing: {x: road[0], y: ry, z: road[1]}});
  if(s.y-s.low>1.1) {
    for(const side of[-1,1]) {
      const a=frame(p,side*(p.w/2+1.2),-p.d/2-1),b=frame(p,side*(p.w/2+1.2),p.d/2-0.5),ha=groundH(...a),hb=groundH(...b);
      if(Number.isFinite(ha)&&Number.isFinite(hb))parts.push(placedWorld(beam([a[0],ha+0.25,a[1]],[b[0],hb+0.25,b[1]],0.45,PAL.stone,0.8),p.x,p.z));
    }
  }
  // 텃밭은 집 뒤 사면에, 진입로/다른 집/산악 도로와 겹치지 않는 곳에만 둔다.
  if(p.garden) {
    const g=frame(p,0,-p.d/2-5.8),h=groundH(...g),r=fringeRoadNear(...g);
    if(Number.isFinite(h)&&h>-2&&r.d>r.lane!.width/2+3&&!solidAt(...g,3,h)&&mroadNear(...g).d>13) {
      parts.push(placedWorld(terrainPatch(g[0],g[1],6.5,5,mix(PAL.clay,PAL.wood,0.15),-p.ry),g[0],g[1]));
      for(let k=0;k<4;k++) {
        const a=frame(p,-2.5,-p.d/2-3.9-k),b=frame(p,2.5,-p.d/2-3.9-k);
        parts.push(placedWorld(terrainRibbon([a,b],0.28,k%2?PAL.lime:PAL.green,0.2),g[0],g[1]));
      }
    }
  }
  if(p.kind==='orchard'&&p.w>=14) {
    const silo=frame(p,p.w/2+2,-p.d/2+1),h=groundH(...silo),rd=fringeRoadNear(...silo);
    if(Number.isFinite(h)&&h>-2&&!solidAt(...silo,1.6,h)&&rd.d>rd.lane!.width/2+3) {
      parts.push({g:mergeGeometries([cyl(1.15,5.3,PAL.ash,0,0,0,0,8),cone(1.4,1.6,PAL.tileRed,0,5.3,0,0,8)]),x:silo[0],y:h,z:silo[1]});
      addSolid(silo[0]-1.15,silo[1]-1.15,silo[0]+1.15,silo[1]+1.15,h,h+7);
    }
  }
  const utility=frame(p,p.w/2+1.3,p.d/2-1),uh=groundH(...utility);
  if(Number.isFinite(uh)&&!solidAt(...utility,0.45,uh))parts.push({g:box(0.7,1,0.7,hash2(p.x,p.z)>0.5?PAL.green:PAL.steel),x:utility[0],y:uh,z:utility[1]});
}

export function buildCityFringe() {
  const root=new THREE.Group();root.name='city-fringe';acceptedSites.length=0;lods.length=0;
  const landscape:Placed[]=[],cells=new Map<string,Site[]>();
  for(const p of FRINGE_PLOTS){const s=siteOf(p);if(!s)continue;acceptedSites.push(s);registerHouse(s,p.floors*5.2);const key=`${Math.floor(p.x/120)},${Math.floor(p.z/120)}`;(cells.get(key)||cells.set(key,[]).get(key)!).push(s);}
  cells.forEach(sites=>{
    const cx=sites.reduce((v,s)=>v+s.plot.x,0)/sites.length,cz=sites.reduce((v,s)=>v+s.plot.z,0)/sites.length,close:Placed[]=[],far:Placed[]=[];
    for(const s of sites) {
      const p=s.plot,b:CityBuilding={id:p.id,district:'fringe',purpose:'house',face:'s',x:p.x,z:p.z,w:p.w,d:p.d,floors:p.floors,style:p.style,wall:p.wall,roof:p.roof};
      close.push({g:nearParts(s,b),x:p.x-cx,y:s.y,z:p.z-cz,ry:p.ry});far.push({g:farParts(s,b),x:p.x-cx,y:s.y,z:p.z-cz,ry:p.ry});livingParts(s,landscape);
    }
    const lod=new THREE.LOD();lod.name='fringe-neighborhood';lod.autoUpdate=false;lod.position.set(cx,0,cz);
    lod.addLevel(new THREE.Mesh(mergePlaced(close),surfaceMaterial()),0);lod.addLevel(new THREE.Mesh(mergePlaced(far),surfaceMaterial()),175);
    lod.levels[0].object.visible=false;lod.levels[1].object.visible=true;lods.push({lod,x:cx,z:cz});root.add(lod);
  });
  for(const lane of FRINGE_LANES) {
    const c=lane.kind==='homes'?mix(PAL.asphalt,PAL.stone,0.22):mix(PAL.bone,PAL.clay,0.18),mid=lane.points[Math.floor(lane.points.length/2)];
    // 전체 골목의 공통 접선으로 edge를 계산해 중간 배치 경계의 삼각 틈을 없앤다.
    landscape.push(placedWorld(terrainRibbon(lane.points,lane.width+1.4,mix(PAL.bone,PAL.stone,0.2),0.07),mid[0],mid[1]),placedWorld(terrainRibbon(lane.points,lane.width,c,0.12),mid[0],mid[1]));
    // 작은 정류장은 대로 접점 바로 바깥의 넓은 갓길에만 둔다.
    const index=Math.min(7,lane.points.length-2),p=lane.points[index],a=lane.points[index-1],b=lane.points[index+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=(b[1]-a[1])/len,nz=-(b[0]-a[0])/len;
    const x=p[0]+nx*(lane.width/2+2),z=p[1]+nz*(lane.width/2+2),y=groundH(x,z);
    if(Number.isFinite(y)&&!solidAt(x,z,2,y)) {
      const parts=[box(3.8,0.15,2.4,PAL.stone),box(3.8,0.2,2.4,PAL.tileBlue,0,3.2),box(0.12,3.2,0.12,PAL.steel,-1.6,0,-0.8),box(0.12,3.2,0.12,PAL.steel,1.6,0,-0.8),box(2.8,0.16,0.6,PAL.wood,0,0.75,-0.4),box(0.12,3.8,0.12,PAL.steel,2.6,0,0),panel(0.8,1.1,PAL.blue,2.6,3,0.1)];
      landscape.push({g:mergeGeometries(parts),x,y,z,ry:Math.atan2(nx,nz)});
    }
  }
  root.add(landscapeBatch(landscape,'fringe-living',120));
  root.userData={buildings:acceptedSites.length,lanes:FRINGE_LANES.length,plots:acceptedSites.map(s=>({id:s.plot.id,x:s.plot.x,z:s.plot.z,y:s.y,entry:s.plot.entry,road:s.plot.road}))};
  return root;
}

/** 지도 카메라는 고도와 무관하게 상세 모델을 보이고, 플레이는 수평 거리로만 선택한다. */
export function updateCityFringe() {
  const overview=!!G.camera?.isOrthographicCamera,p=G.me?.pos||G.camera?.position||{x:0,z:0};
  for(const t of lods){const close=overview||Math.hypot(t.x-p.x,t.z-p.z)<175;t.lod.levels[0].object.visible=close;t.lod.levels[1].object.visible=!close;}
}
