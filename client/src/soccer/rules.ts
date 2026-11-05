// 규칙: 소유·터치·골키퍼 선방, 골·아웃(스로인/골킥/코너), 반칙(프리킥·페널티·카드·퇴장), 오프사이드, 재개(킥오프 포함), 심판, 전후반
import {sfx} from '../audio/index.js';
import {uniform} from '../render/uniform.js';
import {G} from '../core/runtime.js';
import {PLAYER_SCALE} from '../core/scale.js';
import {blocky} from '../render/characters.js';
import {atkX, ball, BR, cx, cz, defX, dir, dist, GH, hl, hw, inBox, M, wrap, type Pl, type RestartKind} from './state.js';
import {kickBall, placeBall} from './ball.js';
import {lineup} from './team.js';

/** 시스템(systems/soccer.ts)이 채우는 훅 */
export const hooks = {cheer: (_n: number) => {}, end: () => {}};
export const say = (t: string, sec = 2.6) => {
  if (!M) return;
  M.hint = t;
  M.hintT = sec;
};

export function makeRef() {
  const m = blocky(0x111111, 0x111111, '#e0b090', PLAYER_SCALE, 0xf3e04a);
  uniform(m, 'referee');
  m.rotation.order = 'YXZ';
  G.scene.add(m);
  return m;
}
export function refUpdate(dt: number) {
  if (!M) return;
  const r = M.ref,
    tx = ball.x - 7,
    tz = ball.z + (ball.z > cz ? -8 : 8),
    dx = tx - r.x,
    dz = tz - r.z,
    d = Math.hypot(dx, dz);
  if (d > 1) {
    const sp = Math.min(d, 7 * dt);
    r.x += (dx / d) * sp;
    r.z += (dz / d) * sp;
    r.m.rotation.y = Math.atan2(ball.x - r.x, ball.z - r.z);
  }
  r.m.position.set(r.x, 0, r.z);
}

// ---------- 재개 ----------
const KICK_TEXT: Record<RestartKind, string> = {kickoff: '⚽', throw: '🤾', goalkick: '🥅↗', corner: '🚩', free: '🦵', penalty: '⚽●', indirect: '⚑'};
export function setRestart(kind: RestartKind, team: 0 | 1, x: number, z: number) {
  if (!M) return;
  const pool = M.pls.filter(p => p.team === team && !p.off && (kind === 'goalkick' ? p.role === 'GK' : p.role !== 'GK'));
  let taker = pool[0];
  let bd = 1e9;
  for (const p of pool) {
    const d = kind === 'kickoff' ? (p.role === 'ST' ? 0 : 99) : kind === 'penalty' ? (p.role === 'ST' ? 0 : 99) : Math.hypot(p.x - x, p.z - z);
    if (d < bd) [taker, bd] = [p, d];
  }
  placeBall(x, z);
  const a = dir(team);
  taker.x = x - a * (kind === 'throw' ? 0 : 1.3);
  taker.z = kind === 'throw' ? z + Math.sign(z - cz) * 0.8 : z;
  taker.ry = kind === 'throw' ? (z > cz ? -Math.PI : 0) : a > 0 ? Math.PI / 2 : -Math.PI / 2;
  taker.vx = taker.vz = 0;
  taker.down = taker.slide = 0;
  if (team === 0) M.ctl = taker;
  M.phase = 'restart';
  M.restart = {kind, team, x, z, taker, wait: team === 0 ? 7 : 1.5};
  say(KICK_TEXT[kind]);
}
export function startKickoff(team: 0 | 1) {
  if (!M) return;
  lineup(M.pls, team);
  setRestart('kickoff', team, cx, cz);
  M.restart!.wait = team === 0 ? 5 : 1.8;
}
/** 재개 중: 상대 선수를 공에서 떼어 놓는다 */
export function stepRestart(dt: number) {
  const m = M;
  if (!m || !m.restart) return;
  const R = m.restart;
  R.wait -= dt;
  const clear = R.kind === 'throw' ? 3 : R.kind === 'penalty' ? 0 : 8;
  for (const p of m.pls) {
    if (p.off || p.team === R.team || p.role === 'GK' && R.kind !== 'corner') continue;
    if (R.kind === 'penalty') {
      // 페널티: 박스 밖으로 (골키퍼 제외)
      const gx = defX(R.team === 0 ? 1 : 0);
      if (Math.abs(p.x - gx) < 19) p.x = gx - Math.sign(gx - cx) * 19 + 0;
      continue;
    }
    const d = dist(p, ball);
    if (d < clear) {
      const k = (clear - d) / Math.max(d, 0.1);
      p.x += (p.x - ball.x) * k * Math.min(1, dt * 6);
      p.z += (p.z - ball.z) * k * Math.min(1, dt * 6);
    }
  }
  // 페널티: 같은 편 선수도 박스 밖
  if (R.kind === 'penalty') {
    const gx = defX(R.team === 0 ? 1 : 0);
    for (const p of m.pls) if (p !== R.taker && p.role !== 'GK' && !p.off && Math.abs(p.x - gx) < 19) p.x = gx - Math.sign(gx - cx) * 19;
  }
}

