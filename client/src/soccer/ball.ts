// 공: 메시 · 물리(마찰·바운스·커브) · 소유(드리블은 공이 발 앞에 붙는다) · 차기
import {G} from '../core/runtime.js';
import {sfx} from '../audio/index.js';
import {BR, M, ball, clamp, cx, cz, hl, hw, GD, type Pl} from './state.js';

export function ensureBall() {
  if (ball.m) return ball;
  const g = new THREE.IcosahedronGeometry(BR, 1).toNonIndexed(),
    n = g.attributes.position.count,
    col = new Float32Array(n * 3);
  for (let f = 0; f < n / 3; f++) {
    const c = f % 5 === 0 ? 0.08 : 0.96;
    for (let k = 0; k < 9; k++) col[f * 9 + k] = c;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  ball.m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({vertexColors: true}));
  G.scene.add(ball.m);
  ball.x = cx;
  ball.z = cz;
  return ball;
}
export function placeBall(x: number, z: number) {
  ball.x = x;
  ball.z = z;
  ball.y = BR;
  ball.vx = ball.vy = ball.vz = ball.spin = 0;
  ball.owner = null;
}
/** p 가 공을 찬다: (dx,dz) 방향, power(u/s), lift = 위로 뜨는 속도, spin = 커브(rad/s) */
export function kickBall(p: Pl | null, dx: number, dz: number, power: number, lift = 0, spin = 0) {
  const l = Math.hypot(dx, dz) || 1;
  ball.vx = (dx / l) * power;
  ball.vz = (dz / l) * power;
  ball.vy = lift;
  ball.spin = spin;
  ball.y = Math.max(ball.y, BR + 0.05);
  ball.owner = null;
  if (p) {
    ball.last = p;
    p.cd = 0.35;
    if (M?.phase === 'restart' && M.restart?.taker === p) {
      M.phase = 'play';
      M.restart = null;
    }
    if (M?.phase === 'kickoff') M.pause = Math.min(M.pause, 0);
  }
  sfx('kick');
}
export function stepBall(dt: number) {
  const o = ball.owner;
  if (o) {
    // 드리블: 공이 발 앞(달리면 조금 더 앞)에 붙어 있다
    const off = 0.85 + (o.sprint ? 0.3 : 0) + Math.min(0.25, Math.hypot(o.vx, o.vz) * 0.02);
    ball.x += (o.x + Math.sin(o.ry) * off - ball.x) * Math.min(1, dt * 26);
    ball.z += (o.z + Math.cos(o.ry) * off - ball.z) * Math.min(1, dt * 26);
    ball.y = BR + Math.abs(Math.sin(performance.now() / 90)) * 0.12 * Math.min(1, Math.hypot(o.vx, o.vz) / 8);
    ball.vx = o.vx;
    ball.vz = o.vz;
    ball.vy = 0;
    ball.last = o;
  } else {
    if (ball.spin && ball.y > BR + 0.3) {
      const a = ball.spin * dt,
        c = Math.cos(a),
        s = Math.sin(a);
      [ball.vx, ball.vz] = [ball.vx * c - ball.vz * s, ball.vx * s + ball.vz * c];
    }
    ball.x += ball.vx * dt;
    ball.z += ball.vz * dt;
    ball.vy -= 26 * dt;
    ball.y += ball.vy * dt;
    const air = ball.y > BR + 0.15;
    const f = Math.exp(-(air ? 0.12 : 1.0) * dt);
    ball.vx *= f;
    ball.vz *= f;
    if (ball.y < BR) {
      ball.y = BR;
      ball.vy = Math.abs(ball.vy) > 3 ? -ball.vy * 0.5 : 0;
      ball.spin *= 0.5;
    }
  }
  // 그물 안쪽 끝
  const gx = Math.abs(ball.x - cx) - (hl + GD);
  if (gx > 0) {
    ball.x = cx + Math.sign(ball.x - cx) * (hl + GD);
    ball.vx *= -0.15;
  }
  ball.z = clamp(ball.z, cz - hw - 12, cz + hw + 12);
  ball.m.position.set(ball.x, ball.y, ball.z);
  ball.m.rotation.x += ball.vz * dt * 0.5;
  ball.m.rotation.z -= ball.vx * dt * 0.5;
}
