// 차량 파손: 차체 hp · 엔진 · 앞/뒤/좌/우 찌그러짐 · 고장 · 침수. 충돌은 vehicle.ts 의 bumpHooks, 가속 제한은 stepMods 로 붙는다.
// 시각(찌그러짐/연기)은 render/vehicle-damage.ts · render/vehicle-fx.ts, HUD 는 game/car-hud.ts, 수리는 game/cars.ts + car-shop.ts.
import {S} from '../core/state.js';
import {G} from '../core/runtime.js';
import {groundH, solidAt} from '../core/terrain.js';
import {waterAt} from '../core/water.js';
import {carOf, CARS} from '../data/cars.js';
import {VEH, bumpHooks, exitVeh, placeMesh, stepMods, type Veh} from './vehicle.js';
import {deformCar, setLights} from '../render/vehicle-damage.js';
import {puff, updateFx} from '../render/vehicle-fx.js';
import {sfx} from '../audio/index.js';
import {flash, toast} from '../game/hud.js';
import type {GameSystem} from '../core/types.js';

export interface CarDmg {
  /** 차체·엔진 0~100 */
  hp: number;
  engine: number;
  /** 앞·뒤·왼(+x)·오른(−x) 찌그러짐 0~1 */
  zn: number[];
  broken: 0 | 1;
  cause: '' | 'crash' | 'water';
  /** 불꽃 남은 초 */
  fire: number;
  /** 물에 잠긴 누적 초(2초 차면 고장), 가라앉은 깊이, 물 안 여부 */
  wet: number;
  sink: number;
  inW: boolean;
  /** 충돌 재충돌 대기, 탑승자 내리기 대기, 연기 타이머 */
  cd: number;
  eject: number;
  puffT: number;
  splT: number;
  flickT: number;
  grp: any;
  dirty: boolean;
  tilt: number;
}
/** 엔진이 이 값 이하로 떨어지면 고장 */
export const BREAK_AT = 12;
/** 물에 이 시간 이상 있으면 침수 고장 */
export const WATER_FAIL = 2;
const FRAGILE: Record<string, number> = {kart: 1.2, cart: 1.2, buggy: 1.1, bus: 0.7, limo: 0.85, van: 0.85, suv: 0.85, pickup: 0.85, police: 0.9};
const clamp = (x: number, a = 0, b = 100) => Math.max(a, Math.min(b, x));

/** 차의 파손 상태 (처음 보면 만든다: 내 차는 저장값에서) */
export function dmgOf(v: Veh): CarDmg {
  if (v.d) return v.d;
  const o = v.own >= 0 ? S.cars.list[v.own] : null;
  v.d = {
    hp: o?.hp ?? 100, engine: o?.engine ?? 100, zn: o?.zn ? o.zn.slice(0, 4) : [0, 0, 0, 0], broken: o?.brk ? 1 : 0, cause: o?.brk ? 'crash' : '',
    fire: 0, wet: 0, sink: 0, inW: false, cd: 0, eject: 0, puffT: 0, splT: 0, flickT: 0, grp: null, dirty: true, tilt: 0,
  };
  if (v.d.broken && v.d.zn.every(z => z < 0.01)) v.d.zn = [0.4, 0, 0, 0];
  return v.d;
}
export const isBroken = (v: Veh) => !!v.d?.broken;
const soot = (d: CarDmg) => (d.broken ? 0.85 : clamp((100 - d.hp) / 100 + (100 - d.engine) / 200, 0, 0.6));

