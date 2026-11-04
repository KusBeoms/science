// 매 프레임: 시간/성장/밤낮 → 이동·점프 → 수호자 → 라이벌 → 대상 탐색 → 카메라/렌더 → HUD
import {S, income, dexN} from '../core/state.js';
import {G, paused} from '../core/runtime.js';
import {$, clamp, dist2, fmt, setTxt} from '../core/util.js';
import {LAY, nests, stepLayout} from '../core/layout.js';
import {blockedAt, inTile, locked, onGround, zoneAt} from '../core/geometry.js';
import {GROW, P, pickFrom} from '../data/planets.js';
import {SPR} from '../data/shop.js';
import {SH, Z} from '../data/zones.js';
import {animateWalk} from '../render/characters.js';
import {GGLOW} from '../render/guardian.js';
import {syncPlanets} from '../render/sync.js';
import {caught, deposit, respawn} from '../game/actions.js';
import {flash, toast} from '../game/hud.js';
import {missionTick} from '../game/missions.js';
import {hazards, gravityNow} from './hazards.js';
import {updateRival} from './rival.js';
import {updateTarget} from './target.js';

let stamEl: HTMLElement | null = null,
  stamW = '',
  stamT = false;
function setStam(w: string, tired: boolean) {
  const sb = stamEl || (stamEl = $('#stam'));
  if (stamW !== w) {
    stamW = w;
    sb.style.width = w;
  }
  if (stamT !== tired) {
    stamT = tired;
    sb.classList.toggle('tired', tired);
  }
}
export function frame() {
  requestAnimationFrame(frame);
  const raw = Math.min(0.05, G.clock.getDelta()),
    t = G.clock.elapsedTime,
    dt = paused() ? 0 : raw;
  G.curZone = zoneAt();
  const tdil = G.curZone === 2 ? 3 : 1;
  const inc = income();
  S.cr += inc * dt * tdil;
  LAY.forEach(l => stepLayout(l, dt));
  nests.forEach(n => {
    n.t.forEach((v, k) => {
      if (v > 0 && v < 1e8 && (n.t[k] -= dt) <= 0) n.t[k] = 0;
      if (n.cd[k] > 0) n.cd[k] -= dt;
    });
  });
  G.cycT += dt;
  if (G.night > 0) {
    G.night -= dt;
    if (G.night <= 0) {
      G.night = 0;
      toast('☀️ 아침 — 둥지가 새로 채워졌다');
    }
  } else if (G.cycT >= 300) {
    G.cycT = 0;
    G.night = 12;
    toast('🌙 밤! 성장 ×30 · 둥지 리셋', 3);
    flash('#112', 0.55);
    nests.forEach((n, zi) =>
      n.s.forEach((_, k) => {
        if (!G.carry.some(c => c.z === zi && c.k === k)) {
          n.s[k] = pickFrom(Z[zi].pool);
          n.t[k] = 0;
        }
      })
    );
  }
  S.base.forEach(o => {
    if (!o) return;
    if (o.left > 0) o.left -= dt * tdil * (G.night > 0 ? 30 : 1);
  });
  // 이동
  const f = [-Math.sin(G.yaw), -Math.cos(G.yaw)],
    rt = [Math.cos(G.yaw), -Math.sin(G.yaw)];
  let mx = 0,
    mz = 0;
  if (G.keys.KeyW || G.keys.ArrowUp) {
    mx += f[0];
    mz += f[1];
  }
  if (G.keys.KeyS || G.keys.ArrowDown) {
    mx -= f[0];
    mz -= f[1];
  }
  if (G.keys.KeyD || G.keys.ArrowRight) {
    mx += rt[0];
    mz += rt[1];
  }
  if (G.keys.KeyA || G.keys.ArrowLeft) {
    mx -= rt[0];
    mz -= rt[1];
  }
  mx += rt[0] * G.joy.x + f[0] * G.joy.y;
  mz += rt[1] * G.joy.x + f[1] * G.joy.y;
  if (paused()) {
    mx = 0;
    mz = 0;
  }
  let spd = 14 + 1.5 * S.spd + SPR[S.eq][4];
  if (G.carry.length) spd /= 1 + G.carry.reduce((a, c) => a + Math.min(120, P[c.id].ve), 0) / 220;
  const ml = Math.hypot(mx, mz),
    moving = ml > 0.05 && !paused();
  const wantRun = (G.keys.ShiftLeft || G.keys.ShiftRight || G.runHeld) && moving;
  if (wantRun && !G.tired && G.stam > 0) {
    spd *= 1.7;
    G.stam -= 20 * dt;
    if (G.stam <= 0) {
      G.stam = 0;
      G.tired = true;
    }
  } else {
    G.stam = Math.min(100, G.stam + (moving ? 10 : 20) * dt);
    if (G.tired && G.stam >= 30) G.tired = false;
  }
  setStam(Math.round(G.stam) + '%', G.tired);
  const hold = G.carry.length > 0;
  if (moving) {
    mx /= ml;
    mz /= ml;
    const ox = G.me.pos.x,
      oz = G.me.pos.z,
      nx = ox + mx * spd * dt,
      nz = oz + mz * spd * dt;
    if (!blockedAt(nx, nz)) {
      G.me.pos.x = nx;
      G.me.pos.z = nz;
    } else if (!blockedAt(nx, oz)) G.me.pos.x = nx;
    else if (!blockedAt(ox, nz)) G.me.pos.z = nz;
    G.me.rotation.y = Math.atan2(mx, mz);
    animateWalk(G.me, t * spd * 0.22, hold);
  } else animateWalk(G.me, 0, hold);
  const gnd = onGround(G.me.pos.x, G.me.pos.z);
  if (!paused() && (G.keys.Space || G.jumpHeld) && G.me.pos.y <= 0.02 && gnd) {
    G.me.vy = 14 * SPR[S.eq][3];
  }
  const prevY = G.me.pos.y;
  if (dt > 0) {
    G.me.vy -= 34 * gravityNow() * dt;
    G.me.pos.y += G.me.vy * dt;
  }
  if (gnd && G.me.pos.y < 0 && prevY > -1.2 && G.me.vy <= 0) {
    G.me.pos.y = 0;
    G.me.vy = 0;
  } // 이전 프레임 높이로 판정 — 저프레임·높은 점프에서 바닥을 뚫지 않게
  if (G.me.pos.y < -45) respawn();
  // 스프링 장식 애니메이션
  if (G.springGrp) {
    const a = G.springGrp.userData;
    if (a.orb) a.orb.rotation.y += raw * 3;
    if (a.flame) {
      a.flame.scale.y = 1 + Math.sin(t * 20) * 0.25;
      a.flame.position.y = 0.3 + Math.sin(t * 20) * 0.08;
    }
    if (a.rainbow) a.rainbow.forEach((m: any, i: number) => m.color.setHSL((t * 0.5 + i * 0.3) % 1, 0.9, 0.6));
  }
  if (G.decoGrp.userData.spin) G.decoGrp.userData.spin.rotation.y += raw;
  hazards(dt);
  // 문 표시
  G.gates.forEach((g, zi) => {
    const lk = locked(zi);
    g.panel.visible = lk;
    const next = zi === S.zone;
    g.gl.userData.txt !== `${lk ? next : 'o'}${zi}` &&
      ((g.gl.userData.txt = `${lk ? next : 'o'}${zi}`),
      g.gl.userData.setText(
        lk ? (next ? `🔒 ${zi + 1}단계 시험 — E` : `🔒 ${zi + 1}단계`) : `🔓 ${zi + 1}단계`,
        lk ? '#ff8aa0' : '#9dffb0'
      ));
  });
  // 수호자
  G.guards.forEach((g, zi) => {
    const z = Z[zi],
      gp = g.m.position;
    g.chase = inTile(G.me.pos.x, G.me.pos.z, z.z, 3, SH) && !locked(zi); // 행성 유무와 상관없이, 자기 구역에 들어온 플레이어를 쫓는다
    const tg = g.chase ? G.me.pos : g.home,
      dx = tg.x - gp.x,
      dz = tg.z - gp.z,
      d = Math.hypot(dx, dz);
    if (d > 0.8 && dt > 0) {
      gp.x += (dx / d) * z.gs * dt;
      gp.z += (dz / d) * z.gs * dt;
      gp.x = clamp(gp.x, -SH + 1, SH - 1);
      gp.z = clamp(gp.z, z.z - SH + 1, z.z + SH - 1);
      g.m.rotation.y = Math.atan2(dx, dz);
      animateWalk(g.m, t * z.gs * 0.22);
    } else if (d <= 0.8) animateWalk(g.m, 0);
    const gu = g.m.userData,
      hot = new THREE.Color(GGLOW[zi]).lerp(new THREE.Color(0xffffff), g.chase ? 0.55 : 0);
    gu.eyes.color.copy(hot);
    gu.glow.color.copy(hot);
    gu.aura.scale.setScalar(1 + Math.sin(t * 3 + zi) * 0.06);
    gu.aura.material.opacity = g.chase ? 0.9 : 0.5;
    if (g.chase && dist2(G.me.pos, gp) < 3 && G.me.pos.y < 3.2 && dt > 0) caught();
  });
  if (G.carry.length && inTile(G.me.pos.x, G.me.pos.z, 0, -1)) deposit();
  updateRival(dt);
  syncPlanets(t);
  G.npc.position.y = Math.abs(Math.sin(t * 2)) * 0.12;
  G.npc.rotation.y = Math.sin(t * 0.7) * 0.3;
  updateTarget(raw);
  // 카메라
  if (!G.started) G.yaw += raw * 0.12;
  const cp = Math.cos(G.pitch);
  G.camera.position.set(
    G.me.pos.x + Math.sin(G.yaw) * cp * G.camDist,
    G.me.pos.y + 2.5 + Math.sin(G.pitch) * G.camDist,
    G.me.pos.z + Math.cos(G.yaw) * cp * G.camDist
  );
  G.camera.lookAt(G.me.pos.x, G.me.pos.y + 2.5, G.me.pos.z);
  G.starPts.position.copy(G.camera.position);
  G.renderer.render(G.scene, G.camera);
  setTxt('#cr', '✦ ' + fmt(S.cr));
  setTxt('#inc', '+' + fmt(inc) + '/s');
  setTxt('#dexBtn', `📖 ${dexN()}/${P.length}`);
  if (G.shopOpen) $('#sc').textContent = '✦ ' + fmt(S.cr);
  missionTick();
  if (G.toastT > 0 && (G.toastT -= raw) <= 0) $('#toast').classList.remove('on');
}
