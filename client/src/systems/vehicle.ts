// 차량 월드: 길가에 세워 둔 차(훔칠 수 있음)·내 차 생성/보관, 운전 물리, 내리기. 모델은 render/vehicle.ts, 데이터 data/cars.ts, 구매·튜닝·등록은 game/cars.ts.
import {S, save, saveHooks} from '../core/state.js';
import {G} from '../core/runtime.js';
import {addDynSolid, dropDynSolid, groundH, solidAt, walkable, type Solid} from '../core/terrain.js';
import {CITY_ROADS} from '../data/city.js';
import {CARS, PAINTS, carOf} from '../data/cars.js';
import {buildCar} from '../render/vehicle.js';
import {mulberry32} from '../render/lowpoly/rng.js';
import type {GameSystem, OwnedCar} from '../core/types.js';

export interface Veh {
  t: string;
  c: number;
  eng: number;
  tire: number;
  neon: number;
  x: number;
  y: number;
  z: number;
  h: number;
  v: number;
  grp: any;
  /** S.cars.list 의 인덱스, −1 = 길가의 남의 차, −2 = 훔쳐 타고 있는 임시 차(자리 없음) */
  own: number;
  spot: number;
  solid: Solid | null;
  age: number;
}
export const VEH: Veh[] = [];
const PARK: {x: number; z: number; h: number}[] = [];
const respawn: {spot: number; t: number}[] = [];
let ready = false;

/** 길가 주차 자리: 차도(car=true) 양쪽 가장자리, 일정 간격으로 */
function planSpots() {
  const rnd = mulberry32(2026);
  for (const r of CITY_ROADS) {
    if (!r.car) continue;
    const horiz = r.z0 === r.z1,
      a0 = Math.min(horiz ? r.x0 : r.z0, horiz ? r.x1 : r.z1) + 14,
      a1 = Math.max(horiz ? r.x0 : r.z0, horiz ? r.x1 : r.z1) - 14,
      off = r.w / 2 - 1.7;
    let k = 0;
    for (let a = a0; a <= a1; a += 19 + rnd() * 5, k++) {
      const side = k % 2 ? 1 : -1,
        c = horiz ? r.z0 : r.x0;
      PARK.push(horiz ? {x: a, z: c + side * off, h: Math.PI / 2 * (side > 0 ? 1 : -1)} : {x: c + side * off, z: a, h: side > 0 ? Math.PI : 0});
    }
  }
}
const pickType = (rnd: () => number) => {
  const tot = CARS.reduce((a, c) => a + c.spawn, 0);
  let x = rnd() * tot;
  for (const c of CARS) if ((x -= c.spawn) < 0) return c;
  return CARS[2];
};
const rndSeed = mulberry32(77);

