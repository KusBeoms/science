// AI: 공 가진 선수(슛·패스·드리블) · 지원 달리기(오프사이드 라인 준수) · 수비(압박·태클·지역 방어) · 골키퍼(위치·다이빙·배급) · 재개 킥
import {GH, M, ball, clamp, cx, cz, defX, atkX, dir, dist, hl, hw, toGoal, wrap, type Pl} from './state.js';
import {groundPass, lobPass, nearestOpp, pickMate, shoot} from './actions.js';
import {tackle} from './rules.js';
import {homeOf, moveTo, steer} from './team.js';
import {kickBall} from './ball.js';

const near2 = (team: 0 | 1, skip?: Pl | null): Pl[] =>
  M!.pls.filter(p => p.team === team && !p.off && p.role !== 'GK' && p !== skip).sort((a, b) => dist(a, ball) - dist(b, ball));

/** AI 가 재개 킥을 찬다 */
export function aiTake(p: Pl) {
  const R = M!.restart!,
    a = dir(p.team);
  const mate = pickMate(p, a, 0, true) || pickMate(p, 0, 0);
  switch (R.kind) {
    case 'penalty':
      return shoot(p, cz + (Math.random() < 0.5 ? -1 : 1) * GH * 0.65, 0.7, 0.8);
    case 'corner':
      return lobPass(p, atkX(p.team) - a * 7, cz + (Math.random() - 0.5) * 8, a * 0.5);
    case 'goalkick':
      return lobPass(p, cx + a * 8, p.z * 0.4 + (Math.random() - 0.5) * 20);
    case 'free':
      if (toGoal(p) < 30) return shoot(p, cz + (Math.random() - 0.5) * GH, 0.75, 1.1);
      return mate ? lobPass(p, mate.x, mate.z) : groundPass(p, p.x + a * 12, p.z);
    default:
      return mate ? groundPass(p, mate.x, mate.z) : kickBall(p, a, 0, 12);
  }
}

function withBall(p: Pl, dt: number) {
  const a = dir(p.team),
    opp = nearestOpp(p),
    pressed = !!opp && dist(opp, p) < 4.5;
  p.think -= dt;
  // 슛 거리
  if (p.think <= 0) {
    p.think = 0.35 + Math.random() * 0.25;
    if (toGoal(p) < 27 && Math.abs(p.z - cz) < 22 && Math.random() < 0.8) {
      const gk = M!.pls.find(q => q.team !== p.team && q.role === 'GK');
      const side = gk && gk.z > cz ? -1 : 1;
      return shoot(p, cz + side * GH * 0.62, 0.55 + Math.random() * 0.3, 0.9);
    }
    if (pressed || Math.random() < 0.18) {
      const mate = pickMate(p, a, 0, true) || pickMate(p, a, 0);
      if (mate) {
        if (dist(p, mate) > 24) return lobPass(p, mate.x + a * 3, mate.z);
        return groundPass(p, mate.x + mate.vx * 0.3, mate.z + mate.vz * 0.3);
      }
    }
  }
  // 드리블: 골 쪽으로, 가까운 상대는 피해서
  let dx = a * 1,
    dz = (cz - p.z) * 0.03;
  if (opp && dist(opp, p) < 6) {
    const ax = p.x - opp.x,
      az = p.z - opp.z,
      l = Math.hypot(ax, az) || 1;
    dx += (ax / l) * 0.9;
    dz += (az / l) * 1.4;
  }
  // 측면 이탈 방지
  if (Math.abs(p.z - cz) > hw - 4) dz -= Math.sign(p.z - cz) * 1.2;
  steer(p, dx, dz, true, dt, 0.95);
  // 수비수에게 찍힌 태클 (아래 수비측에서 처리)
}
function support(p: Pl, dt: number) {
  const a = dir(p.team),
    h = homeOf(p),
    opp = M!.pls.filter(q => q.team !== p.team && !q.off).map(q => q.x * a).sort((x, y) => y - x),
    line = (opp[1] ?? cx * a) - 1.2;
  let tx = h.x + a * (14 + (p.role === 'ST' ? 6 : 0)) + (ball.x - h.x) * 0.25,
    tz = h.z + (ball.z - cz) * 0.15;
  tx = Math.min(tx * a, line) * a; // 오프사이드 라인 안쪽
  tx = clamp(tx, cx - hl + 3, cx + hl - 3);
  moveTo(p, tx, tz, dist(p, ball) > 12, dt, 0.95);
}
function defend(p: Pl, dt: number, chasers: Pl[]) {
  const owner = ball.owner!,
    h = homeOf(p),
    a = dir(p.team);
  if (chasers.includes(p)) {
    // 압박: 공 가진 선수와 골 사이로
    const gx = defX(p.team),
      vx = gx - owner.x,
      vz = cz - owner.z,
      l = Math.hypot(vx, vz) || 1;
    moveTo(p, owner.x + (vx / l) * 1.3, owner.z + (vz / l) * 1.3, dist(p, owner) > 5, dt, 0.98, 0.3);
    if (dist(p, owner) < 2.2 && p.tackleCd <= 0 && Math.random() < dt * 1.6) tackle(p, Math.random() < 0.12);
  } else {
    // 지역 방어: 공과 자기 골 사이로 라인을 내린다
    const tx = clamp(h.x + (ball.x - h.x) * 0.45 - a * 3, cx - hl + 3, cx + hl - 3),
      tz = h.z + (ball.z - cz) * 0.35;
    moveTo(p, tx, tz, false, dt, 0.9);
  }
}
function keeper(p: Pl, dt: number) {
  const a = dir(p.team),
    gx = defX(p.team) + a * 2.2;
  p.dive = Math.max(0, p.dive - dt);
  if (ball.owner === p) {
    p.hold -= dt;
    steer(p, 0, 0, false, dt);
    if (p.hold <= 0) {
      const mate = pickMate(p, a, 0, true);
      if (mate) lobPass(p, mate.x, mate.z);
      else kickBall(p, a * 10, (Math.random() - 0.5) * 6, 24, 6);
    }
    return;
  }
  // 슛 예측: 공이 골 쪽으로 빠르게 오면 도착 z 로 미리 이동/다이빙
  let tz = cz + clamp((ball.z - cz) * 0.4, -GH * 0.9, GH * 0.9);
  const toward = (defX(p.team) - ball.x) * ball.vx > 0 && Math.abs(ball.vx) > 8,
    t = toward ? Math.abs((defX(p.team) - ball.x) / ball.vx) : 9;
  if (toward && t < 1.2) {
    const pz = ball.z + ball.vz * t;
    if (Math.abs(pz - cz) < GH + 2.2) {
      tz = pz;
      if (t < 0.55 && p.dive <= 0 && Math.abs(pz - p.z) > 1.5) {
        p.dive = 0.6;
        p.tz = pz;
        p.tx = Math.sign(pz - p.z);
      }
    }
  }
  const fast = p.dive > 0 ? 3.2 : 1;
  moveTo(p, gx, tz, false, dt, 1.15 * fast, 0.2);
  // 페널티박스 안 느슨한 공은 나가서 처리
  if (!ball.owner && dist(p, ball) < 9 && Math.abs(ball.x - defX(p.team)) < 14 && Math.abs(ball.vx) < 6) moveTo(p, ball.x, ball.z, true, dt, 1.1);
}

