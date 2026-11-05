// 도시 외곽 생활권: 사각 시가지 끝의 여러 골목이 산기슭/바닷가의 작은 군락으로 이어진다.
// 높이 값은 보관하지 않는다. 렌더가 현재 terrainY를 읽고 부지/물/도로 정합성을 검수한다.
import type {CityBuilding} from './city.js';
import {hash2} from '../render/lowpoly/rng.js';

export type FringeKind = 'homes' | 'orchard' | 'cabins' | 'coast';
export type FringePoint = readonly [number, number];
export interface FringeLane {
  id: string;
  kind: FringeKind;
  width: number;
  points: readonly FringePoint[];
}
const LANE_CONTROLS: readonly FringeLane[] = [
  {id:'west-village',kind:'homes',width:4.8,points:[[-326,174],[-347,170],[-362,138],[-356,103],[-367,72],[-354,36],[-345,3],[-326,0]]},
  {id:'west-cabins',kind:'cabins',width:4.2,points:[[-327,-190],[-349,-181],[-363,-146],[-350,-111],[-365,-77],[-348,-44],[-327,-36]]},
  {id:'northwest-orchard',kind:'orchard',width:4.4,points:[[-310,-325],[-306,-346],[-276,-358],[-247,-350],[-220,-367],[-191,-353],[-180,-326]]},
  {id:'north-hamlet',kind:'homes',width:4.4,points:[[-148,-326],[-147,-346],[-120,-364],[-85,-355],[-60,-374],[-29,-353],[-16,-326]]},
  {id:'north-east-cabins',kind:'cabins',width:4.4,points:[[76,-326],[84,-350],[116,-365],[143,-348],[172,-361],[196,-346],[205,-326]]},
  {id:'east-hillside',kind:'homes',width:4.6,points:[[326,-111],[347,-108],[356,-80],[346,-49],[360,-17],[349,17],[360,47],[345,76],[326,82]]},
  {id:'east-orchard',kind:'orchard',width:4.3,points:[[326,139],[347,143],[362,167],[353,190],[370,213],[355,239],[335,248]]},
  {id:'southwest-coast',kind:'coast',width:4.3,points:[[-326,257],[-347,267],[-359,291],[-346,316],[-325,329],[-295,345],[-260,349]]},
];


function smoothLane(lane:FringeLane):FringeLane {
  const out:FringePoint[]=[];
  for(let i=0;i<lane.points.length-1;i++) {
    const a=lane.points[Math.max(0,i-1)],b=lane.points[i],c=lane.points[i+1],d=lane.points[Math.min(lane.points.length-1,i+2)],n=Math.max(2,Math.ceil(Math.hypot(c[0]-b[0],c[1]-b[1])/3));
    for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t,f=(j:number)=>0.5*(2*b[j]+(-a[j]+c[j])*t+(2*a[j]-5*b[j]+4*c[j]-d[j])*t2+(-a[j]+3*b[j]-3*c[j]+d[j])*t3);out.push([f(0),f(1)]);}
  }
  out.push(lane.points[lane.points.length-1]);return {...lane,points:out};
}
export const FRINGE_LANES:readonly FringeLane[]=LANE_CONTROLS.map(smoothLane);

