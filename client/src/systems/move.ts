// 플레이어 이동: 입력 → 걷기/달리기(스태미나) → 막힘 판정 → 점프·중력·바닥 (속도 배율·비행은 시스템 레지스트리 훅)
/** 몸 반지름 (충돌체 판정) · 내리막에서 떨어지지 않고 바닥에 붙는 최대 낙차 */
const BODY_R = 0.42,
  SNAP_DOWN = 2.5;
import {S} from '../core/state.js';
import {G, paused} from '../core/runtime.js';
import {$} from '../core/util.js';
import {blockedAt} from '../core/geometry.js';
import {groundH, solidAt, walkable} from '../core/terrain.js';
import {P} from '../data/planets.js';
import {SPR} from '../data/shop.js';
import {animateWalk, sitPose} from '../render/characters.js';
import {respawn} from '../game/actions.js';
import {gravityNow} from './hazards.js';
import {hovering, speedMul} from './registry.js';
import {MOVE_MUL, JUMP_MUL} from '../core/scale.js';
import {SPD_BASE, SPD_PER_LV} from '../data/pacing.js';

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
  let spd = (SPD_BASE + SPD_PER_LV * S.spd + SPR[S.eq][4]) * speedMul() * MOVE_MUL;
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
  if (G.drive) return; // 운전 중: 차 물리는 systems/vehicle.ts
  if (G.sit) {
    // 앉아 있는 동안: 이동·점프 입력이 들어오면 일어나고, 아니면 자리에 붙어 앉은 자세를 유지한다
    if (moving || G.keys.Space || G.jumpHeld) G.sit = null;
    else {
      G.me.pos.set(G.sit.x, G.sit.y, G.sit.z);
      G.me.vy = 0;
      G.me.rotation.y = G.sit.ry;
      sitPose(G.me);
      return;
    }
  }
  const hold = G.carry.length > 0,
    wasOn = G.me.pos.y <= groundH(G.me.pos.x, G.me.pos.z) + 0.02; // 이번 프레임 시작에 땅에 서 있었나
  if (moving) {
    mx /= ml;
    mz /= ml;
    const ox = G.me.pos.x,
      oz = G.me.pos.z,
      nx = ox + mx * spd * dt,
      nz = oz + mz * spd * dt;
    const blocked = (x: number, z: number) =>
      blockedAt(x, z) || solidAt(x, z, BODY_R) || !walkable(ox, oz, G.me.pos.y, x, z);
    if (!blocked(nx, nz)) {
      G.me.pos.x = nx;
      G.me.pos.z = nz;
    } else if (!blocked(nx, oz)) G.me.pos.x = nx;
    else if (!blocked(ox, nz)) G.me.pos.z = nz;
    G.me.rotation.y = Math.atan2(mx, mz);
    animateWalk(G.me, t * spd * 0.22, hold);
  } else animateWalk(G.me, 0, hold);
  if (hovering()) {
    G.me.vy = 0; // 비행 중: 높이는 그 시스템이 정한다
    return;
  }
  const gnd = groundH(G.me.pos.x, G.me.pos.z);
  if (!paused() && !G.match && (G.keys.Space || G.jumpHeld) && G.me.pos.y <= gnd + 0.02 && gnd > -Infinity) {
    G.me.vy = 14 * JUMP_MUL * SPR[S.eq][3];
  }
  const prevY = G.me.pos.y;
  if (dt > 0) {
    G.me.vy -= 34 * gravityNow() * dt;
    G.me.pos.y += G.me.vy * dt;
  }
  // 땅에 서 있던 몸은 낙차 SNAP_DOWN 안이면 내리막에 붙고, 공중에서 내려오는 몸은 바닥을 뚫지 않는다 (이전 프레임 높이로 판정 — 저프레임·높은 점프 대비)
  if (gnd > -Infinity && G.me.vy <= 0 && (wasOn ? G.me.pos.y - gnd <= SNAP_DOWN : G.me.pos.y < gnd && prevY > gnd - 1.2)) {
    G.me.pos.y = gnd;
    G.me.vy = 0;
  }
  if (G.me.pos.y < -45) respawn();
}
