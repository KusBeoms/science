// 세이브 보호 (13-1): 저장된 내 차 위치가 벽·물·땅 밖이면 안전한 차고 앞/주차 슬롯으로 옮긴다.
import {groundH, solidAt} from '../core/terrain.js';
import {waterAt} from '../core/water.js';
import {GARAGE_OUT, carOf} from '../data/cars.js';
import type {OwnedCar} from '../core/types.js';
import {parkingSlots} from './vehicle-store.js';

export interface Pose {x: number; z: number; h: number}
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** 이 자세에 차를 세워도 되는가: 땅 위·물 밖·정적/동적 충돌체와 안 겹침 (stepVehicle 의 충돌 검사와 같은 점들) */
export function poseIsSafe(t: string, p: Pose): boolean {
  if (!finite(p.x) || !finite(p.z) || !finite(p.h)) return false;
  const ct = carOf(t),
    rad = ct.wid * 0.42,
    fx = Math.sin(p.h) * ct.len * 0.3,
    fz = Math.cos(p.h) * ct.len * 0.3;
  for (const [x, z] of [[p.x, p.z], [p.x + fx, p.z + fz], [p.x - fx, p.z - fz]]) {
    const gy = groundH(x, z, 1e4); // 고가 상판 위도 땅으로 본다
    if (gy === -Infinity) return false;
    const w = waterAt(x, z);
    if (w && w.depth > 0.5 && gy < w.y + 1.5) return false;
    if (solidAt(x, z, rad, gy)) return false;
  }
  return true;
}

/** 대체 위치: 차고 앞 줄 → 가까운 주차 슬롯 → 차고 둘레 나선 (taken = 이미 차가 있는지) */
export function safeSpotFor(t: string, from: {x: number; z: number}, taken: (x: number, z: number) => boolean): Pose {
  const ok = (p: Pose) => poseIsSafe(t, p) && !taken(p.x, p.z);
  for (let k = 0; k < 8; k++) {
    const p = {x: GARAGE_OUT.x - k * 5.5, z: GARAGE_OUT.z, h: GARAGE_OUT.h};
    if (ok(p)) return p;
  }
  const ref = finite(from.x) && finite(from.z) ? from : GARAGE_OUT;
  const slots = parkingSlots().slice().sort((a, b) => Math.hypot(a.x - ref.x, a.z - ref.z) - Math.hypot(b.x - ref.x, b.z - ref.z));
  for (const s of slots) {
    const p = {x: s.x, z: s.z, h: s.h};
    if (ok(p)) return p;
  }
  for (let r = 6; r <= 60; r += 4)
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2,
        p = {x: GARAGE_OUT.x + Math.cos(a) * r, z: GARAGE_OUT.z + Math.sin(a) * r, h: GARAGE_OUT.h};
      if (ok(p)) return p;
    }
  return {...GARAGE_OUT};
}

/** 로드 직후 1회: 차고에 없는 내 차의 위치를 검사·보정한다. 옮긴 수를 돌려준다 */
export function sanitizeOwnedCars(list: OwnedCar[], taken: (x: number, z: number) => boolean): number {
  let moved = 0;
  for (let i = list.length - 1; i >= 0; i--) if (!list[i] || typeof list[i] !== 'object') list.splice(i, 1); // 깨진 항목 제거 (own 인덱스는 아직 쓰기 전)
  const placed: Pose[] = [];
  const near = (x: number, z: number) => taken(x, z) || placed.some(q => Math.hypot(q.x - x, q.z - z) < 5);
  for (const o of list) {
    if (o.stored) continue;
    if (!finite(o.h)) o.h = 0;
    const stacked = placed.some(q => Math.hypot(q.x - o.x, q.z - o.z) < 3); // 이미 놓인 다른 내 차와 겹침
    if (stacked || !poseIsSafe(o.t, o)) {
      Object.assign(o, safeSpotFor(o.t, o, near));
      moved++;
    }
    placed.push({x: o.x, z: o.z, h: o.h});
  }
  return moved;
}
