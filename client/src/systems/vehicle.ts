// 차량 월드: 길가에 세워 둔 차(훔칠 수 있음)·내 차 생성/보관, 운전 물리, 내리기. 모델은 render/vehicle.ts, 데이터 data/cars.ts, 구매·튜닝·등록은 game/cars.ts.
import {walkingExit, type ExitPoint} from '../core/exit-position.js';
import {toast} from '../game/hud.js';
import {S, save, saveHooks} from '../core/state.js';
import {G} from '../core/runtime.js';
import {addDynSolid, dropDynSolid, groundH, solidAt, walkable} from '../core/terrain.js';
import {PAINTS, carOf} from '../data/cars.js';
import {buildCar} from '../render/vehicle.js';
import type {GameSystem, OwnedCar} from '../core/types.js';
import {addRecord, dropRecord, hasSlotProvider, initialOccupied, newVehicleId, parkingSlots, recordById, recordList, setSlotProvider, slotById, slotGen, slotLook, slotOccupied, tickRespawn, vacateSlot, type Veh} from './vehicle-store.js';
import {roadSideSlots} from './parking-slots.js';
import {sanitizeOwnedCars} from './vehicle-safety.js';
import {beginVehicleEntry, beginVehicleExit, cancelVehicleTransition, cancelVehicleTransitionFor, updateVehicleTransition, vehicleTransitionActive} from './vehicle-transition.js';

export type {Veh, VehState, ParkingSlot} from './vehicle-store.js';
/** 렌더 활성(mesh+충돌체가 있는) 차량만 들어 있다. 논리 레코드 전체는 vehicle-store.ts 의 recordList() */
export const VEH: Veh[] = [];
let ready = false;
/** 렌더 객체를 가진 차의 충돌체 소유자 표식 (dyn 충돌체는 핸들로 해제한다) */
export const vehOwnerId = (v: Veh) => `veh:${v.id}`;

export function syncSolid(v: Veh) {
  dropDynSolid(v.solid);
  v.solid = null;
  if (G.drive === v || !v.grp) return; // 운전 중이거나 렌더 해제된 차는 충돌체가 없다
  const t = carOf(v.t),
    c = Math.abs(Math.cos(v.h)),
    s = Math.abs(Math.sin(v.h)),
    hx = (t.wid * c + t.len * s) / 2,
    hz = (t.wid * s + t.len * c) / 2;
  v.solid = addDynSolid(v.x - hx, v.z - hz, v.x + hx, v.z + hz);
  Object.assign(v.solid, {lo: v.y - 1.4, hi: v.y + 3, owner: vehOwnerId(v)}); // 고가 층 구분(입체교차로): 위·아래 차는 서로 막지 않는다
}
export function placeMesh(v: Veh) {
  if (!v.grp) return;
  v.grp.position.set(v.x, v.y, v.z);
  v.grp.rotation.y = v.h;
}
/** 메시를 장면에서 빼고 지오메트리를 해제한다 (재질은 공유 keep 재질이라 건드리지 않는다) */
function disposeGrp(grp: any) {
  if (!grp) return;
  G.scene.remove(grp);
  grp.traverse?.((o: any) => o.geometry?.dispose());
}
function mkMesh(v: Veh) {
  disposeGrp(v.grp);
  v.grp = buildCar({t: v.t, c: v.c, eng: v.eng, tire: v.tire, neon: v.neon});
  G.scene.add(v.grp);
  placeMesh(v);
}

