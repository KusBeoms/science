// 플레이어 이동: 입력 → 걷기/달리기(스태미나) → 막힘 판정 → 점프·중력·바닥 (속도 배율·비행은 시스템 레지스트리 훅)
import {S} from '../core/state.js';
import {G, paused} from '../core/runtime.js';
import {$} from '../core/util.js';
import {blockedAt, onGround} from '../core/geometry.js';
import {P} from '../data/planets.js';
import {SPR} from '../data/shop.js';
import {animateWalk} from '../render/characters.js';
import {respawn} from '../game/actions.js';
import {gravityNow} from './hazards.js';
import {hovering, speedMul} from './registry.js';

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
export function movePlayer(dt: number, t: number) {
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
  let spd = (14 + 1.5 * S.spd + SPR[S.eq][4]) * speedMul();
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
  if (hovering()) {
    G.me.vy = 0; // 비행 중: 높이는 그 시스템이 정한다
    return;
  }
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
}