function breakDown(v: Veh, cause: 'crash' | 'water') {
  const d = dmgOf(v);
  if (d.broken) return;
  d.broken = 1;
  d.cause = cause;
  d.engine = cause === 'water' ? 0 : Math.min(d.engine, BREAK_AT - 2);
  d.fire = cause === 'crash' ? 14 : 0;
  d.dirty = true;
  if (v.own === -3) v.own = -4; // 고장난 순찰차는 추격에서 빠진다 (12초 뒤 견인되어 사라짐)
  sfx('engineOff');
  if (cause === 'water') sfx('sizzle');
  if (G.drive === v) {
    toast(cause === 'water' ? '차가 물에 잠겨 엔진이 멈췄습니다. 수리가 필요합니다' : '엔진이 고장 났습니다. 튜닝샵에서 수리하세요', 1.6);
    flash(cause === 'water' ? '#6ab4ff' : '#ff6a3a', 0.35);
    if (cause === 'water') d.eject = 0.9;
  }
  for (let i = 0; i < 8; i++) puff(cause === 'water' ? 'steam' : 'dark', v.x, v.y + carOf(v.t).hgt, v.z);
}
/** zones: 각 구역에 가는 비율(0~1), loss: 차체 감소량, engLoss: 엔진 감소량 */
function applyHit(v: Veh, loss: number, zones: number[], engLoss: number) {
  const d = dmgOf(v);
  if (d.broken && d.hp <= 0) return;
  d.hp = clamp(d.hp - loss);
  d.engine = clamp(d.engine - engLoss);
  for (let i = 0; i < 4; i++) d.zn[i] = clamp(d.zn[i] + (zones[i] * loss) / 55, 0, 1);
  d.dirty = true;
  if (!d.broken && (d.engine <= BREAK_AT || d.hp <= 0)) breakDown(v, 'crash');
}

// ---------- 충돌 ----------
const solidIn = (w: Veh, x: number, z: number) => !!w.solid && x > w.solid.x0 - 0.7 && x < w.solid.x1 + 0.7 && z > w.solid.z0 - 0.7 && z < w.solid.z1 + 0.7;
function onBump(v: Veh, speed: number, nx: number, nz: number) {
  const d = dmgOf(v),
    s = Math.abs(speed);
  if (s < 6 || d.cd > 0) return;
  const t = carOf(v.t),
    sn = Math.sin(v.h),
    cs = Math.cos(v.h),
    fwd = speed >= 0 ? 1 : -1;
  // 몸의 8점(모서리·옆·앞뒤 가운데)에서 어디가 닿았는지 본다
  const pts: [number, number][] = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const zones = [0, 0, 0, 0];
  const hitPts: [number, number][] = [];
  for (const [a, b] of pts) {
    const lx = (a * t.wid) / 2,
      lz = (b * t.len) / 2,
      wx = nx + lx * cs + lz * sn,
      wz = nz - lx * sn + lz * cs;
    if (solidAt(wx, wz, 0.7) || (a === 0 && solidAt(wx, wz, 1))) {
      hitPts.push([wx, wz]);
      if (b > 0) zones[0]++;
      if (b < 0) zones[1]++;
      if (a > 0) zones[2]++;
      if (a < 0) zones[3]++;
    }
  }
  let k = 1;
  if (!hitPts.length) {
    // 솔리드가 아닌 것(가파른 비탈 등) — 낭떠러지 끝은 데미지 없음
    if (groundH(nx + sn * t.len * 0.3, nz + cs * t.len * 0.3) === -Infinity) return;
    zones[fwd > 0 ? 0 : 1] = 1;
    k = 0.6;
  }
  const mx = Math.max(...zones);
  for (let i = 0; i < 4; i++) zones[i] /= mx;
  d.cd = 0.3;
  const loss = (s - 6) * 1.9 * (FRAGILE[t.id] ?? 1) * k,
    engLoss = zones[0] * Math.max(0, s - 12) * 2.6 * (FRAGILE[t.id] ?? 1) * k + loss * 0.06;
  applyHit(v, loss, zones, engLoss);
  // 부딪힌 남의 차도 같이 찌그러진다 (가볍게)
  for (const w of VEH)
    if (w !== v && w.solid && hitPts.some(([x, z]) => solidIn(w, x, z))) {
      const dx = v.x - w.x,
        dz = v.z - w.z,
        lx = dx * Math.cos(w.h) - dz * Math.sin(w.h),
        lz = dx * Math.sin(w.h) + dz * Math.cos(w.h),
        zz = [0, 0, 0, 0];
      if (Math.abs(lz) > Math.abs(lx) * 0.6) zz[lz > 0 ? 0 : 1] = 1;
      else zz[lx > 0 ? 2 : 3] = 1;
      applyHit(w, loss * 0.7, zz, zz[0] * Math.max(0, s - 14) * 1.6);
      break;
    }
  const heavy = s >= 18;
  sfx(heavy ? 'crashH' : 'crashL');
  if (G.drive === v && heavy) flash('#ff5a40', 0.28);
  const px = hitPts.length ? hitPts[0][0] : nx,
    pz = hitPts.length ? hitPts[0][1] : nz;
  for (let i = 0; i < (heavy ? 7 : 3); i++) puff(i % 2 ? 'spark' : 'debris', px, v.y + 1, pz);
}
/** 시민을 치면 앞부분만 살짝 */
export function hitPerson(v: Veh) {
  if (v.own <= -3) return;
  applyHit(v, 1.5 + Math.abs(v.v) * 0.08, [1, 0, 0, 0], 0);
}

