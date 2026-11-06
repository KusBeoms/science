// 온사이트 실내 거리 스트리밍·문·실내 상태 (W8 INTERIOR). 도시 핸들(render/citygen/index.ts)마다 하나.
//  - 적재: 문에서 LOAD_R(15u) 안, 동시 MAX_LOADED(3). 해제: UNLOAD_R(25u) 밖이고 고정(pin)되지 않았을 때. 사이는 히스테리시스.
//  - 고정(pin): 플레이어가 실내이거나 문 3u 안, 문이 움직이는 중, 외부 pin(NPC 등: pin()/addPresence()).
//  - 실내 판정: 플레이어 발 위치가 내부 유효 영역(회전 박스) 안이면 insideBuilding(core/inside-state.ts) → G.inside 호환 객체, 바깥 어둡기 목표 1.
//  - 문: 닫힘이 기본. 가게류는 자동문(접근하면 열리고 멀어지면 닫힘), 집·아파트는 E 로 토글. 문 틈에 사람이 있으면 닫지 않는다.
import {G} from '../../core/runtime.js';
import {inOnsiteRect, setOnsiteInside, onsiteInside} from '../../core/inside-state.js';
import {setInteriorDarkTarget} from '../interior-dark.js';
import {setInteriorTone} from '../interior-onsite.js';
import type {OnsiteBuilding} from './buildings.js';
import {loadRoom, setDoorSolid, unloadRoom, type Loaded} from './onsite-load.js';

export const LOAD_R = 15, UNLOAD_R = 25, MAX_LOADED = 3;
const DOOR_S = 0.35, OPEN_RAD = 1.75, STREAM_MS = 100;
const AUTO_PURPOSE = new Set(['house', 'apartment', 'lodge', 'barn']);

export interface DoorView {
  id: string; x: number; y: number; z: number; ox: number; oz: number;
  open: number; target: 0 | 1; auto: boolean;
}
export interface OnsiteManager {
  /** 매 프레임(또는 임의 시점): 스트리밍(100ms 간격)·문 애니메이션·실내 판정. pos 생략 시 G.me.pos */
  update(pos?: {x: number; y: number; z: number}, opt?: {now?: number; force?: boolean}): void;
  loadedIds(): string[];
  isLoaded(id: string): boolean;
  insideId(): string | null;
  doors(): DoorView[];
  /** E 로 문 열기/닫기. 문 틈에 사람이 있어 닫을 수 없으면 false */
  toggleDoor(id: string): boolean;
  pin(id: string, who: string): void;
  unpin(id: string, who: string): void;
  addPresence(fn: (id: string) => boolean): void;
  /** 시험/진단 */
  forceLoad(id: string): boolean;
  forceUnload(id: string): boolean;
  loadedOf(id: string): Loaded | undefined;
  stats(): {loaded: number; records: number; loads: number; unloads: number; maxLoaded: number};
  /** 플레이어를 실내 밖으로 취급(택시 순간이동 등 외부 이동 직전). 다음 update 에서 위치로 다시 판정한다 */
  leaveInside(): void;
  dispose(): void;
}
export const managers = new Set<OnsiteManager>();