// ---------- 소유·터치 ----------
export function checkTouches(dt: number) {
  const m = M!;
  if (ball.owner) m.poss[ball.owner.team] += dt;
  if (ball.offsideT > 0 && (ball.offsideT -= dt) <= 0) ball.offsideSet = [];
  if (m.phase !== 'play') return;
  const sp = Math.hypot(ball.vx, ball.vz);
  for (const p of m.pls) {
    if (p.off || p.down > 0 || p.cd > 0 || ball.owner === p) continue;
    const d = Math.hypot(p.x - ball.x, p.z - ball.z);
    if (p.role === 'GK' && !ball.owner && d < (p.dive > 0 ? 3.4 : 2.3) && ball.y < 3.6 && inBox(p.x, p.z, p.team)) {
      if (sp > 24 && Math.random() < 0.4) {
        kickBall(p, ball.x - p.x, (ball.z - cz) * 0.4 + ball.z - p.z, 14, 5); // 쳐내기
        p.cd = 0.6;
        say('🧤');
      } else {
        ball.owner = p;
        ball.vx = ball.vy = ball.vz = 0;
        p.hold = 1.4;
        say('🧤');
      }
      continue;
    }
    if (ball.owner || d > 1.4 || ball.y > 2.3) continue;
    if (sp > 24) {
      ball.vx *= 0.45;
      ball.vz *= 0.45; // 너무 빠르면 흘린다
      p.cd = 0.2;
      continue;
    }
    // 오프사이드 판정
    if (ball.passTeam === p.team && ball.offsideSet.includes(p)) {
      callOffside(p);
      return;
    }
    ball.owner = p;
    ball.passTeam = -1;
    ball.offsideSet = [];
    ball.last = p;
    if (p.team === 0 && !p.off) m.ctl = p; // 받은 선수로 자동 전환
  }
}
/** 패스가 나가는 순간: 공격 팀 중 오프사이드 위치에 있는 선수를 기록한다 */
export function markPass(passer: Pl) {
  const m = M;
  if (!m) return;
  const a = dir(passer.team),
    opp = m.pls.filter(p => p.team !== passer.team && !p.off).map(p => p.x * a).sort((x, y) => y - x),
    line = Math.max(opp[1] ?? 0, cx * a), // 두 번째로 깊은 수비수 (공·중앙선보다 앞)
    ballLine = Math.max(ball.x * a, cx * a);
  ball.passTeam = passer.team;
  ball.offsideT = 3;
  ball.offsideSet = m.pls.filter(p => p.team === passer.team && p !== passer && !p.off && p.role !== 'GK' && p.x * a > line + 0.8 && p.x * a > ballLine + 0.5);
}
function callOffside(p: Pl) {
  const m = M!;
  sfx('whistle');
  say('⚑ 오프사이드', 3);
  ball.offsideSet = [];
  ball.passTeam = -1;
  setRestart('indirect', p.team === 0 ? 1 : 0, clampX(p.x), clampZ(p.z));
  m.phase = 'restart';
}
const clampX = (x: number) => Math.max(cx - hl + 3, Math.min(cx + hl - 3, x));
const clampZ = (z: number) => Math.max(cz - hw + 2, Math.min(cz + hw - 2, z));

// ---------- 골·아웃 ----------
export function checkBall() {
  const m = M!;
  if (m.phase !== 'play') return;
  const oz = ball.z - cz;
  const lastTeam = ball.last?.team ?? 0;
  if (Math.abs(oz) > hw + 0.2) {
    // 터치라인: 마지막에 만진 반대 팀 스로인
    sfx('whistle');
    setRestart('throw', lastTeam === 0 ? 1 : 0, clampX(ball.x), cz + Math.sign(oz) * (hw - 0.3));
    return;
  }
  if (Math.abs(ball.x - cx) > hl) {
    const side = ball.x > cx ? 1 : -1;
    if (Math.abs(oz) < GH - 0.15 && ball.y < 3.4) {
      goalScored(side > 0 ? 0 : 1);
      return;
    }
    sfx('whistle');
    // 골라인 아웃: 수비 팀이 마지막이면 코너, 공격 팀이면 골킥
    const defTeam: 0 | 1 = side > 0 ? 1 : 0;
    if (lastTeam === defTeam) setRestart('corner', defTeam === 0 ? 1 : 0, cx + side * (hl - 0.4), cz + Math.sign(oz || 1) * (hw - 0.4));
    else setRestart('goalkick', defTeam, cx + side * (hl - 5.5), cz);
  }
}
function goalScored(team: 0 | 1) {
  const m = M!;
  m.score[team]++;
  m.phase = 'goal';
  m.pause = 3.4;
  m.shots[team]++;
  ball.owner = null;
  sfx('cheer');
  sfx('net');
  hooks.cheer(team);
  say(`⚽ GOAL! ${team === 0 ? '🔵' : '🔴'} ${m.score[0]} : ${m.score[1]}`, 3);
}

