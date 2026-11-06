// 온사이트 실내 한 곳의 적재/해제 (W8 INTERIOR): 메시 그룹 + 충돌 교체 + 바닥 데크 + 그림 문/창 판 접기.
// 충돌: 건물 소유자(ns+owner)의 발자국 통짜 박스를 [외벽 조각(문 틈만 비움) + 가구·칸막이] 로 한 번에 교체하고(replaceSolids), 해제 때 되돌린다.
// 문짝이 닫혀 있으면 소유자 `<키>#door` 박스가 문 틈을 막는다. 바닥은 데크 두 장: 방 전체 + 문턱(문 틈~바깥 0.7m) → 비탈 대지에서도 마감 바닥 높이로 걷는다.
import {addDeck, removeDecksByOwner} from '../../core/deck.js';
import {removeSolidsByOwner, replaceSolids, solidsOwnedBy, type SolidSpec} from '../../core/solids.js';
import type {OnsiteInside} from '../../core/inside-state.js';
import {buildOnsiteRoom, type OnsiteRoom} from '../interior-onsite.js';
import {LINER, planRoom, purposeOfSource, type LocalBox, type RoomPlan} from '../interior-plan.js';
import {rotRad} from '../city/building.js';
import {sideFrame, wallToLocal, type ShellPlan} from './shell-plan.js';
import type {OnsiteBuilding} from './buildings.js';
import {setPlugHidden} from './onsite-plug.js';

export interface Loaded {
  rec: OnsiteBuilding;
  room: OnsiteRoom;
  rp: RoomPlan;
  key: string; doorKey: string; deckKey: string;
  snapshot: SolidSpec[];
  /** 문 열림 0(닫힘)~1(열림) · 목표 */
  open: number; target: 0 | 1;
  doorSolid: boolean;
  /** 마지막으로 문 근처에 사람이 있던 시각(ms): 자동문 닫기 지연 */
  lastNear: number;
  info: OnsiteInside;
  /** 월드 좌표의 문 틈 중심(마감 바닥 높이)과 바깥쪽 1u 지점 */
  door: {x: number; y: number; z: number; ox: number; oz: number; nx: number; nz: number};
  floorY: number;
}
/** 건물 로컬 → 월드 */
export function toWorld(rec: {x: number; z: number; rot: number}, lx: number, lz: number): {x: number; z: number} {
  const a = rotRad(rec.rot), c = Math.cos(a), s = Math.sin(a);
  return {x: rec.x + lx * c + lz * s, z: rec.z - lx * s + lz * c};
}
/** 충돌 핸들 → 입력 사양(되돌리기용 스냅샷) */
function specOf(s: any): SolidSpec {
  const lay: any = {};
  if (s.lo !== undefined) lay.lo = s.lo;
  if (s.hi !== undefined) lay.hi = s.hi;
  if (s.up) lay.up = true;
  if (s.obb) return {cx: s.obb.cx, cz: s.obb.cz, hx: s.obb.hx, hz: s.obb.hz, rotDeg: (Math.atan2(s.obb.s, s.obb.c) * 180) / Math.PI, ...lay};
  return {x0: s.x0, z0: s.z0, x1: s.x1, z1: s.z1, ...lay};
}
const boxSpec = (rec: OnsiteBuilding, b: LocalBox, base: number, lo = 0.2): SolidSpec => {
  const w = toWorld(rec, b.cx, b.cz);
  return {cx: w.x, cz: w.z, hx: b.hx, hz: b.hz, rotDeg: -rec.rot, lo: base + b.y0 - lo, hi: base + b.y1};
};
/** 외벽 조각(건물 로컬): 4면, 문 있는 벽은 문 틈만 비운다 */
export function wallBoxes(p: ShellPlan): LocalBox[] {
  const out: LocalBox[] = [];
  for (const side of ['s', 'n', 'e', 'w'] as const) {
    const f = sideFrame(side, p.w, p.d, p.t), spans: [number, number][] = [];
    if (side === p.door.side) spans.push([-f.len / 2, p.door.u - p.door.w / 2], [p.door.u + p.door.w / 2, f.len / 2]);
    else spans.push([-f.len / 2, f.len / 2]);
    for (const [u0, u1] of spans) {
      if (u1 - u0 < 0.01) continue;
      const m = wallToLocal(f, (u0 + u1) / 2, 0), along = side === 's' || side === 'n';
      out.push({cx: m.x, cz: m.z, hx: along ? (u1 - u0) / 2 : p.t / 2, hz: along ? p.t / 2 : (u1 - u0) / 2, y0: -1.2, y1: p.H + 1});
    }
  }
  return out;
}

