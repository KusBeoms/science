// 패스·스루·크로스·슛 (사람과 AI 공용). 공은 마찰로 줄어들어 거리 ≈ 초기속도, 뜬 공은 체공 시간으로 속도를 정한다.
import {GH, M, ball, clamp, cz, atkX, dir, dist, type Pl} from './state.js';
import {kickBall} from './ball.js';
import {markPass} from './rules.js';

/** 지면 패스: (tx,tz) 로 굴린다 */
export function groundPass(p: Pl, tx: number, tz: number) {
  const d = Math.hypot(tx - ball.x, tz - ball.z);
  markPass(p);
  kickBall(p, tx - ball.x, tz - ball.z, clamp(d * 1.05 + 4, 9, 32), 0);
}
/** 띄운 패스/크로스: 체공 시간으로 도착 속도를 맞춘다 */
export function lobPass(p: Pl, tx: number, tz: number, spin = 0) {
  const d = Math.hypot(tx - ball.x, tz - ball.z),
    vy = clamp(6 + d * 0.2, 7, 15),
    T = (2 * vy) / 26;
  markPass(p);
  kickBall(p, tx - ball.x, tz - ball.z, clamp((d / T) * 1.03, 10, 44), vy, spin);
}
/** 슛: aimZ = 골문 안 목표 z, gauge 0~1 (0.5~0.85 가 정확) */
export function shoot(p: Pl, aimZ: number, gauge: number, jitter = 1) {
  const err = Math.abs(gauge - 0.68) * jitter,
    z = aimZ + (Math.random() - 0.5) * err * GH * 2.6,
    power = 17 + 27 * gauge,
    over = gauge > 0.95 && Math.random() < 0.65;
  const lift = over ? 11 : gauge > 0.8 ? 4 + Math.random() * 3 : gauge > 0.5 ? 1.5 : 0.2;
  const gx = atkX(p.team);
  ball.passTeam = -1;
  kickBall(p, gx - ball.x, z - ball.z, power, lift, (Math.random() - 0.5) * 2.2 * gauge);
  if (M) M.shots[p.team]++;
}
/** 후보 중 입력 방향과 가장 잘 맞고 열려 있는 동료 */
export function pickMate(p: Pl, dx: number, dz: number, forwardOnly = false): Pl | null {
  const m = M!;
  let best: Pl | null = null,
    bs = -1e9;
  const l = Math.hypot(dx, dz) || 1;
  for (const q of m.pls) {
    if (q === p || q.team !== p.team || q.off) continue;
    const vx = q.x - p.x,
      vz = q.z - p.z,
      d = Math.hypot(vx, vz);
    if (d < 3) continue;
    const cos = Math.hypot(dx, dz) > 0.1 ? (vx * dx + vz * dz) / (d * l) : (vx * dir(p.team)) / d;
    if (cos < 0.25) continue;
    if (forwardOnly && vx * dir(p.team) < 2) continue;
    let open = 0;
    for (const o of m.pls) {
      if (o.team === p.team || o.off) continue;
      const t = clamp(((o.x - p.x) * vx + (o.z - p.z) * vz) / (d * d), 0, 1),
        px = p.x + vx * t,
        pz = p.z + vz * t;
      if (Math.hypot(o.x - px, o.z - pz) < 2.6) open -= 1.2;
    }
    const sc = cos * 2 + open - d / 45 + (q.role === 'GK' ? -1.5 : 0);
    if (sc > bs) [best, bs] = [q, sc];
  }
  return best;
}
export const nearestOpp = (p: Pl): Pl | null => {
  let b: Pl | null = null,
    bd = 1e9;
  for (const o of M!.pls) if (o.team !== p.team && !o.off) {
    const d = dist(o, p);
    if (d < bd) [b, bd] = [o, d];
  }
  return b;
};
export const centerZ = cz;
