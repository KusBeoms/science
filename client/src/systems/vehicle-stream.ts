// 길가 주차 차량 스트리밍 (W8 P2-b): 플레이어와의 거리로 렌더 객체(mesh+충돌체)만 켜고 끈다. 논리 레코드는 그대로.
// 켜는 거리 rOn < 끄는 거리 rOff (히스테리시스), 동시에 켜 둘 상세 주차 차량 상한 cap.
// 운전·승하차·내 차·시승·경찰은 거리로 해제하지 않는다 (vehicle.ts streamable).
import {G} from '../core/runtime.js';
import type {GameSystem} from '../core/types.js';
import {VEH, activateVehicle, isActive, renderRelease, streamable} from './vehicle.js';
import {recordList, type Veh} from './vehicle-store.js';

export const STREAM = {rOn: 90, rOff: 120, cap: 40, interval: 0.2, enabled: true};

/** 먼 차의 경량 표현 연결점 (나중에 구현): 렌더 해제 때 show, 다시 상세로 켤 때 hide 가 불린다. 지금은 연결 없음 */
export interface FarRepresentation {
  show(v: Veh): void;
  hide(v: Veh): void;
}
let far: FarRepresentation | null = null;
export const setFarRepresentation = (f: FarRepresentation | null) => (far = f);

export const streamStats = {ticks: 0, activated: 0, released: 0};

/** 한 번 정리한다 (쓰로틀·enabled 와 무관: 테스트·텔레포트 직후에도 직접 부를 수 있다. enabled=false 는 자동 호출만 멈춘다) */
export function streamTick() {
  if (!G.started || !G.me || G.inside) return; // 실내는 방 좌표라 거리가 무의미 → 상태 유지
  streamStats.ticks++;
  const px = G.me.pos.x,
    pz = G.me.pos.z,
    dist = (v: Veh) => Math.hypot(v.x - px, v.z - pz),
    parked = recordList().filter(v => v.own === -1);
  let live = 0;
  for (const v of parked) {
    if (!isActive(v)) continue;
    if (dist(v) > STREAM.rOff && streamable(v)) {
      renderRelease(v);
      far?.show(v);
      streamStats.released++;
    } else live++;
  }
  // 상한 초과(설정 변경 등)면 가장 먼 것부터 해제
  if (live > STREAM.cap) {
    const act = parked.filter(v => isActive(v) && streamable(v)).sort((a, b) => dist(b) - dist(a));
    for (const v of act) {
      if (live <= STREAM.cap) break;
      renderRelease(v);
      far?.show(v);
      streamStats.released++;
      live--;
    }
  }
  const near = parked.filter(v => !isActive(v) && dist(v) <= STREAM.rOn).sort((a, b) => dist(a) - dist(b));
  for (const v of near) {
    if (live >= STREAM.cap) break;
    if (activateVehicle(v.id)) {
      far?.hide(v);
      streamStats.activated++;
      live++;
    }
  }
}
export const activeParkedCount = () => VEH.filter(v => v.own === -1).length;

let acc = 0;
export const vehicleStreamSystem: GameSystem = {
  id: 'vehicle-stream',
  update(dt) {
    if (!STREAM.enabled || (acc += dt) < STREAM.interval) return;
    acc = 0;
    streamTick();
  },
};
