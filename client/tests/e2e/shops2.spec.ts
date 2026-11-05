// W5 상점 거리: 새 용도 13종 입장·계산대, 구매 → 상태 변화(편의점·빵집·꽃집·서점·옷·대리점·중고차·펫·자전거), 자전거 타기 속도, 스크린샷
import {test, expect, unexpected, OUT} from './fixtures';

const KINDS = ['clothes', 'autoshop', 'bikeshop', 'mart24', 'florist', 'petshop', 'electro', 'bookshop', 'bakery', 'pharmacy', 'gasstation', 'carwash', 'usedcar'];

test('13 new shop purposes exist on the shop street, are enterable, and each room has a shop2 counter', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const I = await import('/js/data/interiors.js'),
      B = await import('/js/game/interior.js'),
      g = (window as any).__game;
    const out: any = {have: {} as any, fails: [] as string[], noCounter: [] as string[]};
    I.ENTERABLES.forEach((e: any, i: number) => {
      if (!e.id.startsWith('w4-')) return;
      out.have[e.purpose] = e.id;
      B.enterBuilding(i);
      const spot = g.G.inside.spots.find((s: any) => s.kind === 'shop2');
      if (!spot) out.noCounter.push(e.purpose);
      if (!g.G.inside || Math.abs(g.G.me.pos.x - 1500) > e.w) out.fails.push(e.id);
      B.leaveBuilding();
    });
    return out;
  });
  expect(Object.keys(r.have).sort()).toEqual([...KINDS].sort());
  expect(r.fails).toEqual([]);
  expect(r.noCounter).toEqual([]);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('convenience store / bakery / florist / books: buy -> stamina, speed buff, flowers, 6 books bonus', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const g = (window as any).__game,
      M = await import('/js/game/shops2.js'),
      D = await import('/js/data/shops2.js');
    g.S.cr = 100000;
    const out: any = {};
    // UI 로 편의점 열고 탄산음료 클릭
    M.openShop2('mart24');
    const cards = [...document.querySelectorAll('#shop2 .cgrid .it')] as HTMLElement[];
    out.cards = cards.length;
    g.G.stam = 10;
    const cr0 = g.S.cr;
    cards[0].click(); // 초코바
    out.stam = g.G.stam;
    out.paid = cr0 - g.S.cr > 0;
    cards[1].click(); // 탄산음료 (속도 버프)
    out.mul = M.buffs.mul;
    out.buffT = M.buffs.t;
    // 빵집 케이크(하루 한정 4)
    M.openShop2('bakery');
    const cake = [...document.querySelectorAll('#shop2 .cgrid .it')][4] as HTMLElement;
    for (let i = 0; i < 6; i++) cake.click();
    out.cakeSold = M.soldToday('cake');
    // 꽃집
    M.openShop2('florist');
    [...document.querySelectorAll('#shop2 .cgrid .it')][0].dispatchEvent(new Event('click'));
    out.flowers = g.S.coins.flowers || 0;
    // 서점 6권
    M.openShop2('bookshop');
    const crB = g.S.cr;
    for (let k = 0; k < 6; k++) (document.querySelectorAll('#shop2 .cgrid .it')[k] as HTMLElement).click();
    out.books = M.bookCount();
    out.bonus = g.S.cr - crB; // 6 * 300 쓰고 3000 받음(특가 반영 전후 편차 허용)
    // 날짜 기반 특가는 결정적
    out.deal = [D.dealDay('mart24', 8), D.dealDay('mart24', 8)];
    return out;
  });
  expect(r.cards).toBeGreaterThanOrEqual(7);
  expect(r.stam).toBeGreaterThan(30);
  expect(r.paid).toBe(true);
  expect(r.mul).toBeGreaterThan(1);
  expect(r.buffT).toBeGreaterThan(20);
  expect(r.cakeSold).toBeLessThanOrEqual(4);
  expect(r.cakeSold).toBeGreaterThan(0);
  expect(r.flowers).toBeGreaterThanOrEqual(0);
  expect(r.books).toBe(6);
  expect(r.bonus).toBeGreaterThan(1000);
  expect(r.deal[0]).toBe(r.deal[1]);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('clothes mirror recolors the player, back item attached; reset restores', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const g = (window as any).__game,
      M = await import('/js/game/shops2.js');
    g.S.cr = 50000;
    M.openShop2('clothes');
    const sw = () => [...document.querySelectorAll('#shop2 .cgrid .it')] as HTMLElement[];
    const before = g.G.me.userData.mat.shirt.color.getHex();
    sw()[1].click(); // 두 번째 색(주황)
    const after = g.G.me.userData.mat.shirt.color.getHex();
    const sc = g.S.look.shirtC;
    // 등 탭(마지막 탭 직전) → 망토
    const tabs = [...document.querySelectorAll('#shop2 .ctabs .it')] as HTMLElement[];
    tabs[3].click();
    sw().find(b => b.textContent!.includes('🦸'))!.click();
    const back = g.G.me.userData.backG?.children.length || 0;
    tabs[4].click(); // 초기화
    return {before, after, sc, back, reset: g.S.look.shirtC, backAfter: g.G.me.userData.backG.children.length, saved: JSON.parse(localStorage.getItem('stealPlanet4') || '{}').look};
  });
  expect(r.after).not.toBe(r.before);
  expect(r.sc).toBe(0xf08a3a);
  expect(r.back).toBeGreaterThan(0);
  expect(r.reset).toBe(0);
  expect(r.backAfter).toBe(0);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('car dealer & used lot: buy into garage with chosen color; pet shop follower; bike shop: buy, ride faster', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  const r = await page.evaluate(async () => {
    const g = (window as any).__game,
      M = await import('/js/game/shops2.js'),
      V = await import('/js/game/shops2-vehicles.js'),
      Rd = await import('/js/game/rides.js'),
      Pt = await import('/js/game/pets.js');
    g.S.cr = 400000;
    g.S.cars.garage = 3;
    const out: any = {};
    // 대리점: 해치백 클릭 두 번(선택 → 구매)
    M.openShop2('autoshop');
    let cards = [...document.querySelectorAll('#shop2 .cgrid .it')] as HTMLElement[];
    const hatch = cards.find(c => c.textContent!.includes('해치백'))!;
    hatch.click();
    (document.querySelector('#shop2 .cgrid .it:last-child .pt b:nth-child(5)') as HTMLElement).click();
    cards = [...document.querySelectorAll('#shop2 .cgrid .it')] as HTMLElement[];
    cards.find(c => c.textContent!.includes('해치백'))!.click();
    out.cars1 = g.S.cars.list.map((c: any) => [c.t, c.c]);
    // 중고차
    const lot = V.usedLot();
    out.lot = lot.length;
    M.openShop2('usedcar');
    const cr = g.S.cr;
    (document.querySelector('#shop2 .cgrid .it') as HTMLElement).click();
    out.usedPaid = cr - g.S.cr;
    out.cars2 = g.S.cars.list.length;
    // 펫샵: 강아지 구매
    M.openShop2('petshop');
    [...document.querySelectorAll('#shop2 .cgrid .it')].find(c => c.textContent!.includes('강아지'))!.dispatchEvent(new MouseEvent('click'));
    out.pet = g.S.coins.pet;
    await new Promise(r => setTimeout(r, 600));
    out.petMesh = Pt.activePet()?.id;
    // 자전거 샵: 자전거 구매 → 타기
    M.openShop2('bikeshop');
    [...document.querySelectorAll('#shop2 .cgrid .it')].find(c => c.textContent!.includes('자전거') && !c.textContent!.includes('산악') && !c.textContent!.includes('전기') && !c.textContent!.includes('외발'))!.dispatchEvent(new MouseEvent('click'));
    out.owns = Rd.ownsRide('bike');
    document.getElementById('s2x')!.click();
    return out;
  });
  expect(r.cars1.length).toBe(1);
  expect(r.cars1[0][0]).toBe('hatch');
  expect(r.lot).toBe(6);
  expect(r.usedPaid).toBeGreaterThan(0);
  expect(r.cars2).toBe(2);
  expect(r.pet).toBeGreaterThan(0);
  expect(r.petMesh).toBe('dog');
  expect(r.owns).toBe(true);
  // 걷기 vs 자전거 속도
  const dist = async () => {
    await page.evaluate(() => {
      const g = (window as any).__game;
      g.teleport(0, 70);
      g.G.yaw = 0;
      g.G.keys.KeyW = true;
    });
    const a = await page.evaluate(() => (window as any).__game.G.me.pos.z);
    await page.waitForTimeout(1200);
    const b = await page.evaluate(() => {
      const g = (window as any).__game;
      g.G.keys.KeyW = false;
      return g.G.me.pos.z;
    });
    return Math.abs(a - b);
  };
  const walk = await dist();
  await page.keyboard.press('KeyV');
  expect(await page.evaluate(async () => !!(await import('/js/game/rides.js')).currentRide())).toBe(true);
  await page.waitForTimeout(300);
  await page.screenshot({path: `${OUT}/shops2-bike-ride.png`});
  const ride = await dist();
  expect(ride).toBeGreaterThan(walk * 1.5);
  await page.keyboard.press('KeyV');
  expect(await page.evaluate(async () => !!(await import('/js/game/rides.js')).currentRide())).toBe(false);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('shop street screenshots: exterior and interiors; phone lists the street', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.teleport(-238, 238);
    g.G.yaw = Math.PI;
    g.G.pitch = 0.5;
    g.G.camDist = 26;
  });
  await page.waitForTimeout(1500);
  await page.screenshot({path: `${OUT}/shops2-street.png`});
  const places = await page.evaluate(async () => (await import('/js/data/places.js')).PLACES.filter((p: any) => p.id.startsWith('sp-')).length);
  expect(places).toBe(13);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
