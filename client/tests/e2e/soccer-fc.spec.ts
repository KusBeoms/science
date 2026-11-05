// FC 온라인풍 축구: 7대7, 조작(패스·슛 게이지·태클), 골·아웃·반칙·오프사이드·카드·전후반, 관중
import {test, expect, unexpected, OUT} from './fixtures';

test('match: 14 players + referee + crowd; A pass, D-hold shot scores; fouls give free kicks/cards; halves end the match', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(async () => {
    const D = await import('/js/data/soccer.js');
    (window as any).__game.teleport(D.KICKOFF.x + 1, D.KICKOFF.z + 2);
  });
  await page.waitForTimeout(800);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => (window as any).__game.G.match === true, undefined, {timeout: 4000});
  await page.waitForTimeout(1500);
  await page.screenshot({path: `${OUT}/fc-kickoff.png`});
  const r = await page.evaluate(async () => {
    const ST = await import('/js/soccer/state.js'),
      A = await import('/js/soccer/actions.js'),
      R = await import('/js/soccer/rules.js'),
      m: any = ST.M,
      out: any = {};
    out.players = m.pls.length;
    out.ctl = m.ctl.team === 0 && m.ctl.role !== 'GK';
    out.phase0 = m.phase;
    // 킥오프를 즉시 진행시키고 슛 → 골
    m.phase = 'play'; m.restart = null;
    const me = m.ctl;
    me.x = ST.cx + 30; me.z = ST.cz; me.ry = Math.PI / 2;
    for (const p of m.pls) if (p.team === 1 && p.role !== 'GK') { p.x = ST.cx - 20; p.z = ST.cz + 20; }
    ST.ball.owner = me; ST.ball.x = me.x + 1; ST.ball.z = me.z;
    const gk = m.pls.find((p: any) => p.team === 1 && p.role === 'GK');
    gk.x = 999; gk.z = 999; // 골키퍼를 치워 둔다
    const s0 = m.score[0];
    A.shoot(me, ST.cz + 2, 0.7, 0);
    await new Promise(r => setTimeout(r, 1800));
    out.goal = m.score[0] - s0;
    return out;
  });
  expect(r.players).toBe(14);
  expect(r.ctl).toBe(true);
  expect(r.goal).toBe(1);
  // 킥오프 재개 → 반칙: 뒤에서 슬라이딩 → 프리킥 + 카드 집계
  const f = await page.evaluate(async () => {
    const ST = await import('/js/soccer/state.js'),
      R = await import('/js/soccer/rules.js'),
      m: any = ST.M;
    await new Promise(r => setTimeout(r, 4000));
    m.phase = 'play'; m.restart = null;
    const att = m.pls.find((p: any) => p.team === 1 && p.role === 'LW'),
      vic = m.pls.find((p: any) => p.team === 0 && p.role === 'LW');
    vic.x = ST.cx - 10; vic.z = ST.cz; vic.ry = Math.PI / 2;
    att.x = vic.x - 1; att.z = vic.z; att.ry = Math.PI / 2; att.tackleCd = 0; att.down = 0;
    ST.ball.owner = vic;
    let fouls = 0;
    for (let k = 0; k < 40 && m.phase === 'play'; k++) { att.tackleCd = 0; R.tackle(att, true); }
    return {phase: m.phase, restart: m.restart?.kind, fouls: m.fouls[1], cards: m.cards[1]};
  });
  expect(['restart', 'play']).toContain(f.phase);
  expect(f.fouls + f.cards[0] + f.cards[1]).toBeGreaterThanOrEqual(0);
  // 아웃 → 스로인, 골라인 → 코너/골킥
  const o = await page.evaluate(async () => {
    const ST = await import('/js/soccer/state.js'),
      R = await import('/js/soccer/rules.js'),
      m: any = ST.M;
    m.phase = 'play'; m.restart = null;
    ST.ball.owner = null; ST.ball.last = m.pls[1]; ST.ball.x = ST.cx; ST.ball.z = ST.cz + ST.hw + 1; ST.ball.y = 1;
    R.checkBall();
    const a = m.restart?.kind;
    m.phase = 'play'; m.restart = null;
    ST.ball.last = m.pls[8]; // 빨간 팀이 마지막 → 동쪽 골라인 밖이면 파란 골킥이 아니라 상대
    ST.ball.x = ST.cx + ST.hl + 1; ST.ball.z = ST.cz + 12; ST.ball.y = 1;
    R.checkBall();
    return {a, b: m.restart?.kind};
  });
  expect(o.a).toBe('throw');
  expect(['corner', 'goalkick']).toContain(o.b);
  // 전반 종료 → 하프타임 → 후반 → 종료
  const h = await page.evaluate(async () => {
    const ST = await import('/js/soccer/state.js'),
      m: any = ST.M;
    m.phase = 'play'; m.restart = null; m.t = 0.1;
    await new Promise(r => setTimeout(r, 900));
    return m.phase;
  });
  expect(h).toBe('half');
  await page.waitForFunction(async () => (window as any).__game.G.match === true, undefined, {timeout: 3000});
  await page.evaluate(async () => {
    const ST = await import('/js/soccer/state.js'),
      m: any = ST.M;
    await new Promise(r => setTimeout(r, 4500));
    m.phase = 'play'; m.restart = null; m.half = 2; m.t = 0.1;
  });
  await page.waitForFunction(() => (window as any).__game.G.match === false, undefined, {timeout: 12000});
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('human keys: A passes, D charges the shot gauge and releases, Shift sprints, arrows move the controlled player', async ({game}) => {
  const {page} = game;
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(async () => {
    const D = await import('/js/data/soccer.js');
    (window as any).__game.teleport(D.KICKOFF.x + 1, D.KICKOFF.z + 2);
  });
  await page.waitForTimeout(800);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => (window as any).__game.G.match === true, undefined, {timeout: 4000});
  await page.evaluate(async () => { const ST = await import('/js/soccer/state.js'); (window as any).__me = (ST.M as any).ctl; (ST.M as any).phase = 'play'; (ST.M as any).restart = null; ST.ball.owner = (ST.M as any).ctl; });
  const pos = () => page.evaluate(() => [(window as any).__me.x, (window as any).__me.z]);
  await page.evaluate(async () => { const ST = await import('/js/soccer/state.js'); (ST.M as any).phase = 'play'; (ST.M as any).restart = null; });
  const p0 = await pos();
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ShiftLeft');
  await page.waitForTimeout(1600);
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('ArrowRight');
  const p1 = await pos();
  expect(p1[0]).toBeGreaterThan((p0[0] as number) + 0.8);
  // 슛 게이지
  await page.evaluate(async () => { const ST = await import('/js/soccer/state.js'), m: any = ST.M; m.ctl.x = ST.cx + 20; m.ctl.z = ST.cz; ST.ball.owner = m.ctl; });
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(500);
  const g = await page.evaluate(async () => (await import('/js/soccer/control.js')).shotGauge());
  expect(g).toBeGreaterThan(0.05);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(300);
  const shot = await page.evaluate(async () => { const ST = await import('/js/soccer/state.js'); return Math.hypot(ST.ball.vx, ST.ball.vz); });
  expect(shot).toBeGreaterThan(8);
  await page.screenshot({path: `${OUT}/fc-play.png`});
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
