// Reproducible visual tool: PLAYER_REVIEW=1; excluded from functional-spec counts.
import {test,expect,OUT,unexpected} from './fixtures';
import fs from 'node:fs';
test.skip(!process.env.PLAYER_REVIEW,'visual tool');
test('rural doorway, furnished room, vehicle poses and sky view',async({game})=>{
  const {page}=game;await game.open('?debug=1');await page.click('#mstart');
  const snapshot=async(name:string)=>{
    const data=await page.evaluate(()=>{const {G}=(window as any).__game;G.renderer.render(G.scene,G.camera);return G.renderer.domElement.toDataURL();});
    fs.writeFileSync(`${OUT}/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
  };
  await page.evaluate(async()=>{
    const E=await import('/js/data/interiors.js'),C=await import('/js/systems/camera.js'),{G}=(window as any).__game;
    const i=E.ENTERABLES.findIndex(e=>e.rural?.group==='mountain-lodge'),s=E.ENTERABLES[i].rural!;
    (window as any).__reviewHouse=i;G.me.pos.set(s.landing.x,s.landing.y,s.landing.z);G.me.vy=0;
    G.yaw=s.ry;G.pitch=.38;G.camDist=20;G.cycT=100;G.night=0;C.cancelCameraInput();
  });
  await page.waitForTimeout(1200);await snapshot('rural-lodge-entry');
  await page.evaluate(async()=>{const B=await import('/js/game/interior.js');B.enterBuilding((window as any).__reviewHouse);});
  await page.waitForTimeout(600);await snapshot('rural-house-interior');
  await page.evaluate(async()=>{
    const B=await import('/js/game/interior.js'),V=await import('/js/systems/vehicle.js'),{G}=(window as any).__game;
    B.leaveBuilding(true);V.VEH.slice().forEach(V.removeVeh);
    const v=V.spawnVeh({t:'sedan',c:0x4275bb,x:0,z:-90,h:0});(window as any).__reviewCar=v;
    G.me.pos.set(3,v.y,-90);G.me.vy=0;G.yaw=.8;G.pitch=.25;G.camDist=6;
  });
  await page.waitForTimeout(500);
  await page.evaluate(async()=>{
    const V=await import('/js/systems/vehicle.js'),M=await import('/js/systems/vehicle-transition.js'),C=await import('/js/systems/camera.js'),{G}=(window as any).__game;
    G.started=false;V.enterVeh((window as any).__reviewCar,true);M.updateVehicleTransition(.24);C.updateFollowCamera(0);
  });
  await snapshot('vehicle-boarding');
  await page.evaluate(async()=>{
    const V=await import('/js/systems/vehicle.js'),M=await import('/js/systems/vehicle-transition.js'),C=await import('/js/systems/camera.js');
    M.updateVehicleTransition(1);V.exitVeh(false,true);M.updateVehicleTransition(.24);C.updateFollowCamera(0);
  });
  await snapshot('vehicle-exiting');
  await page.evaluate(async()=>{
    const V=await import('/js/systems/vehicle.js'),C=await import('/js/systems/camera.js'),{G}=(window as any).__game;
    V.exitVeh(true);G.started=true;G.pitch=C.CAMERA_PITCH_MIN;C.updateFollowCamera(0);
  });
  await snapshot('camera-sky');
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
