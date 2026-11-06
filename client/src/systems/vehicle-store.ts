// 논리 차량 저장소 (W8 P2-b): 차량의 "있다/없다"와 상태를 렌더 객체(mesh·충돌체)와 분리해 보관한다.
// 렌더 활성/해제는 systems/vehicle.ts(activateVehicle/deactivateVehicle), 거리 정책은 systems/vehicle-stream.ts.
// 이 파일은 three.js 를 쓰지 않는다 (순수 데이터 + 시드 배정 + 주차 슬롯 공급자).
import {CARS, PAINTS, type CarType} from '../data/cars.js';
import {mulberry32} from '../render/lowpoly/rng.js';
import type {Solid} from '../core/solids.js';
import type {CarDmg} from './vehicle-damage.js';

/** 논리 상태: parked(길가 남의 차) · driven(지금 운전 중) · stolen(시승/개조 대기) · owned(내 차) · police */
export type VehState = 'parked' | 'driven' | 'stolen' | 'owned' | 'police';

export interface Veh {
  /** 논리 차량 ID (렌더 활성/해제와 무관하게 유지) */
  id: string;
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
  /** 렌더 객체: 활성 상태일 때만 있다 (null = 해제됨) */
  grp: any;
  /** S.cars.list 의 인덱스, −1 = 길가의 남의 차, −2 = 훔쳐 타고 있는 임시 차(자리 없음), −3~−5 경찰 */
  own: number;
  /** 주차 슬롯 ID ('' = 슬롯 없음: 비워졌거나 슬롯 없이 생긴 차) */
  slot: string;
  /** 슬롯을 비운 시각(스토어 시계, 초). 0 = 비운 적 없음 */
  vacatedAt: number;
  /** 활성 상태의 충돌체 (해제 시 null) */
  solid: Solid | null;
  age: number;
  /** 파손 상태 (systems/vehicle-damage.ts 가 처음 볼 때 채운다). 렌더 해제 후에도 유지된다 */
  d?: CarDmg;
}

/** 주차 슬롯 공급자 계약: 현재는 길가 계산(parking-slots.ts), 나중에 city.compiled.json 의 주차칸이 같은 모양으로 들어온다 */
export interface ParkingSlot {
  id: string;
  x: number;
  z: number;
  h: number;
  y: number;
  kind: 'road' | 'lot' | 'garage' | 'private';
}
export type SlotProvider = () => ParkingSlot[];

// ---------- 논리 차량 레코드 ----------
const records = new Map<string, Veh>();
let seq = 0;
export const newVehicleId = (prefix = 'v') => `${prefix}${++seq}`;
export const recordList = (): Veh[] => [...records.values()];
export const recordById = (id: string): Veh | undefined => records.get(id);
export const hasRecord = (v: Veh) => records.get(v.id) === v;
export const recordCount = () => records.size;
export function addRecord(v: Veh): Veh {
  records.set(v.id, v);
  return v;
}
export function dropRecord(v: Veh): boolean {
  return records.get(v.id) === v && records.delete(v.id);
}
export function stateOf(v: Veh, driven: Veh | null): VehState {
  if (driven === v) return 'driven';
  if (v.own <= -3) return 'police';
  if (v.own === -1) return 'parked';
  if (v.own === -2) return 'stolen';
  return 'owned'; // own>=0: 훔친/개조 대기 여부는 S.cars.list[own].stolen (호출 쪽에서 구분)
}

// ---------- 주차 슬롯 ----------
let provider: SlotProvider | null = null;
let slotCache: ParkingSlot[] | null = null;
let slotIndex = new Map<string, ParkingSlot>();
export function setSlotProvider(p: SlotProvider | null) {
  provider = p;
  slotCache = null;
}
export const hasSlotProvider = () => provider !== null;
export function parkingSlots(): readonly ParkingSlot[] {
  if (!slotCache) {
    slotCache = provider ? provider() : [];
    slotIndex = new Map(slotCache.map(s => [s.id, s]));
  }
  return slotCache;
}
export const slotById = (id: string): ParkingSlot | undefined => (parkingSlots(), slotIndex.get(id));

// ---------- 시드 기반 슬롯 배정: 같은 슬롯(+세대)은 언제나 같은 차종·색 ----------
const SEED = 77;
export function strHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const pickType = (r: () => number): CarType => {
  const tot = CARS.reduce((a, c) => a + c.spawn, 0);
  let x = r() * tot;
  for (const c of CARS) if ((x -= c.spawn) < 0) return c;
  return CARS[2];
};
/** 슬롯이 비었다가 새 차로 채워질 때마다 세대(gen)가 올라 다른 차가 선다 */
const gens = new Map<string, number>();
export const slotGen = (id: string) => gens.get(id) ?? 0;
export function slotLook(id: string, gen = slotGen(id)): {t: string; c: number} {
  const r = mulberry32((strHash(id) ^ Math.imul(gen + 1, 0x9e3779b1) ^ SEED) >>> 0);
  const t = pickType(r);
  return {t: t.id, c: PAINTS[Math.floor(r() * PAINTS.length)] ?? t.color};
}
/** 처음 차가 서 있을 슬롯 선택: 시드 섞기로 일정 수만 (슬롯이 많아져도 같은 방식으로 늘릴 수 있다) */
export function initialOccupied(slots: readonly ParkingSlot[], count: number, seed = 5): ParkingSlot[] {
  const rnd = mulberry32(seed),
    a = slots.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(count, a.length));
}

// ---------- 슬롯 비움 → 재생성 타이머 ----------
let clock = 0;
export const storeClock = () => clock;
const respawnQ: {slot: string; t: number}[] = [];
export const RESPAWN_SEC = 60;
export function vacateSlot(v: Veh) {
  if (v.slot) respawnQ.push({slot: v.slot, t: RESPAWN_SEC});
  v.vacatedAt = clock;
  v.slot = '';
}
/** 시간 진행: 타이머가 다 된 슬롯 ID 마다 fill(slotId) 호출 (세대 +1) */
export function tickRespawn(dt: number, fill: (slotId: string) => void) {
  clock += dt;
  for (const r of respawnQ.slice())
    if ((r.t -= dt) <= 0) {
      respawnQ.splice(respawnQ.indexOf(r), 1);
      gens.set(r.slot, slotGen(r.slot) + 1);
      fill(r.slot);
    }
}
export const pendingRespawns = () => respawnQ.map(r => ({...r}));
export const slotOccupied = (id: string) => recordList().some(v => v.slot === id);