/** 사람이 조작하지 않는 모든 선수 */
export function aiUpdate(dt: number) {
  const m = M!;
  if (m.phase === 'goal' || m.phase === 'half' || m.phase === 'end') {
    for (const p of m.pls) if (p !== m.ctl) steer(p, 0, 0, false, dt);
    return;
  }
  // 재개: 시간이 되면 AI 가 찬다
  if (m.phase === 'restart' && m.restart && m.restart.team === 1 && m.restart.wait <= 0) aiTake(m.restart.taker);
  const owner = ball.owner;
  const opp0 = near2(0), opp1 = near2(1);
  const press0 = (m.ctl && ball.owner?.team === 0) ? 0 : 1;
  for (const p of m.pls) {
    if (p.off || p === m.ctl) continue;
    if (p.down > 0 || p.slide > 0) continue;
    if (p.role === 'GK') {
      keeper(p, dt);
      continue;
    }
    if (m.phase === 'restart' && m.restart && p === m.restart.taker) {
      steer(p, 0, 0, false, dt);
      continue;
    }
    if (owner === p) {
      withBall(p, dt);
      continue;
    }
    if (owner && owner.team === p.team) {
      support(p, dt);
      continue;
    }
    if (owner && owner.team !== p.team) {
      const list = p.team === 0 ? opp0 : opp1,
        chasers = list.filter(q => q !== m.ctl).slice(0, p.team === 1 ? 2 : 1);
      defend(p, dt, chasers);
      continue;
    }
    // 자유공: 팀에서 가장 가까운 선수가 쫓는다
    const list = p.team === 0 ? opp0 : opp1;
    const first = list.find(q => q !== m.ctl);
    if (first === p || (list[0] === p && p.team === 1)) moveTo(p, ball.x + ball.vx * 0.25, ball.z + ball.vz * 0.25, true, dt, 0.98, 0.3);
    else {
      const h = homeOf(p);
      moveTo(p, h.x + (ball.x - h.x) * 0.4, h.z + (ball.z - cz) * 0.2, false, dt, 0.9);
    }
  }
  void press0;
  void wrap;
}
