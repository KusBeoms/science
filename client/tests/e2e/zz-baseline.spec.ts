// 도구(스위트 아님): BASELINE=1 로만 돈다. 도심 재설계 전 현행 상태(사진·삼각형·bake·데이터 수치)를 tests/out/baseline/ 에 기록
import {test, OUT} from './fixtures';
import {mapReview} from './map-review';
import fs from 'node:fs';
import path from 'node:path';
test.skip(!process.env.BASELINE, 'tool');

const DIR = path.join(OUT, 'baseline');
// [이름, x, z, yaw, pitch] — 카메라는 플레이어 뒤(yaw=0 이면 북쪽(-z)을 봄)
const SHOTS: [string, number, number, number, number][] = [
  ['plaza', 0, 138, 0, 0.25], // 중앙 광장 (PLAZA)
  ['apple-avenue', 0, 60, 0, 0.12], // 사과 대로에서 정북 시선 축 방향
  ['stadium-gate', 270, -190, 0, 0.2], // 스타디움 남쪽 출입구(gateX=270) 앞에서 북쪽 입구를 향함
  ['bridge-approach', 74, 340, Math.PI, 0.15], // 다리 접근부(남쪽을 향함)
  ['highrise', 60, -62, -1.19, 0.42], // 고층 군집 거리
  ['suburb-door', 0, 0, 0, 0.2], // 아래에서 첫 교외 필지로 덮어씀
];

test('baseline', async ({game}) => {
  test.setTimeout(300_000);
  fs.mkdirSync(DIR, {recursive: true});
  const {page} = game;
  await game.open('?debug=1&cine=0');
  await page.click('#mstart');
  const fix = (x: number, z: number, yaw: number, pitch: number) => page.evaluate(([x, z, yaw, pitch]) => {
    const g = (window as any).__game;
    g.unlockAll(); g.teleport(x, z); g.G.yaw = yaw; g.G.pitch = pitch; g.G.cycT = 100; g.G.night = 0;
  }, [x, z, yaw, pitch]);
  // 삼각형·호출 수는 렌더 1회 직접 호출로 잰다
  const info = () => page.evaluate(() => {
    const {G} = (window as any).__game, r = G.renderer;
    r.info.reset?.(); r.render(G.scene, G.camera);
    return {triangles: r.info.render.triangles, calls: r.info.render.calls, geometries: r.info.memory.geometries, textures: r.info.memory.textures};
  });
  const snap = async (name: string) => {
    await page.waitForTimeout(2500);
    const i = await info();
    await page.screenshot({path: path.join(DIR, `${name}.png`)});
    return i;
  };
  const stats: any = {note: 'SwiftShader 소프트웨어 렌더, 1024x640. 삼각형·호출은 런마다 수% 변동(군중·LOD 타이밍), 시간(ms)은 참고용', date: new Date().toISOString(), shots: {}};

  // (a) 스폰 시야 (0,17)
  await fix(0, 17, 0, 0.2);
  stats.shots.spawn = {at: [0, 17], ...(await snap('spawn'))};

  // 데이터 수치
  const fringe = await page.evaluate(async () => {
    const m = await import('/js/data/city-fringe.js');
    const p = m.FRINGE_PLOTS[0];
    return p ? {x: p.x, z: p.z, ry: p.ry, w: p.w, d: p.d, count: m.FRINGE_PLOTS.length} : null;
  });
  stats.data = await page.evaluate(async () => {
    const hm = await import('/js/core/heightmap.js'), terr = await import('/js/core/terrain.js');
    const city = await import('/js/data/city.js'), ol = await import('/js/data/outline.js');
    const plaza = await import('/js/core/plaza.js'), soccer = await import('/js/data/soccer.js');
    const poly = ol.CITY_POLY.poly as number[][];
    const xs = poly.map(p => p[0]), zs = poly.map(p => p[1]);
    const be = ol.BRIDGE_ENDS;
    // 도시 섬 25점 격자(5x5) + 해안·다리 끝 보강
    const pts: [string, number, number][] = [];
    for (const z of [-600, -300, 0, 300, 600]) for (const x of [-500, -250, 0, 250, 500]) pts.push([`g${x},${z}`, x, z]);
    pts.push(['coast-N-edge', 0, -330], ['coast-S-city-bridge', be.x, be.city], ['bridge-city-end+', be.x, be.city + 5], ['bridge-wild-end', be.x, be.wild], ['bridge-wild-end-', be.x, be.wild - 5], ['spawn', 0, 17], ['plaza', plaza.PLAZA.x, plaza.PLAZA.z], ['stadium-pitch', soccer.PITCH.cx, soccer.PITCH.cz]);
    const groundH = Object.fromEntries(pts.map(([n, x, z]) => { const h = terr.groundH(x, z); return [n, h > -Infinity ? +h.toFixed(3) : 'water']; }));
    return {
      bakeMs: +hm.bakeMs.toFixed(1),
      CITY_BUILDINGS: city.CITY_BUILDINGS.length,
      CITY_ROADS: city.CITY_ROADS.length,
      BRIDGE_ENDS: be,
      CITY_POLY: {vertices: poly.length, bbox: {x: [Math.min(...xs), Math.max(...xs)].map(v => +v.toFixed(1)), z: [Math.min(...zs), Math.max(...zs)].map(v => +v.toFixed(1))}},
      anchors: {STADIUM: soccer.STADIUM, PITCH: soccer.PITCH, PLAZA: plaza.PLAZA, SPAWN: [0, 17]},
      groundH,
    };
  });
  stats.data.firstFringePlot = fringe;
  // 부팅 시점 bake 시간은 단일 값이므로 보조로 한 번 더 기록
  stats.bakeMsNote = 'heightmap.bakeMs = 페이지 로드 중 대륙 전체 굽기 시간(1회)';

  // (b) 도시 섬 상공 (실제 직교 카메라, 5u, 라벨 없음)
  const top = await mapReview(page, [-600, 1100, -900, 800], 1700, 5);
  fs.writeFileSync(path.join(DIR, 'city-top.png'), Buffer.from(top.split(',')[1], 'base64'));
  stats.topBounds = [-600, 1100, -900, 800];

  // (c) 지상 6컷
  if (fringe) SHOTS[5] = ['suburb-door', fringe.x + Math.sin(fringe.ry) * 14, fringe.z + Math.cos(fringe.ry) * 14, fringe.ry + Math.PI, 0.18];
  for (const [name, x, z, yaw, pitch] of SHOTS) {
    await fix(x, z, yaw, pitch);
    stats.shots[name] = {at: [x, z], yaw, pitch, ...(await snap(name))};
  }
  fs.writeFileSync(path.join(DIR, 'baseline.json'), JSON.stringify(stats, null, 2));
  console.log(JSON.stringify(stats, null, 1));
});
