// 도구(스위트 아님): SHOTS=1 로만 돈다. W7 시가지 지상 스크린샷 → tests/out/w7-*.png
import {test} from './fixtures';
test.skip(!process.env.SHOTS, 'tool');
const SPOTS: [string, number, number, number, number][] = [
  ['radial', 20, -14, -0.785, 0.2], // 중앙 광장 북동 방사 대로
  ['plaza', 0, 56, 0, 0.3], // 광장 남쪽에서 분수·기념비 쪽
  ['houses', -200, -120, 0, 0.12], // 서쪽 주거 블록
  ['houses2', -273, 150, Math.PI, 0.12],
  ['track', 300, -125, 0, 0.45], // 육상 트랙
  ['tanks', 300, -60, 0, 0.3], // 탱크 구역
  ['courts', 300, 8, 0, 0.5], // 테니스·동쪽 공원
  ['arena', 114, 205, Math.PI, 0.2], // 남쪽 아레나
  ['towers', 60, -62, -1.19, 0.42], // 고층 군집
  ['parking', 232, -122, Math.PI, 0.5], // 스타디움 주차장
];
test('w7 shots', async ({game}) => {
  test.setTimeout(240_000);
  const {page} = game;
  await game.open('?debug=1&cine=0');
  await page.click('#mstart');
  const only = process.env.SHOTS === '1' ? null : process.env.SHOTS.split(',');
  for (const [name, x, z, yaw, pitch] of SPOTS) {
    if (only && !only.includes(name)) continue;
    await page.evaluate(([x, z, yaw, pitch]) => { const g = (window as any).__game; g.unlockAll(); g.teleport(x, z); g.G.yaw = yaw; g.G.pitch = pitch; g.G.cycT = 100; g.G.night = 0; }, [x, z, yaw, pitch]);
    await page.waitForTimeout(1300);
    await page.screenshot({path: `tests/out/w7-${name}.png`});
  }
});
