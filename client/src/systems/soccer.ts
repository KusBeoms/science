// 축구: 스타디움 잔디에서 공을 차 보거나(자유 연습), 킥오프 판에서 E 로 5대5 경기(3분)를 시작한다.
// 조작: 방향키/WASD 이동, Shift 달리기, Space 슛(공 근처에서), 공 가까이 달리면 드리블. 파란 팀(나+AI 3+골키퍼) → 동쪽 골대, 빨간 팀(AI 4+골키퍼) → 서쪽 골대.
import {S, save} from '../core/state.js';
import {G, paused} from '../core/runtime.js';
import {PLAYER_SCALE} from '../core/scale.js';
import {dist2} from '../core/util.js';
import {PITCH, KICKOFF, MATCH_SEC} from '../data/soccer.js';
import {animateWalk, blocky} from '../render/characters.js';
import {addHudLine, toast} from '../game/hud.js';
import {sfx} from '../audio/index.js';
import type {GameSystem, Interactable, Target} from '../core/types.js';

const {cx, cz, hl, hw, goalHalf: GH} = PITCH,
  BR = 0.9;
type Role = 'GK' | 'DF' | 'MF' | 'FW';
interface Pl {
  m: any;
  team: 0 | 1;
  role: Role;
  human: boolean;
  /** 홈 위치(자기 골대 기준 정규화): u = 0(자기 골)~1(상대 골), v = −1~1(좌우) */
  u: number;
  v: number;
  x: number;
  z: number;
  px: number;
  pz: number;
  cd: number;
}
interface Match {
  t: number;
  score: [number, number];
  phase: 'kickoff' | 'play' | 'goal' | 'end';
  pause: number;
  pls: Pl[];
  prevCam: number;
  prevPitch: number;
}
let ball: {m: any; x: number; z: number; vx: number; vz: number; y: number; vy: number; spin: number} | null = null,
  match: Match | null = null,
  spaceWas = false;

