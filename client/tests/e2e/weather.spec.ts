// 날씨 W3: 구역별 입자 종류, 도시는 날씨 없음, 입자가 카메라 둘레에 머묾 · 콘솔 error 0
import {test, expect, unexpected, canvasColors, OUT} from './fixtures';

test('weather follows the sector: snow, embers, mist, shards, spores; none in the city', async ({game}) => {
  const {page, problems} = game;
  await game.open('?debug=1&cine=0');
  await page.click('#mstart');
  const at = (x: number, z: number, want: string | null) =>
    page.evaluate(
      async ([x, z, want]) => {
        const g = (window as any).__game;
        g.unlockAll();
        (await import('/js/data/sectors.js')).SECTORS.forEach((s: any) => (s.guard.speed = 0)); // 수호자를 멈춘다(순간이동해서 잡히면 도시로 돌아가 버린다)
        g.teleport(x, z);
        g.G.yaw = 0;
        g.G.pitch = 0.1;
        g.G.cycT = 100;
        g.G.night = 0;
        const W = await import('/js/render/weather.js');
        const t0 = performance.now(); // 이전 날씨가 꺼지고 새 날씨가 켜질 때까지(느린 헤드리스 프레임 고려) 기다린다
        while (performance.now() - t0 < 12000) {
          await new Promise(r => setTimeout(r, 100));
          const w = W.weatherState();
          if (want ? w.kind === want && w.alpha > 0.95 : w.kind === null && w.alpha === 0) break;
        }
        return W.weatherState();
      },
      [x, z, want],
    );
  expect((await at(0, 17, null)).kind).toBe(null); // 도시
  // 구역 남쪽 가장자리(수호자가 중앙에 있어 중앙에 순간이동하면 잡혀 스폰으로 돌아간다)
  const cases: [string, number, number, string][] = [
    ['giants', 270, 210, 'snow'],
    ['hotjup', -260, 210, 'ember'],
    ['nebula', -270, 20, 'mist'],
    ['supernova', -280, -190, 'shard'],
    ['alpha', -10, -410, 'spore'],
  ];
  for (const [name, x, z, kind] of cases) {
    const w = await at(x, z, kind);
    expect(w.kind).toBe(kind);
    expect(w.visible).toBe(true);
    expect(w.alpha).toBeGreaterThan(0.9);
    // 입자가 카메라 근처 상자 안에 있다
    const far = await page.evaluate(async () => {
      const g = (window as any).__game;
      let pts: any = null;
      g.G.scene.traverse((o: any) => o.isPoints && o.renderOrder === 5 && (pts = o));
      const a = pts.geometry.attributes.position.array,
        c = g.G.camera.position;
      let bad = 0;
      for (let i = 0; i < pts.geometry.drawRange.count; i++) if (Math.abs(a[i * 3] - c.x) > 36 || Math.abs(a[i * 3 + 2] - c.z) > 36) bad++;
      return bad;
    });
    expect(far).toBe(0);
    expect(await canvasColors(page)).toBeGreaterThan(8);
    await page.screenshot({path: `${OUT}/weather-${name}.png`});
  }
  expect((await at(0, 17, null)).kind).toBe(null);
  const u = unexpected(problems);
  expect(u.pageerrors).toEqual([]);
  expect(u.console).toEqual([]);
});
