// 길 폭보다 작은 급회전·보도 접힘·진입로 충돌 회귀를 막는다.
import {test,expect,OUT} from './fixtures';
import fs from 'node:fs';
test('city bridge approach is a wide continuous curve with clear sidewalks',async({game})=>{
  const {page}=game;await game.open('?debug=1');await page.click('#mstart');
  const r=await page.evaluate(async()=>{
    const B=await import('/js/data/bridge.js'),T=await import('/js/core/terrain.js'),S=B.cityApproach(200);
    let maxTurn=0,maxCurvatureWidth=0;const blocked:any[]=[];
    for(let i=1;i<S.length-1;i++){
      const p=S[i],a=S[i-1],b=S[i+1],angle=Math.abs(Math.atan2(a.tx*b.tz-a.tz*b.tx,a.tx*b.tx+a.tz*b.tz));
      maxTurn=Math.max(maxTurn,angle);maxCurvatureWidth=Math.max(maxCurvatureWidth,angle/Math.hypot(b.x-a.x,b.z-a.z)*p.w);
      for(const u of[-p.w+1,-p.r+1,0,p.r-1,p.w-1]){const x=p.x+p.tz*u,z=p.z-p.tx*u;if(T.solidAt(x,z,0.45,0)||!Number.isFinite(T.groundH(x,z)))blocked.push([+x.toFixed(1),+z.toFixed(1)]);}
    }
    return{start:S[0],end:S[S.length-1],maxTurn,maxCurvatureWidth,blocked};
  });
  expect(r.start.z).toBeLessThan(300);expect(r.start.x).toBe(0);expect(r.start.tx).toBe(0);expect(r.end.tx).toBe(0);expect(r.maxCurvatureWidth).toBeLessThan(0.8);expect(r.blocked).toEqual([]);
});
test('bridge approach top and oblique review images',async({game})=>{
  const {page}=game;await game.open('?debug=1');await page.click('#mstart');
  for(const [name,height,offset] of [['top',400,0],['oblique',145,170]] as const){
    const data=await page.evaluate(([height,offset])=>{
      const {G}=(window as any).__game,T=(window as any).THREE,cam=new T.OrthographicCamera(-110,110,90,-90,1,1000);cam.up.set(0,offset?1:0,offset?0:-1);cam.position.set(42,height,340+offset);cam.lookAt(42,0,340);cam.updateMatrixWorld(true);
      G.renderer.setSize(1320,1080);const fog=G.scene.fog;G.scene.fog=null;const hidden:any[]=[];G.scene.traverse((o:any)=>{if(o.renderOrder<0&&o.visible){o.visible=false;hidden.push(o);}});G.renderer.render(G.scene,cam);const data=G.renderer.domElement.toDataURL();hidden.forEach(o=>o.visible=true);G.scene.fog=fog;return data;
    },[height,offset]);
    fs.writeFileSync(`${OUT}/bridge-approach-${name}.png`,Buffer.from(data.split(',')[1],'base64'));
  }
});