export function createOnsiteManager(scene: any, ns: string, records: readonly OnsiteBuilding[]): OnsiteManager {
  const byId = new Map<string, OnsiteBuilding>(), loaded = new Map<string, Loaded>(), pins = new Map<string, Set<string>>(), presence: ((id: string) => boolean)[] = [];
  for (const r of records) byId.set(r.id, r);
  // 문 바깥 1u 지점(월드): 거리 판정 기준 — 로드 전에도 계산
  const doorPt = new Map<string, {x: number; z: number}>();
  for (const r of records) {
    const a = (r.rot * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), dx = r.plan.door.x + r.plan.door.nx, dz = r.plan.door.z + r.plan.door.nz;
    doorPt.set(r.id, {x: r.x + dx * c + dz * s, z: r.z - dx * s + dz * c});
  }
  let lastStream = -1e9, lastNow = 0, inside: Loaded | null = null, loads = 0, unloads = 0, maxSeen = 0, disposed = false;
  const dist = (id: string, p: {x: number; z: number}) => { const d = doorPt.get(id)!; return Math.hypot(d.x - p.x, d.z - p.z); };
  const near = (L: Loaded, p: {x: number; z: number}, r: number) => Math.hypot(L.door.x - p.x, L.door.z - p.z) < r;
  const auto = (L: Loaded) => !AUTO_PURPOSE.has(L.rp.purpose);

  const doLoad = (id: string, now: number): boolean => {
    const rec = byId.get(id);
    if (!rec || loaded.has(id)) return false;
    loaded.set(id, loadRoom(scene, ns, rec, now));
    loads++;
    maxSeen = Math.max(maxSeen, loaded.size);
    return true;
  };
  const doUnload = (id: string): boolean => {
    const L = loaded.get(id);
    if (!L) return false;
    if (inside === L) { inside = null; setOnsiteInside(null); setInteriorDarkTarget(0); }
    unloadRoom(scene, L);
    loaded.delete(id);
    unloads++;
    return true;
  };
  const pinned = (L: Loaded, p: {x: number; z: number}): boolean =>
    inside === L || near(L, p, 3) || (L.open > 0.01 && L.open < 0.99) || (pins.get(L.rec.id)?.size ?? 0) > 0 || presence.some(f => f(L.rec.id));

  function stream(p: {x: number; z: number}, now: number) {
    // 해제: 멀고 고정되지 않은 것
    for (const [id, L] of loaded) if (dist(id, p) > UNLOAD_R && !pinned(L, p)) doUnload(id);
    // 적재 후보: 가까운 순, 프레임당 1건
    let best: string | null = null, bd = LOAD_R;
    for (const r of records) {
      if (loaded.has(r.id)) continue;
      const d = dist(r.id, p);
      if (d < bd) [best, bd] = [r.id, d];
    }
    if (!best) return;
    if (loaded.size >= MAX_LOADED) {
      // 가장 먼 비고정 항목이 후보보다 멀면 밀어낸다
      let worst: string | null = null, wd = bd;
      for (const [id, L] of loaded) { const d = dist(id, p); if (d > wd && !pinned(L, p)) [worst, wd] = [id, d]; }
      if (!worst) return;
      doUnload(worst);
    }
    doLoad(best, now);
  }
  function animate(p: {x: number; y: number; z: number}, now: number, dt: number) {
    const night = G.night > 0;
    setInteriorTone(night ? 1 : 0);
    for (const L of loaded.values()) {
      const nearDoor = near(L, p, 2.6);
      if (nearDoor) L.lastNear = now;
      if (auto(L)) {
        if (nearDoor) L.target = 1;
        else if (now - L.lastNear > 1500 && !near(L, p, 1.3)) L.target = 0;
      }
      const step = dt / DOOR_S, was = L.open;
      L.open = L.target > L.open ? Math.min(1, L.open + step) : Math.max(0, L.open - step);
      if (L.open !== was) L.room.door.pivot.rotation.y = L.room.door.closedRy + L.open * OPEN_RAD;
      // 충돌 박스는 열림이 시작되면 즉시 빼고, 완전히 닫혔을 때만 다시 넣는다(틈에 사람이 있으면 넣지 않는다)
      if (L.open > 0.02) setDoorSolid(L, false);
      else if (L.target === 0 && !near(L, p, 0.9)) setDoorSolid(L, true);
    }
  }
  function judge(p: {x: number; y: number; z: number}) {
    let now: Loaded | null = null;
    for (const L of loaded.values()) {
      if (inOnsiteRect(L.info, p.x, p.z, inside === L ? 0.25 : 0) && Math.abs(p.y - L.floorY) < (inside === L ? 1.6 : 1.0)) { now = L; break; }
    }
    if (now !== inside) {
      inside = now;
      setOnsiteInside(now ? now.info : null);
      setInteriorDarkTarget(now ? 1 : 0);
    } else if (inside) setOnsiteInside(inside.info);
  }

  const m: OnsiteManager = {
    update(pos, opt = {}) {
      if (disposed) return;
      const p = pos ?? G.me?.pos;
      if (!p || !Number.isFinite(p.x + p.z)) return;
      const now = opt.now ?? performance.now(), dt = lastNow ? Math.min(0.1, Math.max(0, (now - lastNow) / 1000)) : 0;
      lastNow = now;
      if (opt.force || now - lastStream >= STREAM_MS) { lastStream = now; stream(p, now); }
      judge(p as any);
      animate(p as any, now, dt);
    },
    loadedIds: () => [...loaded.keys()],
    isLoaded: id => loaded.has(id),
    insideId: () => inside?.rec.id ?? null,
    doors: () => [...loaded.values()].map(L => ({id: L.rec.id, x: L.door.x, y: L.door.y, z: L.door.z, ox: L.door.ox, oz: L.door.oz, open: L.open, target: L.target, auto: auto(L)})),
    toggleDoor(id) {
      const L = loaded.get(id);
      if (!L) return false;
      const p = G.me?.pos;
      if (L.target === 1 && p && near(L, p, 0.9)) return false; // 문 틈에 서 있으면 닫을 수 없다
      L.target = L.target === 1 ? 0 : 1;
      L.lastNear = performance.now();
      return true;
    },
    pin(id, who) { (pins.get(id) || pins.set(id, new Set()).get(id)!).add(who); },
    unpin(id, who) { const s = pins.get(id); if (s) { s.delete(who); if (!s.size) pins.delete(id); } },
    addPresence(fn) { presence.push(fn); },
    forceLoad: id => doLoad(id, performance.now()),
    forceUnload: id => doUnload(id),
    loadedOf: id => loaded.get(id),
    stats: () => ({loaded: loaded.size, records: records.length, loads, unloads, maxLoaded: maxSeen}),
    leaveInside() {
      if (inside) { inside = null; setOnsiteInside(null); setInteriorDarkTarget(0); }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const id of [...loaded.keys()]) doUnload(id);
      if (onsiteInside() === null) setInteriorDarkTarget(0);
      managers.delete(m);
    },
  };
  managers.add(m);
  return m;
}
