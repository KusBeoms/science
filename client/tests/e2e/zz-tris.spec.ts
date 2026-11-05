// 도구(스위트 아님): TRIS=1 로만 돈다. 지정 위치(기본 스폰)의 시야 삼각형을 그룹별로 집계해 출력
import {test} from './fixtures';
test.skip(!process.env.TRIS, 'tool');
test('tris by group', async ({game}) => {
  const {page} = game;
  const [x, z, yaw] = (process.env.TRIS_AT || '0,17,0').split(',').map(Number);
  await game.open('?debug=1&cine=0');
  await page.click('#mstart');
  await page.evaluate(([x, z, yaw]) => { const g = (window as any).__game; g.teleport(x, z); g.G.yaw = yaw; g.G.night = 0; g.G.cycT = 100; }, [x, z, yaw]);
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const {G} = (window as any).__game, rd = G.renderer, orig = rd.renderBufferDirect.bind(rd), by: Record<string, number> = {}, meshes: any[] = [], process_meshes = true;
    rd.renderBufferDirect = (...a: any[]) => {
      const geo = a[2], o = a[4];
      let n = o, path = '';
      while (n && !path) { if (n.name) path = n.name; n = n.parent; }
      const tris = (geo.index ? geo.index.count : geo.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
      const c = o.geometry && o.geometry.boundingSphere ? o.geometry.boundingSphere.center : null;
      if (process_meshes && c) meshes.push([Math.round(c.x) + ',' + Math.round(c.z), Math.round(tris), path]);
      const key = (path || 'unnamed') + (o.isInstancedMesh ? '[inst]' : '') + (o.parent && o.parent.parent && o.parent.parent.name === 'city' ? '/' + (o.material.type) : '');
      by[key] = (by[key] || 0) + tris;
      return orig(...a);
    };
    rd.render(G.scene, G.camera);
    rd.renderBufferDirect = orig;
    return {total: rd.info.render.triangles, meshes: meshes.sort((a, b) => b[1] - a[1]).slice(0, 14), by: Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 18)};
  });
  console.log(JSON.stringify(r, null, 1));
});
