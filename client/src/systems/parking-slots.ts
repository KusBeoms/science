// 기본 주차 슬롯 공급자: 차도(car=true) 양쪽 가장자리에 일정 간격으로 (W8 P2-b 이전의 planSpots 와 같은 계산).
// city.compiled.json 의 주차칸이 생기면 setSlotProvider 로 같은 ParkingSlot 모양을 넘기면 된다.
import {groundH} from '../core/terrain.js';
import {approachNear, CITY_APPROACH_START, Z_UP0} from '../data/bridge.js';
import {CITY_ROADS} from '../data/city.js';
import {mulberry32} from '../render/lowpoly/rng.js';
import type {ParkingSlot} from './vehicle-store.js';

export function roadSideSlots(): ParkingSlot[] {
  const rnd = mulberry32(2026),
    out: ParkingSlot[] = [];
  CITY_ROADS.forEach((r, ri) => {
    if (!r.car) return;
    const horiz = r.z0 === r.z1,
      a0 = Math.min(horiz ? r.x0 : r.z0, horiz ? r.x1 : r.z1) + 14,
      a1 = Math.max(horiz ? r.x0 : r.z0, horiz ? r.x1 : r.z1) - 14,
      off = r.w / 2 - 1.7;
    let k = 0;
    for (let a = a0; a <= a1; a += 19 + rnd() * 5, k++) {
      const side = k % 2 ? 1 : -1,
        c = horiz ? r.z0 : r.x0;
      const p = horiz ? {x: a, z: c + side * off, h: Math.PI / 2 * (side > 0 ? 1 : -1)} : {x: c + side * off, z: a, h: side > 0 ? Math.PI : 0};
      const ap = approachNear(p.x, p.z);
      if (p.z > CITY_APPROACH_START - 8 && p.z < Z_UP0 + 8 && ap.d < ap.w + 5) continue; // 다리 진입·확폭 구간에는 주차하지 않는다
      const y = groundH(p.x, p.z);
      out.push({id: `road:${ri}:${k}`, ...p, y: y === -Infinity ? 0 : y, kind: 'road'});
    }
  });
  return out;
}
