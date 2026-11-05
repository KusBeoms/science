// Keep every building/tree in the distance; simplify only its geometry.
import {G} from '../../core/runtime.js';
import {instancedChunks, lowMat, mergeGeometries, type Inst} from '../lowpoly/merge.js';
import {box, gable, panel, cone} from '../lowpoly/prim.js';
import {PAL, mix} from '../lowpoly/palette.js';
import type {CityBuilding} from '../../data/city.js';
import {buildingHeight} from './building.js';

const chunks: {near:any;far:any;x:number;z:number;range:number}[]=[];
export function cityDetail(near:any,far:any,x:number,z:number,range=120) {
  far.visible=false;
  chunks.push({near,far,x,z,range});
}
export function updateCityDetail() {
  if(!G.me)return;
  for(const t of chunks) {
    const near=G.camera.isOrthographicCamera||Math.hypot(t.x-G.me.pos.x,t.z-G.me.pos.z)<t.range;
    t.near.visible=near;t.far.visible=!near;
  }
}
export function detailInstances(geo:any,farGeo:any,items:Inst[],name:string) {
  const group=new THREE.Group();group.name=name;
  const near=instancedChunks(geo,lowMat(),items,64),far=instancedChunks(farGeo,lowMat(),items,64);
  near.children.forEach((m:any,i:number)=>{
    const p=m.geometry.boundingSphere.center;
    cityDetail(m,far.children[i],p.x,p.z,110);
  });
  group.add(near,far);return group;
}
export const distantTree=(pine=false)=>pine
  ?mergeGeometries([box(0.4,2,0.4,PAL.wood),cone(2,4.7,mix(PAL.green,PAL.teal,0.3),0,1.4,0,0,4)])
  :mergeGeometries([box(0.4,2.5,0.4,PAL.wood),cone(2,3.6,mix(PAL.green,PAL.lime,0.3),0,2,0,0,5)]);
export const distantLamp=()=>mergeGeometries([box(0.22,5.6,0.22,PAL.steel),box(2.5,0.25,0.65,PAL.coal,1.1,5.5)]);
export const distantBench=()=>box(2.4,0.7,0.7,PAL.wood);

export function distantBuilding(b:CityBuilding) {
  const h=b.district==='w7-house'?b.floors*4.6+1:buildingHeight(b),p=[box(b.w,h,b.d,PAL[b.wall])];
  if(b.style==='house')p.push(gable(b.w+1,3.2,b.d+1,PAL[b.roof],0,h));
  else p.push(box(b.w+0.6,0.5,b.d+0.6,PAL[b.roof],0,h));
  // Continuous window bands keep the distant facade readable without individual frames.
  for(let f=0;f<b.floors;f++) {
    const y=(f+0.55)*h/b.floors;
    for(const s of[-1,1]) {
      p.push(panel(b.w-2,1.6,PAL.glass,0,y,s*(b.d/2+0.06),s<0?Math.PI:0));
      p.push(panel(b.d-2,1.6,PAL.glass,s*(b.w/2+0.06),y,0,s*Math.PI/2));
    }
  }
  return mergeGeometries(p);
}
