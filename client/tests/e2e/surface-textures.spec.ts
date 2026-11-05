import {test,expect,unexpected,OUT} from './fixtures';
import fs from 'node:fs';

test('shared detail packs load once, stay small and reach terrain, structures and furniture',async({game})=>{
  const {page}=game;const urls:string[]=[];
  page.on('request',r=>{if(/assets\/surfaces\/.*\.png/.test(r.url()))urls.push(r.url());});
  await game.open('?debug=1');await page.click('#mstart');
  const r=await page.evaluate(async()=>{
    const D=await import('/js/render/surface-detail.js'),I=await import('/js/render/interior.js'),E=await import('/js/data/interiors.js');
    await D.surfaceTexturesReady();const {G}=(window as any).__game;
    let tagged=0,meshCount=0,structure=0;
    G.scene.traverse((o:any)=>{if(o.isMesh){meshCount++;const a=o.geometry.attributes.surfaceDetail;if(a){for(let i=0;i<a.count;i++){if(a.getZ(i)>0){tagged++;if(a.getX(i)>=8&&a.getX(i)<16)structure++;}}}}});
    const room=I.buildRoom(E.ENTERABLES.find((e:any)=>e.purpose==='house')),kinds:number[]=[];
    room.grp.traverse((o:any)=>{const a=o.geometry?.attributes?.surfaceDetail;if(a)for(let i=0;i<a.count;i++)if(a.getZ(i)>0)kinds.push(a.getX(i));});
    return{stats:D.surfaceTextureStats(),tagged,structure,fabric:kinds.includes(15),wood:kinds.includes(10),meshCount};
  });
  expect(r.stats.loaded).toBe(4);expect(r.stats.failed).toBe(0);expect(r.stats.pending).toBe(0);
  expect(new Set(urls).size).toBe(4);expect(urls.length).toBe(4);expect(r.stats.gpuBytes).toBeLessThan(6*1024*1024);
  expect(r.tagged).toBeGreaterThan(1000);expect(r.structure).toBeGreaterThan(1000);expect(r.fabric&&r.wood).toBe(true);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
  expect(unexpected(game.problems).console).toEqual([]);
  fs.writeFileSync(`${OUT}/surface-texture-stats.json`,JSON.stringify({stats:r.stats,tagged:r.tagged,structure:r.structure},null,2));
});

test('inactive city plots and snowy boundaries never inherit neighboring grass grain',async({game})=>{
  const {page}=game;await game.open('?debug=1');await page.click('#mstart');
  const changed=await page.evaluate(async()=>{
    const D=await import('/js/render/surface-detail.js'),P=await import('/js/render/lowpoly/prim.js');
    await D.surfaceTexturesReady();const T=(window as any).THREE,{G}=(window as any).__game;
    const scene=new T.Scene();scene.background=new T.Color(0x999999);scene.add(new T.AmbientLight(0xffffff,.8));
    const geo=D.markSurface(P.box(1,.1,1,0x777777),0,6,.8),a=geo.attributes.surfaceDetail;
    for(let i=0;i<a.count;i++)a.setX(i,16); // Terrain uses a mask, even with contrast from an active neighbor.
    const mesh=new T.Mesh(geo,D.surfaceMaterial());scene.add(mesh);
    const cam=new T.PerspectiveCamera(50,1.6,.1,100),canvas=document.createElement('canvas');
    canvas.width=160;canvas.height=100;const ctx=canvas.getContext('2d')!;
    const render=(on:boolean)=>{D.setSurfaceDetailEnabled(on);G.renderer.render(scene,cam);ctx.drawImage(G.renderer.domElement,0,0,160,100);return ctx.getImageData(0,0,160,100).data;};
    return [[0,0],[36.25,-748.75]].map(([x,z])=>{
      mesh.position.set(x,0,z);cam.position.set(x,2,z+1.8);cam.lookAt(x,0,z);
      const before=render(false),after=render(true);let count=0;
      for(let i=0;i<before.length;i+=4)if(Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2])>3)count++;
      return count;
    });
  });
  expect(changed).toEqual([0,0]);expect(unexpected(game.problems).console).toEqual([]);expect(game.problems.pageerrors).toEqual([]);
});

test('real image detail changes pixels without adding a draw or triangle',async({game})=>{
  const {page}=game;await game.open('?debug=1');await page.click('#mstart');
  const r=await page.evaluate(async()=>{
    const D=await import('/js/render/surface-detail.js'),P=await import('/js/render/lowpoly/prim.js'),M=await import('/js/render/lowpoly/merge.js');
    await D.surfaceTexturesReady();const T=(window as any).THREE,{G}=(window as any).__game,scene=new T.Scene();scene.background=new T.Color(0x999999);
    scene.add(new T.HemisphereLight(0xffffff,0x555555,.65),new T.DirectionalLight(0xffffff,.3));
    const list=[0,4,7,10,8,9,12,15].map((kind,i)=>({g:D.markSurface(P.box(7,.2,7,[0x538b39,0x9c7850,0x909090,0x9b693b,0x999999,0x4a4a4a,0xaaaaaa,0xa477af][i]),kind,2,.8),x:(i%4)*8-12,z:Math.floor(i/4)*8-4}));
    scene.add(new T.Mesh(M.mergePlaced(list),D.surfaceMaterial()));
    const cam=new T.PerspectiveCamera(50,1.6,.1,200);cam.position.set(0,30,21);cam.lookAt(0,0,0);
    const canvas=document.createElement('canvas');canvas.width=320;canvas.height=200;const ctx=canvas.getContext('2d')!;
    const render=(on:boolean)=>{D.setSurfaceDetailEnabled(on);G.renderer.render(scene,cam);ctx.drawImage(G.renderer.domElement,0,0,320,200);return{pixels:ctx.getImageData(0,0,320,200).data,image:G.renderer.domElement.toDataURL(),tri:G.renderer.info.render.triangles,calls:G.renderer.info.render.calls};};
    const a=render(false),b=render(true);let changed=0;
    for(let i=0;i<a.pixels.length;i+=4)if(Math.abs(a.pixels[i]-b.pixels[i])+Math.abs(a.pixels[i+1]-b.pixels[i+1])+Math.abs(a.pixels[i+2]-b.pixels[i+2])>9)changed++;
    return{changed,before:{tri:a.tri,calls:a.calls},after:{tri:b.tri,calls:b.calls},plain:a.image,detail:b.image};
  });
  expect(r.changed).toBeGreaterThan(1000);expect(r.after).toEqual(r.before);expect(r.after.calls).toBe(1);
  for(const name of['plain','detail']as const)fs.writeFileSync(`${OUT}/surface-${name}.png`,Buffer.from(r[name].split(',')[1],'base64'));
  expect(unexpected(game.problems).pageerrors).toEqual([]);expect(unexpected(game.problems).console).toEqual([]);
});

test('missing detail files keep the game renderable with neutral fallback',async({game})=>{
  await game.page.route('**/assets/surfaces/*.png',r=>r.abort());
  await game.open('?debug=1');await game.page.click('#mstart');
  const r=await game.page.evaluate(async()=>{const D=await import('/js/render/surface-detail.js');await D.surfaceTexturesReady();const {G}=(window as any).__game;G.renderer.render(G.scene,G.camera);return{stats:D.surfaceTextureStats(),tris:G.renderer.info.render.triangles};});
  expect(r.stats.failed).toBe(4);expect(r.stats.loaded).toBe(0);expect(r.stats.pending).toBe(0);expect(r.tris).toBeGreaterThan(10000);
  expect(game.problems.pageerrors).toEqual([]);
});
