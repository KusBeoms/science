// 도구(스위트 아님): GRAPH=1 로만 돈다. citygraph 가 충돌체에 막히는 간선의 위치를 출력
import {test} from './fixtures';
test.skip(!process.env.GRAPH, 'tool');
test('graph blocked edges', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  const r = await page.evaluate(async () => {
    const {CITY_GRAPH: g} = await import('/js/data/citygraph.js'), {solidAt} = await import('/js/core/terrain.js');
    const out: string[] = [];
    g.adj.forEach((adj: Uint16Array, a: number) => adj.forEach(b => {
      if (b < a) return;
      const len = Math.hypot(g.x[b] - g.x[a], g.z[b] - g.z[a]);
      for (let t = 0; t <= len; t += 0.5) { const x = g.x[a] + ((g.x[b] - g.x[a]) * t) / len, z = g.z[a] + ((g.z[b] - g.z[a]) * t) / len; if (solidAt(x, z, 0.45)) { out.push(`${g.x[a]},${g.z[a]} -> ${g.x[b]},${g.z[b]} at ${x.toFixed(1)},${z.toFixed(1)}`); break; } }
    }));
    return {n: g.x.length, out};
  });
  console.log(r.n, '\n' + r.out.join('\n'));
});