export function loadRoom(scene: any, ns: string, rec: OnsiteBuilding, now: number): Loaded {
  const p = rec.plan,
    rp = planRoom(p, purposeOfSource(rec.src), rec.plan.seed),
    room = buildOnsiteRoom(p, rp),
    floorY = rec.y + p.floorTop,
    key = ns + rec.owner;
  room.group.position.set(rec.x, rec.y, rec.z);
  room.group.rotation.y = rotRad(rec.rot);
  room.group.name = 'onsite:' + rec.id;
  scene.add(room.group);
  // 충돌 교체(원자적): 발자국 통짜 → 외벽 조각 + 가구
  const snapshot = solidsOwnedBy(key).map(specOf);
  const specs: SolidSpec[] = [...wallBoxes(p).map(b => boxSpec(rec, b, rec.y, 0)), ...rp.boxes.map(b => boxSpec(rec, b, floorY))];
  replaceSolids(key, specs);
  // 바닥 데크
  const deckKey = key + '#floor', hx = p.w / 2 - p.t, hz = p.d / 2 - p.t, a = toWorld(rec, 0, -hz), b = toWorld(rec, 0, hz);
  const dn = p.door, ds = dn.w / 2, d0 = toWorld(rec, dn.x - dn.nx * (p.t / 2 + 0.3), dn.z - dn.nz * (p.t / 2 + 0.3)), d1 = toWorld(rec, dn.x + dn.nx * 0.7, dn.z + dn.nz * 0.7);
  addDeck({id: deckKey, ax: a.x, az: a.z, bx: b.x, bz: b.z, hw: hx, h0: floorY, h1: floorY}, deckKey);
  addDeck({id: deckKey + ':door', ax: d0.x, az: d0.z, bx: d1.x, bz: d1.z, hw: ds, h0: floorY, h1: floorY}, deckKey);
  setPlugHidden(rec.plug, true);
  // 문 틈 월드 위치
  const dc = toWorld(rec, dn.x, dn.z), out = toWorld(rec, dn.x + dn.nx, dn.z + dn.nz), nrm = toWorld({x: 0, z: 0, rot: rec.rot}, dn.nx, dn.nz);
  const spots = rp.localSpots.map(sp => {
    const w = toWorld(rec, sp.x, sp.z);
    return {...sp, x: w.x, z: w.z, y: floorY, ry: sp.ry !== undefined ? sp.ry + rp.ry + rotRad(rec.rot) : undefined};
  });
  const info: OnsiteInside = {
    id: rec.id, key, floorY, ceilY: rec.y + p.ceil, cx: rec.x, cz: rec.z, hx: hx - LINER, hz: hz - LINER, rotDeg: rec.rot, spots, grp: room.group,
  };
  const L: Loaded = {
    rec, room, rp, key, doorKey: key + '#door', deckKey, snapshot, open: 0, target: 0, doorSolid: false, lastNear: now, info, floorY,
    door: {x: dc.x, y: floorY, z: dc.z, ox: out.x, oz: out.z, nx: nrm.x, nz: nrm.z},
  };
  setDoorSolid(L, true);
  return L;
}
/** 닫힌 문짝이 문 틈을 막는 박스 켜기/끄기 */
export function setDoorSolid(L: Loaded, on: boolean): void {
  if (L.doorSolid === on) return;
  L.doorSolid = on;
  if (!on) { removeSolidsByOwner(L.doorKey); return; }
  const p = L.rec.plan;
  replaceSolids(L.doorKey, [boxSpec(L.rec, {cx: p.door.x, cz: p.door.z, hx: p.door.side === 's' || p.door.side === 'n' ? p.door.w / 2 : p.t / 2, hz: p.door.side === 's' || p.door.side === 'n' ? p.t / 2 : p.door.w / 2, y0: -0.2, y1: p.door.h}, L.floorY)]);
}
export function unloadRoom(scene: any, L: Loaded): void {
  removeSolidsByOwner(L.doorKey);
  L.doorSolid = false;
  L.snapshot.length ? replaceSolids(L.key, L.snapshot) : removeSolidsByOwner(L.key);
  removeDecksByOwner(L.deckKey);
  setPlugHidden(L.rec.plug, false);
  scene.remove(L.room.group);
  for (const g of L.room.geometries) g.dispose();
  L.room.group.clear();
}
