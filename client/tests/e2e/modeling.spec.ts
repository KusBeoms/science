// 모델 계약·예산과 실제 렌더링을 함께 확인. 전시 이미지는 tests/out/model-*.png.
import {test, expect, OUT, unexpected} from './fixtures';
import fs from 'node:fs';
test('model budgets, portal silhouettes and articulated animals', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1'); await page.click('#mstart');
  const stats = await page.evaluate(async () => {
    const M = await import('/js/render/lowpoly/merge.js'), B = await import('/js/render/bridge.js'), V = await import('/js/render/vehicle.js');
    const C = await import('/js/data/cars.js'), K = await import('/js/render/characters.js'), A = await import('/js/render/animals.js');
    const P = await import('/js/render/portal-art.js'), S = await import('/js/data/sectors.js');
    const cars = C.CARS.map((c: any) => ({id: c.id, tris: M.countTris(V.buildCar({t: c.id, c: 0xe5483f}))}));
    const bridge = (window as any).__game.G.scene.getObjectByName('bridge');
    const portals = S.SECTORS.map((s: any) => {const g = P.portalFrame(s.id); return {id:s.id, n:g.attributes.position.count, bounds:(g.computeBoundingBox(), g.boundingBox.max.y)};});
    const animals = ['cow','rabbit','deer','camel','duck'].map(k => {const g=A.animalModel(k); return {id:k,tris:M.countTris(g),refs:Object.keys(g.userData.rig)};});
    return {bridge:M.countTris(bridge), cars, character:M.countTris(K.blocky(0xffffff,0xffffff,'#ffffff')), portals, animals};
  });
  fs.writeFileSync(`${OUT}/model-stats.json`, JSON.stringify(stats,null,2));
  expect(stats.bridge).toBeLessThanOrEqual(12000);
  expect(stats.character).toBeLessThanOrEqual(300);
  for (const c of stats.cars) expect(c.tris, c.id).toBeLessThanOrEqual(400);
  expect(new Set(stats.portals.map(p=>p.n)).size).toBeGreaterThan(5);
  for (const a of stats.animals) expect(a.refs).toContain('tail');
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('render all room purposes and model gallery for visual review', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1'); await page.click('#mstart');
  await page.evaluate(async () => {
    const {G}=(window as any).__game, T=(window as any).THREE;
    const I=await import('/js/render/interior.js'), D=await import('/js/data/interiors.js');
    const purposes=Object.keys(D.PURPOSE_INFO), rooms:any[]=[];
    G.scene.visible=false;
    const scene=new T.Scene(); scene.background=new T.Color(0xdce7ec);
    scene.add(new T.HemisphereLight(0xffffff,0x71806b,1.3));
    const sun=new T.DirectionalLight(0xffffff,0.7);sun.position.set(20,60,30);scene.add(sun);
    purposes.forEach((p,i)=>{
      const e={id:p,purpose:p,w:22,d:24,wallH:8,seed:5,door:{x:0,z:0}},r=I.buildRoom(e);
      r.grp.position.set((i%7)*30-I.RX,0,Math.floor(i/7)*34-I.RZ);
      // 검수 카메라를 위해 방 벽은 숨긴다. 가구는 그대로.
      r.grp.children[0].visible=false;scene.add(r.grp);
      let tris=0;r.grp.traverse((o:any)=>{if(o.isMesh)tris+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
      rooms.push({purpose:p,tris,spots:r.spots.length});
    });
    const cam=new T.OrthographicCamera(-115,115,160,-160,1,1000);cam.position.set(90,400,128);cam.lookAt(90,0,128);
    G.renderer.setSize(1400,1900);G.renderer.render(scene,cam);
    (window as any).__art={scene,cam,rooms};
    G.renderer.domElement.id='model-canvas';
    document.querySelectorAll('body > *:not(canvas)').forEach((e:any)=>e.style.display='none');
  });
  // 게임 루프가 덮어쓰기 전에 같은 프레임의 이미지로 추출.
  const data = await page.evaluate(()=>{const g=(window as any).__game.G,a=(window as any).__art;g.renderer.render(a.scene,a.cam);return g.renderer.domElement.toDataURL();});
  fs.writeFileSync(`${OUT}/model-interiors.png`, Buffer.from(data.split(',')[1], 'base64'));
  const rooms=await page.evaluate(()=>(window as any).__art.rooms);
  fs.writeFileSync(`${OUT}/model-interiors.json`, JSON.stringify(rooms,null,2));
  expect(rooms.length).toBeGreaterThanOrEqual(50);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('model gallery renders without runtime errors', async ({game}) => {
  const {page}=game;
  await game.open('?debug=1'); await page.click('#mstart');
  const data=await page.evaluate(async()=>{
    const {G}=(window as any).__game,T=(window as any).THREE;
    const V=await import('/js/render/vehicle.js'), C=await import('/js/data/cars.js'), A=await import('/js/render/animals.js');
    const P=await import('/js/render/pets.js'), D=await import('/js/data/shops2.js'), F=await import('/js/render/portal-art.js'), S=await import('/js/data/sectors.js'), M=await import('/js/render/lowpoly/merge.js');
    const scene=new T.Scene();scene.background=new T.Color(0xdce7ec);
    scene.add(new T.HemisphereLight(0xffffff,0x71806b,1.05));const sun=new T.DirectionalLight(0xffffff,0.65);sun.position.set(-50,150,100);scene.add(sun);
    const models=[...C.CARS.map((c:any)=>V.buildCar({t:c.id,c:0xe5483f})),...D.PETS.map((p:any)=>{const g=P.buildPet(p);g.scale.multiplyScalar(4);return g;}),...['cow','rabbit','deer','camel','duck'].map(k=>{const g=A.animalModel(k);g.scale.setScalar(2);return g;}),...S.SECTORS.map((s:any)=>new T.Mesh(F.portalFrame(s.id),M.lowMat()))];
    models.forEach((g:any,i:number)=>{g.position.set((i%6)*18,0,Math.floor(i/6)*24);scene.add(g);});
    const cam=new T.OrthographicCamera(-65,65,96,-96,1,1000);cam.position.set(45,160,210);cam.lookAt(45,0,72);cam.updateMatrixWorld(true);
    G.renderer.setSize(1300,1920);G.renderer.render(scene,cam);return G.renderer.domElement.toDataURL();
  });
  fs.writeFileSync(`${OUT}/model-gallery.png`,Buffer.from(data.split(',')[1],'base64'));
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
