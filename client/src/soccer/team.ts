// 팀 구성(7대7)·포메이션·선수 이동/체력/충돌·애니메이션·조작 선수 표시
import {uniform} from '../render/uniform.js';
import {G} from '../core/runtime.js';
import {PLAYER_SCALE} from '../core/scale.js';
import {animateWalk, blocky} from '../render/characters.js';
import {M, ball, clamp, cx, cz, defX, dir, hl, hw, wrap, type Pl, type Role} from './state.js';

const FORM: [Role, number, number][] = [
  ['GK', 0.03, 0], ['LB', 0.22, -0.6], ['RB', 0.22, 0.6], ['CM', 0.42, 0], ['LW', 0.62, -0.7], ['RW', 0.62, 0.7], ['ST', 0.74, 0],
];
const SKIN = ['#f4c8a0', '#c98e6b', '#8d5a3c', '#e8b090'];
export function makeTeam(team: 0 | 1): Pl[] {
  return FORM.map(([role, u, v], i) => {
    const shirt = role === 'GK' ? (team ? 0xf5b73a : 0x2fb5a0) : team === 0 ? 0x3b82f6 : 0xd23a4a,
      m = blocky(shirt, team === 0 ? 0xf2f2f2 : 0x2a2230, SKIN[(i + team) % 4], PLAYER_SCALE);
    uniform(m, 'player', i + 1);
    m.rotation.order = 'YXZ';
    G.scene.add(m);
    return {m, team, role, u, v: team ? -v : v, x: 0, z: 0, vx: 0, vz: 0, ry: team ? -Math.PI / 2 : Math.PI / 2, stam: 100, cd: 0, down: 0, slide: 0, tackleCd: 0, think: Math.random() * 0.3, sprint: false, shield: false, yellow: 0, off: false, dive: 0, hold: 0, tx: 0, tz: 0};
  });
}
export const homeOf = (p: Pl) => ({x: defX(p.team) + dir(p.team) * p.u * 2 * hl, z: cz + p.v * (hw - 5)});
export function disposeTeam(pls: Pl[]) {
  pls.forEach(p => {
    G.scene.remove(p.m);
    p.m.traverse((o: any) => o.geometry && o.geometry.dispose());
  });
}
/** 킥오프 대형: 자기 진영에 서고 킥오프 팀 ST 는 센터에 선다 */
export function lineup(pls: Pl[], kickTeam: 0 | 1) {
  for (const p of pls) {
    const h = homeOf(p);
    p.x = dir(p.team) > 0 ? Math.min(h.x, cx - 2) : Math.max(h.x, cx + 2);
    p.z = h.z;
    if (p.team === kickTeam && p.role === 'ST') [p.x, p.z] = [cx - dir(p.team) * 0.8, cz];
    if (p.team === kickTeam && p.role === 'CM') [p.x, p.z] = [cx - dir(p.team) * 6, cz + 4];
    p.vx = p.vz = 0;
    p.down = p.slide = 0;
    p.ry = p.team ? -Math.PI / 2 : Math.PI / 2;
  }
}
/** p 를 (dx,dz) 방향으로 달리게 한다 (정규화 안 된 입력도 허용, 크기 > 0 이면 이동) */
export function steer(p: Pl, dx: number, dz: number, sprint: boolean, dt: number, rate = 1) {
  const l = Math.hypot(dx, dz);
  p.sprint = sprint && p.stam > 4 && l > 0.1;
  if (p.down > 0 || p.slide > 0) return;
  const fat = 0.8 + 0.2 * (p.stam / 100),
    sp = (p.sprint ? 12.2 : 8.4) * fat * (ball.owner === p ? 0.94 : 1) * rate;
  const wx = l > 0.05 ? (dx / l) * sp : 0,
    wz = l > 0.05 ? (dz / l) * sp : 0,
    k = Math.min(1, dt * (l > 0.05 ? 9 : 6));
  p.vx += (wx - p.vx) * k;
  p.vz += (wz - p.vz) * k;
  if (l > 0.05) p.ry += wrap(Math.atan2(dx, dz) - p.ry) * Math.min(1, dt * 12);
}
export function moveTo(p: Pl, tx: number, tz: number, sprint: boolean, dt: number, rate = 1, stop = 0.4) {
  const dx = tx - p.x,
    dz = tz - p.z;
  steer(p, Math.hypot(dx, dz) < stop ? 0 : dx, Math.hypot(dx, dz) < stop ? 0 : dz, sprint, dt, rate);
}
/** 위치 적분 + 체력 + 서로 밀기 + 모양 갱신 */
export function integrate(pls: Pl[], dt: number) {
  for (const p of pls) {
    if (p.off) continue;
    p.cd -= dt;
    p.tackleCd -= dt;
    if (p.down > 0) {
      p.down -= dt;
      p.vx *= Math.exp(-4 * dt);
      p.vz *= Math.exp(-4 * dt);
    }
    if (p.slide > 0) {
      p.slide -= dt;
      p.vx *= Math.exp(-2.2 * dt);
      p.vz *= Math.exp(-2.2 * dt);
      if (p.slide <= 0) p.down = Math.max(p.down, 0.45);
    }
    p.stam = clamp(p.stam + (p.sprint ? -22 : 7) * dt, 0, 100);
    p.x = clamp(p.x + p.vx * dt, cx - hl - 6, cx + hl + 6);
    p.z = clamp(p.z + p.vz * dt, cz - hw - 6, cz + hw + 6);
  }
  for (let i = 0; i < pls.length; i++)
    for (let j = i + 1; j < pls.length; j++) {
      const a = pls[i],
        b = pls[j];
      if (a.off || b.off) continue;
      const dx = b.x - a.x,
        dz = b.z - a.z,
        d = Math.hypot(dx, dz);
      if (d > 0 && d < 1.5) {
        const k = (1.5 - d) / 2;
        a.x -= (dx / d) * k;
        a.z -= (dz / d) * k;
        b.x += (dx / d) * k;
        b.z += (dz / d) * k;
      }
    }
  const t = performance.now() / 1000;
  for (const p of pls) {
    p.m.visible = !p.off;
    if (p.off) continue;
    p.m.position.set(p.x, 0, p.z);
    p.m.rotation.y = p.ry;
    const sp = Math.hypot(p.vx, p.vz);
    p.m.rotation.x = p.slide > 0 ? -1.15 : p.down > 0 ? -1.45 : p.dive > 0 ? 0 : 0;
    p.m.rotation.z = p.dive > 0 ? Math.sign(p.tx) * 1.2 : 0;
    p.m.position.y = p.slide > 0 ? 0.5 : p.down > 0 ? 0.6 : 0;
    animateWalk(p.m, t * sp * 0.22 + p.u * 9, ball.owner === p);
  }
}
/** 조작 선수 머리 위 화살표 */
export function markerOf(): any {
  const g = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.4, 4), new THREE.MeshBasicMaterial({color: 0x45c8e8}));
  g.rotation.x = Math.PI;
  G.scene.add(g);
  return g;
}
export function placeMarker() {
  if (!M) return;
  const p = M.ctl;
  M.marker.visible = !p.off;
  M.marker.position.set(p.x, 4.6 + Math.sin(performance.now() / 150) * 0.25, p.z);
  M.marker.rotation.y += 0.05;
}
