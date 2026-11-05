// 참조 지도 전역 아트: 경관 분포·기존 문·차도 보존·실제 플레이 성능·전역 스크린샷.
import {test,expect,unexpected,OUT} from './fixtures';
import fs from 'node:fs';
import {mapReview} from './map-review';
test('natural islands preserve roads and doors and respect the spawn budget',async({game})=>{
  const {page}=game;await game.open('?debug=1');await page.click('#mstart');await page.waitForTimeout(1800);
  const r=await page.evaluate(async()=>{
    const {G}=(window as any).__game,C=await import('/js/data/city.js'),T=await import('/js/core/terrain.js'),N=await import('/js/render/city-natural.js');
    const draw:any[]=[];const renderer=G.renderer,orig=renderer.renderBufferDirect.bind(renderer);renderer.renderBufferDirect=(...args:any[])=>{const geo=args[2],obj=args[4];draw.push({name:obj.name||obj.parent?.name||obj.parent?.parent?.name||'mesh',tris:(geo.index?.count||geo.attributes.position.count)/3*(obj.isInstancedMesh?obj.count:1)});return orig(...args);};renderer.render(G.scene,G.camera);renderer.renderBufferDirect=orig;
    const doors=C.CITY_BUILDINGS.filter((b:any)=>{const d=C.doorOf(b);return T.solidAt(d.x,d.z,0.45);}).map((b:any)=>b.id);
    return{draw:draw.sort((a,b)=>b.tris-a.tris).slice(0,20),island:G.scene.getObjectByName('city-mountain').userData.counts,rural:G.scene.getObjectByName('rural-landscape').userData.counts,buildings:C.CITY_BUILDINGS.filter((b:any)=>b.district.startsWith('w7-')).length,doors,tris:G.renderer.info.render.triangles,calls:G.renderer.info.render.calls};
  });
  fs.writeFileSync(`${OUT}/landscape-stats.json`,JSON.stringify(r,null,2));
  expect(r.island.pines+r.island.snowy).toBeGreaterThan(400);expect(r.rural.villageBuildings).toBeGreaterThan(8);expect(r.rural.fields).toBeGreaterThan(25);expect(r.rural.greenhouses).toBeGreaterThan(0);expect(r.buildings).toBeGreaterThan(30);expect(r.doors).toEqual([]);expect(r.tris).toBeLessThan(95000);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('city and rural island overview images',async({game})=>{
  const {page}=game;await game.open('?debug=1');await page.click('#mstart');
  const shots:[string,number,number,number,number][]=[['city',-790,1110,-910,600],['rural',-590,810,680,2010],['islands',-790,1110,-910,2030]];
  for(const [name,x0,x1,z0,z1] of shots){
    const data=await mapReview(page,[x0,x1,z0,z1]);
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