function ballMesh() {
  const g = new THREE.IcosahedronGeometry(BR, 1).toNonIndexed(),
    n = g.attributes.position.count,
    col = new Float32Array(n * 3);
  for (let f = 0; f < n / 3; f++) {
    const c = f % 5 === 0 ? 0.08 : 0.96;
    for (let k = 0; k < 9; k++) col[f * 9 + k] = c;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({vertexColors: true}));
  G.scene.add(m);
  return m;
}
function ensureBall() {
  if (!ball) ball = {m: ballMesh(), x: cx, z: cz, vx: 0, vz: 0, y: BR, vy: 0, spin: 0};
  return ball;
}
const goalX = (team: 0 | 1) => (team === 0 ? cx + hl : cx - hl); // team 이 공격하는 골대
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function kick(p: Pl, dx: number, dz: number, power: number) {
  const b = ball!,
    l = Math.hypot(dx, dz) || 1;
  b.vx = (dx / l) * power;
  b.vz = (dz / l) * power;
  b.vy = power > 14 ? power * 0.1 : 0;
  p.cd = 0.4;
  sfx('jump');
}
const homeOf = (p: Pl) => {
  const dir = p.team === 0 ? 1 : -1,
    own = cx - dir * hl;
  return {x: own + dir * p.u * 2 * hl, z: cz + p.v * (hw - 6)};
};
function resetKickoff() {
  const m = match!,
    b = ensureBall();
  b.x = cx;
  b.z = cz;
  b.vx = b.vz = b.vy = 0;
  b.y = BR;
  for (const p of m.pls) {
    const h = homeOf(p);
    p.x = p.human ? cx - 5 : p.team === 1 && p.role === 'FW' ? cx + 3 : h.x;
    p.z = p.human ? cz : p.team === 1 && p.role === 'FW' ? cz : h.z;
    if (p.team === 0 && !p.human && p.u > 0.45) p.x = Math.min(p.x, cx - 2);
    if (p.team === 1 && p.u > 0.45 && p.role !== 'FW') p.x = Math.max(p.x, cx + 2);
    p.px = p.x;
    p.pz = p.z;
    p.m.position.set(p.x, 0, p.z);
  }
  G.me.pos.set(cx - 5, 0, cz);
  m.phase = 'kickoff';
  m.pause = 1.2;
}
function startMatch() {
  if (match || G.inside || G.drive) return;
  const mk = (team: 0 | 1, role: Role, u: number, v: number, human = false): Pl => {
    const shirt = role === 'GK' ? 0x2fb5a0 : team === 0 ? 0x3b82f6 : 0xd23a4a,
      m = human ? G.me : blocky(shirt, team === 0 ? 0xeeeeee : 0x222233, ['#f4c8a0', '#c98e6b', '#8d5a3c'][Math.floor(Math.random() * 3)], PLAYER_SCALE);
    if (!human) G.scene.add(m);
    return {m, team, role, human, u, v, x: 0, z: 0, px: 0, pz: 0, cd: 0};
  };
  const pls = [
    mk(0, 'GK', 0.03, 0), mk(0, 'DF', 0.25, 0.5), mk(0, 'MF', 0.45, -0.5), mk(0, 'FW', 0.6, 0, true),
    mk(1, 'GK', 0.03, 0), mk(1, 'DF', 0.24, -0.55), mk(1, 'DF', 0.24, 0.55), mk(1, 'MF', 0.48, 0), mk(1, 'FW', 0.62, 0.3),
  ];
  match = {t: MATCH_SEC, score: [0, 0], phase: 'kickoff', pause: 1.2, pls, prevCam: G.camDist, prevPitch: G.pitch};
  G.match = true;
  G.camDist = 26;
  G.pitch = 0.95;
  resetKickoff();
  toast('⚽ 킥오프! 🔵 나의 팀 → 동쪽 골대 · Space 슛');
}
function endMatch(natural: boolean) {
  const m = match;
  if (!m) return;
  const [a, b] = m.score;
  m.pls.forEach(p => !p.human && (G.scene.remove(p.m), p.m.traverse((o: any) => o.geometry && o.geometry.dispose())));
  G.camDist = m.prevCam;
  G.pitch = m.prevPitch;
  G.match = false;
  match = null;
  if (natural) {
    const win = a > b,
      draw = a === b,
      prize = win ? 800 : draw ? 300 : 100;
    S.cr += prize;
    toast(`${win ? '🏆' : draw ? '🤝' : '😅'} ${a} : ${b} — ✦ +${prize}`, 4);
    sfx('buy');
    save();
  } else toast('⏹ 경기를 마쳤습니다');
}