// ---------- 태클·반칙 ----------
const sendOff = (p: Pl) => {
  p.off = true;
  if (ball.owner === p) ball.owner = null;
  if (M!.ctl === p) {
    const alt = M!.pls.filter(q => q.team === 0 && !q.off && q.role !== 'GK').sort((a, b) => dist(a, ball) - dist(b, ball))[0];
    if (alt) M!.ctl = alt;
  }
};
export function foul(att: Pl, victim: Pl, sev: 0 | 1 | 2) {
  const m = M!;
  sfx('whistle');
  m.fouls[att.team]++;
  let msg = '🦵 파울';
  const r = Math.random();
  if (sev === 2 && r < 0.25) {
    m.cards[att.team][1]++;
    msg = '🟥 퇴장';
    sendOff(att);
  } else if ((sev === 2 && r < 0.9) || (sev === 1 && r < 0.35)) {
    att.yellow++;
    if (att.yellow >= 2) {
      m.cards[att.team][1]++;
      msg = '🟨🟨→🟥 퇴장';
      sendOff(att);
    } else {
      m.cards[att.team][0]++;
      msg = '🟨 경고';
    }
  }
  say(`${att.team === 0 ? '🔵' : '🔴'} ${msg}`, 3);
  ball.owner = null;
  const vx = clampX(victim.x),
    vz = clampZ(victim.z);
  if (inBox(victim.x, victim.z, att.team)) {
    const gx = defX(att.team);
    setRestart('penalty', victim.team, gx + dir(att.team) * 9, cz);
    say('⚽● 페널티킥', 3);
  } else setRestart('free', victim.team, vx, vz);
}
/** att 가 공 가진 상대를 태클한다. 성공하면 공을 빼앗고, 뒤에서/무리하면 반칙 */
export function tackle(att: Pl, slide: boolean): boolean {
  const m = M!,
    v = ball.owner;
  if (att.tackleCd > 0 || att.down > 0) return false;
  att.tackleCd = slide ? 1.4 : 0.7;
  if (slide) {
    att.slide = 0.55;
    att.vx = Math.sin(att.ry) * 11;
    att.vz = Math.cos(att.ry) * 11;
  }
  if (!v || v.team === att.team || m.phase !== 'play') return false;
  const reach = slide ? 3.4 : 2;
  if (dist(att, v) > reach) return false;
  const behind = Math.sin(v.ry) * (att.x - v.x) + Math.cos(v.ry) * (att.z - v.z) < -0.4; // 공격자 뒤에서
  let win = (slide ? 0.7 : 0.55) - (v.shield ? 0.25 : 0) - (behind ? 0 : 0);
  const foulP = (behind ? 0.65 : 0.1) + (slide ? 0.25 : 0);
  if (Math.random() < foulP * (win > 0.5 ? 0.6 : 1)) {
    foul(att, v, slide && behind ? 2 : behind ? 1 : 0);
    v.down = 0.8;
    return true;
  }
  if (Math.random() < win) {
    ball.owner = null;
    kickBall(att, Math.sin(att.ry) + (Math.random() - 0.5), Math.cos(att.ry) + (Math.random() - 0.5), 8, 1);
    v.down = 0.5;
    v.cd = 0.8;
    att.cd = 0;
    if (att.team === 0) m.ctl = att;
    return true;
  }
  return false;
}

// ---------- 전후반·종료 ----------
export function stepClock(dt: number) {
  const m = M!;
  if (m.phase === 'goal') {
    if ((m.pause -= dt) <= 0) startKickoff(m.score[0] + m.score[1] ? (ball.x > cx ? 1 : 0) : 0);
    return;
  }
  if (m.phase === 'half') {
    if ((m.pause -= dt) <= 0) {
      m.half = 2;
      m.t = 90;
      startKickoff(1);
    }
    return;
  }
  if (m.phase === 'end') {
    if ((m.pause -= dt) <= 0) hooks.end();
    return;
  }
  if (m.phase === 'play' || m.phase === 'restart') {
    if ((m.t -= dt) <= 0 && (m.phase === 'play' || m.restart?.kind !== 'penalty')) {
      sfx('whistle');
      if (m.half === 1) {
        m.phase = 'half';
        m.pause = 4;
        say('⏸ 하프타임', 4);
        ball.owner = null;
        m.restart = null;
        placeBall(cx, cz);
      } else {
        m.phase = 'end';
        m.pause = 3.5;
        ball.owner = null;
        m.restart = null;
        say('🏁', 4);
      }
    }
  }
}
export const _unused = [atkX, BR, wrap];