export interface FringePlot {
  id: string;
  lane: string;
  kind: FringeKind;
  x: number;
  z: number;
  ry: number;
  w: number;
  d: number;
  floors: number;
  style: CityBuilding['style'];
  wall: CityBuilding['wall'];
  roof: CityBuilding['roof'];
  /** 문 앞 지점과 골목 접점. 시각 진입로/이동 검수는 같은 두 점을 사용한다. */
  entry: FringePoint;
  road: FringePoint;
  garden: boolean;
}
const WALLS: CityBuilding['wall'][]=['plaster','bone','brick','cloud','clay','plaster'];
const ROOFS: CityBuilding['roof'][]=['tileRed','slate','tileBlue','clay'];
function plots() {
  const out:FringePlot[]=[];
  FRINGE_LANES.forEach((lane,li)=>{
    let station=14, length=0, number=0;
    for(let i=1;i<lane.points.length;i++) {
      const a=lane.points[i-1],b=lane.points[i],dx=b[0]-a[0],dz=b[1]-a[1],segment=Math.hypot(dx,dz),tx=dx/segment,tz=dz/segment;
      while(station<length+segment-2) {
        const u=(station-length)/segment,rx=a[0]+dx*u,rz=a[1]+dz*u;
        for(const side of[-1,1]) {
          const seed=li*101+number*7+side,r=hash2(seed,82,419),large=lane.kind==='orchard'&&r>0.65;
          const w=large?14:8+Math.floor(hash2(seed,3,420)*5),d=large?10:7+Math.floor(hash2(seed,4,420)*4);
          const offset=lane.width/2+5+d/2+(hash2(seed,5,420)-0.5)*2;
          const nx=tz*side,nz=-tx*side,x=rx+nx*offset,z=rz+nz*offset;
          if(Math.max(Math.abs(x),Math.abs(z))<336)continue;
          const faceX=-nx,faceZ=-nz,ry=Math.atan2(faceX,faceZ),entry:[number,number]=[x+faceX*(d/2+1.15),z+faceZ*(d/2+1.15)];
          out.push({id:`fringe-${lane.id}-${number}-${side}`,lane:lane.id,kind:lane.kind,x,z,ry,w,d,
            floors:large?1:lane.kind==='homes'&&r>0.72?2:1,style:lane.kind==='coast'&&r>0.8?'shop':'house',
            wall:WALLS[Math.floor(hash2(seed,6,420)*WALLS.length)],roof:ROOFS[Math.floor(hash2(seed,7,420)*ROOFS.length)],
            entry,road:[rx,rz],garden:lane.kind==='orchard'||r<0.4});
        }
        number++;station+=19+hash2(li,number,421)*7;
      }
      length+=segment;
    }
  });
  return out;
}
export const FRINGE_PLOTS: readonly FringePlot[]=plots();

/** root 지형 담당이 평탄화에 사용할 수 있는 수평 부지 계약. 높이는 기존 지형 중심 높이로 결정한다. */
export const FRINGE_PLATFORM_SPECS=FRINGE_PLOTS.map(p=>({id:p.id,x:p.x,z:p.z,w:p.w+2,d:p.d+2,ry:p.ry,fade:5,maxCut:3.8}));
export function fringeRoadNear(x:number,z:number) {
  let d=Infinity,lane:FringeLane|undefined,px=x,pz=z;
  for(const l of FRINGE_LANES)for(let i=1;i<l.points.length;i++) {
    const a=l.points[i-1],b=l.points[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
    const qx=a[0]+dx*t,qz=a[1]+dz*t,dist=Math.hypot(x-qx,z-qz);
    if(dist<d){d=dist;lane=l;px=qx;pz=qz;}
  }
  return {d,lane,x:px,z:pz};
}

/** 산림 생성기가 같은 생활 부지·골목·집 진입로를 비우도록 공유하는 순수 배치 판정. */
const LANE_BOUNDS=FRINGE_LANES.map(l=>({lane:l,x0:Math.min(...l.points.map(p=>p[0])),x1:Math.max(...l.points.map(p=>p[0])),z0:Math.min(...l.points.map(p=>p[1])),z1:Math.max(...l.points.map(p=>p[1]))}));
export function fringeKeepOut(x:number,z:number,margin=0) {
  if(x<-410-margin||x>420+margin||z<-415-margin||z>395+margin)return false;
  for(const l of LANE_BOUNDS) {
    const pad=l.lane.width/2+2+margin;
    if(x<l.x0-pad||x>l.x1+pad||z<l.z0-pad||z>l.z1+pad)continue;
    for(let i=1;i<l.lane.points.length;i++) {
      const a=l.lane.points[i-1],b=l.lane.points[i],vx=b[0]-a[0],vz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*vx+(z-a[1])*vz)/(vx*vx+vz*vz||1)));
      if(Math.hypot(x-a[0]-vx*t,z-a[1]-vz*t)<pad)return true;
    }
  }
  for(const p of FRINGE_PLOTS) {
    const dx=x-p.x,dz=z-p.z;if(Math.abs(dx)>20+margin||Math.abs(dz)>20+margin)continue;
    const c=Math.cos(p.ry),s=Math.sin(p.ry),u=dx*c-dz*s,v=dx*s+dz*c;
    if(Math.abs(u)<p.w/2+2+margin&&Math.abs(v)<p.d/2+2+margin)return true;
    const a=p.entry,b=p.road,vx=b[0]-a[0],vz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*vx+(z-a[1])*vz)/(vx*vx+vz*vz||1)));
    if(Math.hypot(x-a[0]-vx*t,z-a[1]-vz*t)<1.8+margin)return true;
  }
  return false;
}
