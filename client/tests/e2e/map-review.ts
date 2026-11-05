// Shared screenshot path: use the actual overview camera for every LOD system.
import type {Page} from '@playwright/test';
export async function mapReview(page:Page,bounds:[number,number,number,number],width=1400,spacing=5,sectors=false) {
  return page.evaluate(async({bounds,width,spacing,sectors})=>{
    const [x0,x1,z0,z1]=bounds,{G}=(window as any).__game,T=(window as any).THREE;
    const terrain=await import('/js/render/terrain.js'),forest=await import('/js/render/landscape-batch.js');
    const detail=await import('/js/render/city/detail-lod.js'),natural=await import('/js/render/city-natural.js');
    const sec=await import('/js/render/sectors.js');
    const fringe=await import('/js/render/city-fringe.js');
    const visibility=await import('/js/render/world-visibility.js');
    const camera=new T.OrthographicCamera(-(x1-x0)/2,(x1-x0)/2,(z1-z0)/2,-(z1-z0)/2,1,5000);
    camera.up.set(0,0,-1);camera.position.set((x0+x1)/2,2400,(z0+z1)/2);camera.lookAt((x0+x1)/2,0,(z0+z1)/2);camera.updateMatrixWorld(true);
    const old=G.camera,fog=G.scene.fog,sz=G.renderer.getSize(new T.Vector2());
    G.camera=camera;G.scene.fog=null;
    if(sectors)sec.setSectorOverview(true);
    terrain.setTerrainOverview(true,spacing,{x0,x1,z0,z1});
    forest.updateLandscapeLOD();natural.updateNaturalCity();detail.updateCityDetail();
    visibility.updateWorldVisibility();
    if(fringe.updateCityFringe)fringe.updateCityFringe();
    const hidden:any[]=[];
    G.scene.traverse((o:any)=>{if(o.visible&&(o.renderOrder<0||o.isSprite)){hidden.push(o);o.visible=false;}});
    G.renderer.setSize(width,Math.round(width*(z1-z0)/(x1-x0)));
    G.renderer.render(G.scene,camera);
    const data=G.renderer.domElement.toDataURL();
    hidden.forEach(o=>o.visible=true);G.camera=old;G.scene.fog=fog;
    terrain.setTerrainOverview(false);if(sectors)sec.setSectorOverview(false);
    forest.updateLandscapeLOD();natural.updateNaturalCity();detail.updateCityDetail();
    visibility.updateWorldVisibility();
    if(fringe.updateCityFringe)fringe.updateCityFringe();
    G.renderer.setSize(sz.x,sz.y);
    return data;
  },{bounds,width,spacing,sectors});
}
