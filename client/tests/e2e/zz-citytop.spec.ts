// CITYTOP=1: label-free native terrain screenshot at any city/rural crop.
import {test,OUT} from './fixtures';
import {mapReview} from './map-review';
import fs from 'node:fs';
test.skip(!process.env.CITYTOP,'tool');
test('city top-down',async({game})=>{
  const {page}=game;await game.open('?debug=1');await page.click('#mstart');
  await page.evaluate(()=>{const g=(window as any).__game;g.unlockAll();g.G.cycT=100;g.G.night=0;});
  const [x,z,h]=(process.env.CITYTOP_Z||'0,0,440').split(',').map(Number);
  const data=await mapReview(page,[x-h,x+h,z-h,z+h],1600,2.5);
  fs.writeFileSync(`${OUT}/${process.env.CITYTOP_OUT||'city-top'}.png`,Buffer.from(data.split(',')[1],'base64'));
});
