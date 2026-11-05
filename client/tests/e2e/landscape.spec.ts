// 참조 지도 전역 아트: 경관 분포·기존 문·차도 보존·실제 플레이 성능·전역 스크린샷.
import {test,expect,unexpected,OUT} from './fixtures';
import fs from 'node:fs';
test('natural islands preserve roads and doors and respect the spawn budget',async({game})=>{
  const {page}=game;await game.open('?debug=1');await page.click('#mstart');await page.waitForTimeout(1800);
  const r=await page.evaluate(async()=>{
    const {G}=(window as any).__game,C=await import('/js/data/city.js'),T=await import('/js/core/terrain.js'),N=await import('/js/render/city-natural.js');
    const draw:any[]=[];const renderer=G.renderer,orig=renderer.renderBufferDirect.bind(renderer);renderer.renderBufferDirect=(...args:any[])=>{const geo=args[2],obj=args[4];draw.push({name:obj.name||obj.parent?.name||obj.parent?.parent?.name||'mesh',tris:(geo.index?.count||geo.attributes.position.count)/3*(obj.isInstancedMesh?obj.count:1)});return orig(...args);};renderer.render(G.scene,G.camera);renderer.renderBufferDirect=orig;
    const doors=C.CITY_BUILDINGS.filter((b:any)=>{const d=C.doorOf(b);return T.solidAt(d.x,d.z,0.45);}).map((b:any)=>b.id);
    return{draw:draw.sort((a,b)=>b.tris-a.tris).slice(0,20),island:G.scene.getObjectByName('island-landscape').userData.counts,rural:G.scene.getObjectByName('rural-landscape').userData.counts,buildings:N.naturalBuildings.length,doors,tris:G.renderer.info.render.triangles,calls:G.renderer.info.render.calls};
  });
  fs.writeFileSync(`${OUT}/landscape-stats.json`,JSON.stringify(r,null,2));
  expect(r.island.trees).toBeGreaterThan(400);expect(r.rural.villageBuildings).toBeGreaterThan(8);expect(r.rural.fields).toBeGreaterThan(25);expect(r.rural.greenhouses).toBeGreaterThan(0);expect(r.buildings).toBeGreaterThan(30);expect(r.doors).toEqual([]);expect(r.tris).toBeLessThan(95000);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('city and rural island overview images',async({game})=>{
  const {page}=game;await game.open('?debug=1');await page.click('#mstart');
  const shots:[string,number,number,number,number][]=[['city',-680,1020,-790,590],['rural',-590,800,700,2010],['islands',-700,1050,-800,2030]];
  for(const [name,x0,x1,z0,z1] of shots){
    const data=await page.evaluate(async([name,x0,x1,z0,z1])=>{
      const {G}=(window as any).__game,T=(window as any).THREE;
      const L=await import('/js/render/landscape-batch.js'),N=await import('/js/render/city-natural.js');
      const cam=new T.OrthographicCamera(-(x1-x0)/2,(x1-x0)/2,(z1-z0)/2,-(z1-z0)/2,1,4000);cam.up.set(0,0,-1);cam.position.set((x0+x1)/2,1700,(z0+z1)/2);cam.lookAt((x0+x1)/2,0,(z0+z1)/2);cam.updateMatrixWorld(true);
      const oldCam=G.camera;G.camera=cam;L.updateLandscapeLOD();N.updateNaturalCity();
      const width=1400,height=Math.round(width*(z1-z0)/(x1-x0));G.renderer.setSize(width,height);
      const fog=G.scene.fog;G.scene.fog=null;
      // 천구는 카메라를 따라 이동하므로 지도 검수 프레임에서만 숨긴다.
      const hidden:any[]=[];G.scene.traverse((o:any)=>{if(o.renderOrder<0&&o.visible){o.visible=false;hidden.push(o);}});
      G.renderer.render(G.scene,cam);const data=G.renderer.domElement.toDataURL();
      hidden.forEach(o=>o.visible=true);G.scene.fog=fog;G.camera=oldCam;return data;
    },[name,x0,x1,z0,z1] as [string,number,number,number,number]);
    fs.writeFileSync(`${OUT}/landscape-${name}.png`,Buffer.from(data.split(',')[1],'base64'));
  }
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});


test('marina gangway and rural dock have walkable decks matching their visible surfaces',async({game})=>{
  const {page}=game;await game.open('?debug=1');await page.click('#mstart');
  const r=await page.evaluate(async()=>{
    const {G}=(window as any).__game,T=await import('/js/core/terrain.js'),D=await import('/js/core/deck.js');
    const p=G.scene.getObjectByName('waterfront').userData.gangway;
    let x=p.ax,z=p.az,y=T.groundH(x,z),fail:any=null;
    const end=[[p.bx,p.bz],[p.bx,p.bz+60]];
    for(const [tx,tz]of end){const n=Math.ceil(Math.hypot(tx-x,tz-z)/0.25),ax=x,az=z;
      for(let i=1;i<=n;i++){const nx=ax+(tx-ax)*i/n,nz=az+(tz-az)*i/n,h=T.groundH(nx,nz,y);if(!T.walkable(x,z,y,nx,nz)||T.solidAt(nx,nz,0.4,y)||!Number.isFinite(h)){fail={x:nx,z:nz,y,h};break;}x=nx;z=nz;y=h;}
      if(fail)break;
    }
    const dock=D.deckList().find((d:any)=>d.id==='rural-grand-dock');
    return {fail,y,deck:p.h1,dock};
  });
  expect(r.fail).toBeNull();expect(r.y).toBeCloseTo(r.deck,3);expect(r.dock).toBeTruthy();expect(r.dock.h0).toBeCloseTo(-0.3,3);
});