// ---------- 논리 레코드 생성/삭제 ----------
/** 논리 차량만 만든다 (렌더 객체 없음). activateVehicle 로 화면에 올린다 */
export function createVehicle(o: Partial<Veh> & {t: string; x: number; z: number}): Veh {
  const v: Veh = {id: o.id ?? newVehicleId(), c: PAINTS[0], eng: 0, tire: 0, neon: 0, y: 0, h: 0, v: 0, grp: null, own: -1, slot: '', vacatedAt: 0, solid: null, age: 0, ...o};
  if (o.y === undefined) {
    v.y = groundH(v.x, v.z);
    if (v.y === -Infinity) v.y = 0;
  }
  return addRecord(v);
}
/** 논리 삭제 + 렌더 해제 (예전 removeVeh 의 의미). 레코드가 사라진다 */
export function logicalRemove(v: Veh) {
  cancelVehicleTransitionFor(v);
  renderRelease(v);
  dropRecord(v);
}
/** 렌더만 해제: 메시·충돌체를 지우고 레코드(위치·파손·타이머)는 남긴다. 거리 정책 가드 없음 */
export function renderRelease(v: Veh) {
  cancelVehicleTransitionFor(v);
  dropDynSolid(v.solid);
  v.solid = null;
  disposeGrp(v.grp);
  v.grp = null;
  if (v.d) v.d.grp = null; // 다시 켜질 때 찌그러짐을 새 메시에 다시 입힌다
  const i = VEH.indexOf(v);
  if (i >= 0) VEH.splice(i, 1);
}
export const isActive = (v: Veh) => v.grp !== null;
/** 거리 정책으로 렌더를 해제해도 되는 차: 길가의 남의 차만. 운전·승하차·내 차·임시 시승·경찰은 제외 */
export const streamable = (v: Veh) => v.own === -1 && G.drive !== v && !vehicleTransitionActive();
/** 렌더 객체(mesh+충돌체)를 만든다. 이미 켜져 있거나 레코드가 없으면 false */
export function activateVehicle(id: string): boolean {
  const v = recordById(id);
  if (!v || v.grp || !G.scene) return false;
  mkMesh(v);
  syncSolid(v);
  VEH.push(v);
  return true;
}
/** 렌더 객체를 해제한다 (레코드 유지). 운전·승하차 중이거나 스트리밍 대상이 아니면 false */
export function deactivateVehicle(id: string): boolean {
  const v = recordById(id);
  if (!v || !v.grp || !streamable(v)) return false;
  renderRelease(v);
  return true;
}
export function spawnVeh(o: Partial<Veh> & {t: string; x: number; z: number}): Veh {
  const v = createVehicle(o);
  activateVehicle(v.id);
  return v;
}
/** 호환: 논리 삭제와 렌더 해제를 함께 한다 */
export const removeVeh = logicalRemove;
export const vehOfOwn = (i: number) => recordList().find(v => v.own === i);
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
  if (v.grp) mkMesh(v);
}
/** 슬롯에 NPC 주차 차를 논리적으로 세운다 (화면에는 stream 이 가까울 때 올린다) */
function parkNpc(slotId: string) {
  const p = slotById(slotId);
  if (!p || slotOccupied(slotId)) return;
  const look = slotLook(slotId);
  createVehicle({id: `p:${slotId}:${slotGen(slotId)}`, ...look, x: p.x, z: p.z, y: p.y, h: p.h, slot: slotId});
}
function ensure() {
  if (ready || !G.scene || !G.started) return;
  ready = true;
  if (!hasSlotProvider()) setSlotProvider(roadSideSlots);
  initialOccupied(parkingSlots(), 26).forEach(s => parkNpc(s.id));
  // 저장된 내 차: 벽·물·땅 밖이면 안전한 자리로 옮긴 뒤 꺼낸다
  sanitizeOwnedCars(S.cars.list, (x, z) => recordList().some(v => Math.hypot(v.x - x, v.z - z) < 5));
  S.cars.list.forEach((o, i) => !o.stored && spawnOwned(i));
}

export function enterVeh(v: Veh, animate = false): boolean {
  if (animate) {
    if (vehicleTransitionActive()) return false;
    const ok = beginVehicleEntry(v, () => {enterVeh(v);}, () => VEH.includes(v) && !v.d?.broken && !G.drive && !G.inside && !G.jail);
    if (!ok) toast('차 옆으로 가까이 이동해 주세요');
    return ok;
  }
  cancelVehicleTransition();
  G.drive = v;
  G.sit = null;
  syncSolid(v);
  G.me.visible = false;
  G.me.pos.set(v.x, v.y, v.z);
  G.me.vy = 0;
  G.target = null;
  return true; // 카메라는 수동 시야를 유지하며 camera.ts가 별도 복귀시킨다.
}
/** Normal exits commit only after a free walking location exists. Force callers immediately relocate. */
export function exitVeh(force = false, animate = false): boolean {
  if (force) cancelVehicleTransition();
  else if (vehicleTransitionActive()) return false;
  const v: Veh | null = G.drive;
  if (!v) return false;
  const t = carOf(v.t), rx = Math.cos(v.h), rz = -Math.sin(v.h), fx = Math.sin(v.h), fz = Math.cos(v.h);
  const hx = (t.wid * Math.abs(rx) + t.len * Math.abs(fx)) / 2,
    hz = (t.wid * Math.abs(rz) + t.len * Math.abs(fz)) / 2;
  v.v = 0;
  G.drive = null;
  // Include the parked car's final AABB, especially when it is diagonal, in every candidate check.
  syncSolid(v);
  let exit: ExitPoint | null = null;
  const side = Math.min((hx + 0.8) / (Math.abs(rx) || 1e-9), (hz + 0.8) / (Math.abs(rz) || 1e-9));
  const front = Math.min((hx + 0.8) / (Math.abs(fx) || 1e-9), (hz + 0.8) / (Math.abs(fz) || 1e-9));
  for (const extra of [0, 0.8, 1.6]) {
    sides: for (const sign of [1, -1]) for (const along of [0, t.len * 0.3, -t.len * 0.3]) {
      const x = v.x + rx * sign * (side + extra) + fx * along,
        z = v.z + rz * sign * (side + extra) + fz * along;
      exit = walkingExit(x, z, v.y);
      if (exit) break sides;
    }
    if (exit) break;
  }
  if (!exit) for (const sign of [1, -1]) {
    exit = walkingExit(v.x + fx * sign * front, v.z + fz * sign * front, v.y);
    if (exit) break;
  }
  if (!exit && !force) {
    G.drive = v;
    syncSolid(v); // rollback: a driven car never blocks its own driver
    toast('내릴 공간이 없습니다. 차를 조금 옮겨 주세요');
    return false;
  }
  G.me.visible = true;
  G.sit = null;
  G.target = null;
  G.pickOv = null;
  const out = exit || {x: v.x, y: v.y, z: v.z};
  G.me.pos.set(out.x, out.y, out.z);
  G.me.vy = 0;
  if (v.own >= 0 && S.cars.list[v.own]) Object.assign(S.cars.list[v.own], {x: v.x, z: v.z, h: v.h});
  v.age = 0;
  save();
  if (animate && !force) beginVehicleExit(v, out, () => VEH.includes(v) && !G.drive && !G.inside && !G.jail);
  return true;
}

