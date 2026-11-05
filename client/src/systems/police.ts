// 수배(★ 최대 6)와 경찰: 시민에게 들키거나 시민을 치면 별이 오르고, 별 수만큼 경찰차가 추격한다. 닿으면 검거 → 교도소(systems/jail.ts).
// 별은 경찰이 70u 안에 없는 채로 일정 시간이 지나면 하나씩 내려간다. 건물 안에 숨으면 더 빨리 식는다.
import {S} from '../core/state.js';
import {G, paused} from '../core/runtime.js';
import {dropDynSolid} from '../core/terrain.js';
import {CITY_ROADS} from '../data/city.js';
import {CITY_HALF} from '../data/world-map.js';
import {carOf} from '../data/cars.js';
import {crowdApi} from './crowd.js';
import {VEH, exitVeh, vehicleHooks, removeVeh, spawnVeh, stepVehicle, type Veh} from './vehicle.js';
import {goJail} from './jail.js';
import {addHudLine, flash, toast} from '../game/hud.js';
import {sfx} from '../audio/index.js';
import type {GameSystem} from '../core/types.js';

export const MAX_STARS = 6;
export const addStars = (n: number, why = '') => {
  const before = S.wanted;
  S.wanted = Math.min(MAX_STARS, Math.max(0, S.wanted + n));
  coolT = 0;
  if (S.wanted > before) {
    flash('#4a82e8', 0.4);
    sfx('deny');
    toast(`🚨 ${'★'.repeat(S.wanted)}${'☆'.repeat(MAX_STARS - S.wanted)} ${why}`.trim(), 2.2);
  }
};
let coolT = 0,
  spawnT = 0,
  bustT = 0;
const cops = () => VEH.filter(v => v.own === -3);
const inCity = (x: number, z: number) => Math.abs(x) < CITY_HALF + 30 && Math.abs(z) < CITY_HALF + 30;

/** 플레이어에서 80~140u 떨어진 차도 위 한 점 */
function roadPoint(): {x: number; z: number; h: number} | null {
  const cars = CITY_ROADS.filter(r => r.car);
  for (let k = 0; k < 30; k++) {
    const r = cars[Math.floor(Math.random() * cars.length)],
      t = Math.random(),
      x = r.x0 + (r.x1 - r.x0) * t,
      z = r.z0 + (r.z1 - r.z0) * t,
      d = Math.hypot(x - G.me.pos.x, z - G.me.pos.z);
    if (d > 80 && d < 150) return {x, z, h: r.x0 === r.x1 ? 0 : Math.PI / 2};
  }
  return null;
}
function spawnCop() {
  const p = roadPoint();
  if (!p) return;
  const v = spawnVeh({t: 'police', x: p.x, z: p.z, h: p.h, own: -3, c: 0xffffff});
  dropDynSolid(v.solid);
  v.solid = null;
}
function chase(v: Veh, dt: number) {
  const dx = G.me.pos.x - v.x,
    dz = G.me.pos.z - v.z,
    want = Math.atan2(dx, dz);
  let err = Math.atan2(Math.sin(want - v.h), Math.cos(want - v.h));
  // 걸어서 도망 중이면 곁에 와서 멈춰 막아선다
  if (!G.drive && Math.hypot(dx, dz) < 6) {
    stepVehicle(v, 0, Math.max(-1, Math.min(1, err * 2)), true, dt);
    return;
  }
  // 막혀 있으면 잠깐 후진하며 돌아 나온다
  if ((v as any).stuck > 0) {
    (v as any).stuck -= dt;
    stepVehicle(v, -1, err > 0 ? -1 : 1, false, dt);
    return;
  }
  const bumped = stepVehicle(v, 1, Math.max(-1, Math.min(1, err * 2)), false, dt, 0.72 + 0.05 * S.wanted);
  if (bumped) (v as any).stuck = 0.8;
  if ((v as any).far === undefined) (v as any).far = 0;
  if (Math.hypot(dx, dz) > 260) (v as any).far += dt;
  else (v as any).far = 0;
  if ((v as any).far > 5) {
    // 너무 멀어지면 다시 가까운 차도에 놓는다
    const p = roadPoint();
    if (p) Object.assign(v, {x: p.x, z: p.z, h: p.h, v: 0, y: 0});
    (v as any).far = 0;
  }
}

export const policeSystem: GameSystem = {
  id: 'police',
  update(dt) {
    if (paused() || G.jail) return;
    const list = cops();
    if (S.wanted <= 0) {
      list.forEach(v => (v.own = -4)); // 12초 뒤 사라진다(vehicle.ts)
      return;
    }
    if (G.inside) {
      // 건물 안에 숨으면 빨리 식는다
      if ((coolT += dt) > 10) {
        coolT = 0;
        S.wanted--;
        toast('🕵️ 시선을 피했다');
      }
      return;
    }
    // 추격 인원: 별 수만큼
    if (inCity(G.me.pos.x, G.me.pos.z) && list.length < S.wanted && (spawnT += dt) > 2.5) {
      spawnT = 0;
      spawnCop();
    }
    let near = false;
    for (const v of list) {
      chase(v, dt);
      const d = Math.hypot(v.x - G.me.pos.x, v.z - G.me.pos.z),
        spd = G.drive ? Math.abs(G.drive.v) : 0;
      if (d < 70) near = true;
      if (d < (G.drive ? 4.6 : 3.4) && spd < 11) bustT += dt;
    }
    if (!near) {
      if ((coolT += dt) > 22) {
        coolT = 0;
        S.wanted--;
        toast('🚔 추격을 따돌렸다');
      }
    } else coolT = 0;
    if (list.some(v => Math.hypot(v.x - G.me.pos.x, v.z - G.me.pos.z) < (G.drive ? 4.6 : 3.4)) === false) bustT = Math.max(0, bustT - dt * 2);
    if (bustT > 0.7) {
      bustT = 0;
      if (G.drive) exitVeh();
      list.forEach(removeVeh);
      goJail(S.wanted);
    }
  },
};
addHudLine(() => (S.wanted > 0 ? `🚨 ${'★'.repeat(S.wanted)}${'☆'.repeat(MAX_STARS - S.wanted)}` : null));
void carOf;

/** 달리는 차가 시민을 치면 별이 오른다 */
vehicleHooks.push(v => {
  if (Math.abs(v.v) < 6 || v.own <= -3) return;
  const t = carOf(v.t),
    n = crowdApi.hitAt(v.x + Math.sin(v.h) * t.len * 0.3, v.z + Math.cos(v.h) * t.len * 0.3, t.wid * 0.5 + 1.2, Math.sin(v.h) * v.v, Math.cos(v.h) * v.v);
  if (n) addStars(1, '🚶💥');
});
