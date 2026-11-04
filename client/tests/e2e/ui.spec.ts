import {test, expect, unexpected, OUT} from './fixtures';

test('shop opens and closes via button, X and Escape', async ({game}) => {
  const {page} = game;
  await game.open();
  await page.click('#mstart');
  await page.click('#shopBtn');
  await expect(page.locator('#shop')).toHaveClass(/on/);
  await page.screenshot({path: `${OUT}/ui-shop.png`});
  await page.click('#sx');
  await expect(page.locator('#shop')).not.toHaveClass(/on/);
  await page.click('#shopBtn');
  await page.keyboard.press('Escape');
  await expect(page.locator('#shop')).not.toHaveClass(/on/);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('dex opens via button and B key, closes via X', async ({game}) => {
  const {page} = game;
  await game.open();
  await page.click('#mstart');
  await page.click('#dexBtn');
  await expect(page.locator('#dex')).toHaveClass(/on/);
  await page.screenshot({path: `${OUT}/ui-dex.png`});
  await page.click('#dclose');
  await expect(page.locator('#dex')).not.toHaveClass(/on/);
  await page.keyboard.press('KeyB');
  await expect(page.locator('#dex')).toHaveClass(/on/);
  await page.keyboard.press('KeyB');
  await expect(page.locator('#dex')).not.toHaveClass(/on/);
});

// 디버그 훅(window.__game)이 없으므로 같은 URL 의 ES 모듈 싱글턴을 동적 import 해 직접 호출한다
test('quiz overlay opens, accepts an answer with key 1, and closes', async ({game}) => {
  const {page} = game;
  await game.open();
  await page.click('#mstart');
  await page.evaluate(async () => {
    const q = await import('/js/game/quiz.js');
    q.openQuiz({
      title: 'e2e',
      qs: [['2+2는?', '4', '3', '5', '6', '덧셈']],
      need: 1,
      onDone: () => {},
    } as any);
  });
  await expect(page.locator('#quiz')).toHaveClass(/on/);
  await expect(page.locator('#qo button')).toHaveCount(4);
  await page.screenshot({path: `${OUT}/ui-quiz.png`});
  await page.locator('#qo button', {hasText: '4'}).first().click();
  await expect(page.locator('#qr')).toContainText('정답');
  await page.keyboard.press('Escape');
  await expect(page.locator('#quiz')).not.toHaveClass(/on/);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
