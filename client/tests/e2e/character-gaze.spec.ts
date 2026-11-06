import {test,expect,unexpected,OUT} from './fixtures';
import fs from 'node:fs';

test('player pupils follow the final camera without turning the body or leaving the eye whites',async({game})=>{
  const {page}=game;await game.open('?debug=1');await page.click('#mstart');
  const setView=async(yaw:number,pitch:number)=>page.evaluate(([yaw,pitch])=>{
    const {G}=(window as any).__game;G.me.rotation.set(0,0,0);G.yaw=yaw;G.pitch=pitch;G.camDist=8;
  },[yaw,pitch]);
  const offset=()=>page.evaluate(()=>{const {G}=(window as any).__game;return G.me.userData.eyes.position.toArray();});
  await setView(-.8,.15);await expect.poll(async()=>(await offset())[0]).toBeLessThan(-.01);
  await setView(.8,.15);await expect.poll(async()=>(await offset())[0]).toBeGreaterThan(.01);
  await setView(0,.9);await expect.poll(async()=>(await offset())[1]).toBeGreaterThan(.01);
  await setView(0,-.2);await expect.poll(async()=>(await offset())[1]).toBeLessThan(0);
  const body=await page.evaluate(()=>{const {G}=(window as any).__game;return G.me.rotation.y;});expect(body).toBe(0);
  expect(unexpected(game.problems).pageerrors).toEqual([]);expect(unexpected(game.problems).console).toEqual([]);
});

test('bald block characters keep shared low poly parts and bounded gaze under parent transforms',async({game})=>{
  const {page}=game;await game.open('?debug=1');await page.click('#mstart');
  const r=await page.evaluate(async()=>{
    const C=await import('/js/render/characters.js'),D=await import('/js/render/characters-gaze.js'),M=await import('/js/render/lowpoly/merge.js');
    const T=(window as any).THREE,{G}=(window as any).__game,scene=new T.Scene();scene.background=new T.Color(0xdce7ec);
    scene.add(new T.HemisphereLight(0xffffff,0x71806b,.8));
    const sun=new T.DirectionalLight(0xffffff,.45);sun.position.set(-5,10,10);scene.add(sun);
    const actor=C.blocky(0x3b82f6,0x4a9a4a,'#f4d03f',1),parent=new T.Group();parent.add(actor);scene.add(parent);
    const headSize=new T.Box3().setFromObject(actor.userData.head).getSize(new T.Vector3()).toArray();
    parent.position.set(20,4,-30);parent.rotation.y=1.1;parent.scale.setScalar(1.7);
    const cam=new T.PerspectiveCamera(35,1.6,.1,200),eye=actor.userData.eyes,offsets:number[][]=[];
    for(const local of [[-4,5,8],[4,5,8],[0,15,2],[0,-5,2],[0,5,-8],[0,5,0]]){
      cam.position.copy(parent.localToWorld(new T.Vector3(...local)));D.updateCharacterGaze(actor,cam,1);offsets.push(eye.position.toArray());
    }
    parent.position.set(0,0,0);parent.rotation.y=0;parent.scale.setScalar(1);
    cam.position.set(2.2,5.7,8);cam.lookAt(0,4.7,0);D.updateCharacterGaze(actor,cam,1);
    G.renderer.render(scene,cam);
    return {headSize,offsets,tris:M.countTris(actor),image:G.renderer.domElement.toDataURL()};
  });
  expect(r.headSize[0]).toBeCloseTo(1.6,4);expect(r.headSize[1]).toBeCloseTo(1.6,4);expect(r.tris).toBeLessThanOrEqual(300);
  expect(r.offsets[0][0]).toBeLessThan(0);expect(r.offsets[1][0]).toBeGreaterThan(0);
  for(const p of r.offsets){expect(p.every(Number.isFinite)).toBe(true);expect(Math.abs(p[0])).toBeLessThanOrEqual(.1);expect(Math.abs(p[1])).toBeLessThanOrEqual(.1);}
  fs.writeFileSync(`${OUT}/character-gaze.png`,Buffer.from(r.image.split(',')[1],'base64'));
  expect(unexpected(game.problems).pageerrors).toEqual([]);expect(unexpected(game.problems).console).toEqual([]);
});
