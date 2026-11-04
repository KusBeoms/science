import type {Page} from '@playwright/test';
import {test, expect} from './fixtures';

const crValue = async (p: Page) => +((await p.locator('#cr').textContent()) || '').replace(/\D/g, '');

const v4 = {base: Array(12).fill(null), cr: 1234, slots: 6, stolen: 3, zone: 0, dex: {}, mi: 0};

test('v4 save in localStorage is restored and menu offers resume', async ({game}) => {
  await game.page.addInitScript(s => localStorage.setItem('stealPlanet4', s), JSON.stringify(v4));
  await game.open();
  await expect(game.page.locator('#mstart')).toContainText('이어하기');
  await game.page.click('#mstart');
  await expect.poll(() => crValue(game.page)).toBeGreaterThanOrEqual(1234);
});

test('v3-only save is picked up and migrated to stealPlanet4', async ({game}) => {
  await game.page.addInitScript(s => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('stealPlanet3', s);
    }
  }, JSON.stringify({...v4, cr: 777, ver: 3}));
  await game.open();
  await expect(game.page.locator('#mstart')).toContainText('이어하기');
  await game.page.click('#mstart');
  await expect.poll(() => crValue(game.page)).toBeGreaterThanOrEqual(777);
  expect(await crValue(game.page)).toBeLessThan(900); // 수익으로 약간 늘 수 있음
  await game.page.waitForTimeout(5500); // 5초 자동저장
  const saved = await game.page.evaluate(() => JSON.parse(localStorage.getItem('stealPlanet4') || 'null'));
  expect(saved?.cr).toBeGreaterThanOrEqual(777);
  expect(saved?.ver).toBe(5);
});

test('progress survives reload (autosave -> restore)', async ({game}) => {
  await game.open();
  await game.page.click('#mstart');
  await game.page.waitForTimeout(5500);
  const before = await game.page.evaluate(() => JSON.parse(localStorage.getItem('stealPlanet4')!));
  expect(before).not.toBeNull();
  await game.page.reload();
  await game.page.waitForSelector('#menu.on');
  await game.page.evaluate(() => localStorage.getItem('stealPlanet4'));
  const after = await game.page.evaluate(() => JSON.parse(localStorage.getItem('stealPlanet4')!));
  expect(after.slots).toBe(before.slots);
  expect(after.ver).toBe(5);
});