function updateAI(m: Match, dt: number) {
  const b = ball!;
  const nearest = [0, 1].map(t => {
    let best: Pl | null = null,
      bd = 1e9;
    for (const p of m.pls) if (p.team === t && p.role !== 'GK' && !p.human) {
      const d = Math.hypot(p.x - b.x, p.z - b.z);
      if (d < bd) [best, bd] = [p, d];
    }
    return best;
  });
  for (const p of m.pls) {
    if (p.human) continue;
    p.px = p.x;
    p.pz = p.z;
    p.cd -= dt;
    const dir = p.team === 0 ? 1 : -1,
      home = homeOf(p);
    let tx = home.x,
      tz = home.z,
      spd = p.team === 1 ? 8.6 : 8;
    if (p.role === 'GK') {
      tx = cx - dir * (hl - 2.2);
      tz = cz + clamp(b.z - cz, -GH * 1.1, GH * 1.1);
      spd = 10;
      if (Math.hypot(p.x - b.x, p.z - b.z) < 2.4 && p.cd <= 0) kick(p, dir, (Math.random() - 0.5) * 0.9, 21);
    } else if (nearest[p.team] === p) {
      tx = b.x - dir * 0.5;
      tz = b.z;
      spd *= 1.1;
    } else {
      tx = home.x + (b.x - home.x) * 0.35;
      tz = home.z + (b.z - home.z) * 0.3;
    }
    const dx = tx - p.x,
      dz = tz - p.z,
      d = Math.hypot(dx, dz);
    if (d > 0.4) {
      p.x += (dx / d) * Math.min(d, spd * dt);
      p.z += (dz / d) * Math.min(d, spd * dt);
      p.m.rotation.y = Math.atan2(dx, dz);
    }
    // 공을 찬다: 골대 가까우면 슛, 아니면 앞 동료에게 패스/전진
    if (p.role !== 'GK' && p.cd <= 0 && Math.hypot(p.x - b.x, p.z - b.z) < 1.6) {
      const gx = goalX(p.team),
        toGoal = Math.abs(gx - p.x);
      if (toGoal < 36 && Math.random() < 0.85) kick(p, gx - b.x, cz + (Math.random() - 0.5) * GH * 1.5 - b.z, 24);
      else {
        const mate = m.pls.find(q => q.team === p.team && q !== p && q.role !== 'GK' && (q.x - p.x) * dir > 6 && Math.hypot(q.x - p.x, q.z - p.z) < 30);
        if (mate && Math.random() < 0.5) kick(p, mate.x - b.x, mate.z - b.z, 17);
        else kick(p, dir * 6, (cz - p.z) * 0.15 + (Math.random() - 0.5) * 3, 10);
      }
    }
  }
  // 겹침 밀어내기
  for (let i = 0; i < m.pls.length; i++)
    for (let j = i + 1; j < m.pls.length; j++) {
      const a = m.pls[i],
        c = m.pls[j],
        dx = c.x - a.x,
        dz = c.z - a.z,
        d = Math.hypot(dx, dz);
      if (d > 0 && d < 1.3) {
        const push = (1.3 - d) / 2;
        if (!a.human) [a.x, a.z] = [a.x - (dx / d) * push, a.z - (dz / d) * push];
        if (!c.human) [c.x, c.z] = [c.x + (dx / d) * push, c.z + (dz / d) * push];
      }
    }
  for (const p of m.pls) {
    if (p.human) continue;
    p.m.position.set(p.x, 0, p.z);
    animateWalk(p.m, performance.now() / 1000 * 8 + p.u * 10, false);
  }
}

function updateBall(dt: number, m: Match | null) {
  const b = ball!;
  // 사람(나): 접촉 드리블 / Space 슛
  const me = G.me,
    mv = dt > 0 ? [(me.pos.x - (me as any)._px || 0) / dt, (me.pos.z - (me as any)._pz || 0) / dt] : [0, 0];
  (me as any)._px = me.pos.x;
  (me as any)._pz = me.pos.z;
  const sp = G.keys.Space && !spaceWas;
  spaceWas = !!G.keys.Space;
  const d = Math.hypot(me.pos.x - b.x, me.pos.z - b.z);
  const pl = m?.pls.find(p => p.human);
  if (pl) pl.cd -= dt;
  if (d < 2.6 && sp && !G.drive) {
    const ry = me.rotation.y;
    b.vx = Math.sin(ry) * 28;
    b.vz = Math.cos(ry) * 28;
    b.vy = 3;
    sfx('jump');
  } else if (d < 1.5 && !G.drive) {
    const sp2 = Math.hypot(mv[0], mv[1]);
    if (sp2 > 1) {
      const nx = (b.x - me.pos.x) / (d || 1),
        nz = (b.z - me.pos.z) / (d || 1);
      b.vx += (mv[0] * 1.15 + nx * 3 - b.vx) * 0.6;
      b.vz += (mv[1] * 1.15 + nz * 3 - b.vz) * 0.6;
    }
  }
  b.x += b.vx * dt;
  b.z += b.vz * dt;
  const f = Math.exp(-1.15 * dt);
  b.vx *= f;
  b.vz *= f;
  b.vy -= 22 * dt;
  b.y += b.vy * dt;
  if (b.y < BR) {
    b.y = BR;
    b.vy = Math.abs(b.vy) > 2 ? -b.vy * 0.45 : 0;
  }
  // 경계: 옆줄은 튕김, 끝줄은 골대 입구만 열림
  if (b.z < cz - hw + BR) [b.z, b.vz] = [cz - hw + BR, Math.abs(b.vz) * 0.7];
  if (b.z > cz + hw - BR) [b.z, b.vz] = [cz + hw - BR, -Math.abs(b.vz) * 0.7];
  const inMouth = Math.abs(b.z - cz) < GH - 0.3;
  for (const s of [-1, 1]) {
    const lim = cx + s * hl;
    if (s * (b.x - lim) > 0) {
      if (inMouth && s * (b.x - lim) < PITCH.goalDepth) {
        if (m && m.phase === 'play' && s * (b.x - lim) > BR * 0.5) goal(m, s > 0 ? 0 : 1);
        else if (!m && s * (b.x - lim) > PITCH.goalDepth - 0.5) [b.x, b.vx] = [lim + s * (PITCH.goalDepth - 0.5), -b.vx * 0.3];
      } else if (!inMouth || s * (b.x - lim) >= PITCH.goalDepth) [b.x, b.vx] = [lim - s * BR * 0.2 + s * (inMouth ? PITCH.goalDepth - 0.5 : 0), -b.vx * 0.6];
    }
  }
  b.m.position.set(b.x, b.y, b.z);
  b.m.rotation.x += b.vz * dt * 0.5;
  b.m.rotation.z -= b.vx * dt * 0.5;
}
function goal(m: Match, scorer: 0 | 1) {
  m.score[scorer]++;
  m.phase = 'goal';
  m.pause = 2.2;
  toast(`⚽ GOAL! ${scorer === 0 ? '🔵' : '🔴'}  ${m.score[0]} : ${m.score[1]}`, 2);
  sfx('buy');
}

