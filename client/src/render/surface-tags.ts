// Explicit static surface tags; characters, foliage, glass and lights retain their own materials.
import {PAL, mix, rgb} from './lowpoly/palette.js';
import {markSurface} from './surface-detail.js';
import type {CityBuilding} from '../data/city.js';
export const SURFACE={lawn:0,forest:1,roughLawn:2,pasture:3,soil:4,sand:5,pebbles:6,cliff:7,
  paving:8,asphalt:9,wood:10,corrugated:11,steel:12,rust:13,tile:14,fabric:15} as const;
const same=(r:number,g:number,b:number,hex:number)=>{
  const c=rgb(hex);return Math.abs(r-c[0])+Math.abs(g-c[1])+Math.abs(b-c[2])<0.012;
};
const wood=[PAL.wood,mix(PAL.wood,PAL.coal,.4),mix(PAL.wood,PAL.coal,.3),mix(PAL.wood,PAL.clay,.4)];
const paved=[PAL.paving,mix(PAL.paving,PAL.bone,.4),mix(PAL.paving,PAL.brick,.28)];
export function tagStructure(geo:any,building?:CityBuilding) {
  const c=geo.attributes.color;if(!c)return geo;
  const previous=geo.attributes.surfaceDetail,data=previous?new Float32Array(previous.array):new Float32Array(c.count*3);
  let tagged=!!previous;
  for(let i=0;i<c.count;i++) {
    if(data[i*3+2]>0)continue;
    const r=c.getX(i),g=c.getY(i),b=c.getZ(i),is=(hex:number)=>same(r,g,b,hex);
    let kind=-1,scale=3,strength=.6;
    if(wood.some(is))kind=SURFACE.wood;
    else if(building&&is(PAL[building.roof])) {
      if(building.wall===building.roof&&building.wall!=='steel'&&Math.abs(geo.attributes.normal?.getY(i)??0)<.35)continue;
      kind=building.district.includes('fac')?SURFACE.corrugated:building.roof==='steel'?SURFACE.steel:SURFACE.tile;scale=3;
    }
    else if(building&&is(PAL[building.wall])&&building.wall!=='steel')continue;
    else if(is(PAL.tileRed)||is(PAL.tileBlue)||is(PAL.slate)&&geo.attributes.normal?.getY(i)>.65)kind=SURFACE.tile;
    else if(is(PAL.steel)||is(PAL.ash)){kind=SURFACE.steel;scale=2;strength=.45;}
    if(kind<0)continue;
    data.set([kind,scale,strength],i*3);tagged=true;
  }
  if(tagged)geo.setAttribute('surfaceDetail',new THREE.BufferAttribute(data,3));
  return geo;
}
export function tagGround(geo:any) {
  const c=geo.attributes.color;if(!c)return geo;
  const data=new Float32Array(c.count*3);let tagged=false;
  for(let i=0;i<c.count;i++) {
    const r=c.getX(i),g=c.getY(i),b=c.getZ(i),is=(hex:number)=>same(r,g,b,hex);
    let kind=-1,scale=4,strength=.65;
    if(is(PAL.asphalt)||is(mix(PAL.asphalt,PAL.stone,.22))){kind=SURFACE.asphalt;scale=3;}
    else if(paved.some(is))kind=SURFACE.paving;
    else if(g>r*1.08&&g>b*1.2){kind=SURFACE.lawn;scale=3;strength=.55;}
    else if(r<.7&&r>g*1.1&&g>b*1.15){kind=SURFACE.soil;scale=3;}
    if(kind>=0){data.set([kind,scale,strength],i*3);tagged=true;}
  }
  if(tagged)geo.setAttribute('surfaceDetail',new THREE.BufferAttribute(data,3));
  return geo;
}
export const tagFabric=(geo:any)=>markSurface(geo,SURFACE.fabric,1.2,.65);