export function syncSolid(v: Veh) {
  dropDynSolid(v.solid);
  v.solid = null;
  if (G.drive === v) return;
  const t = carOf(v.t),
    c = Math.abs(Math.cos(v.h)),
    s = Math.abs(Math.sin(v.h)),
    hx = (t.wid * c + t.len * s) / 2,
    hz = (t.wid * s + t.len * c) / 2;
  v.solid = addDynSolid(v.x - hx, v.z - hz, v.x + hx, v.z + hz);
}
export function placeMesh(v: Veh) {
  v.grp.position.set(v.x, v.y, v.z);
  v.grp.rotation.y = v.h;
}
function mkMesh(v: Veh) {
  if (v.grp) G.scene.remove(v.grp);
  v.grp = buildCar({t: v.t, c: v.c, eng: v.eng, tire: v.tire, neon: v.neon});
  G.scene.add(v.grp);
  placeMesh(v);
}
export function spawnVeh(o: Partial<Veh> & {t: string; x: number; z: number}): Veh {
  const v: Veh = {c: PAINTS[0], eng: 0, tire: 0, neon: 0, y: 0, h: 0, v: 0, grp: null, own: -1, spot: -1, solid: null, age: 0, ...o};
  v.y = groundH(v.x, v.z);
  if (v.y === -Infinity) v.y = 0;
  mkMesh(v);
  syncSolid(v);
  VEH.push(v);
  return v;
}
export function removeVeh(v: Veh) {
  dropDynSolid(v.solid);
  if (v.grp) G.scene.remove(v.grp);
  const i = VEH.indexOf(v);
  if (i >= 0) VEH.splice(i, 1);
}
export const vehOfOwn = (i: number) => VEH.find(v => v.own === i);
/** 내 차 i 를 길에 꺼내 놓는다 (위치를 주면 거기, 아니면 저장된 자리) */
export function spawnOwned(i: number, at?: {x: number; z: number; h: number}) {
  const o: OwnedCar = S.cars.list[i];
  if (at) Object.assign(o, at);
  o.stored = 0;
  vehOfOwn(i) && removeVeh(vehOfOwn(i)!);
  return spawnVeh({t: o.t, c: o.c, eng: o.eng, tire: o.tire, neon: o.neon, x: o.x, z: o.z, h: o.h, own: i});
}
export function refreshOwned(i: number) {
  const v = vehOfOwn(i),
    o = S.cars.list[i];
  if (!v || !o) return;
  Object.assign(v, {t: o.t, c: o.c, eng: o.eng, tire: o.tire, neon: o.neon});
  mkMesh(v);
}
function parkNpc(spot: number) {
  const p = PARK[spot],
    t = pickType(rndSeed);
  spawnVeh({t: t.id, c: PAINTS[Math.floor(rndSeed() * PAINTS.length)] ^ 0 || t.color, x: p.x, z: p.z, h: p.h, spot});
}
function ensure() {
  if (ready || !G.scene || !G.started) return;
  ready = true;
  planSpots();
  const keep = Math.min(PARK.length, 26),
    rnd = mulberry32(5),
    order = PARK.map((_, i) => i).sort(() => rnd() - 0.5).slice(0, keep);
  order.forEach(parkNpc);
  S.cars.list.forEach((o, i) => !o.stored && spawnOwned(i));
}

export function enterVeh(v: Veh) {
  G.drive = v;
  G.sit = null;
  syncSolid(v);
  G.me.visible = false;
  G.me.pos.set(v.x, v.y, v.z);
  G.yaw = v.h + Math.PI;
}
export function exitVeh() {
  const v: Veh | null = G.drive;
  if (!v) return;
  const t = carOf(v.t),
    rx = Math.cos(v.h),
    rz = -Math.sin(v.h);
  v.v = 0;
  G.drive = null;
  G.me.visible = true;
  for (const s of [1, -1, 2.4, -2.4]) {
    const x = v.x + rx * s * (t.wid / 2 + 1.1) * Math.sign(s) * (Math.abs(s) > 1 ? -1 : 1),
      z = v.z + rz * s * (t.wid / 2 + 1.1) * Math.sign(s) * (Math.abs(s) > 1 ? -1 : 1);
    if (groundH(x, z) > -Infinity && !solidAt(x, z, 0.5)) {
      G.me.pos.set(x, groundH(x, z), z);
      break;
    }
  }
  syncSolid(v);
  if (v.own >= 0) Object.assign(S.cars.list[v.own], {x: v.x, z: v.z, h: v.h});
  v.age = 0;
  save();
}

