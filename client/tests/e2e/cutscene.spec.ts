// 컷신 디렉터(B1) · 글 없는 알림/위젯(B7) · 세이브 v6 story
import fs from 'node:fs';
import path from 'node:path';
import {test, expect, unexpected, OUT} from './fixtures';

const SRC = path.resolve(__dirname, '../../src');
const NO_TEXT = /[A-Za-z가-힣]/; // 이모지·숫자·기호만 허용 (aria-label 은 속성이라 textContent 에 안 잡힘)
const gameEval = <T>(page: any, fn: string): Promise<T> => page.evaluate(`(() => { const g = window.__game; return (${fn}); })()`);

test('C01 plays on first start: locks input, no text nodes, ends with beat=1 and camera back', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1&cine=1');
  await page.click('#mstart');
  await page.waitForSelector('#moonintro');
  await page.keyboard.press('Space'); // 달 도착 연출 건너뛰기 → 이어서 C01
  await page.waitForFunction(() => (window as any).__game.G.cine?.id === 'c01_love');
  expect(await gameEval(page, 'g.G.cine.lock')).toBe(true);
  for (const t of [2, 6, 10, 12.7, 15, 19]) {
    await page.waitForFunction(x => (window as any).__game.G.cine?.t >= x, t, {timeout: 30000});
    expect(await page.evaluate(() => !/[A-Za-z가-힣]/.test(document.getElementById('cine')!.innerText))).toBe(true);
    await page.screenshot({path: `${OUT}/cine-c01-${String(t).replace('.', '_')}.png`});
  }
  await page.waitForFunction(() => (window as any).__game.G.cine === null, undefined, {timeout: 10000});
  expect(await gameEval(page, 'JSON.stringify([g.S.story.beat, g.S.story.seen.c01_love, g.S.story.mid])')).toBe('[1,1,0]');
  await page.waitForTimeout(1200);
  await page.screenshot({path: `${OUT}/cine-c01-after.png`});
  expect(unexpected(game.problems).pageerrors).toEqual([]);
  expect(unexpected(game.problems).console).toEqual([]);
});

test('skip: ⏭ button fades out then applies onEnd exactly like a normal end; C01 does not replay', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1&cine=1');
  await page.click('#mstart');
  await page.waitForSelector('#moonintro');
  await page.keyboard.press('Space'); // 달 도착 연출 건너뛰기 → 이어서 C01
  await page.waitForFunction(() => (window as any).__game.G.cine?.t >= 2.2, undefined, {timeout: 10000});
  await expect(page.locator('#cineSkip')).toHaveClass(/on/); // 최초 시청: 2초 뒤 표시
  await page.click('#cineSkip');
  await page.waitForFunction(() => (window as any).__game.G.cine === null, undefined, {timeout: 5000});
  expect(await gameEval(page, 'JSON.stringify([g.S.story.beat, g.S.story.seen.c01_love])')).toBe('[1,1]');
  await page.waitForTimeout(800);
  expect(await gameEval(page, 'g.G.cine')).toBeNull();
  await expect(page.locator('#cine')).not.toHaveClass(/on/);
  // 건너뛰기 후 이동 가능 (paused 해제)
  const z0 = await gameEval<number>(page, 'g.G.me.pos.z');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyW');
  expect(Math.abs((await gameEval<number>(page, 'g.G.me.pos.z')) - z0)).toBeGreaterThan(1);
});

test('keyboard skip (Space) works for a lock cutscene and keys do not leak to the game', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1&cine=1');
  await page.click('#mstart');
  await page.waitForSelector('#moonintro');
  await page.keyboard.press('Space'); // 달 도착 연출 건너뛰기 → 이어서 C01
  await page.waitForFunction(() => (window as any).__game.G.cine?.t >= 0.6);
  await page.keyboard.press('KeyB'); // 도감 키가 새지 않아야 한다
  expect(await gameEval(page, 'g.G.dexOpen')).toBe(false);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => (window as any).__game.G.cine === null, undefined, {timeout: 5000});
  expect(await gameEval(page, 'g.S.story.seen.c01_love')).toBe(1);
});

test('format sample x_sample: input-unlocked overlay keeps movement, shows bubbles, ends with seen only', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  expect(await gameEval(page, 'g.cine.play("x_sample")')).toBe(true);
  expect(await gameEval(page, 'g.G.cine.lock')).toBe(false);
  const z0 = await gameEval<number>(page, 'g.G.me.pos.z');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(900);
  await page.keyboard.up('KeyW');
  expect(Math.abs((await gameEval<number>(page, 'g.G.me.pos.z')) - z0)).toBeGreaterThan(1); // 입력 비차단
  await expect(page.locator('.bub:not(.crowd)')).toHaveCount(1);
  expect(await page.locator('.bub:not(.crowd)').innerText()).not.toMatch(NO_TEXT);
  await page.screenshot({path: `${OUT}/cine-sample.png`});
  await page.waitForFunction(() => (window as any).__game.G.cine === null, undefined, {timeout: 12000});
  expect(await gameEval(page, 'JSON.stringify([g.S.story.seen.x_sample, g.S.story.beat])')).toBe('[1,0]');
});

