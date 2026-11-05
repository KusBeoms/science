import {test,expect,unexpected,OUT} from './fixtures';
test('suburban lanes and every accepted house entry remain walkable on the real terrain',async({game})=>{
  const {page}=game;await game.open('?debug=1');await page.click('#mstart');
  const r=await page.evaluate(async()=>{
    const {G}=(window as any).__game,T=await import('/js/core/terrain.js'),F=await import('/js/data/city-fringe.js');
    const root=G.scene.getObjectByName('city-fringe'),fail:any[]=[],plots=root.userData.plots;
    for(const p of plots) {
      let [x,z]=p.road,y=T.groundH(x,z);
      const n=Math.ceil(Math.hypot(p.entry[0]-x,p.entry[1]-z)/0.2),ax=x,az=z;
      for(let i=1;i<=n;i++) {
        const nx=ax+(p.entry[0]-ax)*i/n,nz=az+(p.entry[1]-az)*i/n,h=T.groundH(nx,nz,y);
        if(T.solidAt(nx,nz,0.4,y)||!T.walkable(x,z,y,nx,nz)||!Number.isFinite(h)) {fail.push({id:p.id,x:nx,z:nz,h,y});break;}
        x=nx;z=nz;y=h;
      }
      if(Math.abs(y-p.y)>0.3)fail.push({id:p.id,end:y,want:p.y});
    }
    return {count:plots.length,lanes:F.FRINGE_LANES.length,outside:plots.filter((p:any)=>Math.max(Math.abs(p.x),Math.abs(p.z))>335).length,fail};
  });
  expect(r.count).toBeGreaterThanOrEqual(60);expect(r.outside).toBe(r.count);expect(r.lanes).toBe(8);expect(r.fail).toEqual([]);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('suburban ground review images and native terrain detail',async({game})=>{
  const {page}=game;await game.open('?debug=1');await page.click('#mstart');
  for(const [name,x,z,yaw]of[['west',-350,100,Math.PI/2],['north',-120,-355,0],['east',350,30,-Math.PI/2]]as const) {
    await page.evaluate(([x,z,yaw])=>{const g=(window as any).__game;g.teleport(x,z);g.G.yaw=yaw;g.G.pitch=0.28;g.G.camDist=20;g.G.cycT=100;g.G.night=0;},[x,z,yaw]);
    await page.waitForTimeout(2000);await page.screenshot({path:`${OUT}/fringe-${name}.png`});
  }
  const r=await page.evaluate(async()=>{
    const H=await import('/js/core/heightmap.js'),R=await import('/js/render/terrain.js'),{G}=(window as any).__game;
    const meshes:any[]=[];G.scene.getObjectByName('terrain').traverse((o:any)=>{if(o.isMesh&&o.visible&&o.userData.terrainStep===2.5)meshes.push(o);});
    const m=meshes.find(o=>o.geometry.index?.count>0);
    return {step:H.DETAIL_STEP,stats:R.terrainStats(),indexed:!!m?.geometry.index,verts:m?.geometry.attributes.position.count};
  });
  expect(r.step).toBe(2.5);expect(r.stats.lod['2.5']).toBeGreaterThan(0);expect(r.indexed).toBe(true);expect(r.verts).toBeGreaterThan(1000);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