/** 차 물리 한 걸음: fw −1~1(가속/후진), st −1~1(왼쪽+), brake 제동. 운전과 경찰 AI 가 같이 쓴다. 부딪히면 true */
export function stepVehicle(v: Veh, fw: number, st: number, brake: boolean, dt: number, vmul = 1): boolean {
  stepMod.fw = fw;
  stepMod.vmul = vmul;
  for (const f of stepMods) f(v, stepMod, dt);
  fw = stepMod.fw;
  vmul = stepMod.vmul;
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
    solidAt(x, z, rad, v.y) || solidAt(x + fx, z + fz, rad, v.y) || solidAt(x - fx, z - fz, rad, v.y) || !walkable(v.x, v.z, v.y, x, z) || groundH(x + fx, z + fz, v.y) === -Infinity;
  let bumped = false;
  if (hit(nx, nz)) {
    for (const f of bumpHooks) f(v, v.v, nx, nz);
    v.v *= -0.3;
    bumped = true;
  } else {
    v.x = nx;
    v.z = nz;
  }
  const gy = groundH(v.x, v.z, v.y);
  if (gy > -Infinity) v.y += (gy - v.y) * Math.min(1, dt * (gy > v.y ? 30 : 12)); // 오르막은 빨리 붙는다(램프)
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
  vehicleHooks.forEach(f => f(v, dt));
}
/** 가속 입력·최고속도 보정 훅 (파손·침수가 엔진 고장 시 fw=0 으로 만든다) */
export const stepMod = {fw: 0, vmul: 1};
export const stepMods: ((v: Veh, m: {fw: number; vmul: number}, dt: number) => void)[] = [];
/** 충돌 훅: (차, 부딪히기 직전 속도, 가려던 x, z) */
export const bumpHooks: ((v: Veh, speed: number, nx: number, nz: number) => void)[] = [];
/** 운전 중 매 프레임 불리는 훅 (시민 충돌 등) */
export const vehicleHooks: ((v: Veh, dt: number) => void)[] = [];

export const vehicleSystem: GameSystem = {
  id: 'vehicle',
  onSave() {
    recordList().forEach(v => v.own >= 0 && S.cars.list[v.own] && Object.assign(S.cars.list[v.own], {x: v.x, z: v.z, h: v.h}));
  },
  update(dt) {
    ensure();
    const transitioning = vehicleTransitionActive();
    updateVehicleTransition(dt);
    if (G.drive && !G.inside && !transitioning && !vehicleTransitionActive()) {
      const paused = G.modal !== null || G.shopOpen || G.quizOpen || G.dexOpen || (G.cine && G.cine.lock);
      if (!paused) drive(G.drive, dt);
    }
    // 임시(자리 없음) 훔친 차는 두고 가면 사라진다, 길가 자리는 일정 시간 뒤 새 차로 채운다
    for (const v of VEH.slice()) {
      if (v === G.drive) continue;
      if (v.own === -2 && (v.age += dt) > 90) removeVeh(v);
      if (v.own === -4 && (v.age += dt) > 12) removeVeh(v);
    }
    tickRespawn(dt, parkNpc); // 비운 슬롯은 60초 뒤 새 차(다음 세대)로 채운다
  },
};
/** 길가의 남의 차를 가져갈 때 자리를 비운다 → 잠시 뒤 새 차가 선다 */
export const vacateSpot = vacateSlot;
void saveHooks;