test('iconToast: icons only, merges repeats into ×n, queue max 2, held during cutscene', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.cine.iconToast(['money']);
    g.cine.iconToast(['money']);
  });
  await expect(page.locator('#itoast .itk')).toHaveCount(1);
  await expect(page.locator('#itoast .cnt')).toHaveText('×2');
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.cine.iconToast(['quest']);
    g.cine.iconToast(['apple', 'sparkle']);
  });
  await expect(page.locator('#itoast .itk')).toHaveCount(2);
  expect((await page.locator('#itoast').innerText()).replace(/[×0-9\s]/g, '')).not.toMatch(NO_TEXT);
  await page.waitForTimeout(2200);
  await expect(page.locator('#itoast .itk')).toHaveCount(0);
  // 컷신 중 보류 → 종료 후 표시
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.cine.play('x_sample');
    g.cine.iconToast(['joy']);
  });
  await expect(page.locator('#itoast .itk')).toHaveCount(0);
  await page.waitForFunction(() => (window as any).__game.G.cine === null, undefined, {timeout: 12000});
  await expect(page.locator('#itoast .itk')).toHaveCount(1);
});

test('HudWidget: slot caps and total cap are enforced by the renderer', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => {
    const g = (window as any).__game;
    const mk = (id: string, slot: string, priority: number, fill?: number) => () => ({id, slot, priority, icons: ['apple'], fill});
    g.cine.addHudWidget(mk('a', 'TC', 5));
    g.cine.addHudWidget(mk('b', 'TC', 9)); // 같은 슬롯 상한 1 → priority 큰 b 만
    g.cine.addHudWidget(mk('c', 'TL', 1, 0.5));
  });
  await expect(page.locator('#widgets .slot[data-slot="TC"] .wg')).toHaveCount(1);
  await expect(page.locator('#widgets .slot[data-slot="TL"] .fill')).toHaveCount(1);
  expect(await page.locator('#widgets').innerText()).not.toMatch(NO_TEXT);
});

test('save v6: v5 save with progress counts C01 as seen; v6 default has 17 seen keys; higher version is preserved', async ({game}) => {
  const {page} = game;
  const v5 = {base: Array(12).fill(null), cr: 50, slots: 6, stolen: 3, zone: 0, dex: {}, mi: 0, ver: 5, quests: {}, ach: {}};
  await page.addInitScript(s => localStorage.setItem('stealPlanet4', s), JSON.stringify(v5));
  await game.open('?debug=1&cine=1');
  const st = await gameEval<any>(page, 'g.S.story');
  expect(st.seen.c01_love).toBe(1);
  expect(Object.keys(st.seen).length).toBe(17);
  expect([st.beat, st.mid]).toEqual([1, 0]);
  expect(await gameEval(page, 'g.S.ver')).toBe(6);
  expect(await gameEval(page, 'JSON.stringify(g.S.quests)')).toBe('{}'); // 다른 v6 필드는 건드리지 않는다
  await page.click('#mstart');
  await page.waitForTimeout(800);
  expect(await gameEval(page, 'g.G.cine')).toBeNull(); // 이미 본 걸로 침 → 자동 재생 없음
});
test('save: a save from a higher version keeps its version and story fields', async ({game}) => {
  const {page} = game;
  const v9 = {base: Array(12).fill(null), cr: 50, slots: 6, stolen: 3, zone: 0, dex: {}, mi: 0, ver: 9, story: {beat: 4, mid: 2, seen: {c01_love: 1}, ended: 0, hints: {move: 1}}};
  await page.addInitScript(s => localStorage.setItem('stealPlanet4', s), JSON.stringify(v9));
  await game.open('?debug=1&cine=1');
  expect(await gameEval(page, 'g.S.ver')).toBe(9);
  expect(await gameEval(page, 'JSON.stringify([g.S.story.beat, g.S.story.mid, g.S.story.hints.move])')).toBe('[4,2,1]');
});

test('rules: no Korean in cutscene data, no sentence toast() on story/tutorial paths', () => {
  const read = (f: string) => fs.readFileSync(path.join(SRC, f), 'utf8');
  const data = read('data/cutscenes.ts').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  expect(data).not.toMatch(/[가-힣]/); // 한글 문자열 리터럴 0건 (주석 제외)
  const files = ['data/cutscenes.ts', 'systems/cutscene.ts', ...fs.readdirSync(path.join(SRC, 'game')).filter(f => f.startsWith('cutscene')).map(f => `game/${f}`)];
  files.forEach(f => expect(read(f).replace(/\/\/.*$/gm, ''), f).not.toMatch(/(?<![A-Za-z])toast\(/));
  // 컷신 데이터에 text 필드 없음
  expect(data).not.toMatch(/\btext\s*:/);
});
