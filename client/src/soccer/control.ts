// 사람 조작 (FC 온라인 키보드): 방향키 이동 · Shift 달리기 · 공격 S 패스 / A 로빙패스 / W 스루패스 / D 슛(꾹 눌러 게이지) / Z+D 감아차기 (패스는 보는 방향 동료에게 거리별 세기) / Space 보호(쉴드)
// 수비 A 선수 교체 / S 압박(꾹) / D 태클 / Space 슬라이딩. 공을 받거나 뺏으면 그 선수로 자동 전환.
import {G} from '../core/runtime.js';
import {GH, M, atkX, ball, clamp, cx, cz, dir, dist, toGoal, type Pl} from './state.js';
import {groundPass, lobPass, pickMate, shoot} from './actions.js';
import {tackle} from './rules.js';
import {moveTo, steer} from './team.js';

let prev: Record<string, boolean> = {},
  gauge = 0,
  charging = false;
export const shotGauge = () => (charging ? gauge : 0);
const down = (c: string) => !!G.keys[c];
const edge = (c: string) => down(c) && !prev[c];

function input() {
  let x = (down('ArrowRight') ? 1 : 0) - (down('ArrowLeft') ? 1 : 0) + G.joy.x,
    z = (down('ArrowDown') ? 1 : 0) - (down('ArrowUp') ? 1 : 0) - G.joy.y;
  // WASD 중 이동용은 쓰지 않는다 (A/S/D/W 는 동작 키)
  return {x, z, l: Math.hypot(x, z)};
}
function switchTo(near: Pl) {
  if (M && near !== M.ctl) M.ctl = near;
}
function nearestToBall(): Pl | null {
  const m = M!;
  let b: Pl | null = null,
    bd = 1e9;
  for (const p of m.pls) if (p.team === 0 && !p.off && p.role !== 'GK') {
    const d = dist(p, ball);
    if (d < bd) [b, bd] = [p, d];
  }
  return b;
}
let swT = 0;
export function humanUpdate(dt: number) {
  const m = M!,
    p = m.ctl,
    inp = input(),
    ph = m.phase;
  const frozen = ph === 'goal' || ph === 'half' || ph === 'end';
  const takeKick = ph === 'restart' && m.restart?.taker === p;
  const mine = ball.owner === p || takeKick;
  p.shield = false;
  // 자동 전환: 상대가 공을 가졌거나 공이 자유로우면 가장 가까운 선수로
  swT -= dt;
  if (!frozen && !mine && swT <= 0) {
    swT = 0.25;
    const n = nearestToBall();
    if (n && dist(n, ball) + (ball.owner && ball.owner.team === 0 ? 99 : 2.2) < dist(p, ball)) switchTo(n);
  }
  if (frozen) {
    steer(p, 0, 0, false, dt);
  } else if (takeKick) {
    steer(p, 0, 0, false, dt); // 재개 때는 제자리에서 방향만 정한다
    if (inp.l > 0.1) p.ry = Math.atan2(inp.x, inp.z);
  } else if (!mine && ball.owner && ball.owner.team === 1 && down('KeyS')) {
    moveTo(p, ball.owner.x, ball.owner.z, down('ShiftLeft') || down('ShiftRight'), dt, 1.0, 0.2); // 압박
  } else {
    if (down('Space') && mine) p.shield = true;
    steer(p, inp.x, inp.z, down('ShiftLeft') || down('ShiftRight'), dt, p.shield ? 0.75 : 1);
  }
  if (!frozen) {
    if (mine) {
      const fx = inp.l > 0.1 ? inp.x : Math.sin(p.ry),
        fz = inp.l > 0.1 ? inp.z : Math.cos(p.ry);
      // 패스류는 모두 '보고 있는 방향'의 동료에게, 거리에 맞는 세기로. S 땅볼 패스 · A 로빙 · W 스루
      if (edge('KeyS')) {
        const q = pickMate(p, fx, fz);
        if (q) groundPass(p, q.x + q.vx * 0.3, q.z + q.vz * 0.3);
        else groundPass(p, p.x + fx * 12, p.z + fz * 12);
      } else if (edge('KeyA')) {
        const q = pickMate(p, fx, fz);
        if (q) lobPass(p, q.x + q.vx * 0.4, q.z + q.vz * 0.4);
        else if (toGoal(p) < 34) lobPass(p, atkX(0) - dir(0) * 8, cz + clamp(fz * 5, -8, 8), fz * 0.8);
        else lobPass(p, p.x + fx * 24, p.z + fz * 24);
      } else if (edge('KeyW')) {
        const q = pickMate(p, fx, fz, true) || pickMate(p, fx, fz);
        if (q) {
          const rl = Math.hypot(q.vx, q.vz);
          const lx = rl > 1 ? q.vx / rl : dir(0),
            lz = rl > 1 ? q.vz / rl : 0;
          groundPass(p, q.x + lx * 8 + dir(0) * 3, q.z + lz * 8); // 달리는 앞 공간으로
        } else groundPass(p, p.x + fx * 18, p.z + fz * 18);
      }
      if (edge('KeyD')) [charging, gauge] = [true, 0];
      if (charging && down('KeyD')) gauge = Math.min(1, gauge + dt / 1.05);
      if (charging && !down('KeyD')) {
        charging = false;
        // 방향이 대충 골대 쪽이면 골문 안쪽 구석(키퍼 반대편, 입력이 있으면 그쪽)으로 보낸다
        const gx = atkX(0) - p.x,
          gz = cz - p.z,
          cosg = (fx * gx + fz * gz) / (Math.hypot(fx, fz) * Math.hypot(gx, gz) || 1);
        const gk = M!.pls.find(q => q.team === 1 && q.role === 'GK'),
          side = Math.abs(inp.z) > 0.3 ? Math.sign(inp.z) : gk && gk.z !== cz ? (gk.z > cz ? -1 : 1) : Math.sign(p.z - cz) || 1;
        const aim = cosg > 0.5 ? cz + side * GH * 0.8 : cz + clamp(inp.z * GH * 0.78, -GH * 0.85, GH * 0.85);
        const g = Math.max(0.18, gauge);
        if (down('KeyZ')) shoot(p, cz + side * GH * 0.7, Math.max(0.5, g), 0.8, side as 1 | -1);
        else shoot(p, aim, g);
        gauge = 0;
      }
    } else {
      charging = false;
      gauge = 0;
      if (edge('KeyA')) {
        const n = nearestToBall();
        if (n) switchTo(n);
      }
      if (edge('KeyD')) {
        // 공이 가까우면 걷어내기/슛, 아니면 서서 태클
        if (!ball.owner && dist(p, ball) < 2.6) shoot(p, cz, 0.6, 1.5);
        else tackle(p, false);
      }
      if (edge('Space')) tackle(p, true);
      if (!ball.owner && dist(p, ball) < 2.6) {
        if (edge('KeyS')) groundPass(p, p.x + Math.sin(p.ry) * 14, p.z + Math.cos(p.ry) * 14);
        if (edge('KeyW')) lobPass(p, p.x + Math.sin(p.ry) * 26, p.z + Math.cos(p.ry) * 26);
      }
    }
  }
  prev = {};
  for (const c of ['KeyA', 'KeyS', 'KeyD', 'KeyW', 'Space']) prev[c] = down(c);
  // 재개를 오래 방치하면 자동으로 가까운 동료에게 (사람 팀)
  if (m.restart && m.restart.team === 0 && m.restart.wait <= 0 && takeKick) {
    if (m.restart.kind === 'penalty') shoot(p, cz + (Math.random() < 0.5 ? -1 : 1) * GH * 0.6, 0.7);
    else {
      const q = pickMate(p, Math.sin(p.ry), Math.cos(p.ry));
      if (q) groundPass(p, q.x, q.z);
      else groundPass(p, p.x + dir(0) * 10, p.z);
    }
  }
  void cx;
}
