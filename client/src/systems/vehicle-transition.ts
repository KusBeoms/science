// 짧은 승하차 연출. 차량/저장 상태는 vehicle.ts가 확정하고 이 모듈은 기존 캐릭터 관절만 움직인다.
import {G} from '../core/runtime.js';
import {groundH, solidAt, walkable} from '../core/terrain.js';
import {walkingExit, type ExitPoint} from '../core/exit-position.js';
import {carOf} from '../data/cars.js';
import type {Veh} from './vehicle.js';

const DURATION = 0.66, smooth = (t: number) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
type Motion = {v: Veh; entering: boolean; t: number; path: ExitPoint[]; seat: ExitPoint; end: ExitPoint;
  actor: any; heading: number; yaw: number; pose: {part: any; x: number; y: number; z: number}[];
  expected: ExitPoint; vx: number; vz: number; finish: () => void; valid: () => boolean};
let motion: Motion | null = null;
export const vehicleTransitionActive = () => motion !== null;
const position = (p: {x: number; y: number; z: number}): ExitPoint => ({x: p.x, y: p.y, z: p.z});
const dist = (a: ExitPoint, b: ExitPoint) => Math.hypot(a.x - b.x, a.z - b.z);

/** 보행 접근은 차량 모서리 바깥으로 돌아가며, 마지막 문→좌석 구간만 연출상 차 안으로 들어간다. */
function entryPath(v: Veh): ExitPoint[] | null {
  const t = carOf(v.t), start = position(G.me.pos), cs = Math.cos(v.h), sn = Math.sin(v.h), r = v.solid;
  const hx = (t.wid * Math.abs(cs) + t.len * Math.abs(sn)) / 2,
    hz = (t.wid * Math.abs(sn) + t.len * Math.abs(cs)) / 2,
    side = Math.min((hx + 0.75) / (Math.abs(cs) || 1e-9), (hz + 0.75) / (Math.abs(sn) || 1e-9));
  const doors = [1, -1].map(s => walkingExit(v.x + cs * s * side, v.z - sn * s * side, v.y)).filter((p): p is ExitPoint => !!p);
  if (!doors.length) return null;
  const corners: ExitPoint[] = [];
  if (r) for (const x of [r.x0 - 0.7, r.x1 + 0.7]) for (const z of [r.z0 - 0.7, r.z1 + 0.7]) {
    const y = groundH(x, z, v.y); if (Number.isFinite(y)) corners.push({x, y, z});
  }
  const at = [start, ...doors, ...corners], cost = at.map(() => Infinity), prev = at.map(() => -1), done = new Set<number>();
  const clear = (a: ExitPoint, b: ExitPoint) => {
    let p = a; const n = Math.max(1, Math.ceil(dist(a, b) / 0.25));
    for (let i = 1; i <= n; i++) {
      const x = a.x + (b.x - a.x) * i / n, z = a.z + (b.z - a.z) * i / n, y = groundH(x, z, p.y);
      if (!Number.isFinite(y) || solidAt(x, z, 0.42, y) || !walkable(p.x, p.z, p.y, x, z)) return false;
      p = {x, y, z};
    }
    return true;
  };
  cost[0] = 0;
  while (done.size < at.length) {
    let u = -1;
    for (let i = 0; i < at.length; i++) if (!done.has(i) && (u < 0 || cost[i] < cost[u])) u = i;
    if (u < 0 || !Number.isFinite(cost[u])) break;
    if (u > 0 && u <= doors.length) {
      const out: ExitPoint[] = []; for (let i = u; i >= 0; i = prev[i]) out.push(at[i]);
      return out.reverse();
    }
    done.add(u);
    for (let i = 1; i < at.length; i++) if (!done.has(i)) {
      const d = cost[u] + dist(at[u], at[i]);
      if (d < cost[i] && clear(at[u], at[i])) {cost[i] = d; prev[i] = u;}
    }
  }
  return null;
}
function restore(m: Motion) {
  for (const p of m.pose) p.part.rotation.set(p.x, p.y, p.z);
  m.actor.rotation.x = m.actor.rotation.z = 0;
  m.actor.vy = 0;
}
/** Force callers settle outside before their teleport/arrest; external relocation keeps its new position. */
export function cancelVehicleTransition(preservePosition = false) {
  const m = motion; if (!m) return;
  motion = null; restore(m);
  if (!preservePosition) m.actor.pos.set(m.end.x, m.end.y, m.end.z);
  m.actor.visible = true;
  G.target = null; G.pickOv = null;
}
export function cancelVehicleTransitionFor(v: Veh) {if (motion?.v === v) cancelVehicleTransition();}
function begin(v: Veh, entering: boolean, path: ExitPoint[], end: ExitPoint, finish: () => void, valid: () => boolean) {
  const actor = G.me, t = carOf(v.t), door = path[path.length - 1],
    side = Math.sign((door.x - v.x) * Math.cos(v.h) - (door.z - v.z) * Math.sin(v.h)) || 1;
  const seat = {x: v.x + Math.cos(v.h) * side * t.wid * 0.18, y: v.y - 0.35, z: v.z - Math.sin(v.h) * side * t.wid * 0.18};
  const pose = ['armL', 'armR', 'legL', 'legR'].map(k => actor.userData[k]).filter(Boolean)
    .map(part => ({part, x: part.rotation.x, y: part.rotation.y, z: part.rotation.z}));
  motion = {v, entering, path, seat, end, actor, heading: v.h, yaw: actor.rotation.y, pose, expected: position(actor.pos),
    vx: v.x, vz: v.z, t: 0, finish, valid};
  G.sit = null; G.target = null; G.pickOv = null; actor.vy = 0; v.v = 0; actor.visible = true;
  if (!entering) {actor.pos.set(seat.x, seat.y, seat.z); motion.expected = position(actor.pos);}
}
export function beginVehicleEntry(v: Veh, finish: () => void, valid: () => boolean): boolean {
  if (motion || !G.me || G.drive || G.inside) return false;
  const path = entryPath(v); if (!path) return false;
  begin(v, true, path, position(G.me.pos), finish, valid);
  return true;
}
export function beginVehicleExit(v: Veh, out: ExitPoint, valid: () => boolean) {
  begin(v, false, [out], out, () => {}, valid);
}
function along(path: ExitPoint[], f: number): ExitPoint {
  let total = 0; for (let i = 1; i < path.length; i++) total += dist(path[i - 1], path[i]);
  let d = total * f;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], len = dist(a, b);
    if (d <= len || i === path.length - 1) {const k = len ? Math.min(1, d / len) : 1; return {x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k};}
    d -= len;
  }
  return path[0];
}
export function updateVehicleTransition(dt: number) {
  const m = motion; if (!m) return;
  if (G.me !== m.actor || !m.valid() || Math.hypot(m.v.x - m.vx, m.v.z - m.vz) > 0.1) {cancelVehicleTransition(!!(G.drive || G.inside || G.jail)); return;}
  if (Math.hypot(m.actor.pos.x - m.expected.x, m.actor.pos.y - m.expected.y, m.actor.pos.z - m.expected.z) > 0.2) {cancelVehicleTransition(true); return;}
  if (dt <= 0) return;
  m.t = Math.min(1, m.t + dt / DURATION);
  const f = m.entering ? m.t : 1 - m.t, approach = smooth(f / 0.48), tuck = smooth((f - 0.48) / 0.52),
    door = m.path[m.path.length - 1], p = along(m.path, approach), a = m.actor, rig = a.userData;
  a.pos.set(p.x + (m.seat.x - door.x) * tuck, p.y + (m.seat.y - door.y) * tuck, p.z + (m.seat.z - door.z) * tuck);
  const last = m.path[Math.max(0, m.path.length - 2)],
    walkingHeading = m.path.length > 1 ? Math.atan2(door.x - last.x, door.z - last.z) : m.heading,
    heading = walkingHeading + Math.atan2(Math.sin(m.heading - walkingHeading), Math.cos(m.heading - walkingHeading)) * smooth((f - 0.3) / 0.4);
  a.rotation.y = m.yaw + Math.atan2(Math.sin(heading - m.yaw), Math.cos(heading - m.yaw)) * smooth(m.t * 4);
  a.rotation.x = 0.22 * Math.sin(Math.PI * tuck); a.rotation.z = -0.13 * Math.sin(Math.PI * tuck);
  const step = Math.sin(approach * Math.PI * 4) * 0.65 * (1 - tuck);
  if (rig.legL) rig.legL.rotation.x = step - tuck * 1.25;
  if (rig.legR) rig.legR.rotation.x = -step - tuck * 0.95;
  if (rig.armL) rig.armL.rotation.x = -step * 0.6 - Math.sin(tuck * Math.PI) * 1.1;
  if (rig.armR) rig.armR.rotation.x = step * 0.6 - Math.sin(tuck * Math.PI) * 0.65;
  m.expected = position(a.pos);
  if (m.t >= 1) {
    motion = null; restore(m);
    if (!m.entering) {a.pos.set(m.end.x, m.end.y, m.end.z); a.visible = true;}
    m.finish();
  }
}