// ---------- 수리·조회 ----------
/** 저장된 내 차(또는 월드의 그 차) 상태 */
export function condOf(i: number) {
  const o = S.cars.list[i];
  if (!o) return {hp: 100, engine: 100, broken: false};
  const v = VEH.find(w => w.own === i);
  if (v?.d) return {hp: v.d.hp, engine: v.d.engine, broken: !!v.d.broken};
  return {hp: o.hp ?? 100, engine: o.engine ?? 100, broken: !!o.brk};
}
/** 수리비 ✦: 차 값 기준, 고장이면 견인비 가산 */
export function repairCost(i: number) {
  const o = S.cars.list[i];
  if (!o) return 0;
  const c = condOf(i);
  if (c.hp >= 99.5 && c.engine >= 99.5 && !c.broken) return 0;
  const p = carOf(o.t).price;
  return Math.max(60, Math.round(p * (0.03 * ((100 - c.hp) / 100) + 0.05 * ((100 - c.engine) / 100) + (c.broken ? 0.03 : 0))));
}
function restore(v: Veh) {
  const d = dmgOf(v);
  Object.assign(d, {hp: 100, engine: 100, zn: [0, 0, 0, 0], broken: 0, cause: '', fire: 0, wet: 0, sink: 0, eject: 0, dirty: true});
}
/** 요금 처리는 호출 쪽(game/cars.ts) — 상태만 새 차로 되돌린다 */
export function repairOwned(i: number) {
  const o = S.cars.list[i];
  if (!o) return;
  Object.assign(o, {hp: 100, engine: 100, zn: [0, 0, 0, 0], brk: 0});
  const v = VEH.find(w => w.own === i);
  if (v) restore(v);
}
/** 차고 입고 = 무료 정비 */
export const repairSaved = (o: {hp?: number; engine?: number; zn?: number[]; brk?: 0 | 1}) => Object.assign(o, {hp: 100, engine: 100, zn: [0, 0, 0, 0], brk: 0});
/** 시동 걸 수 있는가 (고장이면 '고장' 연출 후 false) */
export function canStart(v: Veh): boolean {
  if (!v.d?.broken) return true;
  sfx('deny');
  toast('엔진이 고장 나 달릴 수 없습니다. 튜닝샵에서 수리하세요', 1.4);
  puff('dark', v.x, v.y + carOf(v.t).hgt, v.z);
  return false;
}