/** 차 물리 한 걸음: fw −1~1(가속/후진), st −1~1(왼쪽+), brake 제동. 운전과 경찰 AI 가 같이 쓴다. 부딪히면 true */
export function stepVehicle(v: Veh, fw: number, st: number, brake: boolean, dt: number, vmul = 1): boolean {
  const t = carOf(v.t),
    vmax = t.vmax * (1 + 0.08 * v.eng) * vmul,
    turn = t.turn * (1 + 0.1 * v.tire);
  if (fw !== 0) v.v += (Math.sign(fw) === Math.sign(v.v) || v.v === 0 ? t.acc : t.acc * 2.8) * fw * dt;
  else v.v -= Math.sign(v.v) * Math.min(Math.abs(v.v), 7 * dt);
  if (brake) v.v -= Math.sign(v.v) * Math.min(Math.abs(v.v), 38 * dt);
  v.v = Math.max(-vmax * 0.35, Math.min(vmax, v.v));
  v.h += st * turn * dt * Math.max(-1, Math.min(1, v.v / 7));
  const nx = v.x + Math.sin(v.h) * v.v * dt,
    nz = v.z + Math.cos(v.h) * v.v * dt,
    rad = t.wid * 0.42,
    fx = Math.sin(v.h) * t.len * 0.3,
    fz = Math.cos(v.h) * t.len * 0.3;
  const hit = (x: number, z: number) =>
    solidAt(x, z, rad) || solidAt(x + fx, z + fz, rad) || solidAt(x - fx, z - fz, rad) || !walkable(v.x, v.z, v.y, x, z) || groundH(x + fx, z + fz) === -Infinity;
  let bumped = false;
  if (hit(nx, nz)) {
    v.v *= -0.3;
    bumped = true;
  } else {
    v.x = nx;
    v.z = nz;
  }
  const gy = groundH(v.x, v.z);
  if (gy > -Infinity) v.y += (gy - v.y) * Math.min(1, dt * 12);
  placeMesh(v);
  return bumped;
}
/** 플레이어 운전: 앞/뒤 = W/S, 핸들 = A/D, 스페이스 = 브레이크 */
function drive(v: Veh, dt: number) {
  const k = G.keys,
    fw = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) + G.joy.y,
    st = (k.KeyA || k.ArrowLeft ? 1 : 0) - (k.KeyD || k.ArrowRight ? 1 : 0) - G.joy.x;
  stepVehicle(v, fw, st, !!k.Space, dt);
  G.me.pos.set(v.x, v.y, v.z);
  G.me.vy = 0;
  // 카메라가 천천히 차 뒤로 따라온다
  if (Math.abs(v.v) > 4) {
    const want = v.h + Math.PI + (v.v < 0 ? Math.PI : 0);
    const d = ((want - G.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    G.yaw += d * Math.min(1, dt * 1.4);
  }
  vehicleHooks.forEach(f => f(v, dt));
}
/** 운전 중 매 프레임 불리는 훅 (시민 충돌 등) */
export const vehicleHooks: ((v: Veh, dt: number) => void)[] = [];

export const vehicleSystem: GameSystem = {
  id: 'vehicle',
  onSave() {
    VEH.forEach(v => v.own >= 0 && S.cars.list[v.own] && Object.assign(S.cars.list[v.own], {x: v.x, z: v.z, h: v.h}));
  },
  update(dt) {
    ensure();
    if (G.drive && !G.inside) {
      const paused = G.modal !== null || G.shopOpen || G.quizOpen || G.dexOpen || (G.cine && G.cine.lock);
      if (!paused) drive(G.drive, dt);
    }
    // 임시(자리 없음) 훔친 차는 두고 가면 사라진다, 길가 자리는 일정 시간 뒤 새 차로 채운다
    for (const v of VEH.slice()) {
      if (v === G.drive) continue;
      if (v.own === -2 && (v.age += dt) > 90) removeVeh(v);
      if (v.own === -4 && (v.age += dt) > 12) removeVeh(v);
    }
    for (const r of respawn.slice())
      if ((r.t -= dt) <= 0) {
        respawn.splice(respawn.indexOf(r), 1);
        if (!VEH.some(v => v.spot === r.spot && v.own === -1)) parkNpc(r.spot);
      }
  },
};
/** 길가의 남의 차를 가져갈 때 자리를 비운다 → 잠시 뒤 새 차가 선다 */
export function vacateSpot(v: Veh) {
  if (v.spot >= 0) respawn.push({spot: v.spot, t: 60});
  v.spot = -1;
}
void saveHooks;