export const soccerSystem: GameSystem = {
  id: 'soccer',
  update(dt) {
    if (paused() && !match) return;
    const near = dist2(G.me.pos, KICKOFF) < 80 || !!match;
    if (!near) return;
    ensureBall();
    if (paused()) return;
    if (match) {
      const m = match;
      // 사람은 경기장 둘레 안에 가둔다
      G.me.pos.x = clamp(G.me.pos.x, cx - hl - 3, cx + hl + 3);
      G.me.pos.z = clamp(G.me.pos.z, cz - hw - 3, cz + hw + 3);
      const hp = m.pls.find(p => p.human)!;
      hp.x = G.me.pos.x;
      hp.z = G.me.pos.z;
      if (m.phase === 'kickoff') {
        if ((m.pause -= dt) <= 0) m.phase = 'play';
        updateBall(dt, m);
        return;
      }
      if (m.phase === 'goal') {
        if ((m.pause -= dt) <= 0) resetKickoff();
        updateBall(dt, m);
        return;
      }
      if ((m.t -= dt) <= 0) {
        endMatch(true);
        return;
      }
      updateAI(m, dt);
      updateBall(dt, m);
    } else updateBall(dt, null);
  },
};

interface SoccerT extends Target {
  kind: 'soccer';
}
export const soccerIt: Interactable<SoccerT> = {
  kind: 'soccer',
  tier: 0,
  find(me) {
    if (G.inside || G.drive) return null;
    if (match) return {kind: 'soccer', d: 0.4};
    const d = dist2(me.pos, KICKOFF);
    return d < 4.5 ? {kind: 'soccer', d} : null;
  },
  info: () => (match ? '<b>⚽ 경기 중</b>' : '<b>⚽ 축구</b><br>🔵 → 동쪽 골대 · 방향키 이동 · Space 슛'),
  prompt: () => (match ? 'E ⏹ 경기 종료' : 'E ⚽ 경기 시작'),
  act(_t, key) {
    if (key !== 'e') return;
    if (match) endMatch(false);
    else startMatch();
  },
};
addHudLine(() => {
  if (!match) return null;
  const t = Math.max(0, Math.ceil(match.t));
  return `⚽ 🔵 ${match.score[0]} : ${match.score[1]} 🔴  ⏱ ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
});