// ---------- 매 프레임 ----------
function escapeWater(v: Veh) {
  exitVeh();
  for (let r = 3; r <= 64; r += 3)
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2,
        x = v.x + Math.cos(a) * r,
        z = v.z + Math.sin(a) * r,
        g = groundH(x, z);
      if (g > -Infinity && !waterAt(x, z) && !solidAt(x, z, 0.5)) {
        G.me.pos.set(x, g, z);
        G.me.vy = 0;
        return;
      }
    }
}
function waterStep(v: Veh, d: CarDmg, dt: number) {
  const w = waterAt(v.x, v.z),
    t = carOf(v.t),
    inW = !!w && w.depth > 0.5 && v.y < w.y + 1.5; // 다리 상판 위(수면보다 한참 높음)는 물이 아니다 (W6 BRIDGE)
  if (inW && !d.inW) {
    sfx('splash');
    for (let i = 0; i < 9; i++) puff('splash', v.x, w!.y, v.z);
  }
  d.inW = inW;
  if (inW && w) {
    d.wet += dt;
    d.sink += dt * 0.5;
    v.v *= Math.max(0, 1 - (d.broken ? 3 : 1.8) * dt); // 속도 급감
    if ((d.splT -= dt) < 0 && Math.abs(v.v) > 2) {
      d.splT = 0.1;
      const sn = Math.sin(v.h),
        cs = Math.cos(v.h);
      for (const sd of [-1, 1]) puff('splash', v.x + cs * sd * t.wid * 0.5 + sn * t.len * 0.3, w.y, v.z - sn * sd * t.wid * 0.5 + cs * t.len * 0.3);
    }
    if (!d.broken && d.wet >= WATER_FAIL) breakDown(v, 'water');
    // 수면에 뜬 채 서서히 가라앉는다 (바닥에 닿으면 멈춤)
    const bed = groundH(v.x, v.z);
    v.y = Math.max(bed, w.y - 0.9 - d.sink);
    d.tilt = Math.sin(performance.now() / 260 + v.x) * 0.05 + d.sink * 0.012;
  } else {
    d.wet = Math.max(0, d.wet - dt * 0.5);
    d.sink = Math.max(0, d.sink - dt * 2);
    d.tilt *= Math.max(0, 1 - dt * 6);
    if (Math.abs(d.tilt) < 0.002) d.tilt = 0;
  }
  if (d.tilt !== 0 || inW) {
    placeMesh(v);
    v.grp.rotation.z = d.tilt;
    v.grp.rotation.x = d.tilt * 0.6;
  }
}
function smokeStep(v: Veh, d: CarDmg, dt: number) {
  if (Math.hypot(v.x - G.me.pos.x, v.z - G.me.pos.z) > 90) return;
  const t = carOf(v.t),
    sn = Math.sin(v.h),
    cs = Math.cos(v.h),
    hx = v.x + sn * t.len * 0.32,
    hz = v.z + cs * t.len * 0.32,
    hy = v.y + t.hgt * 0.85;
  const water = d.broken && d.cause === 'water';
  const stage = d.broken ? (water ? 4 : 2) : d.engine < 30 || d.hp < 25 ? 2 : d.engine < 60 || d.hp < 50 ? 1 : 0;
  if (!stage) return;
  if (d.fire > 0) d.fire -= dt;
  if ((d.puffT -= dt) > 0) return;
  d.puffT = stage === 1 ? 0.3 : stage === 2 ? 0.14 : 0.12;
  const py = d.inW ? Math.max(hy, (waterAt(v.x, v.z)?.y ?? 0) + 0.5) : hy;
  puff(stage === 1 ? 'smoke' : stage === 4 ? 'steam' : 'dark', hx, py, hz);
  if (d.fire > 0) puff('fire', hx + (Math.random() - 0.5) * 1.2, py - 0.2, hz + (Math.random() - 0.5) * 1.2);
}

const sys: GameSystem = {
  id: 'vehicle-damage',
  onSave() {
    for (const v of VEH) {
      const o = v.own >= 0 ? S.cars.list[v.own] : null;
      if (o && v.d) Object.assign(o, {hp: Math.round(v.d.hp), engine: Math.round(v.d.engine), zn: v.d.zn.map(z => Math.round(z * 100) / 100), brk: v.d.broken});
    }
  },
  update(dt) {
    for (const v of VEH) {
      const d = dmgOf(v);
      d.cd -= dt;
      waterStep(v, d, dt);
      if (d.eject > 0 && (d.eject -= dt) <= 0 && G.drive === v) escapeWater(v);
      if (d.broken && v.own === -3) v.own = -4;
      if (v.grp !== d.grp) {
        d.grp = v.grp;
        d.dirty = true;
      }
      if (d.dirty) {
        d.dirty = false;
        deformCar(v.grp, d.zn, soot(d));
      }
      // 전조등: 엔진이 약하면 깜빡, 고장이면 꺼짐
      if (d.broken) setLights(v.grp, false);
      else if (d.engine < 45 || d.hp < 20) {
        if ((d.flickT -= dt) < 0) {
          d.flickT = 0.08 + Math.random() * 0.25;
          setLights(v.grp, Math.random() > 0.4);
        }
      } else if (d.grp) setLights(v.grp, true);
      smokeStep(v, d, dt);
    }
    updateFx(dt);
  },
};
export const vehicleDamageSystem = sys;

bumpHooks.push(onBump);
stepMods.push((v, m) => {
  const d = v.d;
  if (!d) return;
  if (d.broken) m.fw = 0;
  else {
    if (d.engine < 60) m.vmul *= 0.55 + (0.45 * d.engine) / 60;
    if (d.hp < 25) m.vmul *= 0.85;
  }
  if (d.inW) m.vmul *= 0.5;
});
void CARS;
